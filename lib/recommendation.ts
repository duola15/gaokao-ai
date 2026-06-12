import { AdmissionRecord, RecommendationItem, RecommendationTier, RiskTag, TrendPoint, School, UserInput } from './types';
import { getAllAdmissionRecords, allSchools } from './seed_data';
import { getRiskLabels } from './risk-labels';

/** 解析学校 description JSON 字符串为标签数组 */
export function parseDescription(desc: string): string[] {
  if (!desc) return [];
  try {
    const arr = JSON.parse(desc);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return desc.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
  }
}

/** 年份衰减权重：越近年份权重越高 */
function yearWeight(year: number): number {
  const weights: Record<number, number> = {
    2025: 1.00,
    2024: 0.95, // 如果有2024数据
    2023: 0.85,
    2022: 0.70,
    2021: 0.55,
    2020: 0.40,
    2019: 0.30,
    2018: 0.20,
    2017: 0.15,
  };
  return weights[year] || 0.10;
}

/**
 * 动态位次差阈值
 * 对于高位次（顶尖考生），名校之间位次差很小但竞争激烈，需缩小阈值
 * 对于低位次（普通考生），位次差较大，保持2000阈值
 *
 * 公式：threshold = min(2000, max(300, rank × 0.5))
 *
 * 示例：
 *   位次100  → 阈值300   (只需差300名即可冲刺）
 *   位次800  → 阈值400   (清华100 vs 考生800 → rankDiff=-700 < -400 → 冲)
 *   位次5000 → 阈值2000  (恢复默认)
 *   位次40000→ 阈值2000  (保持默认)
 */
function getDynamicTierThreshold(rank: number): number {
  return Math.min(2000, Math.max(300, Math.round(rank * 0.5)));
}

/** 计算趋势方向和斜率 */
function computeTrend(records: AdmissionRecord[], schoolId: number): {
  trend: TrendPoint[];
  direction: 'up' | 'down' | 'stable';
} {
  const schoolRecords = records
    .filter(r => r.school_id === schoolId && r.avg_rank > 0)
    .sort((a, b) => a.year - b.year);

  // 取最新3个年份
  const uniqueYears = [...new Set(schoolRecords.map(r => r.year))].sort((a, b) => b - a);
  const recentYears = uniqueYears.slice(0, 3).reverse(); // 升序

  const trend: TrendPoint[] = [];
  for (const year of recentYears) {
    const yearRecs = schoolRecords.filter(r => r.year === year);
    if (yearRecs.length === 0) continue;
    const avgRank = Math.round(yearRecs.reduce((s, r) => s + r.avg_rank, 0) / yearRecs.length);
    const minScore = Math.min(...yearRecs.map(r => r.min_score));
    trend.push({ year, min_score: minScore, avg_rank: avgRank });
  }

  if (trend.length < 2) return { trend, direction: 'stable' };

  // 计算位次变化：负值 = 位次变小 = 变难(up)，正值 = 位次变大 = 变易(down)
  const firstRank = trend[0].avg_rank;
  const lastRank = trend[trend.length - 1].avg_rank;
  const rankChange = firstRank - lastRank;

  // 位次变化超过5%视为趋势
  const threshold = firstRank * 0.05;
  let direction: 'up' | 'down' | 'stable';
  if (rankChange > threshold) direction = 'up';    // 录取位次上升(变难)
  else if (rankChange < -threshold) direction = 'down'; // 录取位次下降(变易)
  else direction = 'stable';

  return { trend, direction };
}

