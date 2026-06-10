import { NextRequest, NextResponse } from 'next/server';
import { chat, hasApiKey } from '@/lib/deepseek';
import { QNA_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, context } = body;

    if (!question) {
      return NextResponse.json({ error: '请输入问题' }, { status: 400 });
    }

    if (!hasApiKey()) {
      return NextResponse.json({
        answer: 'AI 问答功能需要配置 API Key，请稍后再试～',
      });
    }

    const contextStr = context
      ? `\n\n考生上下文信息：分数${context.score || '未知'}，省份${context.province || '未知'}。请结合此信息给出针对性回答。`
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
    return NextResponse.json({ answer: msg }, { status: 200 });
  }
}
