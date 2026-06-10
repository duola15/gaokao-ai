'use client';

import { useState } from 'react';
import { yunnanSchools, getYunnanAdmissionRecords } from '@/lib/seed_data';

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const toggleSchool = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedSchools = yunnanSchools.filter((s) => selectedIds.includes(s.id));
  const allRecords = getYunnanAdmissionRecords();

  return (
    <div className="page-enter pb-8">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-extrabold text-gray-800">多校对比</h1>
        <p className="mt-1 text-sm text-gray-500">
          选择2-4所学校，横向对比录取位次和专业优势（最多选4所）
        </p>
      </div>

      {/* 选择学校 */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {yunnanSchools.slice(0, 15).map((s) => (
          <button
            key={s.id}
            onClick={() => toggleSchool(s.id)}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
              selectedIds.includes(s.id)
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">{s.name}</span>
              <span className="text-xs text-gray-400">{s.school_type}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">{s.city}</p>
          </button>
        ))}
      </div>

      {selectedIds.length >= 2 && (
        <button
          onClick={() => setShowResult(!showResult)}
          className="mb-6 w-full rounded-2xl bg-blue-600 py-4 text-center font-bold text-white shadow-lg hover:bg-blue-700"
        >
          {showResult ? '重新选择' : `对比 ${selectedIds.length} 所学校 →`}
        </button>
      )}

      {/* 对比结果 */}
      {showResult && selectedSchools.length >= 2 && (
        <div className="overflow-x-auto scroll-x rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left font-semibold text-gray-700">维度</th>
                {selectedSchools.map((s) => (
                  <th key={s.id} className="p-4 text-left font-semibold text-gray-800">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: '学校层次', key: 'school_type' as const },
                { label: '城市', key: 'city' as const },
              ].map((row) => (
                <tr key={row.key} className="border-b">
                  <td className="p-4 font-medium text-gray-500">{row.label}</td>
                  {selectedSchools.map((s) => (
                    <td key={s.id} className="p-4 text-gray-800">
                      {s[row.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {/* 各校有哪些优势专业 */}
              <tr className="border-b">
                <td className="p-4 font-medium text-gray-500">优势专业（录取分最高Top3）</td>
                {selectedSchools.map((s) => {
                  const schoolRecords = allRecords
                    .filter((r) => r.school_id === s.id && r.year === 2025)
                    .sort((a, b) => b.min_score - a.min_score)
                    .slice(0, 3);
                  return (
                    <td key={s.id} className="p-4 text-gray-800">
                      {schoolRecords.map((r) => (
                        <div key={r.major_name} className="mb-1 text-xs">
                          {r.major_name}（{r.min_score}分）
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
              {/* 最低录取分 */}
              <tr className="border-b bg-gray-50">
                <td className="p-4 font-semibold text-gray-700">最低录取分（2025理科）</td>
                {selectedSchools.map((s) => {
                  const minRec = allRecords
                    .filter((r) => r.school_id === s.id && r.year === 2025)
                    .sort((a, b) => a.min_score - b.min_score)[0];
                  return (
                    <td key={s.id} className="p-4">
                      <span className="text-lg font-bold text-blue-600">
                        {minRec?.min_score || '-'}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">分</span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
