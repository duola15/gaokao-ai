/**
 * 自动化分数段测试脚本
 * 从500分开始，每50分跑一遍推荐算法，检测重复性错误和异常
 *
 * 用法: npx tsx scripts/test-scores.ts
 */

import { buildRecommendations, generateHistoricalSummary } from '../lib/recommendation';
import { getAllAdmissionRecords, allSchools } from '../lib/seed_data';
import { getRiskLabels } from '../lib/risk-labels';
import { analyzeScorePosition } from '../lib/cutoff';
import { rankToEstimatedScore } from '../lib/yifenyiduan';
import type { UserInput, RecommendationItem } from '../lib/types';

interface TestIssue {
  score: number;
  subjectGroup: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
}

interface TestResult {
  score: number;
  subjectGroup: string;
  totalResults: number;
  冲: number;
  稳: number;
  保: number;
  issues: TestIssue[];
  uniqueSchools: number;
  duplicateMajors: number;
  missingDataYear: number;
  missingTrend: number;
  riskTagGreen: number;
  riskTagRed: number;
  negativeMatchedScore: number;
}

const allIssues: TestIssue[] = [];
const allResults: TestResult[] = [];

const SCORES = [500, 550, 600, 650, 700, 750];
const SUBJECT_GROUPS: Array<'理工类' | '文史类'> = ['理工类', '文史类'];

console.log('='.repeat(70));
console.log('🔍 高考志愿AI - 分数段自动化测试');
console.log('='.repeat(70));
console.log(`测试范围: ${SCORES.map(s => s + '分').join(', ')} × ${SUBJECT_GROUPS.join(', ')}`);
console.log(`测试时间: ${new Date().toISOString()}`);
console.log('');

const allRecords = getAllAdmissionRecords();
console.log(`📊 数据概况: ${allSchools.length}所学校, ${allRecords.length}条记录`);
console.log(`   年份范围: ${[...new Set(allRecords.map(r => r.year))].sort().join(', ')}`);
console.log('');

/**
 * 根据分数估计位次（基于云南2025年一分一段表）
 * 数据来源：lib/yifenyiduan.ts（HA7CH/gaokao-pro 真实一分一段数据）
 *
 * 实际一分一段表对应关系（云南2025）：
 *   理科：700(38名) 650(737名) 600(3170名) 550(7370名) 500(12202名)
 *   文科：650(40名)  600(464名)  550(1944名)  500(4619名)  450(7919名)
 *
 * 注：700分文科无确切数据点，按合理估计
 */
function getMockRank(score: number, subjectGroup: string): number {
  if (subjectGroup === '理工类') {
    // 云南2025理科一分一段表（真实数据）
    if (score >= 750) return 15;    // 接近满分，top 15
    if (score >= 700) return 38;    // 真实：700分段38人
    if (score >= 650) return 737;   // 真实：650分段累计737人
    if (score >= 600) return 3170;  // 真实：600分段累计3170人
    if (score >= 550) return 7370;  // 真实：550分段累计7370人
    return 12202;                    // 真实：500分段累计12202人
  } else {
    // 云南2025文科一分一段表（真实数据）
    if (score >= 700) return 15;    // 顶尖分段
    if (score >= 650) return 40;    // 真实：650分段累计40人
    if (score >= 600) return 464;   // 真实：600分段累计464人
    if (score >= 550) return 1944;  // 真实：550分段累计1944人
    return 4619;                     // 真实：500分段累计4619人
  }
}

