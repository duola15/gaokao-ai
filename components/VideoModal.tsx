'use client';

import { useEffect, useRef } from 'react';

interface VideoModalProps {
  videoUrl: string;
  loading: boolean;
  error: string;
  pollingStatus: string;
  score: number;
  onClose: () => void;
  onRetry: () => void;
}

export default function VideoModal({ videoUrl, loading, error, pollingStatus, score, onClose, onRetry }: VideoModalProps) {
  const pollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pollingStatus]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">🎬 分享视频</h3>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="mb-4 h-10 w-10 animate-spin text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="font-medium text-gray-600">AI 正在生成视频...</p>
            <p className="mt-1 text-sm text-gray-400">预计30-90秒，请耐心等待</p>
            <div ref={pollRef} className="mt-3 flex items-center gap-2 text-xs text-blue-500">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              {pollingStatus || '任务提交中...'}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="py-8 text-center">
            <p className="mb-4 text-red-500">{error}</p>
            <button onClick={onRetry} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white">
              🔄 重新生成
            </button>
          </div>
        )}

        {!loading && videoUrl && (
          <div>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-xl shadow-md"
              poster="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='533'><rect fill='%233b82f6' width='300' height='533'/><text fill='white' x='150' y='260' text-anchor='middle' font-size='24'>🎬 高考志愿推荐</text></svg>"
            />
            <p className="mt-1 text-center text-xs text-gray-400">⚠️ 视频由AI生成，仅供参考</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const blob = await (await fetch(videoUrl)).blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `志愿推荐_${score}分.mp4`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    alert('下载失败，请重试');
                  }
                }}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-center font-medium text-white"
              >
                💾 保存视频
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    fetch(videoUrl).then(r => r.blob()).then(b => {
                      navigator.share({
                        title: '高考志愿推荐方案',
                        text: `${score}分·志愿推荐`,
                        files: [new File([b], 'gaokao.mp4', { type: 'video/mp4' })]
                      }).catch(() => {});
                    });
                  } else {
                    alert('请下载后分享');
                  }
                }}
                className="flex-1 rounded-xl bg-green-600 py-3 text-center font-medium text-white"
              >
                📤 直接分享
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
