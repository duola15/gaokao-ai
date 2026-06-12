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
 */
function getDynamicTierThreshold(rank: number): number {
  return Math.min(2000, Math.max(300, Math.round(rank * 0.5)));
}

/**
 * 可达性检查：考生是否有合理可能冲刺该学校
 *
 * 分档规则（冲的本质是"博一把"，不应过于保守）：
 *   位次 < 1000   → maxGap = studentRank × 1.0（顶尖段，百名差很大，允许冲比自高一倍的学校）
 *   位次 1000-5000  → maxGap = studentRank × 0.7（高分段）
 *   位次 5000-20000 → maxGap = studentRank × 0.5（中分段）
 *   位次 > 20000  → maxGap = min(studentRank × 0.4, 15000)（中低分段）
 *
 * 只排除完全不可能的学校（如排名15000的考生冲排名253的浙大）
 */
function isReachable(studentRank: number, schoolRank: number): boolean {
  if (schoolRank >= studentRank) return true; // 学校差于考生 → 永远可达

  const gap = studentRank - schoolRank; // 正向，越大越难

  let maxGap: number;
  if (studentRank < 1000) {
    maxGap = studentRank * 1.0;        // rank 800 → maxGap 800, 可达 rank 0+（全部）
  } else if (studentRank < 5000) {
    maxGap = studentRank * 0.7;        // rank 3000 → maxGap 2100, 可达 rank 900+
  } else if (studentRank < 20000) {
    maxGap = studentRank * 0.5;        // rank 15000 → maxGap 7500, 可达 rank 7500+
  } else {
    maxGap = Math.min(studentRank * 0.4, 15000); // rank 40000 → maxGap 15000, 可达 rank 25000+
  }

  return gap <= maxGap;
}

/**
 * 获取学校的代表性录取位次（中位数）
 *
 * 使用 avg_rank（优先）或 min_rank（回退），取中位数。
 * 中位数比平均数更稳定，不被极端高/低位次的专业拉偏。
 * 偶数长度时取偏上中位数（Math.floor(n * 0.5)），略微保守。
 *
 * 例如：[1200, 1500, 1800, 2200] → 取第 2 个（1800），而非第1个（1500）。
 * 这保证了代表性位次不会因为一两个极低分专业而大幅下降。
 */
