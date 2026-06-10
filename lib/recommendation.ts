import { AdmissionRecord, RecommendationItem, RecommendationTier, School, UserInput } from './types';
import { getYunnanAdmissionRecords, yunnanSchools } from './seed_data';

const RANK_TIER_THRESHOLD = 2000; // 位次差阈值

export function buildRecommendations(input: UserInput): {
  冲: RecommendationItem[];
  稳: RecommendationItem[];
  保: RecommendationItem[];
  allRecords: AdmissionRecord[];
} {
  const allRecords = getYunnanAdmissionRecords();

  // 仅取 2025 年数据做推荐（最新）
  const records2025 = allRecords.filter((r) => r.year === 2025);

  // 筛选：同省份 + 同选科类别
  const matched = records2025.filter(
    (r) =>
      r.province_code === input.province &&
      r.subject_group === input.subject_group
  );

  const results: RecommendationItem[] = [];

  for (const record of matched) {
    const school = yunnanSchools.find((s) => s.id === record.school_id);
    if (!school) continue;

    // 计算位次差：学校平均录取位次 - 考生位次
    const rankDiff = record.avg_rank - input.rank;

    // 判定层级
    let tier: RecommendationTier;
    if (rankDiff > RANK_TIER_THRESHOLD) {
      tier = '稳'; // negative rankDiff means 学校录取位次更高（更难考），是冲刺
      // Actually: positive rankDiff = 学校录取位次比考生位次大 = 考生位次更好 = 保底
      // Let me reconsider:
      // rankDiff = 学校avg_rank - 考生rank
      // 如果 rankDiff > 0: 学校录取位次 > 考生位次 → 考生考得好，学校容易上 → 保底
      // 如果 rankDiff < 0: 学校录取位次 < 考生位次 → 学校要求更高 → 冲刺
    }

    if (rankDiff < -RANK_TIER_THRESHOLD) {
      tier = '冲';
    } else if (rankDiff >= -RANK_TIER_THRESHOLD && rankDiff <= RANK_TIER_THRESHOLD) {
      tier = '稳';
    } else {
      tier = '保';
    }

    // 计算匹配分 (0-100)
    let matchScore = 50;
    // 位次越接近越高（对于稳的学校）
    if (Math.abs(rankDiff) < 500) matchScore += 30;
    else if (Math.abs(rankDiff) < 1000) matchScore += 20;
    else if (Math.abs(rankDiff) < 2000) matchScore += 10;

    // 专业方向匹配加分
    if (input.preferences.major_direction) {
      const dir = input.preferences.major_direction.toLowerCase();
      if (
        record.major_name.toLowerCase().includes(dir)
      ) {
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

    matchScore = Math.max(0, Math.min(100, matchScore));

    results.push({
      school,
      major: record,
      tier,
      rank_diff: rankDiff,
      match_score: matchScore,
    });
  }

  // 分类汇总并按匹配分排序
  const 冲 = results
    .filter((r) => r.tier === '冲')
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 10);

  const 稳 = results
    .filter((r) => r.tier === '稳')
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 10);

  const 保 = results
    .filter((r) => r.tier === '保')
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 10);

  return { 冲, 稳, 保, allRecords };
}

/** 生成历史数据摘要文本供 AI 分析 */
export function generateHistoricalSummary(
  items: RecommendationItem[],
  allRecords: AdmissionRecord[]
): string {
  const schoolIds = new Set(items.map((i) => i.school.id));
  const relevantRecords = allRecords.filter((r) => schoolIds.has(r.school_id));

  const lines: string[] = [];
  for (const sid of schoolIds) {
    const school = yunnanSchools.find((s) => s.id === sid);
    if (!school) continue;
    const schoolRecords = relevantRecords.filter((r) => r.school_id === sid);
    const majorNames = [...new Set(schoolRecords.map((r) => r.major_name))];

    lines.push(`\n【${school.name}】（${school.school_type}，${school.city}）`);
    for (const major of majorNames) {
      const majorRecords = schoolRecords.filter((r) => r.major_name === major);
      const yearData = majorRecords
        .sort((a, b) => b.year - a.year)
        .map(
          (r) =>
            `${r.year}年: 最低分${r.min_score}/位次${r.min_rank}，平均分${r.avg_score}/位次${r.avg_rank}`
        )
        .join('；');
      lines.push(`  - ${major}：${yearData}`);
    }
  }

  return lines.join('\n');
}