export function buildRecommendations(input: UserInput): {
  冲: RecommendationItem[];
  稳: RecommendationItem[];
  保: RecommendationItem[];
  allRecords: AdmissionRecord[];
} {
  const allRecords = getAllAdmissionRecords();

  // 筛选：同省份 + 同选科类别
  const candidateRecords = allRecords.filter(
    (r) =>
      r.province_code === input.province &&
      r.subject_group === input.subject_group
  );

  // 按学校+年份分组，收集全部年份数据用于趋势分析
  const schoolAllRecords = new Map<number, AdmissionRecord[]>();
  for (const r of candidateRecords) {
    const arr = schoolAllRecords.get(r.school_id) || [];
    arr.push(r);
    schoolAllRecords.set(r.school_id, arr);
  }

  // 取每所学校最新年份的数据（同时保留全部年份用于趋势分析）
  const schoolLatestYear = new Map<number, number>();
  for (const r of candidateRecords) {
    const cur = schoolLatestYear.get(r.school_id) || 0;
    if (r.year > cur) schoolLatestYear.set(r.school_id, r.year);
  }

  const matched = candidateRecords.filter(
    (r) => r.year === schoolLatestYear.get(r.school_id)
  );

  const results: RecommendationItem[] = [];

  for (const record of matched) {
    const school = allSchools.find((s) => s.id === record.school_id);
    if (!school) continue;

    // 计算位次差：学校录取位次 - 考生位次
    const rankDiff = record.avg_rank - input.rank;

    // 判定层级（动态阈值：高位次缩小，低位次保持2000）
    const threshold = getDynamicTierThreshold(input.rank);
    let tier: RecommendationTier;
    if (rankDiff < -threshold) {
      tier = '冲';
    } else if (rankDiff >= -threshold && rankDiff <= threshold) {
      tier = '稳';
    } else {
      tier = '保';
    }

    // 年份衰减权重
    const yw = yearWeight(record.year);

    // 基础匹配分
    let matchScore = 50 * yw;

    // 位次越接近越高（对于稳的学校）
    if (Math.abs(rankDiff) < 500) matchScore += 30 * yw;
    else if (Math.abs(rankDiff) < 1000) matchScore += 20 * yw;
    else if (Math.abs(rankDiff) < 2000) matchScore += 10 * yw;

    // 专业方向匹配加分
    if (input.preferences.major_direction) {
      const dir = input.preferences.major_direction.toLowerCase();
      if (record.major_name.toLowerCase().includes(dir)) {
        matchScore += 15;
      }
    }

    // 城市偏好加分
    if (
      input.preferences.cities &&
      input.preferences.cities.some((c) => school.city.includes(c))
    ) {
      matchScore += 10;
    }

    // 排除类型
    if (input.preferences.exclude_types?.includes(school.school_type)) {
      matchScore -= 50;
    }

    // ─── P3-18: 趋势分析加分 ───
    const allSchoolRecs = schoolAllRecords.get(record.school_id) || [];
    const { trend, direction } = computeTrend(allSchoolRecs, record.school_id);

    if (tier === '冲' && direction === 'down') {
      // 冲刺校 + 录取位次在下降 = 越来越容易 → 加5分（捡漏机会）
      matchScore += 5;
    } else if (tier === '冲' && direction === 'up') {
      // 冲刺校 + 录取位次在上升 = 越来越难 → 减3分
      matchScore -= 3;
    } else if (tier === '保' && direction === 'up') {
      // 保底校 + 录取位次在上升 = 越来越难 → 减5分（可能不再安全）
      matchScore -= 5;
    }

    // ─── P2-11: 风险标签加分/减分 ───
    const riskTags: RiskTag[] = getRiskLabels(record.major_name).map(rt => ({
      type: rt.type,
      label: rt.label,
      description: rt.description,
    }));

    for (const tag of riskTags) {
      if (tag.type === 'green') matchScore += 8;
      else if (tag.type === 'red') matchScore -= 12;
    }

    matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));

    results.push({
      school,
      major: record,
      tier,
      rank_diff: rankDiff,
      match_score: matchScore,
      risk_tags: riskTags.length > 0 ? riskTags : undefined,
      trend: trend.length >= 2 ? trend : undefined,
      trend_direction: direction,
      data_year: record.year,
    });
  }

  // 分类汇总并按匹配分排序
  // P1-6: 扩充推荐数量——冲15+稳20+保15（共50条，支持45个平行志愿）
  const 冲 = results
    .filter((r) => r.tier === '冲')
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 15);

  const 稳 = results
    .filter((r) => r.tier === '稳')
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 20);

  const 保 = results
    .filter((r) => r.tier === '保')
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 15);

  return { 冲, 稳, 保, allRecords };
}

/** 生成历史数据摘要文本供 AI 分析（含趋势和风险标签） */
export function generateHistoricalSummary(
  items: RecommendationItem[],
  allRecords: AdmissionRecord[]
): string {
  const topItems = items.slice(0, 8);
  const schoolIds = new Set(topItems.map((i) => i.school.id));
  const availableYears = [...new Set(allRecords.map(r => r.year))].sort((a, b) => b - a);
  const recentYears = availableYears.slice(0, 3);
  const relevantRecords = allRecords.filter(
    (r) => schoolIds.has(r.school_id) && recentYears.includes(r.year)
  );

  const lines: string[] = [];
  for (const item of topItems.slice(0, 6)) {
    const school = item.school;
    const schoolRecords = relevantRecords
      .filter((r) => r.school_id === school.id)
      .sort((a, b) => b.year - a.year)
      .slice(0, 5);

    if (schoolRecords.length === 0) continue;

    lines.push(`\n【${school.name}】${school.school_type}·${school.city}`);
    for (const r of schoolRecords) {
      lines.push(`  ${r.year}年 ${r.major_name.slice(0, 20)}：最低${r.min_score}分/位次${r.min_rank}（权重${yearWeight(r.year).toFixed(2)}）`);
    }
  }

  return lines.join('\n') || '（暂无历史数据）';
}

export { yearWeight };
