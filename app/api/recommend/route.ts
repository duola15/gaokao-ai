import { NextRequest, NextResponse } from 'next/server';
import { buildRecommendations } from '@/lib/recommendation';
import { analyzeScorePosition, getYunnanCutoffHistory } from '@/lib/cutoff';
import { checkRateLimit, getClientIP, RATE_LIMIT_CONFIG } from '@/lib/rate-limit';
import type { UserInput } from '@/lib/types';

/** 纯算法推荐 —— 秒返，不等 AI */
export async function POST(req: NextRequest) {
  try {
    // 限流检查
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(
      `recommend:${ip}`,
      RATE_LIMIT_CONFIG.recommend.max,
      RATE_LIMIT_CONFIG.recommend.windowMs,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试（每分钟30次）' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { score, rank, province, subject_group, subjects, preferences } = body;

    if (!score || !rank) {
      return NextResponse.json({ error: '请填写分数和位次' }, { status: 400 });
    }

    // 输入校验
    const scoreNum = Number(score);
    const rankNum = Number(rank);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 750) {
      return NextResponse.json({ error: '请输入0-750之间的分数' }, { status: 400 });
    }
    if (isNaN(rankNum) || rankNum < 1 || rankNum > 999999) {
      return NextResponse.json({ error: '请输入1-999999之间的位次' }, { status: 400 });
    }

    const input: UserInput = {
      score: scoreNum,
      rank: rankNum,
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