function getSchoolRepresentativeRank(records: AdmissionRecord[]): number {
  const ranks = records
    .map(r => r.avg_rank > 0 ? r.avg_rank : r.min_rank)
    .filter(r => r > 0)
    .sort((a, b) => a - b);
  if (ranks.length === 0) return Infinity;
  // 偏上中位数：偶数时取上侧，确保"学校档次"不被低分专业拉低
  // 索引 = floor(n * 0.5)，例如 n=4 时取索引2（第3个），n=3 时取索引1（第2个）
  return ranks[Math.floor(ranks.length * 0.5)];
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

  // 单年数据无法判断趋势，返回 stable 供调用方自行处理
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

  // ═══════════════════════════════════════════════════════════
  // 第1步：筛选同省份+同选科的候选记录
  // ═══════════════════════════════════════════════════════════
  const candidateRecords = allRecords.filter(
    (r) =>
      r.province_code === input.province &&
      r.subject_group === input.subject_group
  );

  // 按学校分组（全部年份）
  const schoolAllRecords = new Map<number, AdmissionRecord[]>();
  for (const r of candidateRecords) {
    const arr = schoolAllRecords.get(r.school_id) || [];
    arr.push(r);
    schoolAllRecords.set(r.school_id, arr);
  }

  // ═══════════════════════════════════════════════════════════
  // 第2步：每校取最新年份数据，计算代表性位次
  // ═══════════════════════════════════════════════════════════
  interface SchoolAggregate {
    school: School;
    latestYear: number;
    latestRecords: AdmissionRecord[];
    representativeRank: number;   // 中位数（avg_rank优先，min_rank回退）
    allSchoolRecs: AdmissionRecord[];
  }

  const aggregates: SchoolAggregate[] = [];

  for (const [schoolId, allRecs] of schoolAllRecords) {
    const school = allSchools.find((s) => s.id === schoolId);
    if (!school) continue;

    // 最新年份
    const latestYear = Math.max(...allRecs.map(r => r.year));
    const latestRecords = allRecs.filter(r => r.year === latestYear);
    if (latestRecords.length === 0) continue;

    const representativeRank = getSchoolRepresentativeRank(latestRecords);
    if (representativeRank === Infinity) continue; // 无有效位次

    aggregates.push({
      school,
      latestYear,
      latestRecords,
      representativeRank,
      allSchoolRecs: allRecs,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 第3步：可达性过滤 + 分 tier
  // ═══════════════════════════════════════════════════════════
  const threshold = getDynamicTierThreshold(input.rank);
  const tiered: { tier: RecommendationTier; agg: SchoolAggregate; rankDiff: number }[] = [];

  for (const agg of aggregates) {
    const rankDiff = agg.representativeRank - input.rank;

    // 不可达：完全够不着的学校直接排除
    if (!isReachable(input.rank, agg.representativeRank)) continue;

    // 判定层级（严格单层：每校只归入一个 tier）
    let tier: RecommendationTier;
    if (rankDiff < -threshold) {
      tier = '冲';
    } else if (rankDiff >= -threshold && rankDiff <= threshold) {
      tier = '稳';
    } else {
      tier = '保';
    }

    tiered.push({ tier, agg, rankDiff });
  }

  // ═══════════════════════════════════════════════════════════
  // 第4步：每校选最佳专业 → 构建 RecommendationItem
  //
  // 最佳专业选择策略（优先级从高到低）：
  //   1. 专业方向匹配（用户偏好是第一优先级；精确匹配 > 模糊）
  //   2. 位次接近度（优先展示更容易考上的专业）
  //   3. 风险标签（绿牌 > 黄牌 > 红牌）
  //
  // 重要：此处 risk label 仅用于"选择"最佳展示专业。
  //       最终 matchScore 在下方统一计算一次，杜绝双算。
  // ═══════════════════════════════════════════════════════════
  const results: RecommendationItem[] = [];

  for (const { tier, agg, rankDiff } of tiered) {
    // ── 4a. 选择最佳展示专业 ──
    let bestMajorRecord = agg.latestRecords[0];
    let bestMajorScore = -Infinity;

    for (const rec of agg.latestRecords) {
      let score = 0;

      // 专业方向匹配（第一优先级）
      if (input.preferences.major_direction) {
        const dir = input.preferences.major_direction.toLowerCase();
        const majorLower = rec.major_name.toLowerCase();
        if (majorLower === dir) {
          score += 30; // 精确匹配
        } else if (majorLower.includes(dir)) {
          score += 15; // 模糊匹配（如"计算机/人工智能"匹配"计算机科学与技术"）
        }
      }

      // 位次接近度：优先展示更接近考生位次的专业（更容易考上）
      const recRank = rec.avg_rank > 0 ? rec.avg_rank : rec.min_rank;
      if (recRank > 0) {
        const bestRank = bestMajorRecord.avg_rank > 0 ? bestMajorRecord.avg_rank : bestMajorRecord.min_rank;
        if (Math.abs(recRank - input.rank) < Math.abs(bestRank - input.rank) + 3000) {
          score += 3;
        }
      }

      // 风险标签（用于选专业——选择更安全的专业展示）
      const tags = getRiskLabels(rec.major_name);
      for (const t of tags) {
        if (t.type === 'green') score += 8;
        else if (t.type === 'red') score -= 12;
        // 黄牌不加减分，仅作为参考标签
      }

      if (score > bestMajorScore) {
        bestMajorScore = score;
        bestMajorRecord = rec;
      }
    }

    // ── 4b. 计算最终匹配分 ──
    //
    // 权重组成为（满分100，各项可叠加）：
    //
    //   【数据基础】
    //   50 × yearWeight                         — 年份越新分越高
    //
    //   【位次匹配】
    //   |rankDiff| < 500   →  +30 × yearWeight  — 位次非常接近
    //   |rankDiff| < 1000  →  +20 × yearWeight  — 位次较接近
    //   |rankDiff| < 2000  →  +10 × yearWeight  — 位次勉强接近
    //
    //   【偏好匹配】
    //   专业方向匹配       →  +15               — 用户偏好专业
    //   城市偏好           →  +10               — 用户偏好城市（精确字符串匹配）
    //
    //   【风险与趋势】
    //   绿牌专业           →   +8               — 就业前景好
    //   红牌专业           →  -12               — 就业预警
    //   冲刺+趋势向下(变易) →   +5               — 冲刺成功率上升
    //   冲刺+趋势向上(变难) →   -3               — 冲刺成功率下降
    //   保底+趋势向上(变难) →   -5               — 保底安全性下降
    //
    //   【惩罚】
    //   排除类型           →  -50               — 沉底但不移除

    const yw = yearWeight(agg.latestYear);
    let matchScore = 50 * yw;

    // 位次接近度加分
    if (Math.abs(rankDiff) < 500) matchScore += 30 * yw;
    else if (Math.abs(rankDiff) < 1000) matchScore += 20 * yw;
    else if (Math.abs(rankDiff) < 2000) matchScore += 10 * yw;

    // 专业方向匹配
    if (input.preferences.major_direction) {
      const dir = input.preferences.major_direction.toLowerCase();
      if (bestMajorRecord.major_name.toLowerCase().includes(dir)) matchScore += 15;
    }

    // 城市偏好（精确匹配：拆分学校城市字段，避免"西安"误匹配"西安区"等子串）
    if (input.preferences.cities?.some((c) => {
      const schoolCities = agg.school.city.split(/[,，、\s]+/).filter(Boolean);
      return schoolCities.some(sc => sc === c || c === sc);
    })) {
      matchScore += 10;
    }

    // 排除类型（大幅扣分沉底，但不移除——用户可自行判断）
    if (input.preferences.exclude_types?.includes(agg.school.school_type)) {
      matchScore -= 50;
    }

    // 趋势影响
    const { trend, direction } = computeTrend(agg.allSchoolRecs, agg.school.id);
    if (tier === '冲' && direction === 'down') matchScore += 5;   // 录取变易→冲刺更有希望
    else if (tier === '冲' && direction === 'up') matchScore -= 3; // 录取变难→冲刺更困难
    else if (tier === '保' && direction === 'up') matchScore -= 5; // 保底变难→可能不再安全

    // 风险标签（★ 唯一计算点——此处只计一次分）
    const riskTags: RiskTag[] = getRiskLabels(bestMajorRecord.major_name).map(rt => ({
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
      school: agg.school,
      major: bestMajorRecord,
      tier,
      rank_diff: rankDiff,
      match_score: matchScore,
      risk_tags: riskTags.length > 0 ? riskTags : undefined,
      trend: trend.length >= 2 ? trend : undefined,
      trend_direction: trend.length >= 2 ? direction : undefined,
      data_year: agg.latestYear,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 第5步：分类排序（同一学校只出现一次，严格单层级）
  // ═══════════════════════════════════════════════════════════
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
