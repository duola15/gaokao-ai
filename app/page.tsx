import Link from 'next/link';

export default function Home() {
  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="hero-gradient -mx-4 -mt-2 mb-10 rounded-b-3xl px-4 pb-16 pt-12 text-white sm:pt-20 sm:pb-20">
        <div className="text-center">
          <div className="mb-3 inline-block rounded-full bg-white/20 px-4 py-1 text-sm backdrop-blur-sm">
            🎓 2026高考 · 云南省版
          </div>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            输入分数，AI帮你
            <br />
            <span className="text-yellow-300">填好志愿</span>
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-lg text-blue-100 sm:text-xl">
            基于历年录取位次数据，免费生成"冲/稳/保"志愿方案
          </p>

          <Link
            href="/recommend"
            className="inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-blue-600 shadow-lg transition-all hover:scale-105 hover:scale-95 active:scale-95"
          >
            免费生成志愿方案 →
          </Link>

          <p className="mt-4 text-sm text-blue-200">
            数据来源：云南省招生考试院(ynzs.cn) · 阳光高考网(gaokao.chsi.com.cn) 历年公开数据
          </p>
        </div>
      </section>

      {/* ⚠️ 免责声明（置顶） */}
      <section className="mb-8 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
        <p className="mb-2 font-semibold">⚠️ 重要声明</p>
        <ul className="list-inside list-disc space-y-1">
          <li>本工具为免费公益项目，数据来自历年公开录取信息整理，<strong>仅供参考</strong></li>
          <li>AI 分析基于历史数据推算，存在偏差，<strong>不构成志愿填报建议或录取承诺</strong></li>
          <li>
            最终志愿填报请以{' '}
            <a href="https://www.ynzs.cn" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">云南省招生考试院(ynzs.cn)</a>
            {' '}和{' '}
            <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">阳光高考网(gaokao.chsi.com.cn)</a>
            {' '}官方发布为准
          </li>
          <li>建议将推荐结果与学校招生章程、班主任/老师建议交叉验证</li>
        </ul>
      </section>

      {/* 三大核心价值 */}
      <section className="mb-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-800">
          为什么用AI填志愿？
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">📊</div>
            <h3 className="mb-2 text-lg font-semibold">数据全</h3>
            <p className="text-sm text-gray-500">
              收录430+所高校在滇历年录取位次，1500+个专业数据，覆盖2017-2025年
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">🧠</div>
            <h3 className="mb-2 text-lg font-semibold">AI辅助分析</h3>
            <p className="text-sm text-gray-500">
              基于位次差算法+AI，自动分"冲/稳/保"三级，比翻志愿书效率高<br /><span className="text-amber-600">（AI分析仅供参考）</span>
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">⚡</div>
            <h3 className="mb-2 text-lg font-semibold">秒出结果</h3>
            <p className="text-sm text-gray-500">
              输入分数→推荐数据秒出，AI分析流式输出。志愿填报窗口短，效率就是机会
            </p>
          </div>
        </div>
      </section>

      {/* 如何使用 */}
      <section className="mb-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-800">
          三步搞定志愿填报
        </h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {[
            { step: '1', title: '输入分数和位次', desc: '省份、选科、偏好城市和专业' },
            { step: '2', title: 'AI智能分析', desc: '基于历年数据生成三级推荐（仅供参考）' },
            { step: '3', title: '交叉验证', desc: '对照官方数据，最终自己决策' },
          ].map((item) => (
            <div
              key={item.step}
              className="flex w-full items-center gap-4 rounded-xl bg-white p-5 shadow-sm sm:w-auto sm:flex-col sm:text-center"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {item.step}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">{item.title}</h4>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 数据来源 */}
      <section className="mb-8 rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
        <h2 className="mb-6 text-xl font-bold text-gray-800">
          数据来源与声明
        </h2>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <a href="https://www.ynzs.cn" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">📋 云南省招生考试院 ynzs.cn</a>
          <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">🎓 阳光高考网 gaokao.chsi.com.cn</a>
          <span>📚 各高校招生章程</span>
          <span>📈 2017-2025年录取位次数据</span>
        </div>
        <p className="text-sm text-gray-400">
          数据从公开渠道收集整理，无法保证100%完整准确。请以官方最新发布为准。
          本工具不收集用户隐私，不收费，不构成任何形式的录取承诺。
        </p>
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/recommend"
          className="inline-block rounded-full bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95"
        >
          免费生成志愿方案 →
        </Link>
        <p className="mt-3 text-sm text-gray-400">
          无需注册，输入分数直接看结果 · 仅供参考
        </p>
      </div>
    </div>
  );
}
