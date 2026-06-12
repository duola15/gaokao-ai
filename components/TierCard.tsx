'use client';

import type { RecommendationItem } from '@/lib/types';
import { parseDescription } from '@/lib/recommendation';
import Link from 'next/link';

interface TierCardProps {
  item: RecommendationItem;
  tierColor: string;
  onCompare?: (schoolId: number) => void;
  compareIds?: number[];
}

export default function TierCard({ item, tierColor, onCompare, compareIds = [] }: TierCardProps) {
  const tags = parseDescription(item.school.description);
  const isComparing = compareIds.includes(item.school.id);

  return (
    <div className={`rounded-2xl p-4 shadow-sm sm:p-5 ${tierColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800">{item.school.name}</h3>
            <span className="rounded-md bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-500">
              {item.school.school_type}
            </span>
            <span className="text-xs text-gray-400">{item.school.city}</span>
            {/* 数据年份标签 */}
            {item.data_year && (
              <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                item.data_year >= 2025 ? 'bg-green-100 text-green-600' :
                item.data_year >= 2023 ? 'bg-blue-100 text-blue-600' :
                'bg-orange-100 text-orange-600'
              }`}>
                {item.data_year}年数据
              </span>
            )}
          </div>

          {/* 学校描述标签 */}
          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tags.slice(0, 4).map((t, i) => (
                <span key={i} className="rounded-md bg-white/40 px-1.5 py-0.5 text-xs text-gray-500">{t}</span>
              ))}
            </div>
          )}

          {/* 专业名 + 风险标签 */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-gray-700">{item.major.major_name}</p>
            {item.risk_tags && item.risk_tags.length > 0 && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                  item.risk_tags[0].type === 'green' ? 'bg-green-100 text-green-700' :
                  item.risk_tags[0].type === 'red' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}
                title={item.risk_tags[0].description}
              >
                {item.risk_tags[0].label}
              </span>
            )}
          </div>

          {/* 录取数据 */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>🎯 录取位次：<strong className="text-gray-800">{item.major.avg_rank.toLocaleString()}</strong></span>
            <span>📊 最低分：<strong className="text-gray-800">{item.major.min_score}</strong></span>
            {item.major.enrollment_quota > 0 && (
              <span>👥 招生：<strong className="text-gray-800">{item.major.enrollment_quota}人</strong></span>
            )}
            {item.major.tuition > 0 && (
              <span>💰 <strong className="text-gray-800">¥{item.major.tuition.toLocaleString()}/年</strong></span>
            )}
          </div>

          {/* 趋势指示 */}
          {item.trend && item.trend.length >= 2 && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-medium ${
                item.trend_direction === 'up' ? 'bg-orange-100 text-orange-600' :
                item.trend_direction === 'down' ? 'bg-green-100 text-green-600' :
                'bg-gray-100 text-gray-500'
              }`}>
                {item.trend_direction === 'up' ? '📈 录取位次上升（变难）' :
                 item.trend_direction === 'down' ? '📉 录取位次下降（变易）' :
                 '➡️ 录取位次稳定'}
              </span>
              <span className="text-gray-400">
                {item.trend.map(t => `${t.year}:${t.min_score}分`).join(' → ')}
              </span>
            </div>
          )}
        </div>

        {/* 匹配度 + 操作 */}
        <div className="ml-3 flex flex-shrink-0 flex-col items-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${
              item.match_score >= 70 ? 'bg-green-500 text-white' :
              item.match_score >= 50 ? 'bg-blue-500 text-white' :
              'bg-gray-300 text-gray-600'
            }`}
          >
            {item.match_score}
          </div>
          <span className="mt-1 text-xs text-gray-400">匹配度</span>

          {/* 加入对比按钮 */}
          {onCompare && (
            <button
              onClick={() => onCompare(item.school.id)}
              className={`mt-2 rounded-lg px-2 py-1 text-xs font-medium transition ${
                isComparing
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/60 text-blue-600 hover:bg-blue-100'
              }`}
            >
              {isComparing ? '✓ 已加对比' : '+ 对比'}
            </button>
          )}
        </div>
      </div>

      {/* 底部信息 */}
      <div className="mt-3 border-t border-white/40 pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-gray-400">
            位次差：{item.rank_diff > 0
              ? `低${item.rank_diff.toLocaleString()}名（相对安全）`
              : `高${Math.abs(item.rank_diff).toLocaleString()}名（需要冲刺）`}
          </p>
          {item.major.subject_requirements && (
            <p className="text-xs text-gray-400">选科要求：{item.major.subject_requirements}</p>
          )}
        </div>
        <div className="mt-1.5 flex gap-2">
          <Link
            href={`/school?id=${item.school.id}`}
            className="text-xs text-blue-600 hover:underline"
          >
            📋 学校详情
          </Link>
          {item.data_year && item.data_year < 2024 && (
            <span className="text-xs text-amber-500" title="该学校最新可用数据年份较早，实际录取线可能有变化">
              ⚠️ 数据较旧
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
