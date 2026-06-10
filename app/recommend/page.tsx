'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOP_CITIES, MORE_CITIES } from '@/lib/city_data';

export default function RecommendPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    score: '',
    rank: '',
    subject_group: '理工类' as '理工类' | '文史类',
    subjects: [] as string[],
    preferred_cities: [] as string[],
    major_direction: '',
  });
  const [loading, setLoading] = useState(false);
  const [showMoreCities, setShowMoreCities] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const subjectPresets = ['物化生', '物化地', '物化政', '物生地', '物生政', '物地政', '史地政', '史政生', '史生化', '史地化'];
  const majorDirections = [
    '计算机/人工智能', '软件工程', '电子信息/通信', '电气/自动化', '机械/航空航天',
    '临床医学', '口腔医学', '药学/中药学', '护理学',
    '师范/教育', '财经/会计', '金融/经济', '工商管理',
    '法学', '新闻传播', '建筑/土木', '农林/园艺',
    '外语/英语', '中文/历史', '材料/化工', '生物/食品',
  ];

  const allCities = [...TOP_CITIES, ...MORE_CITIES];
  const filteredCities = citySearch
    ? allCities.filter(c => c.includes(citySearch))
    : MORE_CITIES;

  const toggleCity = (city: string) => {
    setForm(prev => ({
      ...prev,
      preferred_cities: prev.preferred_cities.includes(city)
        ? prev.preferred_cities.filter(c => c !== city)
        : [...prev.preferred_cities, city],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const params = new URLSearchParams({
      score: form.score,
      rank: form.rank,
      province: 'yunnan',
      subject_group: form.subject_group,
      subjects: form.subjects.join(',') || '无',
      cities: form.preferred_cities.join(',') || '不限',
      major_direction: form.major_direction || '不限',
    });
    router.push(`/result?${params.toString()}`);
  };

  const isFormValid = form.score && form.rank && Number(form.score) > 0 && Number(form.rank) > 0;

  return (
    <div className="page-enter">
      <div className="mb-6 mt-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回首页
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800 sm:text-3xl">输入你的高考信息</h1>
        <p className="mt-2 text-gray-500">填得越详细，AI推荐越精准</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 分数 & 位次 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">📊 核心信息（必填）</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600">高考分数</label>
              <input
                type="number" inputMode="numeric" placeholder="例如：580"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg font-semibold text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600">全省位次</label>
              <input
                type="number" inputMode="numeric" placeholder="例如：15000"
                value={form.rank}
                onChange={(e) => setForm({ ...form, rank: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg font-semibold text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                required
              />
              <p className="mt-1 text-xs text-gray-400">高考成绩单上会显示你的全省排名</p>
            </div>
          </div>
        </div>

        {/* 选科类别 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">📚 选科类别</h2>
          <div className="flex gap-3">
            {(['理工类', '文史类'] as const).map((g) => (
              <button key={g} type="button"
                onClick={() => setForm({ ...form, subject_group: g })}
                className={`rounded-full px-6 py-3 font-medium transition ${
                  form.subject_group === g
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 选科组合 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">🔬 选科组合（可选）</h2>
          <p className="mb-2 text-xs text-gray-400">快捷选择</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {subjectPresets.map((preset) => {
              const map: Record<string, string> = { '物':'物理', '化':'化学', '生':'生物', '史':'历史', '地':'地理', '政':'政治' };
              const mapped = preset.split('').map((c: string) => map[c] || '');
              return (
                <button key={preset} type="button"
                  onClick={() => setForm({ ...form, subjects: mapped })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    JSON.stringify(form.subjects.sort()) === JSON.stringify(mapped.sort())
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}>
                  {preset}
                </button>
              );
            })}
          </div>
          <p className="mb-2 text-xs text-gray-400">逐科选择</p>
          <div className="flex flex-wrap gap-2">
            {['物理', '化学', '生物', '历史', '地理', '政治'].map((s) => (
              <button key={s} type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    subjects: prev.subjects.includes(s)
                      ? prev.subjects.filter(v => v !== s)
                      : [...prev.subjects, s],
                  }));
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  form.subjects.includes(s)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 偏好城市 —— 云南优先 + 全国 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">🏙️ 想去哪个城市读书？（可选）</h2>
          <p className="mb-2 text-xs text-gray-400">热门城市</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {TOP_CITIES.map((c) => (
              <button key={c} type="button" onClick={() => toggleCity(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  form.preferred_cities.includes(c)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>
                {c}
              </button>
            ))}
          </div>

          {!showMoreCities && (
            <button type="button" onClick={() => setShowMoreCities(true)}
              className="text-xs text-blue-600 hover:text-blue-800">
              展开更多城市 ▼（共 {allCities.length} 个，全部来自真实录取数据）
            </button>
          )}

          {showMoreCities && (
            <>
              <div className="mb-2 mt-3">
                <input
                  type="text" placeholder="🔍 搜索城市..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto scroll-x">
                {filteredCities.map((c) => (
                  <button key={c} type="button" onClick={() => toggleCity(c)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      form.preferred_cities.includes(c)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setShowMoreCities(false); setCitySearch(''); }}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600">
                收起 ▲
              </button>
            </>
          )}
          {form.preferred_cities.length > 0 && (
            <p className="mt-2 text-xs text-blue-600">已选 {form.preferred_cities.length} 个城市</p>
          )}
        </div>

        {/* 专业方向 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">🎯 专业方向（可选）</h2>
          <div className="flex flex-wrap gap-2">
            {majorDirections.map((d) => (
              <button key={d} type="button"
                onClick={() => setForm({ ...form, major_direction: form.major_direction === d ? '' : d })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  form.major_direction === d
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 提交 */}
        <button type="submit" disabled={!isFormValid || loading}
          className={`w-full rounded-2xl py-5 text-lg font-bold text-white shadow-lg transition-all ${
            isFormValid && !loading
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-[1.02] active:scale-95'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI正在分析中...
            </span>
          ) : '🚀 生成志愿方案'}
        </button>
        {!isFormValid && <p className="text-center text-sm text-gray-400">请先填写分数和位次</p>}
      </form>
    </div>
  );
}
