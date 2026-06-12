'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ChatMessage } from '@/lib/types';
import LegalDisclaimer from '@/components/LegalDisclaimer';

const SUGGESTED_QUESTIONS = [
  '云南大学的计算机专业怎么样？',
  '550分在云南能上什么好学校？',
  '昆明理工大学和云南大学怎么选？',
  '临床医学专业毕业后好就业吗？',
  '财经类专业在云南有什么好学校？',
];

function AskContent() {
  const searchParams = useSearchParams();

  // 从URL获取考生上下文
  const userContext = useRef<Record<string, string>>({});
  useEffect(() => {
    const ctx: Record<string, string> = {};
    if (searchParams.get('score')) ctx.score = searchParams.get('score')!;
    if (searchParams.get('rank')) ctx.rank = searchParams.get('rank')!;
    if (searchParams.get('province')) ctx.province = searchParams.get('province')!;
    if (searchParams.get('subject_group')) ctx.subject_group = searchParams.get('subject_group')!;
    if (searchParams.get('cities')) ctx.preferred_cities = searchParams.get('cities')!;
    if (searchParams.get('major')) ctx.major_direction = searchParams.get('major')!;
    userContext.current = ctx;
  }, [searchParams]);

  const contextSummary = userContext.current.score
    ? `当前考生：${userContext.current.score}分·第${userContext.current.rank}名·${userContext.current.subject_group || ''}`
    : '';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是高考志愿AI顾问。有什么想问的？你可以问我关于学校、专业、录取分数线、志愿策略等问题。'
        + (contextSummary ? `\n\n📋 ${contextSummary}\n我会结合你的分数和位次信息给出针对性建议。` : '')
        + '\n\n⚠️ 我的回答仅供参考，请以官方发布信息为准。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          context: userContext.current.score ? {
            score: Number(userContext.current.score),
            rank: Number(userContext.current.rank),
            province: userContext.current.province || 'yunnan',
            subject_group: userContext.current.subject_group || '',
            preferred_cities: userContext.current.preferred_cities?.split(',') || [],
            major_direction: userContext.current.major_direction || '',
          } : undefined,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer || '抱歉，暂时无法回答这个问题。' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '网络错误，请稍后再试。' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="mb-4 mt-4">
        <h1 className="text-2xl font-extrabold text-gray-800">AI 问答</h1>
        <p className="mt-1 text-sm text-gray-500">
          关于学校和专业，尽管问
        </p>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 快捷问题 */}
      {messages.length <= 1 && (
        <div className="mb-4">
          <p className="mb-2 text-xs text-gray-400">试试这些问题：</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI问答法律声明 */}
      <LegalDisclaimer variant="banner" className="mt-4" />

      {/* 输入框 */}
      <div className="sticky bottom-4 mt-4 flex gap-2 rounded-2xl bg-white p-3 shadow-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="输入你的问题..."
          className="flex-1 border-none bg-transparent px-2 text-sm outline-none"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
            loading || !input.trim()
              ? 'bg-gray-200 text-gray-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          发送
        </button>
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    }>
      <AskContent />
    </Suspense>
  );
}
