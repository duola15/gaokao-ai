import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/deepseek';
import { QNA_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, context } = body;

    if (!question) {
      return NextResponse.json({ error: '请输入问题' }, { status: 400 });
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
    const msg = error?.message || error?.status || '网络错误';
    return NextResponse.json(
      { answer: `抱歉，AI暂时不可用（${msg}）。请稍后再试，或直接查看推荐页面的数据。` },
      { status: 200 }
    );
  }
}
