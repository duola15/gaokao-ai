'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { RecommendationItem } from '@/lib/types';
import Link from 'next/link';
import TierCard from '@/components/TierCard';
import SharePanel from '@/components/SharePanel';
import PosterModal from '@/components/PosterModal';
import VideoModal from '@/components/VideoModal';
import AIAnalysisPanel from '@/components/AIAnalysisPanel';

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

  // 对比列表（用于结果页→对比页跳转）
  const [compareIds, setCompareIds] = useState<number[]>([]);

  // 海报
  const [posterUrl, setPosterUrl] = useState('');
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [posterError, setPosterError] = useState('');
  const [showPoster, setShowPoster] = useState(false);

  // 视频（异步轮询模式）
  const [videoUrl, setVideoUrl] = useState('');
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [pollingStatus, setPollingStatus] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── 流式 AI 分析 ───
  const fetchAi = useCallback(async (params: Record<string, string>) => {
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
                // 保留已接收的文字，只显示错误提示
                if (!accumulated) setAiError(parsed.error);
              }
            } catch {
              // 跳过非法 JSON 行
            }
          }
        }
      }

      if (!accumulated && !aiError) {
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

  // 生成分享海报
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

  // 生成短视频（异步轮询模式）
  const generateVideoMedia = useCallback(async () => {
    if (!result) return;
    setLoadingVideo(true);
    setVideoError('');
    setVideoUrl('');
    setPollingStatus('正在提交生成任务...');
    setShowVideo(true);

    const summary = [
      `🎯 冲刺：${result.recommendations.冲.slice(0, 3).map((i) => i.school.name).join('、') || '无'}`,
      `✅ 稳妥：${result.recommendations.稳.slice(0, 3).map((i) => i.school.name).join('、') || '无'}`,
      `🛡️ 保底：${result.recommendations.保.slice(0, 3).map((i) => i.school.name).join('、') || '无'}`,
    ].join('\n');

    try {
      // 提交视频生成任务
      const res = await fetch('/api/video', {
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
      if (!res.ok) throw new Error(data.error || '视频生成失败');

      const taskId = data.taskId;
      setPollingStatus('AI正在生成视频中...');

      // 轮询任务状态
      let pollCount = 0;
      const maxPolls = 40; // 最多轮询120秒
      pollTimerRef.current = setInterval(async () => {
        pollCount++;
        try {
          const pollRes = await fetch(`/api/video?taskId=${taskId}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'done' && pollData.videoUrl) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setVideoUrl(pollData.videoUrl);
            setLoadingVideo(false);
            setPollingStatus('');
          } else if (pollData.status === 'error') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setVideoError(pollData.error || '视频生成失败');
            setLoadingVideo(false);
            setPollingStatus('');
          } else if (pollCount >= maxPolls) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setVideoError('视频生成超时，请稍后重试');
            setLoadingVideo(false);
            setPollingStatus('');
          } else {
            setPollingStatus(`AI正在生成视频...(${pollCount * 3}秒)`);
          }
        } catch {
          // 网络错误不中断轮询
        }
      }, 3000);
    } catch (err: any) {
      setVideoError(err?.message || '视频生成失败（可能需要较长时间），请稍后重试');
      setLoadingVideo(false);
    }
  }, [result]);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // 切换对比
  const toggleCompare = useCallback((schoolId: number) => {
    setCompareIds(prev =>
      prev.includes(schoolId)
        ? prev.filter(id => id !== schoolId)
        : prev.length < 5
          ? [...prev, schoolId]
          : prev
    );
  }, []);

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
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `请求失败(${res.status})`);
        }
        const data: ResultData = await res.json();
        setResult(data);
        setLoadingRecs(false);
        fetchAi(params);
      } catch (err: any) {
        setRecError(err?.message || '数据加载失败，请返回重试');
        setLoadingRecs(false);
      }
    })();
  }, [searchParams, fetchAi]);

  // ─── Loading ───
  if (loadingRecs) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <svg className="mb-4 h-12 w-12 animate-spin text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-lg font-semibold text-gray-700">正在检索录取数据...</p>
        <p className="mt-2 text-sm text-gray-400">基于历年公开录取位次 · 2,200+所全国高校</p>
      </div>
    );
  }

  // ─── Error ───
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
          <strong className="text-blue-600">{input.rank.toLocaleString()}</strong> · 偏好{' '}
          {input.preferences.major_direction || '不限'}
          {' · '}
          <span className="text-xs text-gray-400">
            共{recommendations.冲.length + recommendations.稳.length + recommendations.保.length}条推荐
          </span>
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
            <br />
            <span className="text-xs">请尝试扩大偏好范围或调整选科设置</span>
          </div>
        )}
        {activeTier.data.map((item) => (
          <TierCard
            key={`${item.school.id}-${item.major.major_name}`}
            item={item}
            tierColor={activeTier.color}
            onCompare={toggleCompare}
            compareIds={compareIds}
          />
        ))}
      </div>

      {/* P1-6: "查看更多"按钮（展开完整列表） */}
      {activeTier.data.length >= 10 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-400">
            以上为{activeTab === '冲' ? '冲刺' : activeTab === '稳' ? '稳妥' : '保底'}精选（共{activeTier.data.length}条），
            建议至少填报{activeTab === '冲' ? '10-15' : activeTab === '稳' ? '15-20' : '8-10'}个志愿
          </p>
        </div>
      )}

      {/* 对比栏 */}
      {compareIds.length >= 2 && (
        <div className="mt-4 rounded-xl bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              📊 已选 {compareIds.length}/5 所学校进行对比
            </span>
            <Link
              href={`/compare?ids=${compareIds.join(',')}`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              开始对比 →
            </Link>
          </div>
        </div>
      )}

      {/* ⚠️ 重要免责声明（含数据时效性说明） */}
      <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">⚠️ 重要声明</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>本工具数据来自历年公开录取信息，仅供参考，不构成录取承诺</li>
          <li>AI 分析基于历史数据推算，存在偏差，请理性对待</li>
          <li>
            <strong>数据时效性</strong>：各学校推荐使用的数据年份可能不同（{(() => {
              const allYears = [...new Set([
                ...recommendations.冲, ...recommendations.稳, ...recommendations.保
              ].map(i => i.data_year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));
              return allYears.join('、');
            })()}年），较旧数据可能无法反映最新录取趋势
          </li>
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

      {/* AI 分析区域 */}
      <AIAnalysisPanel
        analysis={aiAnalysis}
        loading={loadingAi}
        error={aiError}
        onRetry={() => {
          const params: Record<string, string> = {};
          searchParams.forEach((v, k) => { params[k] = v; });
          fetchAi(params);
        }}
      />

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
        <SharePanel
          recommendations={recommendations}
          input={input}
          onClose={() => setShowShare(false)}
          onGeneratePoster={() => { setShowShare(false); generatePoster(); }}
          onGenerateVideo={() => { setShowShare(false); generateVideoMedia(); }}
        />
      )}

      {/* 海报预览弹窗 */}
      {showPoster && (
        <PosterModal
          posterUrl={posterUrl}
          loading={loadingPoster}
          error={posterError}
          score={input.score}
          onClose={() => setShowPoster(false)}
          onRetry={generatePoster}
        />
      )}

      {/* 视频预览弹窗 */}
      {showVideo && (
        <VideoModal
          videoUrl={videoUrl}
          loading={loadingVideo}
          error={videoError}
          pollingStatus={pollingStatus}
          score={input.score}
          onClose={() => setShowVideo(false)}
          onRetry={generateVideoMedia}
        />
      )}
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
