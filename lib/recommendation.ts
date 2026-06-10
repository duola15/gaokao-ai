import { AdmissionRecord, RecommendationItem, RecommendationTier, School, UserInput } from './types';
import { getAllAdmissionRecords, allSchools } from './seed_data';

/** 解析学校 description JSON 字符串为标签数组 */
export function parseDescription(desc: string): string[] {
  if (!desc) return [];
  try {
    const arr = JSON.parse(desc);
    return Array.isArray(arr) ? arr : [];
  } catch {
    // 不是 JSON，尝试按逗号/换行分割
    return desc.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
  }
}

const RANK_TIER_THRESHOLD = 2000; // 位次差阈值

export function buildRecommendations(input: UserInput): {
  冲: RecommendationItem[];
  稳: RecommendationItem[];
  保: RecommendationItem[];
  allRecords: AdmissionRecord[];
} {
  const allRecords = getAllAdmissionRecords();

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
    const school = allSchools.find((s) => s.id === record.school_id);
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

/** 生成历史数据摘要文本供 AI 分析（严格控制长度） */
export function generateHistoricalSummary(
  items: RecommendationItem[],
  allRecords: AdmissionRecord[]
): string {
  const topItems = items.slice(0, 8); // 最多8所学校
  const schoolIds = new Set(topItems.map((i) => i.school.id));
  // 仅保留 2023-2025 数据，进一步缩短
  const relevantRecords = allRecords.filter(
    (r) => schoolIds.has(r.school_id) && r.year >= 2023
  );

  const lines: string[] = [];
  for (const item of topItems.slice(0, 6)) {
    const school = item.school;
    const schoolRecords = relevantRecords
      .filter((r) => r.school_id === school.id)
      .sort((a, b) => b.year - a.year)
      .slice(0, 5); // 每校最多5条

    if (schoolRecords.length === 0) continue;

    lines.push(`\n【${school.name}】${school.school_type}·${school.city}`);
    for (const r of schoolRecords) {
      lines.push(`  ${r.year}年 ${r.major_name.slice(0,20)}：最低${r.min_score}分/位次${r.min_rank}`);
    }
  }

  return lines.join('\n') || '（暂无历史数据）';
}