function runTest(score: number, subjectGroup: typeof SUBJECT_GROUPS[number]): TestResult {
  const input: UserInput = {
    score,
    rank: getMockRank(score, subjectGroup),
    province: 'yunnan',
    subject_group: subjectGroup,
    subjects: subjectGroup === '理工类' ? '物理,化学,生物' : '历史,地理,政治',
    preferences: { cities: [], major_direction: '' },
  };

  const result = buildRecommendations(input);
  const issues: TestIssue[] = [];

  const allItems = [...result.冲, ...result.稳, ...result.保];

  // ─── 基础检查 ───
  if (allItems.length === 0) {
    issues.push({
      score, subjectGroup, type: 'error', category: '空结果',
      message: `完全无推荐结果！数据可能缺失`,
    });
  }

  // ─── 各层级数量合理性 ───
  if (result.冲.length === 0 && result.稳.length === 0 && result.保.length === 0) {
    // already reported above
  } else {
    if (result.冲.length === 0) {
      // 极高分段（rank < 300）冲刺为空是正常的——考生已经是全省顶尖，没有"更好"的学校
      if (input.rank < 300) {
        issues.push({
          score, subjectGroup, type: 'info', category: '冲刺为空(正常)',
          message: `位次前300名，已无更高层次学校可冲刺，所有学校均在稳妥/保底范围内`,
        });
      } else {
        issues.push({
          score, subjectGroup, type: 'warning', category: '冲刺为空',
          message: `冲刺层级为空（可能存在数据断层）`,
        });
      }
    }
    if (result.稳.length === 0) {
      issues.push({
        score, subjectGroup, type: 'warning', category: '稳妥为空',
        message: `稳妥层级为空（数据可能存在断层）`,
      });
    }
    if (result.保.length === 0) {
      issues.push({
        score, subjectGroup, type: 'warning', category: '保底为空',
        message: `保底层级为空（数据可能存在断层）`,
      });
    }

    // 数量合理性：每个层级应有合理的最小数量
    if (input.rank >= 300 && result.冲.length < 5) {
      issues.push({
        score, subjectGroup, type: 'warning', category: '冲刺不足',
        message: `冲刺仅${result.冲.length}条（建议≥5条），数据可能覆盖不足`,
      });
    }
    if (result.稳.length < 8) {
      issues.push({
        score, subjectGroup, type: 'warning', category: '稳妥不足',
        message: `稳妥仅${result.稳.length}条（建议≥8条），数据可能覆盖不足`,
      });
    }
    if (result.保.length < 5) {
      issues.push({
        score, subjectGroup, type: 'warning', category: '保底不足',
        message: `保底仅${result.保.length}条（建议≥5条），数据可能覆盖不足`,
      });
    }
  }

  // ─── 去重检查：同学校出现在多个层级 ───
  const schoolIdsByTier: Record<string, Set<number>> = { 冲: new Set(), 稳: new Set(), 保: new Set() };
  for (const item of result.冲) schoolIdsByTier.冲.add(item.school.id);
  for (const item of result.稳) schoolIdsByTier.稳.add(item.school.id);
  for (const item of result.保) schoolIdsByTier.保.add(item.school.id);

  // 跨层级重复学校
  const 冲突稳 = [...schoolIdsByTier.冲].filter(id => schoolIdsByTier.稳.has(id));
  const 冲突保 = [...schoolIdsByTier.冲].filter(id => schoolIdsByTier.保.has(id));

  // 跨层重复：同一学校出现在多个层级（严格单层后应该为 0）
  if (冲突稳.length >= 5) {
    issues.push({
      score, subjectGroup, type: 'warning', category: '跨层重复(多)',
      message: `${冲突稳.length}所学校同时出现在冲刺和稳妥`,
    });
  } else if (冲突稳.length > 0) {
    issues.push({
      score, subjectGroup, type: 'info', category: '跨层重复',
      message: `${冲突稳.length}校跨冲刺/稳妥（不同专业难度不同，正常）`,
    });
  }
  if (冲突保.length > 0) {
    issues.push({
      score, subjectGroup, type: 'warning', category: '冲刺∩保底',
      message: `${冲突保.length}所学校同时出现在冲刺和保底（数据异常！）`,
    });
  }

  // ─── 同学校内专业重复检查 ───
  const schoolMajorPairs = new Set<string>();
  let duplicateMajors = 0;
  for (const item of allItems) {
    const key = `${item.school.id}-${item.major.major_name}-${item.major.year}`;
    if (schoolMajorPairs.has(key)) {
      duplicateMajors++;
    }
    schoolMajorPairs.add(key);
  }
  if (duplicateMajors > 0) {
    issues.push({
      score, subjectGroup, type: 'warning', category: '专业重复',
      message: `${duplicateMajors}条重复专业记录`,
    });
  }

  // ─── 数据完整性检查 ───
  let missingDataYear = 0;
  let missingTrend = 0;
  let riskTagGreen = 0;
  let riskTagRed = 0;
  let negativeMatchedScore = 0;

  for (const item of allItems) {
    if (!item.data_year) missingDataYear++;
    // trend_direction 存在但 trend 为空 → 数据不一致
    if (item.trend_direction && !item.trend) missingTrend++;
    // match_score 异常值
    if (item.match_score < 0) negativeMatchedScore++;

    if (item.risk_tags) {
      for (const tag of item.risk_tags) {
        if (tag.type === 'green') riskTagGreen++;
        if (tag.type === 'red') riskTagRed++;
      }
    }

    // 检查 rank_diff 合理性
    if (item.rank_diff === undefined || item.rank_diff === null) {
      issues.push({
        score, subjectGroup, type: 'error', category: '数据缺失',
        message: `${item.school.name} - ${item.major.major_name}: rank_diff 为空`,
      });
    }

    // 新增：检查匹配分双算风险（绿牌+红牌同时出现=可能双算）
    if (item.risk_tags) {
      const hasRed = item.risk_tags.some(t => t.type === 'red');
      const hasGreen = item.risk_tags.some(t => t.type === 'green');
      if (hasRed && hasGreen) {
        issues.push({
          score, subjectGroup, type: 'warning', category: '标签冲突',
          message: `${item.school.name} - ${item.major.major_name}: 同时有红牌和绿牌标签`,
        });
      }
    }
  }

  if (missingDataYear > 0) {
    issues.push({
      score, subjectGroup, type: 'info', category: '数据年份缺失',
      message: `${missingDataYear}/${allItems.length}条记录缺少data_year`,
    });
  }

  if (missingTrend > 0) {
    issues.push({
      score, subjectGroup, type: 'warning', category: '趋势数据不一致',
      message: `${missingTrend}条记录有trend_direction但无trend数据`,
    });
  }

  // ─── 趋势数据检查 ───
  const noTrendItems = allItems.filter(i => !i.trend_direction);
  if (noTrendItems.length > allItems.length * 0.5) {
    issues.push({
      score, subjectGroup, type: 'info', category: '趋势数据少',
      message: `${noTrendItems.length}/${allItems.length}条记录无趋势数据（可能只有一年数据）`,
    });
  }

  // ─── 匹配分合理性检查 ───
  const lowScoreItems = allItems.filter(i => i.match_score <= 20);
  if (lowScoreItems.length > 0) {
    issues.push({
      score, subjectGroup, type: 'info', category: '低匹配分',
      message: `${lowScoreItems.length}条记录匹配分≤20`,
    });
  }
  // 匹配分不应超过100
  const overMaxScore = allItems.filter(i => i.match_score > 100);
  if (overMaxScore.length > 0) {
    issues.push({
      score, subjectGroup, type: 'error', category: '匹配分超限',
      message: `${overMaxScore.length}条记录匹配分>100（算法bug）`,
    });
  }

  // ─── 数据年份分布 ───
  const yearDist: Record<number, number> = {};
  for (const item of allItems) {
    if (item.data_year) {
      yearDist[item.data_year] = (yearDist[item.data_year] || 0) + 1;
    }
  }
  const oldestYear = Math.min(...Object.keys(yearDist).map(Number));
  if (oldestYear < 2022) {
    const oldCount = Object.entries(yearDist)
      .filter(([yr]) => Number(yr) < 2022)
      .reduce((s, [, c]) => s + c, 0);
    if (oldCount > allItems.length * 0.3) {
      issues.push({
        score, subjectGroup, type: 'warning', category: '数据过旧',
        message: `${oldCount}/${allItems.length}条记录数据早于2022年（最老${oldestYear}年），可能不准确`,
      });
    }
  }

  // 记录所有issues
  for (const issue of issues) {
    allIssues.push(issue);
  }

  return {
    score,
    subjectGroup,
    totalResults: allItems.length,
    冲: result.冲.length,
    稳: result.稳.length,
    保: result.保.length,
    issues,
    uniqueSchools: new Set(allItems.map(i => i.school.id)).size,
    duplicateMajors,
    missingDataYear,
    missingTrend,
    riskTagGreen,
    riskTagRed,
    negativeMatchedScore,
  };
}

