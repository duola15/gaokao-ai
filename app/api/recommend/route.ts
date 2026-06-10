import { NextRequest, NextResponse } from 'next/server';
import { buildRecommendations } from '@/lib/recommendation';
import { analyzeScorePosition, getYunnanCutoffHistory } from '@/lib/cutoff';
import type { UserInput } from '@/lib/types';

/** 纯算法推荐 —— 秒返，不等 AI */
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

    const { 冲, 稳, 保 } = buildRecommendations(input);

    // 批次线定位（纯内存计算）
    const position = analyzeScorePosition(input.score, input.subject_group);
    const cutoffHistory = getYunnanCutoffHistory();

    return NextResponse.json({
      input,
      recommendations: { 冲, 稳, 保 },
      cutoff: {
        position: position.level,
        diff: position.diff,
        summary: position.summary,
        history: cutoffHistory,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('推荐生成失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
