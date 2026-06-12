import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: '高考志愿AI助手 - AI辅助分析 · 仅供参考',
  description: '基于历年录取数据与AI辅助分析，为云南考生提供冲/稳/保三级志愿推荐。所有分析和数据仅供参考，请以官方发布为准。',
  keywords: '高考志愿填报,云南高考,志愿推荐,AI填志愿,2026高考,仅供参考',
  openGraph: {
    title: '高考志愿AI助手 - AI辅助 · 仅供参考',
    description: '基于历年数据的智能志愿分析工具，所有结果仅供参考',
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

        {/* 移动端底部导航 */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-around py-2">
            {[
              { href: '/', label: '首页', emoji: '🏠' },
              { href: '/recommend', label: '填志愿', emoji: '📝' },
              { href: '/compare', label: '对比', emoji: '📊' },
              { href: '/ask', label: '问答', emoji: '💬' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs text-gray-500 hover:text-blue-600"
              >
                <span className="text-lg">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <footer className="mt-16 border-t bg-white py-6 text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-700">⚠️ 免责声明</p>
          <p className="mt-1">
            本工具数据来自历年公开录取信息（云南省招生考试院、阳光高考网等），
            <strong>所有分析结果仅供参考，不构成志愿填报建议或录取承诺</strong>。
          </p>
          <p className="mt-1">
            志愿填报最终决策请以{' '}
            <a href="https://www.ynzs.cn" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">云南省招生考试院(ynzs.cn)</a>
            {' '}和{' '}
            <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">阳光高考网(gaokao.chsi.com.cn)</a>
            {' '}官方发布为准。
          </p>
          <p className="mt-3">
            ☕ <a href="https://afdian.com/a/gaokao-ai" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">爱发电支持作者</a>
            {' · '}
            <a href="https://github.com/duola15/gaokao-ai" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">GitHub 开源</a>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            本工具免费开放使用，不收集个人信息，无付费墙
          </p>
        </footer>
      </body>
    </html>
  );
}
