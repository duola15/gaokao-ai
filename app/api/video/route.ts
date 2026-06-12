import { NextRequest, NextResponse } from 'next/server';
import { generateVideo, canGenerateVideo } from '@/lib/deepseek';
import { checkRateLimit, getClientIP, RATE_LIMIT_CONFIG } from '@/lib/rate-limit';

/**
 * 视频任务存储（内存，同一Netlify实例内有效）
 * 键：taskId → 值：{ status, videoUrl?, error? }
 */
const videoTasks = new Map<string, { status: 'generating' | 'done' | 'error'; videoUrl?: string; error?: string }>();

// 定期清理过期任务（30分钟后清理）
setInterval(() => {
  const now = Date.now();
  for (const [key, task] of videoTasks) {
    const created = Number(key.split('_')[1]);
    if (now - created > 30 * 60 * 1000) videoTasks.delete(key);
  }
}, 60000);

/**
 * POST /api/video
 * 异步生成志愿推荐短视频
 * 立即返回 taskId，前端轮询 GET /api/video?taskId=xxx
 */
export async function POST(req: NextRequest) {
  try {
    // 限流检查（视频生成极贵）
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(
      `video:${ip}`,
      RATE_LIMIT_CONFIG.video.max,
      RATE_LIMIT_CONFIG.video.windowMs,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: '视频生成过于频繁，请稍后再试（每2分钟3次）' },
        { status: 429 },
      );
    }

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

    // 创建异步任务
    const taskId = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    videoTasks.set(taskId, { status: 'generating' });

    // 异步生成（不阻塞响应）
    generateVideo(prompt)
      .then((videoUrl) => {
        videoTasks.set(taskId, { status: 'done', videoUrl });
      })
      .catch((err) => {
        videoTasks.set(taskId, { status: 'error', error: err?.message || '视频生成失败' });
      });

    return NextResponse.json({
      taskId,
      status: 'generating',
      message: '视频生成已启动，预计30-90秒',
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('视频生成失败:', error);
    return NextResponse.json(
      { error: error?.message || '视频生成失败，请稍后重试' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/video?taskId=xxx
 * 查询视频生成状态
 */
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: '缺少 taskId' }, { status: 400 });
  }

  const task = videoTasks.get(taskId);
  if (!task) {
    return NextResponse.json({ error: '任务不存在或已过期' }, { status: 404 });
  }

  return NextResponse.json(task);
}
