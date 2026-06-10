'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { RecommendationResult, RecommendationItem } from '@/lib/types';
import Link from 'next/link';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'冲' | '稳' | '保'>('稳');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params: Record<string, string> = {};
        searchParams.forEach((v, k) => {
          params[k] = v;
        });

        // 先本地计算快速出结果，再请求AI分析
        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: params.score,
            rank: params.rank,
            province: params.province || 'yunnan',
            subject_group: params.subject_group || '理工类',
            subjects: params.subjects || '',
            preferences: {
              cities: params.cities && params.cities !== '不限' ? params.cities.split(',') : [],
              major_direction: params.major_direction && params.major_direction !== '不限' ? params.major_direction : '',
            },
          }),
        });

        if (!res.ok) {
          throw new Error('请求失败');
        }

        const data = await res.json();
        setResult(data);
      } catch (err) {
        setError('数据加载失败，请返回重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <svg className="mb-4 h-12 w-12 animate-spin text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-lg font-semibold text-gray-700">AI 正在分析你的志愿...</p>
        <p className="mt-2 text-sm text-gray-400">正在检索云南省近三年录取位次数据</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mt-20 text-center">
        <p className="text-red-500">{error || '未知错误'}</p>
        <button onClick={() => router.back()} className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-white">
          ← 返回重新输入
        </button>
      </div>
    );
  }

  const { recommendations, input, ai_analysis } = result;
  const tiers: Array<{ key: '冲' | '稳' | '保'; label: string; color: string; data: RecommendationItem[] }> = [
    { key: '冲', label: '🎯 冲刺', color: 'tier-chong', data: recommendations.冲 },
    { key: '稳', label: '✅ 稳妥', color: 'tier-wen', data: recommendations.稳 },
    { key: '保', label: '🛡️ 保底', color: 'tier-bao', data: recommendations.保 },
  ];

  const activeTier = tiers.find((t) => t.key === activeTab)!;

  return (
    <div className="page-enter pb-8">
      {/* 顶部 */}
      <div className="mb-6 mt-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          ← 修改条件
        </button>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          {input.province === 'yunnan' ? '云南省' : input.province} · {input.subject_group}
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800 sm:text-3xl">
          你的志愿方案
        </h1>
        <p className="mt-1 text-gray-500">
          分数 <strong className="text-blue-600">{input.score}</strong> ·
          位次 <strong className="text-blue-600">{input.rank}</strong> ·
          偏好 {input.preferences.major_direction || '不限'}
        </p>
      </div>

      {/* 三级Tab切换 */}
      <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-gray-100 p-1.5">
        {tiers.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-xl py-3 text-sm font-semibold transition sm:text-base ${
              activeTab === t.key
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs opacity-60">({t.data.length})</span>
          </button>
        ))}
      </div>

      {/* 推荐卡片列表 */}
      <div className="space-y-3">
        {activeTier.data.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-400">
            暂无{activeTab === '冲' ? '冲刺' : activeTab === '稳' ? '稳妥' : '保底'}推荐
          </div>
        )}
        {activeTier.data.map((item, idx) => (
          <div
            key={`${item.school.id}-${item.major.major_name}`}
            className={`rounded-2xl p-4 shadow-sm sm:p-5 ${activeTier.color}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-800">
                    {item.school.name}
                  </h3>
                  <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-500">
                    {item.school.school_type}
                  </span>
                  <span className="text-xs text-gray-400">{item.school.city}</span>
                </div>
                <p className="mt-1 text-base font-semibold text-gray-700">
                  {item.major.major_name}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span>🎯 录取位次：<strong className="text-gray-800">{item.major.avg_rank}</strong></span>
                  <span>📊 平均分：<strong className="text-gray-800">{item.major.avg_score}</strong></span>
                  <span>👥 招生：<strong className="text-gray-800">{item.major.enrollment_quota}人</strong></span>
                  {item.major.tuition > 0 && (
                    <span>💰 <strong className="text-gray-800">¥{item.major.tuition}/年</strong></span>
                  )}
                </div>
              </div>

              {/* 匹配度 */}
              <div className="ml-3 flex flex-shrink-0 flex-col items-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${
                    item.match_score >= 70
                      ? 'bg-green-500 text-white'
                      : item.match_score >= 50
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {item.match_score}
                </div>
                <span className="mt-1 text-xs text-gray-400">匹配度</span>
              </div>
            </div>

            {/* 历年趋势 */}
            <div className="mt-3 border-t border-white/40 pt-3">
              <p className="text-xs text-gray-400">
                位次差：{item.rank_diff > 0 ? `低${item.rank_diff}名（相对安全）` : `高${Math.abs(item.rank_diff)}名（需要冲刺）`}
                &nbsp;·&nbsp;{item.major.subject_requirements && `选科要求：${item.major.subject_requirements}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 支持作者 */}
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center text-white shadow-lg">
        <p className="text-lg font-bold">☕ 觉得有用？请作者喝杯咖啡</p>
        <p className="mt-2 text-sm text-amber-100">
          这个工具完全免费，数据来源公开可查。如果帮到了你，欢迎支持一下
        </p>
        <a
          href="https://afdian.com/a/your_username"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-full bg-white px-8 py-3 font-bold text-orange-600 shadow-md transition hover:scale-105 active:scale-95"
        >
          去爱发电支持 →
        </a>
        <p className="mt-2 text-xs text-amber-200">
          完全自愿，不影响使用任何功能
        </p>
      </div>

      {/* AI 分析 */}
      {ai_analysis && (
        <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
            🤖 AI 综合分析
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-600">仅供参考</span>
          </h2>
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
            {ai_analysis}
          </div>
        </div>
      )}

      {/* 底部操作 */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 rounded-2xl border border-gray-200 bg-white py-4 text-center font-medium text-gray-600 hover:bg-gray-50"
        >
          修改条件
        </button>
        <button
          onClick={() => {
            const text = `【${input.score}分·${input.rank}名】志愿填报推荐：\n冲刺：${recommendations.冲.slice(0,3).map(i => i.school.name).join('、')}\n稳妥：${recommendations.稳.slice(0,3).map(i => i.school.name).join('、')}\n保底：${recommendations.保.slice(0,3).map(i => i.school.name).join('、')}\n\n——来自高考志愿AI助手`;
            if (navigator.share) {
              navigator.share({ text });
            } else {
              navigator.clipboard.writeText(text).then(() => alert('已复制分享文本！'));
            }
          }}
          className="flex-1 rounded-2xl bg-green-600 py-4 text-center font-medium text-white hover:bg-green-700"
        >
          📤 分享给家长/同学
        </button>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-gray-400">加载中...</p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
