'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { School, AdmissionRecord } from '@/lib/types';
import { parseDescription } from '@/lib/recommendation';

function SchoolDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [school, setSchool] = useState<School | null>(null);
  const [records, setRecords] = useState<AdmissionRecord[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/school?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSchool(data.school);
        setRecords(data.admissionRecords || []);
        setAiAnalysis(data.ai_analysis || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mt-20 text-center">
        <p className="text-gray-500">学校不存在</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600">
          ← 返回
        </button>
      </div>
    );
  }

  // 按年份分组
  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);
  const majors = [...new Set(records.map((r) => r.major_name))];

  return (
    <div className="page-enter pb-8">
      <div className="mb-4 mt-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回
        </button>
      </div>

      {/* 学校头部 */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
            {school.school_type}
          </span>
          <span className="text-sm text-blue-100">{school.city}</span>
        </div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{school.name}</h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {parseDescription(school.description).map((tag, i) => (
            <span key={i} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-blue-50 backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 历年录取数据 */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          📈 近三年在云南省录取数据
        </h2>
        <div className="overflow-x-auto scroll-x">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">专业</th>
                {years.map((y) => (
                  <th key={y} className="pb-3 font-medium" colSpan={2}>
                    {y}年
                  </th>
                ))}
              </tr>
              <tr className="border-b text-left text-xs text-gray-400">
                <th></th>
                {years.map((y) => (
                  <th key={y} colSpan={2} className="space-x-2 pb-2 font-normal">
                    <span>最低分</span>
                    <span>位次</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {majors.map((major) => (
                <tr key={major} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium text-gray-700">{major}</td>
                  {years.map((year) => {
                    const rec = records.find(
                      (r) => r.major_name === major && r.year === year
                    );
                    return rec ? (
                      <td key={year} colSpan={2} className="py-3">
                        <span className="font-semibold text-gray-800">{rec.min_score}</span>
                        <span className="ml-2 text-gray-400">/ {rec.min_rank}</span>
                      </td>
                    ) : (
                      <td key={year} colSpan={2} className="py-3 text-gray-300">
                        -
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI 分析 */}
      {aiAnalysis && (
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            🤖 AI 学校分析
          </h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-600">
            {aiAnalysis}
          </div>
        </div>
      )}

      {/* 操作 */}
      <button
        onClick={() => router.back()}
        className="w-full rounded-2xl bg-blue-600 py-4 text-center font-bold text-white shadow-lg hover:bg-blue-700"
      >
        返回结果页
      </button>
    </div>
  );
}

export default function SchoolPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><p className="text-gray-400">加载中...</p></div>}>
      <SchoolDetailContent />
    </Suspense>
  );
}
