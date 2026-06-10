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
            输入分数，AI自动帮你
            <br />
            <span className="text-yellow-300">填好志愿</span>
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-lg text-blue-100 sm:text-xl">
            基于云南省近5年真实录取位次数据，免费生成"冲/稳/保"志愿方案
          </p>

          <Link
            href="/recommend"
            className="inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-blue-600 shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
          >
            免费生成志愿方案 →
          </Link>

          <p className="mt-4 text-sm text-blue-200">
            数据来源：云南省招生考试院历年公布数据
          </p>
        </div>
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
              收录全国350所高校在滇近5年录取位次，
              1000+个真实专业数据，不用到处翻官网
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">🧠</div>
            <h3 className="mb-2 text-lg font-semibold">AI算得准</h3>
            <p className="text-sm text-gray-500">
              基于位次差算法，自动分"冲/稳/保"三级，
              比人工翻志愿书准得多
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">⚡</div>
            <h3 className="mb-2 text-lg font-semibold">10秒出结果</h3>
            <p className="text-sm text-gray-500">
              输入分数→AI分析→生成方案，不到10秒。
              志愿填报窗口只有5天，时间就是录取机会
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
            { step: '1', title: '输入分数和位次', desc: '加上你的省份、选科和偏好' },
            { step: '2', title: 'AI智能分析', desc: '基于近5年数据生成三级推荐' },
            { step: '3', title: '查看志愿方案', desc: '冲/稳/保一目了然，点击看详情' },
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

      {/* 信任标志 */}
      <section className="mb-8 rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
        <h2 className="mb-6 text-xl font-bold text-gray-800">
          数据来源权威可靠
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <span>📋 云南省招生考试院</span>
          <span>🎓 阳光高考网</span>
          <span>📚 各高校招生章程</span>
          <span>📈 近三年录取位次数据</span>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/recommend"
          className="inline-block rounded-full bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95"
        >
          现在免费生成志愿方案 →
        </Link>
        <p className="mt-3 text-sm text-gray-400">
          无需注册，输入分数直接看结果
        </p>
      </div>
    </div>
  );
}
