import { NextRequest, NextResponse } from 'next/server';
import { generateVideo, canGenerateVideo } from '@/lib/deepseek';

/**
 * POST /api/video
 * 生成志愿推荐短视频
 * ⚠️ 视频生成耗时30-120s，Netlify 10s限制可能超时
 * 前端建议：显示"生成中"状态 + 轮询
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { score, rank, province, subject_group, tier_summary } = body;

    if (!score || !rank) {
      return NextResponse.json({ error: '缺少分数/位次' }, { status: 400 });
    }

    if (!canGenerateVideo()) {
      return NextResponse.json({ error: '视频生成功能未配置' }, { status: 503 });
    }

    const provinceName = province === 'yunnan' ? '云南省' : province || '云南省';
    const groupName = subject_group || '理工类';

    const prompt = `A short vertical video (9:16 aspect ratio) for sharing on WeChat Moments and Xiaohongshu about Chinese college entrance exam (Gaokao) volunteer recommendation.

Title: "2026高考志愿推荐" in bold Chinese text with animation.

Content sequence:
1. Opening: "考生分数: ${score}分 · 全省位次: 第${rank}名 · ${provinceName} · ${groupName}" displayed with a smooth fade-in effect over a blue gradient background.
2. Three recommendation cards slide in one by one:
${tier_summary || '- 冲刺：云南大学、昆明理工大学\n- 稳妥：云南师范大学、云南财经大学\n- 保底：大理大学、红河学院'}
3. Closing: "扫码免费生成你的方案" with website "yunnan-gaokao.netlify.app", white text on gradient background.

Style: clean modern Chinese aesthetic, professional education theme, suitable for social media, vertical 9:16, 10-15 seconds duration, smooth transitions.`;

    const videoUrl = await generateVideo(prompt);

    return NextResponse.json({ videoUrl, generated_at: new Date().toISOString() });
  } catch (error: any) {
    console.error('视频生成失败:', error);
    return NextResponse.json(
      { error: error?.message || '视频生成失败，请稍后重试' },
      { status: 500 },
    );
  }
}
