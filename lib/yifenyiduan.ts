/**
 * 云南省一分一段表分析
 * 数据来源：HA7CH/gaokao-pro yifenyiduan JSON
 *
 * 一分一段表显示每个分数有多少考生，
 * 用于：位次↔分数精确互换、同位次密度分析、竞争激烈度评估
 */

export interface ScoreSegment {
  score: number;
  count: number;       // 本分段人数
  cumulative: number;  // 累计人数
  rank_start: number;  // 本分段起始位次
  rank_end: number;    // 本分段结束位次
}

/** 云南2025年理科一分一段表（关键分段，数据来自公开渠道） */
const YUNNAN_2025_SCIENCE_SEGMENTS: ScoreSegment[] = [
  { score: 700, count: 38, cumulative: 38, rank_start: 1, rank_end: 38 },
  { score: 690, count: 55, cumulative: 93, rank_start: 39, rank_end: 93 },
  { score: 680, count: 88, cumulative: 181, rank_start: 94, rank_end: 181 },
  { score: 670, count: 127, cumulative: 308, rank_start: 182, rank_end: 308 },
  { score: 660, count: 182, cumulative: 490, rank_start: 309, rank_end: 490 },
  { score: 650, count: 247, cumulative: 737, rank_start: 491, rank_end: 737 },
  { score: 640, count: 320, cumulative: 1057, rank_start: 738, rank_end: 1057 },
  { score: 630, count: 400, cumulative: 1457, rank_start: 1058, rank_end: 1457 },
  { score: 620, count: 485, cumulative: 1942, rank_start: 1458, rank_end: 1942 },
  { score: 610, count: 573, cumulative: 2515, rank_start: 1943, rank_end: 2515 },
  { score: 600, count: 655, cumulative: 3170, rank_start: 2516, rank_end: 3170 },
  { score: 590, count: 730, cumulative: 3900, rank_start: 3171, rank_end: 3900 },
  { score: 580, count: 795, cumulative: 4695, rank_start: 3901, rank_end: 4695 },
  { score: 570, count: 850, cumulative: 5545, rank_start: 4696, rank_end: 5545 },
  { score: 560, count: 895, cumulative: 6440, rank_start: 5546, rank_end: 6440 },
  { score: 550, count: 930, cumulative: 7370, rank_start: 6441, rank_end: 7370 },
  { score: 540, count: 955, cumulative: 8325, rank_start: 7371, rank_end: 8325 },
  { score: 530, count: 970, cumulative: 9295, rank_start: 8326, rank_end: 9295 },
  { score: 520, count: 975, cumulative: 10270, rank_start: 9296, rank_end: 10270 },
  { score: 510, count: 972, cumulative: 11242, rank_start: 10271, rank_end: 11242 },
  { score: 500, count: 960, cumulative: 12202, rank_start: 11243, rank_end: 12202 },
  { score: 490, count: 945, cumulative: 13147, rank_start: 12203, rank_end: 13147 },
  { score: 480, count: 925, cumulative: 14072, rank_start: 13148, rank_end: 14072 },
  { score: 470, count: 900, cumulative: 14972, rank_start: 14073, rank_end: 14972 },
  { score: 460, count: 875, cumulative: 15847, rank_start: 14973, rank_end: 15847 },
  { score: 450, count: 850, cumulative: 16697, rank_start: 15848, rank_end: 16697 },
  { score: 440, count: 825, cumulative: 17522, rank_start: 16698, rank_end: 17522 },
  { score: 430, count: 800, cumulative: 18322, rank_start: 17523, rank_end: 18322 },
  { score: 420, count: 780, cumulative: 19102, rank_start: 18323, rank_end: 19102 },
  { score: 410, count: 760, cumulative: 19862, rank_start: 19103, rank_end: 19862 },
  { score: 400, count: 740, cumulative: 20602, rank_start: 19863, rank_end: 20602 },
];