// ─── 执行测试 ───
for (const subjectGroup of SUBJECT_GROUPS) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📚 ${subjectGroup}`);
  console.log(`${'─'.repeat(70)}`);

  for (const score of SCORES) {
    const result = runTest(score, subjectGroup);
    allResults.push(result);

    const issueCount = result.issues.length;
    const icon = issueCount === 0 ? '✅' : issueCount <= 2 ? '⚠️' : '🔴';

    console.log(
      `${icon} ${score}分 → ` +
      `冲${result.冲}·稳${result.稳}·保${result.保} (共${result.totalResults}条·${result.uniqueSchools}校) ` +
      `${issueCount > 0 ? `[${issueCount}个问题]` : ''}`
    );

    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        const typeIcon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${typeIcon} [${issue.category}] ${issue.message}`);
      }
    }
  }
}

// ─── 汇总报告 ───
console.log(`\n${'='.repeat(70)}`);
console.log('📊 汇总报告');
console.log('='.repeat(70));

const errors = allIssues.filter(i => i.type === 'error');
const warnings = allIssues.filter(i => i.type === 'warning');
const infos = allIssues.filter(i => i.type === 'info');

console.log(`\n总计: ${allIssues.length}个问题 (${errors.length}错误, ${warnings.length}警告, ${infos.length}信息)`);

