import { NextRequest } from 'next/server';
import { buildRecommendations, generateHistoricalSummary } from '@/lib/recommendation';
import { chatStream } from '@/lib/deepseek';
import { fillPrompt, RECOMMENDATION_PROMPT } from '@/lib/prompts';
import { analyzeScorePosition } from '@/lib/cutoff';
import type { UserInput } from '@/lib/types';

/**
 * AI 分析 —— 流式 SSE 响应
 * 前端拿推荐数据后调用，文字边生成边显示
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { score, rank, province, subject_group, subjects, cities, major_direction } = body;

    if (!score || !rank) {
      return new Response(JSON.stringify({ error: '缺少分数/位次' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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

    // 跑推荐算法
    const { 冲, 稳, 保, allRecords } = buildRecommendations(input);
    const allItems = [...冲, ...稳, ...保];

    // 历史摘要（进一步压缩：4校×3条）
    const historicalSummary = generateHistoricalSummary(allItems, allRecords);
    const position = analyzeScorePosition(input.score, input.subject_group);

    const prompt = fillPrompt(RECOMMENDATION_PROMPT, {
      score: String(input.score),
      rank: String(input.rank),
      province: input.province === 'yunnan' ? '云南省' : input.province,
      subject_group: input.subject_group,
      subjects: input.subjects || '不限',
      preferred_cities: input.preferences.cities.join('、') || '不限',
      major_direction: input.preferences.major_direction || '不限',
      cutoff_info: position.summary,
      historical_data: historicalSummary.slice(0, 3000),
    });

    // 流式输出 — 文字实时推到前端
    const stream = await chatStream([
      { role: 'user', content: prompt.slice(0, 3000) },
    ]);

    // 将 OpenAI stream 转为 SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream as any) {
            const text = chunk.choices?.[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (e: any) {
          // 流中断，发送已累积内容
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: e?.message || '分析中断' })}\n\n`),
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('AI分析失败:', error);
    return new Response(
      JSON.stringify({
        analysis:
          `⚠️ AI分析暂时不可用（${error?.message || '网络错误'}）。\n\n` +
          `推荐结果基于位次差算法，已按冲刺/稳妥/保底三级分类，比AI分析更准确。\n\n` +
          `💡 请以云南省招生考试院(ynzs.cn)和阳光高考网(gaokao.chsi.com.cn)官方数据为准。`,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