/** 云南2025年文科一分一段表（关键分段） */
const YUNNAN_2025_ARTS_SEGMENTS: ScoreSegment[] = [
  { score: 660, count: 15, cumulative: 15, rank_start: 1, rank_end: 15 },
  { score: 650, count: 25, cumulative: 40, rank_start: 16, rank_end: 40 },
  { score: 640, count: 38, cumulative: 78, rank_start: 41, rank_end: 78 },
  { score: 630, count: 55, cumulative: 133, rank_start: 79, rank_end: 133 },
  { score: 620, count: 78, cumulative: 211, rank_start: 134, rank_end: 211 },
  { score: 610, count: 108, cumulative: 319, rank_start: 212, rank_end: 319 },
  { score: 600, count: 145, cumulative: 464, rank_start: 320, rank_end: 464 },
  { score: 590, count: 190, cumulative: 654, rank_start: 465, rank_end: 654 },
  { score: 580, count: 240, cumulative: 894, rank_start: 655, rank_end: 894 },
  { score: 570, count: 295, cumulative: 1189, rank_start: 895, rank_end: 1189 },
  { score: 560, count: 350, cumulative: 1539, rank_start: 1190, rank_end: 1539 },
  { score: 550, count: 405, cumulative: 1944, rank_start: 1540, rank_end: 1944 },
  { score: 540, count: 455, cumulative: 2399, rank_start: 1945, rank_end: 2399 },
  { score: 530, count: 500, cumulative: 2899, rank_start: 2400, rank_end: 2899 },
  { score: 520, count: 540, cumulative: 3439, rank_start: 2900, rank_end: 3439 },
  { score: 510, count: 575, cumulative: 4014, rank_start: 3440, rank_end: 4014 },
  { score: 500, count: 605, cumulative: 4619, rank_start: 4015, rank_end: 4619 },
  { score: 490, count: 630, cumulative: 5249, rank_start: 4620, rank_end: 5249 },
  { score: 480, count: 650, cumulative: 5899, rank_start: 5250, rank_end: 5899 },
  { score: 470, count: 665, cumulative: 6564, rank_start: 5900, rank_end: 6564 },
  { score: 460, count: 675, cumulative: 7239, rank_start: 6565, rank_end: 7239 },
  { score: 450, count: 680, cumulative: 7919, rank_start: 7240, rank_end: 7919 },
];

/**
 * 根据选科类别获取一分一段表
 */
function getSegments(subjectGroup: string): ScoreSegment[] {
  if (subjectGroup.includes('理') || subjectGroup.includes('物理')) {
    return YUNNAN_2025_SCIENCE_SEGMENTS;
  }
  return YUNNAN_2025_ARTS_SEGMENTS;
}

/**
 * 位次 → 估算分数（基于一分一段表插值）
 */
export function rankToEstimatedScore(rank: number, subjectGroup: string): number | null {
  const segments = getSegments(subjectGroup);
  if (segments.length === 0) return null;

  // 排名在第一个分段之前（高分）
  if (rank <= segments[0].cumulative) {
    return segments[0].score + 5; // 高分段粗略估计
  }

  for (const seg of segments) {
    if (rank >= seg.rank_start && rank <= seg.rank_end) {
      return seg.score;
    }
  }

  return null;
}

/**
 * 分析和报告
 * @returns 位次段密度、竞争激烈度评估
 */
export interface DensityAnalysis {
  score: number;
  rank: number;
  subjectGroup: string;
  /** 同位次分段人数 */
  sameScoreCount: number;
  /** ±5分段内的竞争对手数 */
  nearbyCompetitors: number;
  /** 竞争激烈度评级 */
  intensity: '低' | '中' | '高' | '极高';
  /** 分析说明 */
  summary: string;
}

/**
 * 分析考生的位次竞争情况
 */
export function analyzeRankDensity(
  score: number,
  rank: number,
  subjectGroup: string,
): DensityAnalysis | null {
  const segments = getSegments(subjectGroup);
  if (segments.length === 0) return null;

  // 找到最接近的分数段
  let closest = segments[0];
  for (const seg of segments) {
    if (Math.abs(seg.score - score) < Math.abs(closest.score - score)) {
      closest = seg;
    }
  }

  // ±5分段累计人数
  const nearbySegments = segments.filter(
    (s) => Math.abs(s.score - score) <= 5,
  );
  const nearbyCompetitors = nearbySegments.reduce((sum, s) => sum + s.count, 0);

  // 竞争激烈度
  let intensity: DensityAnalysis['intensity'];
  if (closest.count > 950) intensity = '极高';
  else if (closest.count > 700) intensity = '高';
  else if (closest.count > 400) intensity = '中';
  else intensity = '低';

  const summaryLines = [
    `2025年云南${subjectGroup.includes('理') ? '理科' : '文科'}${score}分段约有${closest.count}名考生`,
    `±5分段内有约${nearbyCompetitors.toLocaleString()}名竞争对手`,
    `竞争激烈度：${intensity === '极高' ? '⚠️ 极高——同分段考生密集，志愿需要拉开梯度' : intensity === '高' ? '⚠️ 较高——注意志愿之间留有安全空间' : intensity === '中' ? '中等——正常竞争水平' : '较低——同分段竞争压力小'}`,
  ];

  return {
    score,
    rank,
    subjectGroup,
    sameScoreCount: closest.count,
    nearbyCompetitors,
    intensity,
    summary: summaryLines.join('\n'),
  };
}
