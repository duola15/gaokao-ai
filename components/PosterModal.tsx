'use client';

interface PosterModalProps {
  posterUrl: string;
  loading: boolean;
  error: string;
  score: number;
  onClose: () => void;
  onRetry: () => void;
}

export default function PosterModal({ posterUrl, loading, error, score, onClose, onRetry }: PosterModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">📸 分享海报</h3>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="mb-4 h-10 w-10 animate-spin text-purple-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="font-medium text-gray-600">AI 正在生成海报...</p>
            <p className="mt-1 text-sm text-gray-400">预计 5-15 秒</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-8 text-center">
            <p className="mb-4 text-red-500">{error}</p>
            <button onClick={onRetry} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white">
              🔄 重新生成
            </button>
          </div>
        )}

        {!loading && posterUrl && (
          <div>
            <img src={posterUrl} alt="志愿推荐海报" className="w-full rounded-xl shadow-md" />
            <p className="mt-1 text-center text-xs text-gray-400">⚠️ 图片由AI生成，仅供参考</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const blob = await (await fetch(posterUrl)).blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `高考志愿推荐_${score}分.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    alert('下载失败，请长按图片保存');
                  }
                }}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-center font-medium text-white"
              >
                💾 保存图片
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    fetch(posterUrl).then(r => r.blob()).then(b => {
                      navigator.share({
                        title: '高考志愿推荐方案',
                        text: `${score}分志愿推荐`,
                        files: [new File([b], 'poster.png', { type: 'image/png' })]
                      }).catch(() => {});
                    });
                  } else {
                    alert('请长按图片保存后分享');
                  }
                }}
                className="flex-1 rounded-xl bg-green-600 py-3 text-center font-medium text-white"
              >
                📤 直接分享
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">💡 也可以长按图片保存到相册</p>
          </div>
        )}
      </div>
    </div>
  );
}
