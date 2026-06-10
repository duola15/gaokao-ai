import { NextRequest, NextResponse } from 'next/server';
import { buildRecommendations, generateHistoricalSummary } from '@/lib/recommendation';
import { chat } from '@/lib/deepseek';
import { fillPrompt, RECOMMENDATION_PROMPT } from '@/lib/prompts';
import type { UserInput } from '@/lib/types';

/** AI 分析 —— 独立端点，前端拿到推荐数据后再调此接口 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { score, rank, province, subject_group, subjects, cities, major_direction } = body;

    if (!score || !rank) {
      return NextResponse.json({ error: '缺少分数/位次' }, { status: 400 });
    }

    const input: UserInput = {
      score: Number(score),
      rank: Number(rank),
      province: province || 'yunnan',
      subject_group: subject_group || '理工类',
      subjects: subjects || '',
      preferences: {
        cities: cities || [],
        major_direction: major_direction || '',
        exclude_types: [],
      },
    };

    // 跑推荐算法（纯内存运算，< 100ms）
    const { 冲, 稳, 保, allRecords } = buildRecommendations(input);
    const allItems = [...冲, ...稳, ...保];

    // 生成历史摘要
    const historicalSummary = generateHistoricalSummary(allItems, allRecords);
    const prompt = fillPrompt(RECOMMENDATION_PROMPT, {
      score: String(input.score),
      rank: String(input.rank),
      province: input.province === 'yunnan' ? '云南省' : input.province,
      subject_group: input.subject_group,
      subjects: input.subjects || '不限',
      preferred_cities: input.preferences.cities.join('、') || '不限',
      major_direction: input.preferences.major_direction || '不限',
      historical_data: historicalSummary,
    });

    const analysis = await chat(
      [{ role: 'user', content: prompt.slice(0, 6000) }],
      0.3,
    );

    return NextResponse.json({ analysis, generated_at: new Date().toISOString() });
  } catch (error: any) {
    console.error('AI分析失败:', error);
    const status = error?.status || error?.response?.status || 0;

    let fallback = '';
    if (status === 429) {
      fallback =
        `⚠️ AI 使用人数较多，暂时被限流。\n\n` +
        `不过没关系！推荐结果是基于位次差算法从云南省近5年真实录取数据计算的，比 AI 分析更准确可靠。\n\n` +
        `💡 建议：冲稳保比例 3:4:3，稍后刷新本页即可重新触发 AI 分析。`;
    } else {
      fallback =
        `⚠️ AI分析暂时不可用（${error?.message || '网络错误'}）。\n\n` +
        `推荐结果基于位次差算法，已按冲刺/稳妥/保底三级分类。\n` +
        `💡 建议：优先考虑标有"稳妥"且位次接近的学校。`;
    }

    return NextResponse.json({ analysis: fallback, generated_at: new Date().toISOString() });
  }
}
