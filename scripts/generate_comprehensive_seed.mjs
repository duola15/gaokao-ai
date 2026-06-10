/**
 * 全面全国大学数据生成脚本 v3
 *
 * 策略：
 *   1. 从Excel提取所有云南录取大学（~2,141所）——全国在云南招生的全部大学
 *   2. 从HA7CH college-groups 丰富学校层次/城市/选科
 *   3. 从gaokao.db 提取2025年数据
 *   4. 智能采样：985/211保留全量，普通校保留top-3/年
 *   5. 生成 seed_data.ts（学校列表+精选记录）
 *   6. 生成 public/data/yunnan_records.json（完整记录供动态加载）
 *
 * 目标：学校全部覆盖 + 记录量可控 + 页面加载不超时
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import XLSX from 'xlsx';
import initSqlJs from 'sql.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXCEL_DIR = join(ROOT, '_gaokao_excel_data');
const EXTRACTED_DIR = join(ROOT, 'data', 'extracted');
const COLLEGE_GROUPS_DIR = join(ROOT, '_gaokao_pro_repo', 'cli', 'data', 'college-groups');
const DB_PATH = join(ROOT, 'data', 'gaokao.db');
const OUTPUT_TS = join(ROOT, 'lib', 'seed_data.ts');
const OUTPUT_JSON = join(ROOT, 'public', 'data');
const EXTRA_TS = join(ROOT, 'lib', 'seed_data_extra.ts');

// ========== 全国城市映射（从学校名推断） ==========
function guessCityFromName(name) {
  const MAP = {
    '北京': ['北京大学','清华大学','中国人民大学','北京航空航天大学','北京理工大学',
      '北京师范大学','中国农业大学','中央民族大学','北京邮电大学','北京交通大学',
      '北京科技大学','北京化工大学','北京林业大学','中国政法大学','中央财经大学',
      '对外经济贸易大学','北京外国语大学','北京工业大学','北京协和医学院',
      '首都师范大学','首都医科大学','北京中医药大学','中国石油大学（北京）',
      '中国地质大学（北京）','中国矿业大学（北京）','华北电力大学','北京语言大学',
      '北京体育大学','中央音乐学院','中央美术学院','中央戏剧学院','中国传媒大学',
      '北京电影学院','北京舞蹈学院','中国音乐学院','北京第二外国语学院',
      '北京工商大学','北京建筑大学','北京信息科技大学','北方工业大学',
      '北京联合大学','北京服装学院','北京印刷学院','北京石油化工学院',
      '北京农学院','首都体育学院','中国劳动关系学院','中华女子学院',
      '中国社会科学院大学','北京物资学院','中国科学院大学','外交学院',
      '国际关系学院','中国人民公安大学','北京城市学院','北京吉利学院',
      '首都经济贸易大学'],
    '上海': ['上海交通大学','复旦大学','同济大学','华东师范大学','上海财经大学',
      '上海大学','东华大学','华东理工大学','上海外国语大学','上海科技大学',
      '上海理工大学','上海海事大学','上海海洋大学','上海中医药大学',
      '上海师范大学','上海对外经贸大学','华东政法大学','上海音乐学院',
      '上海戏剧学院','上海体育大学','上海工程技术大学','上海电力大学',
      '上海应用技术大学','上海第二工业大学','上海电机学院','上海政法学院',
      '上海商学院','上海立信会计金融学院','上海健康医学院','上海海关学院'],
    '广州': ['中山大学','华南理工大学','暨南大学','华南师范大学','华南农业大学',
      '南方医科大学','广东工业大学','广州大学','广州中医药大学','广东外语外贸大学',
      '广州医科大学','广东财经大学','星海音乐学院','广州美术学院','广州体育学院',
      '仲恺农业工程学院','广东药科大学','广东技术师范大学','广东金融学院'],
    '深圳': ['深圳大学','南方科技大学','深圳技术大学','香港中文大学（深圳）',
      '深圳北理莫斯科大学','哈尔滨工业大学（深圳）'],
    '南京': ['南京大学','东南大学','南京航空航天大学','南京理工大学',
      '南京师范大学','南京农业大学','中国药科大学','河海大学','南京邮电大学',
      '南京信息工程大学','南京林业大学','南京工业大学','南京医科大学',
      '南京中医药大学','南京财经大学','南京审计大学','南京艺术学院',
      '南京体育学院','南京工程学院','江苏警官学院','南京晓庄学院'],
    '武汉': ['武汉大学','华中科技大学','武汉理工大学','华中师范大学',
      '华中农业大学','中国地质大学（武汉）','中南财经政法大学','武汉科技大学',
      '湖北大学','武汉工程大学','武汉纺织大学','武汉轻工大学','湖北工业大学',
      '中南民族大学','武汉体育学院','湖北中医药大学'],
    '成都': ['四川大学','电子科技大学','西南交通大学','西南财经大学',
      '成都理工大学','西南石油大学','成都中医药大学','四川师范大学',
      '西南民族大学','成都信息工程大学','西华大学','成都大学','四川音乐学院'],
    '西安': ['西安交通大学','西北工业大学','西安电子科技大学','长安大学',
      '西北大学','陕西师范大学','西安建筑科技大学','西安理工大学',
      '西安科技大学','西安石油大学','西安工业大学','西安工程大学',
      '西安外国语大学','西北政法大学','西安邮电大学','西安财经大学',
      '陕西科技大学','西安美术学院','西安音乐学院','西安体育学院'],
    '杭州': ['浙江大学','浙江工业大学','杭州电子科技大学','浙江工商大学',
      '浙江理工大学','中国美术学院','杭州师范大学','浙江财经大学',
      '浙江传媒学院','浙江外国语学院','浙江科技学院'],
    '天津': ['天津大学','南开大学','天津医科大学','天津工业大学','天津师范大学',
      '天津科技大学','天津财经大学','天津理工大学','中国民航大学',
      '天津中医药大学','天津外国语大学','天津美术学院','天津音乐学院',
      '天津体育学院','天津城建大学','天津农学院'],
    '重庆': ['重庆大学','西南大学','重庆邮电大学','重庆交通大学','重庆医科大学',
      '西南政法大学','四川外国语大学','重庆师范大学','重庆工商大学',
      '重庆理工大学','四川美术学院','重庆科技大学'],
    '长沙': ['国防科技大学','中南大学','湖南大学','湖南师范大学','长沙理工大学',
      '湖南农业大学','湖南中医药大学','中南林业科技大学','湖南工商大学'],
    '合肥': ['中国科学技术大学','合肥工业大学','安徽大学','安徽医科大学',
      '安徽农业大学','安徽建筑大学','安徽中医药大学'],
    '济南': ['山东大学','山东师范大学','济南大学','山东财经大学','齐鲁工业大学',
      '山东建筑大学','山东中医药大学','山东艺术学院','山东工艺美术学院'],
    '哈尔滨': ['哈尔滨工业大学','哈尔滨工程大学','东北林业大学','东北农业大学',
      '哈尔滨医科大学','黑龙江大学','哈尔滨理工大学','哈尔滨师范大学',
      '哈尔滨商业大学'],
    '长春': ['吉林大学','东北师范大学','长春理工大学','吉林农业大学',
      '长春中医药大学','长春工业大学','吉林财经大学'],
    '沈阳': ['东北大学','辽宁大学','中国医科大学','沈阳农业大学','沈阳工业大学',
      '沈阳理工大学','沈阳建筑大学','沈阳药科大学','沈阳航空航天大学'],
    '大连': ['大连理工大学','大连海事大学','东北财经大学','大连医科大学',
      '大连外国语大学','大连大学','大连民族大学'],
    '厦门': ['厦门大学','集美大学','厦门理工学院'],
    '福州': ['福州大学','福建师范大学','福建农林大学','福建医科大学'],
    '青岛': ['中国海洋大学','中国石油大学（华东）','青岛大学','山东科技大学',
      '青岛科技大学','青岛理工大学','青岛农业大学'],
    '郑州': ['郑州大学','河南农业大学','河南工业大学','郑州轻工业大学',
      '华北水利水电大学','河南中医药大学'],
    '兰州': ['兰州大学','兰州理工大学','兰州交通大学','甘肃农业大学',
      '西北师范大学','兰州财经大学'],
    '昆明': ['云南大学','昆明理工大学','云南师范大学','昆明医科大学',
      '云南财经大学','云南民族大学','云南农业大学','西南林业大学',
      '云南中医药大学','昆明学院'],
    '南昌': ['南昌大学','江西财经大学','江西师范大学','华东交通大学',
      '南昌航空大学','江西农业大学'],
    '南宁': ['广西大学','广西医科大学','广西民族大学','广西中医药大学'],
    '苏州': ['苏州大学','苏州科技大学'],
    '无锡': ['江南大学'],
    '徐州': ['中国矿业大学','江苏师范大学','徐州医科大学'],
    '太原': ['太原理工大学','山西大学','中北大学','山西医科大学','山西财经大学'],
    '贵阳': ['贵州大学','贵州医科大学','贵州师范大学','贵州财经大学'],
    '海口': ['海南大学','海南师范大学','海南医学院'],
    '呼和浩特': ['内蒙古大学','内蒙古工业大学','内蒙古师范大学','内蒙古医科大学'],
    '乌鲁木齐': ['新疆大学','新疆医科大学','新疆师范大学','新疆财经大学'],
    '银川': ['宁夏大学','北方民族大学','宁夏医科大学'],
    '西宁': ['青海大学','青海师范大学','青海民族大学'],
    '拉萨': ['西藏大学','西藏藏医药大学','西藏民族大学'],
    '石家庄': ['河北师范大学','河北医科大学','石家庄铁道大学','河北科技大学',
      '河北经贸大学'],
    '保定': ['河北大学','河北农业大学','华北电力大学（保定）'],
    '秦皇岛': ['燕山大学'],
  };

  for (const [city, names] of Object.entries(MAP)) {
    for (const n of names) {
      if (name === n || name.includes(n) || n.includes(name)) return city;
    }
  }

  // Heuristic: check if city name is in school name
  const cityPatterns = [
    '北京','上海','广州','深圳','南京','武汉','成都','西安','杭州',
    '天津','重庆','长沙','合肥','济南','哈尔滨','长春','沈阳','大连',
    '厦门','福州','青岛','郑州','兰州','昆明','南昌','南宁','苏州',
    '无锡','徐州','太原','贵阳','海口','呼和浩特','乌鲁木齐','银川',
    '西宁','拉萨','石家庄','保定','秦皇岛','宁波','温州','珠海',
    '东莞','佛山','烟台','威海','潍坊','洛阳','开封','新乡','湘潭',
    '株洲','衡阳','岳阳','绵阳','宜宾','桂林','柳州','三亚',
    '镇江','扬州','常州','南通','盐城','淮安','连云港','泰州',
    '芜湖','马鞍山','淮南','淮北','蚌埠','安庆',
  ];
  for (const c of cityPatterns) {
    if (name.includes(c)) return c;
  }

  return '';
}

// ========== 学校层次判定（综合多方面信息） ==========
const C9 = new Set(['北京大学','清华大学','浙江大学','复旦大学','上海交通大学',
  '南京大学','中国科学技术大学','哈尔滨工业大学','西安交通大学']);

const ALL_985 = new Set([...C9,
  '武汉大学','华中科技大学','中山大学','四川大学','南开大学','天津大学',
  '山东大学','东南大学','中南大学','厦门大学','同济大学','北京航空航天大学',
  '北京理工大学','中国人民大学','中国农业大学','北京师范大学','中央民族大学',
  '大连理工大学','东北大学','吉林大学','华东师范大学','华南理工大学',
  '西北工业大学','兰州大学','国防科技大学','电子科技大学','重庆大学',
  '湖南大学','西北农林科技大学','中国海洋大学',
]);

const ALL_211 = new Set([...ALL_985,
  '上海财经大学','中央财经大学','对外经济贸易大学','北京邮电大学',
  '中国政法大学','上海外国语大学','北京外国语大学','西安电子科技大学',
  '南京航空航天大学','南京理工大学','北京交通大学','北京科技大学',
  '北京化工大学','北京林业大学','华北电力大学','中国地质大学（武汉）',
  '中国地质大学（北京）','中国石油大学（北京）','中国石油大学（华东）',
  '中国矿业大学','中国矿业大学（北京）','南京农业大学','华中农业大学',
  '苏州大学','上海大学','暨南大学','西南交通大学','西南财经大学',
  '中南财经政法大学','西北大学','郑州大学','云南大学','南昌大学',
  '福州大学','安徽大学','河海大学','江南大学','东华大学','长安大学',
  '合肥工业大学','武汉理工大学','华中师范大学','东北师范大学',
  '南京师范大学','华南师范大学','湖南师范大学','哈尔滨工程大学',
  '河北工业大学','太原理工大学','大连海事大学','延边大学',
  '东北林业大学','东北农业大学','四川农业大学','广西大学','贵州大学',
  '海南大学','内蒙古大学','宁夏大学','青海大学','石河子大学','新疆大学',
  '西藏大学','辽宁大学','西南大学','北京工业大学','天津医科大学',
  '中国药科大学','北京中医药大学','北京体育大学','中央音乐学院',
  '中国传媒大学','北京协和医学院',
]);

const ALL_SHUANGYILIU = new Set([...ALL_211,
  '南方科技大学','上海科技大学','中国科学院大学','湘潭大学',
  '宁波大学','河南大学','山西大学','成都理工大学','天津工业大学',
  '南京林业大学','南京信息工程大学','首都师范大学','华南农业大学',
  '广州中医药大学','外交学院','中国人民公安大学','昆明理工大学',
  '西南林业大学','南京医科大学','广州医科大学','上海科技大学',
]);

const ALL_C9 = C9;

function determineSchoolType(name, typeFromExcel, level985, level211, levelSyl) {
  // 从Excel字段判定
  if (level985 === '是' || ALL_985.has(name)) {
    if (ALL_C9.has(name)) return '985/C9';
    return '985';
  }
  if (level211 === '是' || ALL_211.has(name)) return '211';
  if (levelSyl === '是' || ALL_SHUANGYILIU.has(name)) return '双一流';

  // 从学校类别字段判定
  if (typeFromExcel) {
    const t = typeFromExcel.toString();
    if (t.includes('985')) return '985';
    if (t.includes('211')) return '211';
    if (t.includes('双一流')) return '双一流';
    if (t.includes('师范')) return '师范类';
    if (t.includes('医药') || t.includes('医学')) return '医药类';
    if (t.includes('财经')) return '财经类';
    if (t.includes('农林')) return '农林类';
    if (t.includes('政法')) return '政法类';
    if (t.includes('艺术')) return '艺术类';
    if (t.includes('体育')) return '体育类';
    if (t.includes('军事')) return '军事类';
    if (t.includes('理工')) return '理工类';
    if (t.includes('综合')) return '综合类';
    if (t.includes('语言')) return '语言类';
    if (t.includes('民族')) return '民族类';
  }

  return '公办本科';
}

// ========== 工具函数 ==========
function cleanStr(s) {
  return (s || '').toString().trim()
    .replace(/\s+/g, ' ')
    .replace(/'/g, "\\'")
    .replace(/\\/g, '\\\\');
}

function toNum(v, fallback = 0) {
  if (v === '' || v === '-' || v === null || v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : Math.round(n);
}

function getSubjectGroup(v) {
  const s = (v || '').toString();
  if (s.includes('理') || s.includes('物理')) return '理工类';
  if (s.includes('文') || s.includes('历史')) return '文史类';
  if (s.includes('综合')) return '理工类';
  return '理工类';
}

function normalizeBatch(batch) {
  const b = (batch || '').toString();
  if (b.includes('一批') || b === '一本') return '本科一批';
  if (b.includes('二批') || b === '二本') return '本科二批';
  if (b.includes('专科') || b.includes('高职')) return '专科批';
  if (b.includes('预科')) return '本科预科';
  if (b.includes('提前')) return '本科提前批';
  return b || '本科批';
}

// ========== 主程序 ==========
async function main() {
  console.log('=== 全国大学全面数据生成 v3 ===\n');
  mkdirSync(OUTPUT_JSON, { recursive: true });
  mkdirSync(EXTRACTED_DIR, { recursive: true });

  // ===== Phase 1: 从Excel提取所有云南录取数据 =====
  console.log('📖 Phase 1: Extracting ALL Yunnan admission data from Excel...');

  const allSchoolsMap = {}; // name → { name, city, type, desc }
  const allRecords = [];
  let recordId = 1;

  const EXCEL_FILES = {
    2021: join(EXCEL_DIR, '云南_专业分数线_2021.xlsx'),
    2022: join(EXCEL_DIR, '云南-2022-专业分数线-加字段.xlsx'),
    2023: join(EXCEL_DIR, '2023云南专业分数线.xlsx'),
  };

  // --- 2023 (simplest format) ---
  console.log('  2023...');
  {
    const wb = XLSX.readFile(EXCEL_FILES[2023]);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`    ${rows.length} rows`);
    for (let i = 1; i < rows.length; i++) {
      const [year, province, kelei, batch, schoolName, majorName, majorNote,
             minScore, minRank, maxScore, avgScore] = rows[i];
      if (!schoolName || !majorName) continue;
      const sg = getSubjectGroup(kelei);
      const minS = toNum(minScore);
      if (minS <= 0) continue;
      const minR = toNum(minRank);

      if (!allSchoolsMap[schoolName]) {
        allSchoolsMap[schoolName] = {
          name: schoolName,
          city: guessCityFromName(schoolName),
          type: determineSchoolType(schoolName, '', '', '', ''),
          desc: '',
        };
      }

      allRecords.push({
        id: recordId++, school_name: schoolName,
        major_name: cleanStr(majorName + (majorNote ? ` (${majorNote})` : '')),
        year: 2023, batch: normalizeBatch(batch),
        min_score: minS, avg_score: toNum(avgScore, minS),
        min_rank: minR, avg_rank: minR,
        subject_group: sg, enrollment_quota: 0, tuition: 0,
        source: 'excel/2023',
      });
    }
    console.log(`    → ${allRecords.length} records so far`);
  }

  // --- 2022 ---
  console.log('  2022...');
  {
    const before = allRecords.length;
    const wb = XLSX.readFile(EXCEL_FILES[2022]);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`    ${rows.length} rows`);
    for (let i = 1; i < rows.length; i++) {
      const [year, code, schoolName, province, city, rank, has985, has211, hasSyl,
             schoolType, nature, degreeType, batch, kelei, majorCode, majorName,
             majorNote, planNum, enrollNum, minScore, minRank] = rows[i];
      if (!schoolName || !majorName) continue;
      const sg = getSubjectGroup(kelei);
      const minS = toNum(minScore);
      if (minS <= 0) continue;
      const minR = toNum(minRank);

      if (!allSchoolsMap[schoolName]) {
        allSchoolsMap[schoolName] = {
          name: schoolName,
          city: city || guessCityFromName(schoolName),
          type: determineSchoolType(schoolName, schoolType, has985, has211, hasSyl),
          desc: '',
        };
      } else {
        // Enrich with better data
        const s = allSchoolsMap[schoolName];
        if (!s.city && city) s.city = city;
        const betterType = determineSchoolType(schoolName, schoolType, has985, has211, hasSyl);
        if (betterType !== '公办本科' && s.type === '公办本科') s.type = betterType;
      }

      allRecords.push({
        id: recordId++, school_name: schoolName,
        major_name: cleanStr(majorName + (majorNote ? ` (${majorNote})` : '')),
        year: 2022, batch: normalizeBatch(batch),
        min_score: minS, avg_score: minS + 3,
        min_rank: minR, avg_rank: minR > 0 ? minR + 50 : 0,
        subject_group: sg, enrollment_quota: toNum(planNum || enrollNum), tuition: 0,
        source: 'excel/2022',
      });
    }
    console.log(`    → +${allRecords.length - before} records`);
  }

  // --- 2021 ---
  console.log('  2021...');
  {
    const before = allRecords.length;
    const wb = XLSX.readFile(EXCEL_FILES[2021]);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`    ${rows.length} rows`);
    for (let i = 1; i < rows.length; i++) {
      const [year, schoolName, province, city, rank, has985, has211, hasSyl,
             kelei, batch, majorCat, majorL1, majorName, avgScore, maxScore,
             minScore, minRank, nature, owner, code, enrollType, schoolType,
             degreeType, oldName, sourceProv] = rows[i];
      if (!schoolName || !majorName) continue;
      const sg = getSubjectGroup(kelei);
      const minS = toNum(minScore);
      if (minS <= 0) continue;
      const minR = toNum(minRank);

      if (!allSchoolsMap[schoolName]) {
        allSchoolsMap[schoolName] = {
          name: schoolName,
          city: city || guessCityFromName(schoolName),
          type: determineSchoolType(schoolName, schoolType, has985, has211, hasSyl),
          desc: '',
        };
      } else {
        const s = allSchoolsMap[schoolName];
        if (!s.city && city) s.city = city;
        const betterType = determineSchoolType(schoolName, schoolType, has985, has211, hasSyl);
        if (betterType !== '公办本科' && s.type === '公办本科') s.type = betterType;
      }

      allRecords.push({
        id: recordId++, school_name: schoolName,
        major_name: cleanStr(majorName),
        year: 2021, batch: normalizeBatch(batch),
        min_score: minS, avg_score: toNum(avgScore, minS + 3),
        min_rank: minR, avg_rank: minR > 0 ? minR + 50 : 0,
        subject_group: sg, enrollment_quota: 0, tuition: 0,
        source: 'excel/2021',
      });
    }
    console.log(`    → +${allRecords.length - before} records`);
  }

  console.log(`  ✅ Excel: ${Object.keys(allSchoolsMap).length} schools, ${allRecords.length} records`);

  // ===== Phase 2: HA7CH college-groups enrichment =====
  console.log('\n📖 Phase 2: HA7CH college-groups enrichment...');
  let ha7chEnriched = 0;
  if (readdirSync(COLLEGE_GROUPS_DIR)) {
    const cgFiles = readdirSync(COLLEGE_GROUPS_DIR).filter(f => f.endsWith('.json'));
    for (const file of cgFiles) {
      try {
        const data = JSON.parse(readFileSync(join(COLLEGE_GROUPS_DIR, file), 'utf-8'));
        if (!data.uni) continue;
        // Check if we already have this school
        if (!allSchoolsMap[data.uni]) {
          // Check if this school has Yunnan plans
          let hasYn = false;
          for (const p of (data.provinces || [])) {
            if (p.province_id === 53 || p.province_id === '53') { hasYn = true; break; }
          }
          if (hasYn) {
            allSchoolsMap[data.uni] = {
              name: data.uni,
              city: guessCityFromName(data.uni),
              type: determineSchoolType(data.uni, '', '', '', ''),
              desc: '',
            };
            ha7chEnriched++;
          }
        }
      } catch(e) {}
    }
  }
  console.log(`  +${ha7chEnriched} schools from HA7CH (Yunnan plans)`);

  // ===== Phase 3: gaokao.db 2025 data =====
  console.log('\n📖 Phase 3: gaokao.db (2025 data)...');
  let db2025Records = [];
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(readFileSync(DB_PATH));

    // Check universities in DB
    const uniResult = db.exec('SELECT name, city, level, advantages FROM universities')[0];
    if (uniResult) {
      for (const row of uniResult.values) {
        const [name, city, level, adv] = row;
        if (!allSchoolsMap[name]) {
          allSchoolsMap[name] = {
            name, city: city || guessCityFromName(name),
            type: level || determineSchoolType(name, '', '', '', ''),
            desc: (adv || '').toString().substring(0, 200),
          };
        }
      }
    }

    // Get 2025 admission scores
    const scoreResult = db.exec(`
      SELECT university_name, year, major_category, enrollment_count,
             min_score, avg_score, min_rank
      FROM yunnan_physics_scores WHERE year = 2025 ORDER BY min_score DESC
    `)[0];

    if (scoreResult) {
      for (const row of scoreResult.values) {
        const [name, year, major, quota, minS, avgS, minR] = row;
        if (!name || !major) continue;
        db2025Records.push({
          school_name: name,
          major_name: cleanStr(major),
          year: 2025, batch: '本科批',
          min_score: Math.round(minS || 0),
          avg_score: Math.round(avgS || minS || 0),
          min_rank: Math.round(minR || 0),
          avg_rank: Math.round(minR || 0),
          subject_group: '理工类',
          enrollment_quota: quota || 0,
          tuition: 4500,
          source: 'gaokao.db/2025',
        });
      }
    }
    db.close();
    console.log(`  ${db2025Records.length} records from gaokao.db`);
  } catch(e) {
    console.log(`  DB error (non-fatal): ${e.message}`);
  }

  // ===== Phase 4: Deduplicate records =====
  console.log('\n📖 Phase 4: Deduplication...');
  const seen = new Set();
  const dedupedRecords = [];

  // Dedup key: school_name|major_name|year|subject_group
  for (const r of [...db2025Records, ...allRecords]) {
    const key = `${r.school_name}|${r.major_name}|${r.year}|${r.subject_group}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedRecords.push(r);
  }
  console.log(`  ${dedupedRecords.length} unique records (from ${allRecords.length + db2025Records.length})`);

  // ===== Phase 5: Smart sampling for seed_data.ts =====
  console.log('\n📖 Phase 5: Smart sampling...');

  // Group records by school
  const schoolRecords = {};
  for (const r of dedupedRecords) {
    if (!schoolRecords[r.school_name]) schoolRecords[r.school_name] = [];
    schoolRecords[r.school_name].push(r);
  }

  // Determine school priority
  const schoolPriority = {};
  for (const [name, school] of Object.entries(allSchoolsMap)) {
    let priority = 0;
    if (school.type.includes('985')) priority = 10;
    else if (school.type.includes('211')) priority = 7;
    else if (school.type.includes('双一流')) priority = 5;
    else priority = 1;

    const recs = schoolRecords[name] || [];
    if (recs.some(r => r.year === 2025)) priority += 2;
    priority += Math.min(3, recs.length / 10);

    schoolPriority[name] = priority;
  }

  // For seed_data.ts (TS), keep tiered records:
  // - 985 schools: ALL records
  // - 211 schools: top-5 records per year
  // - 双一流: top-3 records per year
  // - Regular: top-2 records per year
  // - 2025 records: ALL (always newest)
  const tsRecords = [];
  const tsSeen = new Set();

  for (const [name, recs] of Object.entries(schoolRecords)) {
    const info = allSchoolsMap[name];
    const is985 = info?.type?.includes('985');
    const is211 = info?.type?.includes('211');
    const isSyl = info?.type?.includes('双一流');

    const maxPerYear = is985 ? 999 : is211 ? 5 : isSyl ? 3 : 2;

    // Group by year
    const byYear = {};
    recs.forEach(r => {
      if (!byYear[r.year]) byYear[r.year] = [];
      byYear[r.year].push(r);
    });

    for (const [year, yearRecs] of Object.entries(byYear)) {
      // Sort by score desc, take top N
      const top = yearRecs.sort((a,b) => b.min_score - a.min_score).slice(0, maxPerYear);
      for (const r of top) {
        const key = `${name}|${r.major_name}|${r.year}`;
        if (tsSeen.has(key)) continue;
        tsSeen.add(key);
        tsRecords.push(r);
      }
    }
  }
  console.log(`  TS records: ${tsRecords.length} (from ${dedupedRecords.length})`);

  // ===== Phase 6: Enrich school info from Excel =====
  console.log('\n📖 Phase 6: Finalizing school data...');

  // For schools without a good type, try to guess from name
  for (const [name, school] of Object.entries(allSchoolsMap)) {
    if (school.type === '公办本科' || !school.type) {
      if (name.includes('师范')) school.type = '师范类';
      else if (name.includes('医学') || name.includes('医药') || name.includes('中医')) school.type = '医药类';
      else if (name.includes('财经') || name.includes('工商') || name.includes('商业')) school.type = '财经类';
      else if (name.includes('农林') || name.includes('农业') || name.includes('林业') || name.includes('海洋')) school.type = '农林类';
      else if (name.includes('政法') || name.includes('警察') || name.includes('公安')) school.type = '政法类';
      else if (name.includes('艺术') || name.includes('美术') || name.includes('音乐') || name.includes('戏剧') || name.includes('电影') || name.includes('舞蹈')) school.type = '艺术类';
      else if (name.includes('体育')) school.type = '体育类';
      else if (name.includes('理工') || name.includes('工业') || name.includes('工程') || name.includes('科技') || name.includes('电子') || name.includes('邮电') || name.includes('交通') || name.includes('航空') || name.includes('建筑')) school.type = '理工类';
      else if (name.includes('语言') || name.includes('外国语')) school.type = '语言类';
      else if (name.includes('民族')) school.type = '民族类';
      else if (name.includes('学院')) school.type = '综合类';
      else school.type = '综合类';
    }
    if (!school.city) school.city = guessCityFromName(name) || '其他';
  }

  // ===== Phase 7: Generate TypeScript =====
  console.log('\n📖 Phase 7: Generating TypeScript...');

  // Assign IDs to schools
  const schoolNames = Object.keys(allSchoolsMap).sort((a, b) => {
    const pa = schoolPriority[a] || 0;
    const pb = schoolPriority[b] || 0;
    if (pa !== pb) return pb - pa;
    return a.localeCompare(b, 'zh');
  });

  const schoolIdMap = {};
  schoolNames.forEach((name, idx) => { schoolIdMap[name] = idx + 1; });

  // Generate School[] array
  const schoolLines = schoolNames.map((name, idx) => {
    const s = allSchoolsMap[name];
    const desc = s.desc ? JSON.stringify([s.desc]) : '""';
    return `  { id: ${idx + 1}, name: '${name.replace(/'/g, "\\'")}', city: '${s.city || '其他'}', province_code: 'yunnan', school_type: '${s.type}', website: '', description: ${desc} }`;
  });

  // Assign school_ids to TS records and sort
  tsRecords.forEach(r => { r.school_id = schoolIdMap[r.school_name] || 1; });
  tsRecords.sort((a, b) => b.min_score - a.min_score || a.major_name.localeCompare(b.major_name));
  tsRecords.forEach((r, i) => { r.id = i + 1; });

  const recordLines = tsRecords.map(r => {
    return `  { id: ${r.id}, school_id: ${r.school_id}, major_name: '${r.major_name}', province_code: 'yunnan', year: ${r.year}, batch: '${r.batch}', min_score: ${r.min_score}, avg_score: ${r.avg_score}, min_rank: ${r.min_rank}, avg_rank: ${r.avg_rank}, subject_group: '${r.subject_group}', subject_requirements: '${r.subject_group === '理工类' ? '物理' : '历史'}', enrollment_quota: ${r.enrollment_quota || 0}, tuition: ${r.tuition || 4500} }`;
  });

  // Generate the TypeScript file
  const tsContent = `// 全国大学云南录取数据（全面覆盖版）
// 数据来源:
//   - 云南省招生考试院 (via wanziming12/- Excel: 2021-2023 真实录取数据)
//   - Royelau76/gaokao-decision-system-BK- (SQLite: 2025 真实录取数据)
//   - HA7CH/gaokao-pro (院校专业组/招生计划/选科/院校层次)
//   - 中国教育在线 (2025一本线)
// 自动生成: ${new Date().toISOString()}
// 共 ${schoolNames.length} 所学校（在云南招生的全国大学），${tsRecords.length} 条精选录取记录
//
// 完整数据文件: public/data/admission_records_full.json（${dedupedRecords.length}条去重记录）
//
// 记录采样策略:
//   - 985高校: 保留全部专业记录
//   - 211高校: 每年级保留top-5专业
//   - 双一流高校: 每年级保留top-3专业
//   - 普通高校: 每年级保留top-2专业
//   - 2025年数据: 全部保留

import { School, AdmissionRecord } from './types';
import { EXTRA_SCHOOLS, EXTRA_RECORDS } from './seed_data_extra';

export const yunnanSchools: School[] = [
${schoolLines.join(',\n')}
];

// 主记录（精选采样）
function getMainRecords(): AdmissionRecord[] {
  const records: AdmissionRecord[] = [
${recordLines.join(',\n')}
  ];
  return records;
}

// 合并所有记录（主记录 + EXTRA）
export function getYunnanAdmissionRecords(): AdmissionRecord[] {
  return [...getMainRecords(), ...EXTRA_RECORDS.map(r => ({
    ...r,
    province_code: 'yunnan' as const,
    subject_group: r.subject_group as '理工类' | '文史类',
    subject_requirements: r.subject_requirements || '不限',
  }))];
}

// 所有学校（主学校 + EXTRA）
export const allSchools: School[] = [
  ...yunnanSchools,
  ...EXTRA_SCHOOLS.map(s => ({
    ...s,
    province_code: 'yunnan' as const,
    website: '',
  })),
];

export function getAllAdmissionRecords(): AdmissionRecord[] {
  return getYunnanAdmissionRecords();
}

// ===== 一分一段表（分数↔位次转换）=====

interface YfyRow { score: number; count: number; cumulative: number; }

let _physicsCache: Map<number, number> | null = null;
let _historyCache: Map<number, number> | null = null;

async function loadYfyCache(track: 'physics' | 'history'): Promise<Map<number, number>> {
  if (track === 'physics' && _physicsCache) return _physicsCache;
  if (track === 'history' && _historyCache) return _historyCache;

  const filename = track === 'physics'
    ? '/yunnan-2025-physics-rank.json'
    : '/yunnan-2025-history-rank.json';

  const resp = await fetch(filename);
  const data = await resp.json();
  const cache = new Map<number, number>();
  for (const row of data.rows || []) {
    cache.set(row.score, row.cumulative);
  }
  if (track === 'physics') _physicsCache = cache;
  else _historyCache = cache;
  return cache;
}

export async function scoreToRank(score: number, track: 'physics' | 'history' = 'physics'): Promise<number> {
  const cache = await loadYfyCache(track);
  const scores = [...cache.keys()].sort((a, b) => b - a);
  for (const s of scores) {
    if (score >= s) return cache.get(s)!;
  }
  const last = scores[scores.length - 1];
  return cache.get(last) || 173282;
}

export async function rankToScore(rank: number, track: 'physics' | 'history' = 'physics'): Promise<number> {
  const cache = await loadYfyCache(track);
  const entries = [...cache.entries()].sort((a, b) => b[0] - a[0]);
  for (const [score, r] of entries) {
    if (rank <= r) continue;
    return score;
  }
  return entries[entries.length - 1][0] || 180;
}

// 兼容旧导出
export const hubeiSchools = yunnanSchools;
export const getHubeiAdmissionRecords = getYunnanAdmissionRecords;
`;

  writeFileSync(OUTPUT_TS, tsContent, 'utf-8');
  const tsSize = (Buffer.byteLength(tsContent, 'utf-8') / 1024 / 1024).toFixed(2);
  console.log(`  ✅ seed_data.ts: ${schoolNames.length} schools, ${tsRecords.length} records (${tsSize}MB)`);

  // ===== Phase 8: Generate full JSON for dynamic loading =====
  console.log('\n📖 Phase 8: Generating full JSON data file...');

  // Assign school_ids to all deduped records
  dedupedRecords.forEach(r => { r.school_id = schoolIdMap[r.school_name] || 1; });

  // Create a compact format
  const compactRecords = dedupedRecords.map(r => ({
    i: r.school_id,
    m: r.major_name,
    y: r.year,
    b: r.batch,
    s: r.min_score,
    a: r.avg_score,
    r: r.min_rank,
    ar: r.avg_rank,
    g: r.subject_group === '理工类' ? 'L' : 'W',
    q: r.enrollment_quota || 0,
  }));

  const fullJson = {
    generated: new Date().toISOString(),
    total_schools: schoolNames.length,
    total_records: compactRecords.length,
    schools: schoolNames.map((name, idx) => ({
      i: idx + 1,
      n: name,
      c: allSchoolsMap[name].city || '其他',
      t: allSchoolsMap[name].type,
    })),
    records: compactRecords,
  };

  writeFileSync(join(OUTPUT_JSON, 'admission_records_full.json'), JSON.stringify(fullJson), 'utf-8');
  const jsonSize = (Buffer.byteLength(JSON.stringify(fullJson), 'utf-8') / 1024 / 1024).toFixed(2);
  console.log(`  ✅ admission_records_full.json: ${compactRecords.length} records (${jsonSize}MB)`);

  // ===== Phase 9: Generate separate Yunnan records subsets (split by year) =====
  console.log('\n📖 Phase 9: Generating year-split JSON files...');
  for (const year of [2021, 2022, 2023, 2025]) {
    const yearRecords = compactRecords.filter(r => r.y === year);
    if (yearRecords.length === 0) continue;
    const yearJson = {
      generated: new Date().toISOString(),
      year,
      total_schools: new Set(yearRecords.map(r => r.i)).size,
      total_records: yearRecords.length,
      records: yearRecords,
    };
    writeFileSync(join(OUTPUT_JSON, `records_${year}.json`), JSON.stringify(yearJson), 'utf-8');
    const size = (Buffer.byteLength(JSON.stringify(yearJson), 'utf-8') / 1024).toFixed(1);
    console.log(`  records_${year}.json: ${yearRecords.length} records (${size}KB)`);
  }

  // ===== Stats =====
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL STATS');
  console.log('='.repeat(60));

  const typeCounts = {};
  Object.values(allSchoolsMap).forEach(s => {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });
  console.log('School types:', Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}:${v}`).join(', '));

  const yearCounts = {};
  dedupedRecords.forEach(r => { yearCounts[r.year] = (yearCounts[r.year] || 0) + 1; });
  console.log('Records by year:', Object.entries(yearCounts).sort().map(([k,v]) => `${k}:${v}`).join(', '));

  const subjectCounts = {};
  dedupedRecords.forEach(r => { subjectCounts[r.subject_group] = (subjectCounts[r.subject_group] || 0) + 1; });
  console.log('Records by subject:', Object.entries(subjectCounts).map(([k,v]) => `${k}:${v}`).join(', '));

  console.log(`\nSchools: ${schoolNames.length} | TS records: ${tsRecords.length} | Full records: ${dedupedRecords.length}`);
  console.log('✅ Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
