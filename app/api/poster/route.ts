import { NextRequest, NextResponse } from 'next/server';
import { generateImage, canGenerateImage } from '@/lib/deepseek';

/**
 * POST /api/poster
 * 生成志愿推荐分享海报（AI 图片生成）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { score, rank, province, subject_group, tier_summary } = body;

    if (!score || !rank) {
      return NextResponse.json({ error: '缺少分数/位次' }, { status: 400 });
    }

    if (!canGenerateImage()) {
      return NextResponse.json({ error: '图片生成功能未配置' }, { status: 503 });
    }

    const provinceName = province === 'yunnan' ? '云南省' : province || '云南省';
    const groupName = subject_group || '理工类';

    // 构建中文描述 prompt
    const prompt = `A clean, modern infographic-style poster for Chinese college entrance exam (Gaokao) volunteer recommendation.

Layout: vertical poster, warm gradient background (soft blue to white), elegant Chinese aesthetic.

Top section: Large title "2026高考志愿推荐" in bold, subtitle "${provinceName} · ${groupName}".

Middle section - Score card: "考生分数: ${score}分 · 全省位次: 第${rank}名" displayed prominently in a rounded card with gold border.

Then three recommendation tiers displayed horizontally in three colored cards:
${tier_summary || 'Based on data analysis, recommendations include冲刺/稳妥/保底 tiers'}

Bottom section: QR code area placeholder with text "扫码免费生成你的方案" and website "yunnan-gaokao.netlify.app".

Style: clean flat design, large readable Chinese text, professional education theme, suitable for sharing on WeChat Moments and Xiaohongshu. No realistic photos, illustration style.`;

    const imageUrl = await generateImage(prompt, '768x1024');

    return NextResponse.json({ imageUrl, generated_at: new Date().toISOString() });
  } catch (error: any) {
    console.error('海报生成失败:', error);
    return NextResponse.json(
      { error: error?.message || '海报生成失败，请稍后重试' },
      { status: 500 },
    );
  }
}
