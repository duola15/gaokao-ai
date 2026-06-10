'use client';

import { useState, useMemo } from 'react';
import { allSchools, getAllAdmissionRecords } from '@/lib/seed_data';
import type { AdmissionRecord } from '@/lib/types';

const FILTER_TYPES = ['全部', '985', '211', '双一流', '综合类', '理工类', '师范类', '医药类', '财经类', '农林类', '政法类', '艺术类', '体育类'];

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [subjectFilter, setSubjectFilter] = useState<'全部' | '理工类' | '文史类'>('全部');

  const allRecords = useMemo(() => getAllAdmissionRecords(), []);

  // 每校的最新数据年份 + 总记录数
  const schoolStats = useMemo(() => {
    const map = new Map<number, { latestYear: number; years: number[]; recordCount: number; subjects: Set<string> }>();
    for (const r of allRecords) {
      let s = map.get(r.school_id);
      if (!s) { s = { latestYear: 0, years: [], recordCount: 0, subjects: new Set() }; map.set(r.school_id, s); }
      if (r.year > s.latestYear) s.latestYear = r.year;
      s.recordCount++;
      s.subjects.add(r.subject_group);
      if (!s.years.includes(r.year)) s.years.push(r.year);
    }
    return map;
  }, [allRecords]);

  // 搜索+过滤
  const filteredSchools = useMemo(() => {
    let list = [...allSchools];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.school_type.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== '全部') {
      list = list.filter(s => s.school_type.includes(typeFilter));
    }
    if (subjectFilter !== '全部') {
      list = list.filter(s => {
        const st = schoolStats.get(s.id);
        return st?.subjects.has(subjectFilter);
      });
    }
    // 有数据的排前面
    list.sort((a, b) => {
      const sa = schoolStats.get(a.id)?.recordCount || 0;
      const sb = schoolStats.get(b.id)?.recordCount || 0;
      if (sa !== sb) return sb - sa;
      return a.name.localeCompare(b.name, 'zh');
    });
    return list;
  }, [search, typeFilter, subjectFilter, schoolStats]);

  const toggleSchool = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
    else if (selectedIds.length < 5) setSelectedIds([...selectedIds, id]);
  };

  const selectedSchools = allSchools.filter(s => selectedIds.includes(s.id));

  // 获取某校最佳展示年份的数据
  function getBestRecords(schoolId: number): { year: number; records: AdmissionRecord[] } {
    const recs = allRecords.filter(r => r.school_id === schoolId);
    if (recs.length === 0) return { year: 0, records: [] };
    // 优先2025 → 2022 → 2021 → 最新
    for (const yr of [2025, 2022, 2021, 2020, 2018, 2017]) {
      const yrRecs = recs.filter(r => r.year === yr);
      if (yrRecs.length > 0) return { year: yr, records: yrRecs };
    }
    const maxYr = Math.max(...recs.map(r => r.year));
    return { year: maxYr, records: recs.filter(r => r.year === maxYr) };
  }

  return (
    <div className="page-enter pb-8">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-extrabold text-gray-800">多校对比</h1>
        <p className="mt-1 text-sm text-gray-500">
          选择 2-5 所学校横向对比（已选 {selectedIds.length}/5）· 共 {allSchools.length} 所学校
        </p>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="mb-3 flex gap-2">
        <input
          type="text" placeholder={`🔍 搜索学校名称/城市...（共${allSchools.length}所）`}
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className="py-1 text-xs text-gray-400">类型：</span>
        {FILTER_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{t}</button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <span className="py-1 text-xs text-gray-400">选科：</span>
        {(['全部', '理工类', '文史类'] as const).map(t => (
          <button key={t} onClick={() => setSubjectFilter(t)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
              subjectFilter === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{t === '全部' ? '全部' : t === '理工类' ? '🔬 理科' : '📖 文科'}</button>
        ))}
      </div>

      {/* 已选标签 */}
      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 px-4 py-3">
          <span className="text-xs font-medium text-blue-700">已选：</span>
          {selectedSchools.map(s => (
            <span key={s.id} className="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs text-white">
              {s.name}
              <button onClick={() => toggleSchool(s.id)} className="ml-0.5 font-bold hover:text-red-200">×</button>
            </span>
          ))}
          {selectedIds.length >= 2 && (
            <button onClick={() => window.scrollTo({ top: 9999, behavior: 'smooth' })}
              className="ml-auto rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-800">
              开始对比 ↓
            </button>
          )}
        </div>
      )}

      {/* 学校列表 */}
      <div className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSchools.map(s => {
          const st = schoolStats.get(s.id);
          return (
            <button key={s.id} onClick={() => toggleSchool(s.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                selectedIds.includes(s.id)
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate font-semibold text-gray-800">{s.name}</span>
                <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-xs ${
                  s.school_type.includes('985') ? 'bg-red-100 text-red-600' :
                  s.school_type.includes('211') ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-100 text-gray-500'
                }`}>{s.school_type.slice(0, 8)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                <span>{s.city}</span>
                {st && (
                  <span className="text-blue-400">{st.recordCount}条数据({st.latestYear}年)</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── 对比表格 ─── */}
      {selectedSchools.length >= 2 && (
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-bold text-gray-800">📊 多维度对比</h2>
            <p className="mt-1 text-xs text-gray-400">
              数据来自历年公开录取信息，仅供参考。请以官方发布为准。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 p-4 text-left font-semibold text-gray-700">对比维度</th>
                  {selectedSchools.map(s => (
                    <th key={s.id} className="p-4 text-left font-semibold text-gray-800">
                      <div>{s.name}</div>
                      <span className="text-xs font-normal text-gray-400">{s.school_type}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>

                {/* 基本信息 */}
                <tr className="border-b">
                  <td className="sticky left-0 bg-white p-4 font-medium text-gray-500">学校层次</td>
                  {selectedSchools.map(s => {
                    const tags = [];
                    if (s.school_type.includes('985')) tags.push('🏆 985');
                    if (s.school_type.includes('211')) tags.push('🥇 211');
                    if (s.school_type.includes('双一流')) tags.push('🌟 双一流');
                    if (tags.length === 0) tags.push(s.school_type);
                    return <td key={s.id} className="p-4 text-gray-800">{tags.join(' · ')}</td>;
                  })}
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="sticky left-0 bg-gray-50 p-4 font-medium text-gray-500">城市</td>
                  {selectedSchools.map(s => (
                    <td key={s.id} className="p-4 text-gray-800">{s.city || '-'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="sticky left-0 bg-white p-4 font-medium text-gray-500">数据年份</td>
                  {selectedSchools.map(s => {
                    const st = schoolStats.get(s.id);
                    return (
                      <td key={s.id} className="p-4 text-gray-800">
                        {st ? st.years.sort((a,b) => b-a).join('、') : <span className="text-gray-400">暂无</span>}
                      </td>
                    );
                  })}
                </tr>

                {/* 录取分 */}
                <tr className="border-b bg-blue-50">
                  <td className="sticky left-0 bg-blue-50 p-4 font-semibold text-gray-700">
                    最低分/位次<br /><span className="text-xs font-normal text-gray-400">（最新年份）</span>
                  </td>
                  {selectedSchools.map(s => {
                    const best = getBestRecords(s.id);
                    if (best.records.length === 0) return <td key={s.id} className="p-4 text-gray-400">-</td>;
                    // 理科优先
                    const li = best.records.filter(r => r.subject_group.includes('理'));
                    const wen = best.records.filter(r => r.subject_group.includes('文'));
                    const main = li.length > 0 ? li : best.records;
                    const minRec = main.reduce((a,b) => a.min_score < b.min_score ? a : b);
                    return (
                      <td key={s.id} className="p-4">
                        <div className="font-bold text-blue-600">{minRec.min_score}分</div>
                        <div className="text-xs text-gray-400">{minRec.min_rank}名</div>
                        <div className="text-xs text-gray-300">({best.year}年·{li.length>0?'理':'文'})</div>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b bg-green-50">
                  <td className="sticky left-0 bg-green-50 p-4 font-semibold text-gray-700">
                    最高分/位次<br /><span className="text-xs font-normal text-gray-400">（最新年份）</span>
                  </td>
                  {selectedSchools.map(s => {
                    const best = getBestRecords(s.id);
                    if (best.records.length === 0) return <td key={s.id} className="p-4 text-gray-400">-</td>;
                    const li = best.records.filter(r => r.subject_group.includes('理'));
                    const main = li.length > 0 ? li : best.records;
                    const maxRec = main.reduce((a,b) => a.min_score > b.min_score ? a : b);
                    return (
                      <td key={s.id} className="p-4">
                        <div className="font-bold text-green-600">{maxRec.min_score}分</div>
                        <div className="text-xs text-gray-400">{maxRec.min_rank}名</div>
                      </td>
                    );
                  })}
                </tr>

                {/* 平均位次 */}
                <tr className="border-b">
                  <td className="sticky left-0 bg-white p-4 font-medium text-gray-500">平均录取位次</td>
                  {selectedSchools.map(s => {
                    const best = getBestRecords(s.id);
                    const li = best.records.filter(r => r.subject_group.includes('理'));
                    const main = li.length > 0 ? li : best.records;
                    const valid = main.filter(r => r.avg_rank > 0);
                    if (valid.length === 0) return <td key={s.id} className="p-4 text-gray-400">-</td>;
                    const avgRank = Math.round(valid.reduce((a,b) => a + b.avg_rank, 0) / valid.length);
                    return <td key={s.id} className="p-4 text-gray-800">约 {avgRank.toLocaleString()} 名</td>;
                  })}
                </tr>

                {/* 专业数量 */}
                <tr className="border-b bg-gray-50">
                  <td className="sticky left-0 bg-gray-50 p-4 font-medium text-gray-500">专业数量</td>
                  {selectedSchools.map(s => {
                    const st = schoolStats.get(s.id);
                    return <td key={s.id} className="p-4 text-gray-800">{st?.recordCount || 0} 条记录</td>;
                  })}
                </tr>
                <tr className="border-b">
                  <td className="sticky left-0 bg-white p-4 font-medium text-gray-500">选科覆盖</td>
                  {selectedSchools.map(s => {
                    const st = schoolStats.get(s.id);
                    const subs = st?.subjects ? [...st.subjects] : [];
                    return (
                      <td key={s.id} className="p-4 text-gray-800">
                        <div className="flex gap-1">
                          {subs.includes('理工类') && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">理科</span>}
                          {subs.includes('文史类') && <span className="rounded bg-pink-100 px-1.5 py-0.5 text-xs text-pink-600">文科</span>}
                          {subs.length === 0 && <span className="text-gray-400">-</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Top-3 专业 */}
                <tr className="border-b">
                  <td className="sticky left-0 bg-white p-4 font-medium text-gray-500">高分专业 Top-3</td>
                  {selectedSchools.map(s => {
                    const best = getBestRecords(s.id);
                    const top3 = [...best.records].sort((a,b) => b.min_score - a.min_score).slice(0, 3);
                    if (top3.length === 0) return <td key={s.id} className="p-4 text-gray-400">暂无</td>;
                    return (
                      <td key={s.id} className="p-4">
                        {top3.map((r, i) => (
                          <div key={i} className="mb-1 text-xs leading-relaxed">
                            <span className="text-gray-500">{i+1}.</span>{' '}
                            <span className="text-gray-800">{r.major_name.slice(0, 20)}</span>
                            <span className="ml-1 text-gray-400">({r.min_score}分)</span>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 表格底部提示 */}
          <div className="border-t bg-amber-50 px-5 py-3">
            <p className="text-xs text-amber-700">
              ⚠️ 以上数据来自历年公开录取信息，仅供参考。不同年份分数不可直接比较，请以位次为主要参考。
              最终填报请以{' '}
              <a href="https://www.ynzs.cn" target="_blank" rel="noopener noreferrer" className="font-semibold underline">云南省招生考试院</a>
              {' '}和{' '}
              <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener noreferrer" className="font-semibold underline">阳光高考网</a>
              {' '}官方发布为准。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
