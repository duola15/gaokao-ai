'use client';

import type { RecommendationItem } from '@/lib/types';

interface SharePanelProps {
  recommendations: { 冲: RecommendationItem[]; 稳: RecommendationItem[]; 保: RecommendationItem[] };
  input: { score: number; rank: number };
  onClose: () => void;
  onGeneratePoster: () => void;
  onGenerateVideo: () => void;
}

function copyText(text: string, target: string) {
  navigator.clipboard.writeText(text).then(() => {
    alert(target ? `已复制！打开${target} → 粘贴发送` : '链接已复制！');
  }).catch(() => {
    // 降级方案：显示文本让用户手动复制
    prompt('请手动复制以下内容：', text);
  });
}

function buildShareText(
  recommendations: { 冲: RecommendationItem[]; 稳: RecommendationItem[]; 保: RecommendationItem[] },
  input: { score: number; rank: number },
): string {
  return [
    `📊 【${input.score}分·${input.rank}名】高考志愿推荐方案`,
    '',
    '🎯 冲刺：' + (recommendations.冲.slice(0, 3).map((i) => i.school.name).join('、') || '无'),
    '✅ 稳妥：' + (recommendations.稳.slice(0, 3).map((i) => i.school.name).join('、') || '无'),
    '🛡️ 保底：' + (recommendations.保.slice(0, 3).map((i) => i.school.name).join('、') || '无'),
    '',
    '⚠️ 仅供参考，请以 ynzs.cn 和 gaokao.chsi.com.cn 官方数据为准',
    '—— 来自【高考志愿AI助手】：',
  ].join('\n');
}

export default function SharePanel({ recommendations, input, onClose, onGeneratePoster, onGenerateVideo }: SharePanelProps) {
  const shareText = buildShareText(recommendations, input);
  const sharePlatforms = [
    { name: '微信好友', icon: '💬', color: 'bg-green-500', action: () => copyText(shareText + '\n\n🔗 https://yunnan-gaokao.netlify.app', '微信') },
    { name: '朋友圈', icon: '🟢', color: 'bg-green-600', action: () => copyText(shareText + '\n\n🔗 yunnan-gaokao.netlify.app', '朋友圈') },
    { name: 'QQ好友', icon: '🐧', color: 'bg-blue-500', action: () => copyText(shareText + '\n\n🔗 https://yunnan-gaokao.netlify.app', 'QQ') },
    { name: 'QQ空间', icon: '⭐', color: 'bg-yellow-500', action: () => copyText(shareText, 'QQ空间') },
    { name: '微博', icon: '📢', color: 'bg-red-500', action: () => copyText(shareText + '\n#高考志愿# #云南高考#', '微博') },
    { name: '小红书', icon: '📕', color: 'bg-red-400', action: () => copyText(shareText + '\n#高考志愿填报 #云南高考', '小红书') },
    { name: '复制链接', icon: '🔗', color: 'bg-gray-500', action: () => copyText('https://yunnan-gaokao.netlify.app', '') },
    { name: '短信转发', icon: '📱', color: 'bg-indigo-500', action: () => {
      window.open(`sms:?body=${encodeURIComponent(shareText + '\nyunnan-gaokao.netlify.app')}`, '_blank');
    }},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 pb-10 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">分享到</h3>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="mb-5 text-sm text-gray-400">推荐方案仅供交流参考，请以官方数据为准</p>

        <div className="mb-4 flex gap-2">
          <button
            onClick={onGeneratePoster}
            className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 text-center text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] active:scale-95"
          >
            📸 生成图片
          </button>
          <button
            onClick={onGenerateVideo}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-3.5 text-center text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] active:scale-95"
          >
            🎬 生成视频
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {sharePlatforms.map((p) => (
            <button key={p.name} onClick={p.action} className="flex flex-col items-center gap-1.5">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${p.color} text-2xl shadow-md transition hover:scale-105 active:scale-95`}>
                {p.icon}
              </div>
              <span className="text-xs text-gray-500">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
