import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: '高考志愿AI助手 - 智能填报，精准推荐',
  description: '基于历年录取数据与AI分析，为云南考生提供冲/稳/保三级志愿推荐。输入分数，一键生成专属志愿方案。',
  keywords: '高考志愿填报,云南高考,志愿推荐,AI填志愿,2026高考',
  openGraph: {
    title: '高考志愿AI助手 - 输入分数，精准出方案',
    description: '基于AI和历年数据的智能志愿填报工具',
    type: 'website',
    locale: 'zh_CN',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 antialiased">
        <main className="mx-auto max-w-4xl px-4 pb-20">{children}</main>

        {/* 底部信任栏 */}
        {/* 移动端底部导航 */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-around py-2">
            {[
              { href: '/', label: '首页', emoji: '🏠' },
              { href: '/recommend', label: '填志愿', emoji: '📝' },
              { href: '/compare', label: '对比', emoji: '📊' },
              { href: '/ask', label: '问答', emoji: '💬' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs text-gray-500 hover:text-blue-600"
              >
                <span className="text-lg">{item.emoji}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>

        <footer className="mt-16 border-t bg-white py-8 text-center text-sm text-gray-500">
          <p>数据来源：云南省招生考试院历年公布数据 · 阳光高考网</p>
          <p className="mt-1">
            ⚠️ 本工具提供的数据和分析仅供参考，不构成录取承诺
          </p>
          <p className="mt-1">
            ☕ <a href="https://afdian.com/a/your_username" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">爱发电支持作者</a>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            志愿填报决策请以官方发布信息为准
          </p>
        </footer>
      </body>
    </html>
  );
}
