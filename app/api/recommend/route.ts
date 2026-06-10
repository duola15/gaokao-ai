import { NextRequest, NextResponse } from 'next/server';
import { buildRecommendations, generateHistoricalSummary } from '@/lib/recommendation';
import { chat } from '@/lib/deepseek';
import { fillPrompt, RECOMMENDATION_PROMPT } from '@/lib/prompts';
import type { UserInput } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { score, rank, province, subject_group, subjects, preferences } = body;

    if (!score || !rank) {
      return NextResponse.json({ error: '请填写分数和位次' }, { status: 400 });
    }

    const input: UserInput = {
      score: Number(score),
      rank: Number(rank),
      province: province || 'yunnan',
      subject_group: subject_group || '理工类',
      subjects: subjects || '',
      preferences: {
        cities: preferences?.cities || [],
        major_direction: preferences?.major_direction || '',
        exclude_types: preferences?.exclude_types || [],
      },
    };

    // 1. 纯算法推荐
    const { 冲, 稳, 保, allRecords } = buildRecommendations(input);
    const allItems = [...冲, ...稳, ...保];

    // 2. AI 分析
    let aiAnalysis = '';
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      try {
        // 只取推荐列表中前10所学校 + 仅2025年数据，避免token溢出
        const topSchoolIds = new Set(allItems.slice(0, 15).map(i => i.school.id));
        const recentRecords = allRecords.filter(r => r.year >= 2023 && topSchoolIds.has(r.school_id));
        const historicalSummary = generateHistoricalSummary(allItems.slice(0, 10), recentRecords);

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

        aiAnalysis = await chat([{ role: 'user', content: prompt }]);
      } catch (aiError: any) {
        console.error('AI分析失败:', aiError);
        aiAnalysis = `⚠️ AI分析暂时不可用（${aiError?.message || aiError?.status || '网络错误'}），以下为基于位次差算法的推荐结果：\n\n` +
          `你的位次为${input.rank}名，系统已自动匹配云南省近5年录取数据。\n` +
          `💡 建议：冲稳保比例 3:4:3，即2-3个冲刺、3-4个稳妥、2-3个保底。`;
      }
    } else {
      aiAnalysis = '（配置AI后可启用智能分析）以下为基于位次差算法的智能推荐：\n\n' +
        `你的位次为${input.rank}名，系统已自动匹配云南省近三年录取数据，按冲刺/稳妥/保底三级分类。\n\n` +
        '💡 建议：冲稳保比例建议为 3:4:3，即2-3个冲刺、3-4个稳妥、2-3个保底。';
    }

    return NextResponse.json({
      input,
      recommendations: { 冲, 稳, 保 },
      ai_analysis: aiAnalysis,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('推荐生成失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
