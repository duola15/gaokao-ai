'use client';

interface AIAnalysisPanelProps {
  analysis: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
}

export default function AIAnalysisPanel({ analysis, loading, error, onRetry }: AIAnalysisPanelProps) {
  return (
    <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
        🤖 AI 分析
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-600">仅供参考</span>
      </h2>

      {/* 流式输出中 */}
      {loading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-400">
          <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          AI 分析中...{analysis && ` (${analysis.length}字)`}
        </div>
      )}

      {/* 流式文字（实时显示） */}
      {analysis && (
        <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
          {analysis}
        </div>
      )}

      {/* 失败 + 重试 */}
      {!loading && error && !analysis && (
        <div className="text-center">
          <p className="mb-3 text-sm text-gray-400">{error}</p>
          <button
            onClick={onRetry}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            🔄 重新获取 AI 分析
          </button>
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && !analysis && (
        <p className="text-sm text-gray-400">AI分析结果将在此处显示。</p>
      )}
    </div>
  );
}
