'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { RecommendationItem } from '@/lib/types';
import { parseDescription } from '@/lib/recommendation';
import Link from 'next/link';

interface ResultData {
  input: {
    score: number;
    rank: number;
    province: string;
    subject_group: string;
    subjects: string;
    preferences: { cities: string[]; major_direction: string; exclude_types?: string[] };
  };
  recommendations: { 冲: RecommendationItem[]; 稳: RecommendationItem[]; 保: RecommendationItem[] };
  cutoff?: {
    position: string;
    diff: number;
    summary: string;
    history: { year: number; arts: number; science: number }[];
  };
}

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [result, setResult] = useState<ResultData | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [recError, setRecError] = useState('');

  // AI 流式
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const aiAbortRef = useRef<AbortController | null>(null);

  const [activeTab, setActiveTab] = useState<'冲' | '稳' | '保'>('稳');
  const [showShare, setShowShare] = useState(false);

  // 海报
  const [posterUrl, setPosterUrl] = useState('');
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [posterError, setPosterError] = useState('');
  const [showPoster, setShowPoster] = useState(false);

  // ─── 流式 AI 分析 ───
  const fetchAi = useCallback(async (params: Record<string, string>) => {
    // Abort previous
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;

    setLoadingAi(true);
    setAiError('');
    setAiAnalysis('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: params.score,
          rank: params.rank,
          province: params.province || 'yunnan',
          subject_group: params.subject_group || '理工类',
          subjects: params.subjects || '',
          cities: params.cities && params.cities !== '不限' ? params.cities.split(',') : [],
          major_direction: params.major_direction && params.major_direction !== '不限' ? params.major_direction : '',
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error('AI 请求失败');

      // SSE 流式读取
      const reader = res.body?.getReader();
      if (!reader) throw new Error('不支持流式');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setAiAnalysis(accumulated);
              }
              if (parsed.error) {
                setAiError(parsed.error);
              }
            } catch {
              // 跳过非法 JSON 行
            }
          }
        }
      }

      // 流结束，如果没有任何内容
      if (!accumulated) {
        setAiAnalysis(`⚠️ AI 返回为空。\n\n推荐结果基于位次差算法生成，比 AI 分析更准确可靠。\n\n💡 请以云南省招生考试院(ynzs.cn)和阳光高考网(gaokao.chsi.com.cn)官方数据为准。`);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setAiError(err?.message || 'AI 分析暂时不可用');
      }
    } finally {
      setLoadingAi(false);
    }
  }, []);

  // 生成分享海报（集成AI分析结果）
  const generatePoster = useCallback(async () => {
    if (!result) return;
    setLoadingPoster(true);
    setPosterError('');
    setShowPoster(true);

    const summary = [
      `🎯 冲刺：${result.recommendations.冲.slice(0, 3).map((i) => i.school.name).join('、') || '无'}`,
      `✅ 稳妥：${result.recommendations.稳.slice(0, 3).map((i) => i.school.name).join('、') || '无'}`,
      `🛡️ 保底：${result.recommendations.保.slice(0, 3).map((i) => i.school.name).join('、') || '无'}`,
    ].join('\n');

    try {
      const res = await fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: result.input.score,
          rank: result.input.rank,
          province: result.input.province,
          subject_group: result.input.subject_group,
          tier_summary: summary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '海报生成失败');
      setPosterUrl(data.imageUrl);
    } catch (err: any) {
      setPosterError(err?.message || '海报生成失败，请稍后重试');
    } finally {
      setLoadingPoster(false);
    }
  }, [result]);

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => { params[k] = v; });

    (async () => {
      try {
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
        if (!res.ok) throw new Error('请求失败');
        const data: ResultData = await res.json();
        setResult(data);
        setLoadingRecs(false);
        fetchAi(params);
      } catch (err) {
        setRecError('数据加载失败，请返回重试');
        setLoadingRecs(false);
      }
    })();
  }, [searchParams, fetchAi]);

  // Loading
  if (loadingRecs) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <svg className="mb-4 h-12 w-12 animate-spin text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-lg font-semibold text-gray-700">正在检索录取数据...</p>
        <p className="mt-2 text-sm text-gray-400">基于历年公开录取位次</p>
      </div>
    );
  }

  if (recError || !result) {
    return (
      <div className="mt-20 text-center">
        <p className="text-red-500">{recError || '未知错误'}</p>
        <button onClick={() => router.back()} className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-white">← 返回重新输入</button>
      </div>
    );
  }

  const { recommendations, input } = result;
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
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← 修改条件</button>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          {input.province === 'yunnan' ? '云南省' : input.province} · {input.subject_group}
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800 sm:text-3xl">你的志愿方案</h1>
        <p className="mt-1 text-gray-500">
          分数 <strong className="text-blue-600">{input.score}</strong> · 位次{' '}
          <strong className="text-blue-600">{input.rank}</strong> · 偏好{' '}
          {input.preferences.major_direction || '不限'}
        </p>
        {result.cutoff && (
          <div
            className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
              result.cutoff.diff >= 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
            }`}
          >
            <span className="font-semibold">{result.cutoff.diff >= 0 ? '✅' : '⚠️'}</span>
            <span>
              2025云南{input.subject_group === '理工类' ? '理科' : '文科'}一本线：
              <strong>{input.subject_group === '理工类' ? result.cutoff.history[0]?.science : result.cutoff.history[0]?.arts}分</strong>
              ，考生{result.cutoff.diff >= 0 ? `高出一本线${result.cutoff.diff}分` : `低于一本线${Math.abs(result.cutoff.diff)}分`}
            </span>
          </div>
        )}
      </div>

      {/* Tab切换 */}
      <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-gray-100 p-1.5">
        {tiers.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-xl py-3 text-sm font-semibold transition sm:text-base ${
              activeTab === t.key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label} <span className="ml-1 text-xs opacity-60">({t.data.length})</span>
          </button>
        ))}
      </div>

      {/* 推荐卡片 */}
      <div className="space-y-3">
        {activeTier.data.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-400">
            暂无{activeTab === '冲' ? '冲刺' : activeTab === '稳' ? '稳妥' : '保底'}推荐
          </div>
        )}
        {activeTier.data.map((item) => (
          <div key={`${item.school.id}-${item.major.major_name}`} className={`rounded-2xl p-4 shadow-sm sm:p-5 ${activeTier.color}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-800">{item.school.name}</h3>
                  <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-500">{item.school.school_type}</span>
                  <span className="text-xs text-gray-400">{item.school.city}</span>
                </div>
                {item.school.description && (() => {
                  const tags = parseDescription(item.school.description);
                  return tags.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tags.slice(0, 4).map((t, i) => (
                        <span key={i} className="rounded-md bg-white/40 px-1.5 py-0.5 text-xs text-gray-500">{t}</span>
                      ))}
                    </div>
                  ) : null;
                })()}
                <p className="mt-1 text-base font-semibold text-gray-700">{item.major.major_name}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span>🎯 录取位次：<strong className="text-gray-800">{item.major.avg_rank}</strong></span>
                  <span>📊 平均分：<strong className="text-gray-800">{item.major.avg_score}</strong></span>
                  <span>👥 招生：<strong className="text-gray-800">{item.major.enrollment_quota}人</strong></span>
                  {item.major.tuition > 0 && <span>💰 <strong className="text-gray-800">¥{item.major.tuition}/年</strong></span>}
                </div>
              </div>
              <div className="ml-3 flex flex-shrink-0 flex-col items-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${
                    item.match_score >= 70 ? 'bg-green-500 text-white' : item.match_score >= 50 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {item.match_score}
                </div>
                <span className="mt-1 text-xs text-gray-400">匹配度</span>
              </div>
            </div>
            <div className="mt-3 border-t border-white/40 pt-3">
              <p className="text-xs text-gray-400">
                位次差：{item.rank_diff > 0 ? `低${item.rank_diff}名（相对安全）` : `高${Math.abs(item.rank_diff)}名（需要冲刺）`}
                &nbsp;·&nbsp;{item.major.subject_requirements && `选科要求：${item.major.subject_requirements}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ⚠️ 重要免责声明 */}
      <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">⚠️ 重要声明</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>本工具数据来自历年公开录取信息，仅供参考，不构成录取承诺</li>
          <li>AI 分析基于历史数据推算，存在偏差，请理性对待</li>
          <li>
            志愿填报最终决策请以
            <a href="https://www.ynzs.cn" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">云南省招生考试院(ynzs.cn)</a>
            {' '}和{' '}
            <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">阳光高考网</a>
            {' '}官方发布为准
          </li>
          <li>建议将推荐结果与学校招生章程、老师建议交叉验证</li>
        </ul>
      </div>

      {/* 支持作者 */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center text-white shadow-lg">
        <p className="text-lg font-bold">☕ 觉得有用？请作者喝杯咖啡</p>
        <p className="mt-2 text-sm text-amber-100">这个工具完全免费，数据来源公开可查。如果帮到了你，欢迎支持一下</p>
        <a href="https://afdian.com/a/gaokao-ai" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-full bg-white px-8 py-3 font-bold text-orange-600 shadow-md transition hover:scale-105 active:scale-95">
          去爱发电支持 →
        </a>
        <p className="mt-2 text-xs text-amber-200">完全自愿，不影响使用任何功能</p>
      </div>

      {/* AI 分析区域 —— 流式显示 */}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
          🤖 AI 分析
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-600">仅供参考</span>
        </h2>

        {/* 流式输出中 */}
        {loadingAi && (
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-400">
            <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI 分析中...{aiAnalysis && ` (${aiAnalysis.length}字)`}
          </div>
        )}

        {/* 流式文字（实时显示） */}
        {aiAnalysis && (
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
            {aiAnalysis}
          </div>
        )}

        {/* 失败 + 重试 */}
        {!loadingAi && aiError && !aiAnalysis && (
          <div className="text-center">
            <p className="mb-3 text-sm text-gray-400">{aiError}</p>
            <button
              onClick={() => {
                const params: Record<string, string> = {};
                searchParams.forEach((v, k) => { params[k] = v; });
                fetchAi(params);
              }}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              🔄 重新获取 AI 分析
            </button>
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 rounded-2xl border border-gray-200 bg-white py-4 text-center font-medium text-gray-600 hover:bg-gray-50"
        >
          修改条件
        </button>
        <button
          onClick={() => setShowShare(true)}
          className="flex-1 rounded-2xl bg-green-600 py-4 text-center font-medium text-white hover:bg-green-700"
        >
          📤 分享
        </button>
      </div>

      {/* 分享弹窗 */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowShare(false)}>
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 pb-10 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">分享到</h3>
              <button onClick={() => setShowShare(false)} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="mb-5 text-sm text-gray-400">推荐方案仅供交流参考，请以官方数据为准</p>

            <button onClick={() => { setShowShare(false); generatePoster(); }} className="mb-4 w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 text-center font-semibold text-white shadow-md transition hover:scale-[1.02] active:scale-95">
              📸 生成分享海报
            </button>

            <div className="grid grid-cols-4 gap-4">
              {[
                { name: '微信好友', icon: '💬', color: 'bg-green-500', action: () => { copyText(buildShareText(recommendations, input) + '\n\n🔗 https://yunnan-gaokao.netlify.app', '微信'); } },
                { name: '朋友圈', icon: '🟢', color: 'bg-green-600', action: () => { copyText(buildShareText(recommendations, input) + '\n\n🔗 yunnan-gaokao.netlify.app', '朋友圈'); } },
                { name: 'QQ好友', icon: '🐧', color: 'bg-blue-500', action: () => { copyText(buildShareText(recommendations, input) + '\n\n🔗 https://yunnan-gaokao.netlify.app', 'QQ'); } },
                { name: 'QQ空间', icon: '⭐', color: 'bg-yellow-500', action: () => { copyText(buildShareText(recommendations, input), 'QQ空间'); } },
                { name: '微博', icon: '📢', color: 'bg-red-500', action: () => { copyText(buildShareText(recommendations, input) + '\n#高考志愿# #云南高考#', '微博'); } },
                { name: '小红书', icon: '📕', color: 'bg-red-400', action: () => { copyText(buildShareText(recommendations, input) + '\n#高考志愿填报 #云南高考', '小红书'); } },
                { name: '复制链接', icon: '🔗', color: 'bg-gray-500', action: () => { copyText('https://yunnan-gaokao.netlify.app', ''); } },
                { name: '短信转发', icon: '📱', color: 'bg-indigo-500', action: () => { const t = buildShareText(recommendations, input); window.open(`sms:?body=${encodeURIComponent(t + '\nyunnan-gaokao.netlify.app')}`, '_blank'); } },
              ].map((p) => (
                <button key={p.name} onClick={p.action} className="flex flex-col items-center gap-1.5">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${p.color} text-2xl shadow-md transition hover:scale-105 active:scale-95`}>{p.icon}</div>
                  <span className="text-xs text-gray-500">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 海报预览弹窗 */}
      {showPoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowPoster(false)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">📸 分享海报</h3>
              <button onClick={() => setShowPoster(false)} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {loadingPoster && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="mb-4 h-10 w-10 animate-spin text-purple-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="font-medium text-gray-600">AI 正在生成海报...</p>
                <p className="mt-1 text-sm text-gray-400">预计 5-10 秒</p>
              </div>
            )}
            {!loadingPoster && posterError && (
              <div className="py-8 text-center">
                <p className="mb-4 text-red-500">{posterError}</p>
                <button onClick={generatePoster} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white">🔄 重新生成</button>
              </div>
            )}
            {!loadingPoster && posterUrl && (
              <div>
                <img src={posterUrl} alt="志愿推荐海报" className="w-full rounded-xl shadow-md" />
                <p className="mt-1 text-center text-xs text-gray-400">⚠️ 图片由AI生成，仅供参考</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={async () => {
                    try { const blob = await (await fetch(posterUrl)).blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `高考志愿推荐_${result!.input.score}分.png`; a.click(); URL.revokeObjectURL(url); } catch { alert('下载失败，请长按图片保存'); }
                  }} className="flex-1 rounded-xl bg-blue-600 py-3 text-center font-medium text-white">💾 保存图片</button>
                  <button onClick={() => {
                    if (navigator.share) { fetch(posterUrl).then(r => r.blob()).then(b => { navigator.share({ title: '高考志愿推荐方案', text: `${result!.input.score}分·第${result!.input.rank}名`, files: [new File([b], 'poster.png', { type: 'image/png' })] }).catch(() => {}); }); }
                    else alert('请长按图片保存后分享');
                  }} className="flex-1 rounded-xl bg-green-600 py-3 text-center font-medium text-white">📤 直接分享</button>
                </div>
                <p className="mt-2 text-center text-xs text-gray-400">💡 也可以长按图片保存到相册</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function copyText(text: string, target: string) {
  navigator.clipboard.writeText(text).then(() => {
    alert(target ? `已复制！打开${target} → 粘贴发送` : '链接已复制！');
  });
}

function buildShareText(
  recommendations: { 冲: RecommendationItem[]; 稳: RecommendationItem[]; 保: RecommendationItem[] },
  input: { score: number; rank: number },
): string {
  return [
    `📊 【${input.score}分·${input.rank}名】高考志愿推荐方案`,
    '',
    '🎯 冲刺：' + (recommendations.冲.slice(0, 3).map((i) => i.school.name).join('、') || '无'),
    '✅ 稳妥：' + (recommendations.稳.slice(0, 3).map((i) => i.school.name).join('、') || '无'),
    '🛡️ 保底：' + (recommendations.保.slice(0, 3).map((i) => i.school.name).join('、') || '无'),
    '',
    '⚠️ 仅供参考，请以 ynzs.cn 和 gaokao.chsi.com.cn 官方数据为准',
    '—— 来自【高考志愿AI助手】：',
  ].join('\n');
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-gray-400">加载中...</p></div>}>
      <ResultContent />
    </Suspense>
  );
}
