/**
 * 各省历年批次线数据
 * 数据来源：
 *   - 2025: Imurs8/score2025 (中国教育在线)
 *   - 2021-2024: 后续补充
 */

export interface CutoffRecord {
  year: number;
  province: string;
  arts: number;    // 文科/历史类 一本线/本科线
  science: number; // 理科/物理类 一本线/本科线
}

/** 2025 年全国 31 省本科一批线 */
const CUTOFF_2025: CutoffRecord[] = [
  { year: 2025, province: '北京', arts: 430, science: 430 },
  { year: 2025, province: '天津', arts: 476, science: 476 },
  { year: 2025, province: '上海', arts: 402, science: 402 },
  { year: 2025, province: '重庆', arts: 438, science: 425 },
  { year: 2025, province: '河北', arts: 477, science: 459 },
  { year: 2025, province: '山西', arts: 443, science: 419 },
  { year: 2025, province: '内蒙古', arts: 418, science: 375 },
  { year: 2025, province: '辽宁', arts: 437, science: 367 },
  { year: 2025, province: '吉林', arts: 384, science: 340 },
  { year: 2025, province: '黑龙江', arts: 405, science: 360 },
  { year: 2025, province: '山东', arts: 441, science: 441 },
  { year: 2025, province: '江苏', arts: 482, science: 463 },
  { year: 2025, province: '浙江', arts: 490, science: 490 },
  { year: 2025, province: '江西', arts: 486, science: 429 },
  { year: 2025, province: '福建', arts: 450, science: 441 },
  { year: 2025, province: '安徽', arts: 477, science: 461 },
  { year: 2025, province: '河南', arts: 471, science: 427 },
  { year: 2025, province: '湖南', arts: 446, science: 405 },
  { year: 2025, province: '湖北', arts: 442, science: 426 },
  { year: 2025, province: '海南', arts: 480, science: 480 },
  { year: 2025, province: '广东', arts: 464, science: 436 },
  { year: 2025, province: '广西', arts: 402, science: 370 },
  { year: 2025, province: '四川', arts: 467, science: 438 },
  { year: 2025, province: '云南', arts: 465, science: 430 },
  { year: 2025, province: '贵州', arts: 458, science: 387 },
  { year: 2025, province: '西藏', arts: 410, science: 400 },
  { year: 2025, province: '陕西', arts: 414, science: 394 },
  { year: 2025, province: '甘肃', arts: 412, science: 374 },
  { year: 2025, province: '宁夏', arts: 404, science: 372 },
  { year: 2025, province: '青海', arts: 405, science: 350 },
  { year: 2025, province: '新疆', arts: 451, science: 421 },
];

/** 云南省 2021-2025 一本线（历年参考，从公开数据汇总） */
const YUNNAN_CUTOFF_HISTORY: CutoffRecord[] = [
  { year: 2021, province: '云南', arts: 565, science: 520 },
  { year: 2022, province: '云南', arts: 575, science: 515 },
  { year: 2023, province: '云南', arts: 530, science: 485 },
  { year: 2024, province: '云南', arts: 550, science: 505 },
  ...CUTOFF_2025.filter((r) => r.province === '云南'),
];

/** 获取某省某年的批次线（先查2025全量，再查云南历年） */
export function getCutoff(
  province: string,
  year: number,
): CutoffRecord | undefined {
  // 先查2025年全量数据
  const from2025 = CUTOFF_2025.find((r) => r.province === province && r.year === year);
  if (from2025) return from2025;
  // 再查云南历年数据
  if (province === '云南') {
    return YUNNAN_CUTOFF_HISTORY.find((r) => r.year === year);
  }
  return undefined;
}

/** 获取云南省的批次线 */
export function getYunnanCutoff(year: number): CutoffRecord | undefined {
  return YUNNAN_CUTOFF_HISTORY.find((r) => r.year === year);
}

/** 获取云南历年批次线 */
export function getYunnanCutoffHistory(): CutoffRecord[] {
  return [...YUNNAN_CUTOFF_HISTORY].sort((a, b) => b.year - a.year);
}

/**
 * 判断考生分数在云南省的水平定位
 * @param score 考生分数
 * @param subjectGroup '理工类' 或 '文史类'
 * @returns 定位文本 + 与本一线差距
 */
export function analyzeScorePosition(
  score: number,
  subjectGroup: string,
): { level: string; diff: number; cutoff: number; summary: string } {
  const cutoff2025 = getYunnanCutoff(2025);
  if (!cutoff2025) return { level: '未知', diff: 0, cutoff: 0, summary: '' };

  const isScience = subjectGroup.includes('理');
  const cutoffScore = isScience ? cutoff2025.science : cutoff2025.arts;
  const diff = score - cutoffScore;

  let level: string;
  if (diff >= 60) level = '一本线上高分段';
  else if (diff >= 30) level = '一本线上中高分段';
  else if (diff >= 0) level = '一本线附近';
  else if (diff >= -30) level = '一本线下，二本高分段';
  else level = '二本中分段';

  const diffText =
    diff >= 0
      ? `高于2025年一本线${diff}分`
      : `低于2025年一本线${Math.abs(diff)}分`;

  const lineName = isScience ? '理科一本线' : '文科一本线';

  return {
    level,
    diff,
    cutoff: cutoffScore,
    summary: `2025年云南省${lineName}为${cutoffScore}分，考生分数${score}分（${diffText}），定位：${level}。`,
  };
}
