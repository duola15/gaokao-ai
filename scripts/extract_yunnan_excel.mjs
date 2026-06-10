/**
 * 从 wanziming12/- 仓库的 Excel 文件中提取云南省真实录取数据
 * 覆盖 2021/2022/2023 三年，生成结构化 JSON
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', '_gaokao_excel_data');
const OUT_DIR = join(__dirname, '..', 'data', 'extracted');

// ========== 配置 ==========
const FILES = {
  2021: join(EXCEL_DIR, '云南_专业分数线_2021.xlsx'),
  2022: join(EXCEL_DIR, '云南-2022-专业分数线-加字段.xlsx'),
  2023: join(EXCEL_DIR, '2023云南专业分数线.xlsx'),
};

// ========== 工具函数 ==========
function cleanStr(s) {
  return (s || '').toString().trim()
    .replace(/\s+/g, ' ')
    .replace(/'/g, "\\'");
}

function toNum(v, fallback = 0) {
  if (v === '' || v === '-' || v === null || v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : Math.round(n);
}

function getSubjectGroup(v) {
  const s = (v || '').toString();
  if (s === '理' || s === '理科' || s.includes('理')) return '理工类';
  if (s === '文' || s === '文科' || s.includes('文')) return '文史类';
  return '理工类';
}

function getSchoolLevel(has985, has211, hasSyl) {
  if (has985 === '是' || has985 === true) return '985';
  if (has211 === '是' || has211 === true) return '211';
  if (hasSyl === '是' || hasSyl === true) return '双一流';
  return '公办本科';
}

function normalizeBatch(batch) {
  const b = (batch || '').toString();
  if (b.includes('一批')) return '本科一批';
  if (b.includes('二批')) return '本科二批';
  if (b.includes('专科') || b.includes('高职')) return '专科批';
  if (b.includes('预科')) return '本科预科';
  if (b === '一本') return '本科一批';
  if (b === '二本') return '本科二批';
  return b || '本科批';
}

// ========== 城市映射 ==========
const CITY_MAP = {
  '北京大学': '北京', '清华大学': '北京', '中国人民大学': '北京',
  '北京航空航天大学': '北京', '北京理工大学': '北京', '北京师范大学': '北京',
  '中国农业大学': '北京', '中央民族大学': '北京', '北京邮电大学': '北京',
  '北京交通大学': '北京', '北京科技大学': '北京', '北京化工大学': '北京',
  '北京林业大学': '北京', '中国政法大学': '北京', '中央财经大学': '北京',
  '对外经济贸易大学': '北京', '北京外国语大学': '北京', '北京工业大学': '北京',
  '上海交通大学': '上海', '复旦大学': '上海', '同济大学': '上海',
  '华东师范大学': '上海', '上海财经大学': '上海', '上海大学': '上海',
  '东华大学': '上海', '华东理工大学': '上海', '上海外国语大学': '上海',
  '浙江大学': '杭州', '武汉大学': '武汉', '华中科技大学': '武汉',
  '南京大学': '南京', '东南大学': '南京', '四川大学': '成都',
  '电子科技大学': '成都', '西安交通大学': '西安', '西北工业大学': '西安',
  '中山大学': '广州', '华南理工大学': '广州', '厦门大学': '厦门',
  '哈尔滨工业大学': '哈尔滨', '天津大学': '天津', '南开大学': '天津',
  '山东大学': '济南', '中国科学技术大学': '合肥', '中南大学': '长沙',
  '湖南大学': '长沙', '重庆大学': '重庆', '兰州大学': '兰州',
  '云南大学': '昆明', '昆明理工大学': '昆明', '云南师范大学': '昆明',
  '云南财经大学': '昆明', '云南民族大学': '昆明', '云南农业大学': '昆明',
  '昆明医科大学': '昆明', '大理大学': '大理',
};

function guessCity(schoolName, cityFromExcel) {
  if (cityFromExcel && cityFromExcel !== '' && cityFromExcel !== '未知') return cityFromExcel;
  if (CITY_MAP[schoolName]) return CITY_MAP[schoolName];
  for (const [k, v] of Object.entries(CITY_MAP)) {
    if (schoolName.includes(k)) return v;
  }
  if (schoolName.includes('北京')) return '北京';
  if (schoolName.includes('上海')) return '上海';
  if (schoolName.includes('广州')) return '广州';
  if (schoolName.includes('南京')) return '南京';
  if (schoolName.includes('武汉')) return '武汉';
  if (schoolName.includes('成都')) return '成都';
  if (schoolName.includes('西安')) return '西安';
  if (schoolName.includes('昆明')) return '昆明';
  if (schoolName.includes('重庆')) return '重庆';
  if (schoolName.includes('天津')) return '天津';
  return '其他';
}

// ========== 主程序 ==========
function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  let allSchools = {}; // name → info
  let allRecords = []; // array of standardized records
  let recordId = 1;

  // === 2023 (simplest structure) ===
  console.log('📖 Reading 2023...');
  const wb2023 = XLSX.readFile(FILES[2023]);
  const ws2023 = wb2023.Sheets[wb2023.SheetNames[0]];
  const rows2023 = XLSX.utils.sheet_to_json(ws2023, { header: 1, defval: '' });
  console.log(`  ${rows2023.length} rows`);

  for (let i = 1; i < rows2023.length; i++) {
    const [year, province, kelei, batch, schoolName, majorName, majorNote,
           minScore, minRank, maxScore, avgScore] = rows2023[i];
    if (!schoolName || !majorName) continue;

    const sg = getSubjectGroup(kelei);
    const minS = toNum(minScore);
    const minR = toNum(minRank);
    if (minS <= 0) continue;

    const schoolKey = `${schoolName}`;
    if (!allSchools[schoolKey]) {
      allSchools[schoolKey] = {
        name: schoolName,
        city: guessCity(schoolName, ''),
        level: '公办本科', // will be enriched from 2021/2022
        desc: '',
      };
    }

    allRecords.push({
      id: recordId++,
      school_name: schoolName,
      major_name: cleanStr(majorName + (majorNote ? ` (${majorNote})` : '')),
      year: 2023,
      batch: normalizeBatch(batch),
      min_score: minS,
      avg_score: toNum(avgScore, minS),
      min_rank: minR,
      avg_rank: minR, // approximate
      subject_group: sg,
      enrollment_quota: 0,
      tuition: 0,
      source: 'wanziming12/excel/2023',
    });
  }
  console.log(`  → ${allRecords.length} records`);

  // === 2022 ===
  console.log('📖 Reading 2022...');
  const recordCount023 = allRecords.length;
  const wb2022 = XLSX.readFile(FILES[2022]);
  const ws2022 = wb2022.Sheets[wb2022.SheetNames[0]];
  const rows2022 = XLSX.utils.sheet_to_json(ws2022, { header: 1, defval: '' });
  console.log(`  ${rows2022.length} rows`);

  for (let i = 1; i < rows2022.length; i++) {
    const [year, code, schoolName, province, city, rank, has985, has211, hasSyl,
           schoolType, nature, degreeType, batch, kelei, majorCode, majorName,
           majorNote, planNum, enrollNum, minScore, minRank] = rows2022[i];
    if (!schoolName || !majorName) continue;

    const sg = getSubjectGroup(kelei);
    const minS = toNum(minScore);
    const minR = toNum(minRank, 999999);
    if (minS <= 0) continue;

    const schoolKey = `${schoolName}`;
    if (!allSchools[schoolKey]) {
      allSchools[schoolKey] = {
        name: schoolName,
        city: guessCity(schoolName, city),
        level: getSchoolLevel(has985, has211, hasSyl),
        desc: '',
      };
    } else {
      // Enrich with level info from 2022
      const level = getSchoolLevel(has985, has211, hasSyl);
      if (level !== '公办本科') allSchools[schoolKey].level = level;
      if (city && allSchools[schoolKey].city === '其他') {
        allSchools[schoolKey].city = city;
      }
    }

    allRecords.push({
      id: recordId++,
      school_name: schoolName,
      major_name: cleanStr(majorName + (majorNote ? ` (${majorNote})` : '')),
      year: 2022,
      batch: normalizeBatch(batch),
      min_score: minS,
      avg_score: minS + 3, // approximate if no avg
      min_rank: minR,
      avg_rank: minR > 0 ? minR + 50 : 0,
      subject_group: sg,
      enrollment_quota: toNum(planNum || enrollNum),
      tuition: 0,
      source: 'wanziming12/excel/2022',
    });
  }
  console.log(`  → ${allRecords.length - recordCount023} new records (total: ${allRecords.length})`);

  // === 2021 ===
  console.log('📖 Reading 2021...');
  const recordCountBefore21 = allRecords.length;
  const wb2021 = XLSX.readFile(FILES[2021]);
  const ws2021 = wb2021.Sheets[wb2021.SheetNames[0]];
  const rows2021 = XLSX.utils.sheet_to_json(ws2021, { header: 1, defval: '' });
  console.log(`  ${rows2021.length} rows`);

  for (let i = 1; i < rows2021.length; i++) {
    const [year, schoolName, province, city, rank, has985, has211, hasSyl,
           kelei, batch, majorCat, majorL1, majorName, avgScore, maxScore,
           minScore, minRank, nature, owner, code, enrollType, schoolType,
           degreeType, oldName, sourceProv] = rows2021[i];
    if (!schoolName || !majorName) continue;

    const sg = getSubjectGroup(kelei);
    const minS = toNum(minScore);
    const minR = toNum(minRank, 999999);
    if (minS <= 0) continue;

    const schoolKey = `${schoolName}`;
    if (!allSchools[schoolKey]) {
      allSchools[schoolKey] = {
        name: schoolName,
        city: guessCity(schoolName, city),
        level: getSchoolLevel(has985, has211, hasSyl),
        desc: '',
      };
    } else {
      const level = getSchoolLevel(has985, has211, hasSyl);
      if (level !== '公办本科' && allSchools[schoolKey].level === '公办本科') {
        allSchools[schoolKey].level = level;
      }
      if (city && allSchools[schoolKey].city === '其他') {
        allSchools[schoolKey].city = city;
      }
    }

    allRecords.push({
      id: recordId++,
      school_name: schoolName,
      major_name: cleanStr(majorName),
      year: 2021,
      batch: normalizeBatch(batch),
      min_score: minS,
      avg_score: toNum(avgScore, minS + 3),
      min_rank: minR,
      avg_rank: minR > 0 ? minR + 50 : 0,
      subject_group: sg,
      enrollment_quota: 0,
      tuition: 0,
      source: 'wanziming12/excel/2021',
    });
  }
  console.log(`  → ${allRecords.length - recordCountBefore21} new records (total: ${allRecords.length})`);

  // === Save extracted data ===
  const schoolsArr = Object.values(allSchools);
  console.log(`\n✅ Total: ${schoolsArr.length} schools, ${allRecords.length} records`);

  // School level stats
  const levelCounts = {};
  schoolsArr.forEach(s => { levelCounts[s.level] = (levelCounts[s.level] || 0) + 1; });
  console.log('  Levels:', Object.entries(levelCounts).map(([k,v]) => `${k}:${v}`).join(', '));

  // Save JSON intermediate files
  writeFileSync(
    join(OUT_DIR, 'yunnan_schools_from_excel.json'),
    JSON.stringify(schoolsArr, null, 2), 'utf-8'
  );
  writeFileSync(
    join(OUT_DIR, 'yunnan_records_from_excel.json'),
    JSON.stringify(allRecords, null, 0), 'utf-8' // compact
  );

  // Save summary
  writeFileSync(
    join(OUT_DIR, 'extraction_summary.json'),
    JSON.stringify({
      generated: new Date().toISOString(),
      total_schools: schoolsArr.length,
      total_records: allRecords.length,
      by_year: {
        2021: allRecords.filter(r => r.year === 2021).length,
        2022: allRecords.filter(r => r.year === 2022).length,
        2023: allRecords.filter(r => r.year === 2023).length,
      },
      by_subject: {
        '理工类': allRecords.filter(r => r.subject_group === '理工类').length,
        '文史类': allRecords.filter(r => r.subject_group === '文史类').length,
      },
      level_distribution: levelCounts,
    }, null, 2), 'utf-8'
  );

  console.log(`\n📁 Intermediate files saved to: ${OUT_DIR}`);
  console.log('Done!');
}

main();
