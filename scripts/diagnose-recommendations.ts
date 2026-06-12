/**
 * 冲稳保诊断脚本 —— 逐校打印数据，定位"重复"和"与实际不符"的根因
 * 用法: npx tsx scripts/diagnose-recommendations.ts
 */
import { buildRecommendations } from '../lib/recommendation';
import { getAllAdmissionRecords, allSchools } from '../lib/seed_data';
import type { UserInput } from '../lib/types';

const TEST_CASES: { score: number; rank: number; label: string; subjectGroup: '理工类' | '文史类' }[] = [
  { score: 580, rank: 15000, label: '中分段理科', subjectGroup: '理工类' },
  { score: 550, rank: 28000, label: '中等理科', subjectGroup: '理工类' },
  { score: 620, rank: 5000,  label: '高分段理科', subjectGroup: '理工类' },
];

for (const tc of TEST_CASES) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 ${tc.label}: ${tc.score}分 / rank ${tc.rank.toLocaleString()} / ${tc.subjectGroup}`);
  console.log('='.repeat(80));

  const input: UserInput = {
    score: tc.score,
    rank: tc.rank,
    province: 'yunnan',
    subject_group: tc.subjectGroup,
    subjects: tc.subjectGroup === '理工类' ? '物理,化学,生物' : '历史,地理,政治',
    preferences: { cities: [], major_direction: '' },
  };

  const { 冲, 稳, 保, allRecords } = buildRecommendations(input);

  // ── 按学校聚合分析 ──
  console.log(`\n📊 总量: 冲${冲.length} · 稳${稳.length} · 保${保.length} = ${冲.length+稳.length+保.length}条`);

  // 检查同校多专业出现在同一层级
  function checkDup(label: string, items: typeof 冲) {
    const schoolCount = new Map<number, number>();
    for (const item of items) {
      schoolCount.set(item.school.id, (schoolCount.get(item.school.id) || 0) + 1);
    }
    const multi = [...schoolCount.entries()].filter(([,c]) => c > 1).sort((a,b) => b[1]-a[1]);
    if (multi.length > 0) {
      console.log(`\n  ⚠️ ${label}: ${multi.length}校有重复（同校多专业展示）:`);
      for (const [schoolId, count] of multi.slice(0, 8)) {
        const school = allSchools.find(s => s.id === schoolId);
        const recs = items.filter(i => i.school.id === schoolId);
        const ranks = recs.map(r => `${r.major.major_name.slice(0,12)}(${r.major.avg_rank}名/${r.major.min_score}分)`);
        console.log(`    ${school?.name} ×${count}: ${ranks.join(', ')}`);
      }
    }
  }
  checkDup('冲', 冲);
  checkDup('稳', 稳);
  checkDup('保', 保);

  // 检查跨层同校
  const allItems = [...冲, ...稳, ...保];
  const schoolTiers = new Map<number, Set<string>>();
  for (const item of allItems) {
    const tiers = schoolTiers.get(item.school.id) || new Set();
    tiers.add(item.tier);
    schoolTiers.set(item.school.id, tiers);
  }
  const crossTier = [...schoolTiers.entries()].filter(([,t]) => t.size > 1);
  if (crossTier.length > 0) {
    console.log(`\n  ⚠️ 跨层重复: ${crossTier.length}校出现在多个层级:`);
    for (const [sid, tiers] of crossTier.slice(0, 10)) {
      const school = allSchools.find(s => s.id === sid);
      const recs = allItems.filter(i => i.school.id === sid);
      console.log(`    ${school?.name}: ${[...tiers].join('/')} ${recs.map(r => `${r.major.major_name.slice(0,10)}(${r.rank_diff})`).join(' | ')}`);
    }
  }

  // 检查 rank_diff 异常值
  const zeroRankRecords = allItems.filter(i => i.major.avg_rank === 0 || i.major.min_rank === 0);
  if (zeroRankRecords.length > 0) {
    console.log(`\n  ⚠️ 位次为0的记录: ${zeroRankRecords.length}条`);
    for (const r of zeroRankRecords.slice(0, 5)) {
      console.log(`    ${r.school.name} ${r.major.major_name}: avg_rank=${r.major.avg_rank} min_rank=${r.major.min_rank} rank_diff=${r.rank_diff}`);
    }
  }

  // 检查 tier 分类逻辑
  console.log(`\n  📐 层级分布分析:`);
  for (const tier of ['冲','稳','保'] as const) {
    const items = {冲,稳,保}[tier];
    const rankDiffs = items.map(i => i.rank_diff);
    if (rankDiffs.length === 0) continue;
    const min = Math.min(...rankDiffs);
    const max = Math.max(...rankDiffs);
    // 找到所有不同 school 的数量 vs 条目数
    const uniqueShools = new Set(items.map(i => i.school.id)).size;
    console.log(`    ${tier}: rank_diff范围 ${min}~${max}, ${items.length}条/${uniqueShools}校`);
    // 打印最极端的前3条
    const sorted = [...items].sort((a,b) => a.rank_diff - b.rank_diff);
    console.log(`      最紧(最冲): ${sorted[0]?.school.name} ${sorted[0]?.major.major_name.slice(0,12)} rank_diff=${sorted[0]?.rank_diff} avg_rank=${sorted[0]?.major.avg_rank}`);
    console.log(`      最松(最保): ${sorted[sorted.length-1]?.school.name} ${sorted[sorted.length-1]?.major.major_name.slice(0,12)} rank_diff=${sorted[sorted.length-1]?.rank_diff} avg_rank=${sorted[sorted.length-1]?.major.avg_rank}`);
  }

  // 检查数据年份分布
  const yearDist: Record<number, number> = {};
  for (const item of allItems) {
    yearDist[item.data_year || 0] = (yearDist[item.data_year || 0] || 0) + 1;
  }
  console.log(`  📅 数据年份: ${Object.entries(yearDist).map(([y,c]) => `${y}年×${c}`).join(', ')}`);

  // ⭐ 关键检查：top3 冲/稳/保 分别打印详情
  console.log(`\n  🎯 冲刺 Top-5:`);
  for (const item of 冲.slice(0, 5)) {
    console.log(`    ${item.school.name} | ${item.major.major_name.slice(0,15)} | avg_rank=${item.major.avg_rank} min_rank=${item.major.min_rank} | rank_diff=${item.rank_diff} | match=${item.match_score} | yr=${item.data_year}`);
  }
  console.log(`\n  ✅ 稳妥 Top-5:`);
  for (const item of 稳.slice(0, 5)) {
    console.log(`    ${item.school.name} | ${item.major.major_name.slice(0,15)} | avg_rank=${item.major.avg_rank} min_rank=${item.major.min_rank} | rank_diff=${item.rank_diff} | match=${item.match_score} | yr=${item.data_year}`);
  }
  console.log(`\n  🛡️ 保底 Top-5:`);
  for (const item of 保.slice(0, 5)) {
    console.log(`    ${item.school.name} | ${item.major.major_name.slice(0,15)} | avg_rank=${item.major.avg_rank} min_rank=${item.major.min_rank} | rank_diff=${item.rank_diff} | match=${item.match_score} | yr=${item.data_year}`);
  }
}

// ── 全局数据异常扫描 ──
console.log(`\n${'='.repeat(80)}`);
console.log('🔬 全局数据质量扫描');
console.log('='.repeat(80));

const allRecords = getAllAdmissionRecords();
const zeroAvg = allRecords.filter(r => r.avg_rank === 0);
const zeroMin = allRecords.filter(r => r.min_rank === 0);
console.log(`avg_rank=0: ${zeroAvg.length}条/${allRecords.length} (${(zeroAvg.length/allRecords.length*100).toFixed(1)}%)`);
console.log(`min_rank=0: ${zeroMin.length}条/${allRecords.length} (${(zeroMin.length/allRecords.length*100).toFixed(1)}%)`);

// 检查 avg_rank=0 的记录是什么年份和学校
if (zeroAvg.length > 0) {
  const yearDist: Record<number, number> = {};
  for (const r of zeroAvg) yearDist[r.year] = (yearDist[r.year] || 0) + 1;
  console.log(`avg_rank=0 年份分布: ${Object.entries(yearDist).map(([y,c]) => `${y}年×${c}`).join(', ')}`);
  // 前5个样例
  for (const r of zeroAvg.slice(0, 5)) {
    const school = allSchools.find(s => s.id === r.school_id);
    console.log(`  样例: ${school?.name} ${r.major_name} ${r.year} avg_rank=0 min_rank=${r.min_rank} min_score=${r.min_score}`);
  }
}

console.log(`\n✅ 诊断完成`);
