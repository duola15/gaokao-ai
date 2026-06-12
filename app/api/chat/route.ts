import { NextRequest, NextResponse } from 'next/server';
import { chat, hasApiKey } from '@/lib/deepseek';
import { QNA_SYSTEM_PROMPT } from '@/lib/prompts';
import { checkRateLimit, getClientIP, RATE_LIMIT_CONFIG } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 限流检查
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(
      `chat:${ip}`,
      RATE_LIMIT_CONFIG.chat.max,
      RATE_LIMIT_CONFIG.chat.windowMs,
    );
    if (!allowed) {
      return NextResponse.json(
        { answer: '提问过于频繁，请稍后再试（每分钟15次）' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { question, context } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: '请输入问题' }, { status: 400 });
    }

    // 问题长度限制
    if (question.length > 2000) {
      return NextResponse.json({ error: '问题过长，请控制在2000字以内' }, { status: 400 });
    }

    if (!hasApiKey()) {
      return NextResponse.json({
        answer: 'AI 问答功能需要配置 API Key，请稍后再试～',
      });
    }

    // 构建上下文信息
    const contextParts: string[] = [];
    if (context?.score) contextParts.push(`考生分数：${context.score}分`);
    if (context?.rank) contextParts.push(`全省位次：第${context.rank}名`);
    if (context?.province) contextParts.push(`省份：${context.province === 'yunnan' ? '云南省' : context.province}`);
    if (context?.subject_group) contextParts.push(`选科：${context.subject_group}`);
    if (context?.preferred_cities?.length) contextParts.push(`偏好城市：${context.preferred_cities.join('、')}`);
    if (context?.major_direction) contextParts.push(`专业方向：${context.major_direction}`);

    const contextStr = contextParts.length > 0
      ? `\n\n【考生背景】\n${contextParts.join('\n')}\n请结合此信息给出针对性回答，提到具体学校和分数时需标注数据年份。`
      : '';

    const answer = await chat([
      { role: 'system', content: QNA_SYSTEM_PROMPT },
      { role: 'user', content: question + contextStr },
    ]);

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error('AI问答失败:', error);
    const status = error?.status || error?.response?.status || 0;
    const msg =
      status === 429
        ? '提问的人有点多，AI 正在排队。请稍微等一下再试试～'
        : `抱歉，AI暂时不可用（${error?.message || '网络错误'}）。请稍后再试。`;
    return NextResponse.json({ answer: msg });
  }
}