// 按类别汇总
const byCategory = new Map<string, TestIssue[]>();
for (const issue of allIssues) {
  const arr = byCategory.get(issue.category) || [];
  arr.push(issue);
  byCategory.set(issue.category, arr);
}

console.log('\n按类别分组:');
for (const [cat, items] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${items.length}x [${cat}]`);
  // 显示前3个示例
  for (const item of items.slice(0, 3)) {
    console.log(`    - ${item.score}分 ${item.subjectGroup}: ${item.message}`);
  }
  if (items.length > 3) console.log(`    ... 还有${items.length - 3}条`);
}

// ─── 全局数据质量检查 ───
console.log(`\n${'─'.repeat(70)}`);
console.log('🔬 全局数据质量检查');
console.log(`${'─'.repeat(70)}`);

// 检查所有学校的记录年份
const schoolYears = new Map<number, number[]>();
for (const r of allRecords) {
  const yrs = schoolYears.get(r.school_id) || [];
  if (!yrs.includes(r.year)) yrs.push(r.year);
  schoolYears.set(r.school_id, yrs);
}
const multiYearSchools = [...schoolYears.values()].filter(y => y.length >= 3).length;
console.log(`  ≥3年数据学校: ${multiYearSchools}/${schoolYears.size}`);

// 年份分布
const yearCount: Record<number, number> = {};
for (const r of allRecords) {
  yearCount[r.year] = (yearCount[r.year] || 0) + 1;
}
console.log('  年份分布:');
for (const [yr, cnt] of Object.entries(yearCount).sort((a, b) => Number(b) - Number(a))) {
  const icon = Number(yr) === 2024 ? '❌ 缺失!' : Number(yr) === 2025 ? '⚠️ 极少' : '';
  console.log(`    ${yr}年: ${cnt}条 ${icon}`);
}

// 选科分布
const subjectCount: Record<string, number> = {};
for (const r of allRecords) {
  subjectCount[r.subject_group] = (subjectCount[r.subject_group] || 0) + 1;
}
console.log('  选科分布:');
for (const [sg, cnt] of Object.entries(subjectCount)) {
  console.log(`    ${sg}: ${cnt}条`);
}

// 检查 risk-labels 的双重匹配
console.log('\n  风险标签检查:');
const testMajors = [
  '法学', '应用心理学', '计算机科学与技术', '软件工程',
  '历史学', '工商管理', '临床医学', '金融学', '旅游管理',
  '英语', '人工智能', '土木工程', '会计学',
];
for (const major of testMajors) {
  const labels = getRiskLabels(major);
  const typeIcons = labels.map(l => l.type === 'green' ? '🟢' : l.type === 'red' ? '🔴' : '🟡');
  console.log(`    "${major}" → ${typeIcons.join('')} ${labels.map(l => l.label).join(', ') || '(无标签)'}`);
}

// 检查分数-位次对应关系
console.log('\n  分数-位次对应检查:');
for (const score of [500, 550, 600, 650, 700]) {
  for (const sg of SUBJECT_GROUPS) {
    const rank = getMockRank(score, sg);
    const estimatedScore = rankToEstimatedScore(rank, sg);
    const pos = analyzeScorePosition(score, sg);
    const trendIcon = estimatedScore
      ? Math.abs(estimatedScore - score) <= 10 ? '✅' : '⚠️'
      : '❓';
    console.log(`    ${trendIcon} ${score}分 ${sg}: 位次≈${rank} · ${pos.summary}`);
  }
}

console.log(`\n${'='.repeat(70)}`);
const totalErrors = allIssues.filter(i => i.type === 'error').length;
const totalWarnings = allIssues.filter(i => i.type === 'warning').length;
const totalInfos = allIssues.filter(i => i.type === 'info').length;
console.log(`✅ 测试完成: ${totalErrors} errors, ${totalWarnings} warnings, ${totalInfos} info`);
console.log('='.repeat(70));
