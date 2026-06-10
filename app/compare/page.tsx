'use client';

import { useState, useMemo } from 'react';
import { yunnanSchools, getYunnanAdmissionRecords } from '@/lib/seed_data';

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [search, setSearch] = useState('');

  const allRecords = getYunnanAdmissionRecords();

  // 搜索过滤
  const filteredSchools = useMemo(() => {
    if (!search.trim()) return yunnanSchools;
    const q = search.toLowerCase();
    return yunnanSchools.filter(
      s => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.school_type.toLowerCase().includes(q)
    );
  }, [search]);

  const toggleSchool = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedSchools = yunnanSchools.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="page-enter pb-8">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-extrabold text-gray-800">多校对比</h1>
        <p className="mt-1 text-sm text-gray-500">
          选择2-4所学校，横向对比录取位次和专业（已选{selectedIds.length}/4所）
        </p>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <input
          type="text" placeholder="🔍 搜索学校名称或城市（共350所）..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* 已选学校 */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 px-4 py-3">
          <span className="text-xs font-medium text-blue-700">已选：</span>
          {selectedSchools.map(s => (
            <span key={s.id} className="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs text-white">
              {s.name}
              <button onClick={() => toggleSchool(s.id)} className="ml-0.5 font-bold hover:text-red-200">×</button>
            </span>
          ))}
          {selectedIds.length >= 2 && (
            <button
              onClick={() => setShowResult(!showResult)}
              className="ml-auto rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
            >
              {showResult ? '隐藏对比' : '开始对比 →'}
            </button>
          )}
        </div>
      )}

      {/* 学校列表 */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {filteredSchools.map((s) => (
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
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{s.school_type}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">{s.city}</p>
          </button>
        ))}
        {filteredSchools.length === 0 && (
          <p className="col-span-2 py-8 text-center text-gray-400">没有找到匹配的学校</p>
        )}
      </div>

      {/* 对比表格 */}
      {showResult && selectedSchools.length >= 2 && (
        <div className="overflow-x-auto scroll-x rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left font-semibold text-gray-700">维度</th>
                {selectedSchools.map((s) => (
                  <th key={s.id} className="p-4 text-left font-semibold text-gray-800">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4 font-medium text-gray-500">学校层次</td>
                {selectedSchools.map((s) => (
                  <td key={s.id} className="p-4 text-gray-800">{s.school_type}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-4 font-medium text-gray-500">城市</td>
                {selectedSchools.map((s) => (
                  <td key={s.id} className="p-4 text-gray-800">{s.city}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-4 font-medium text-gray-500">优势专业（2025最高分Top3）</td>
                {selectedSchools.map((s) => {
                  const topMajors = allRecords
                    .filter((r) => r.school_id === s.id && r.year === 2025)
                    .sort((a, b) => b.min_score - a.min_score)
                    .slice(0, 3);
                  return (
                    <td key={s.id} className="p-4 text-gray-800">
                      {topMajors.length === 0 ? (
                        <span className="text-gray-400">暂无数据</span>
                      ) : (
                        topMajors.map((r, i) => (
                          <div key={i} className="mb-1 text-xs">
                            {r.major_name.slice(0, 18)}（{r.min_score}分/{r.min_rank}名）
                          </div>
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b bg-gray-50">
                <td className="p-4 font-semibold text-gray-700">最低录取分（2025）</td>
                {selectedSchools.map((s) => {
                  const minRec = allRecords
                    .filter((r) => r.school_id === s.id && r.year === 2025)
                    .sort((a, b) => a.min_score - b.min_score)[0];
                  return (
                    <td key={s.id} className="p-4">
                      <span className="text-lg font-bold text-blue-600">{minRec?.min_score || '-'}</span>
                      <span className="ml-1 text-xs text-gray-400">分</span>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b">
                <td className="p-4 font-medium text-gray-500">最高录取分（2025）</td>
                {selectedSchools.map((s) => {
                  const maxRec = allRecords
                    .filter((r) => r.school_id === s.id && r.year === 2025)
                    .sort((a, b) => b.min_score - a.min_score)[0];
                  return (
                    <td key={s.id} className="p-4">
                      <span className="text-lg font-bold text-green-600">{maxRec?.min_score || '-'}</span>
                      <span className="ml-1 text-xs text-gray-400">分</span>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b">
                <td className="p-4 font-medium text-gray-500">专业数量（2025）</td>
                {selectedSchools.map((s) => {
                  const count = new Set(
                    allRecords.filter((r) => r.school_id === s.id && r.year === 2025).map(r => r.major_name)
                  ).size;
                  return <td key={s.id} className="p-4 text-gray-800">{count} 个</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
