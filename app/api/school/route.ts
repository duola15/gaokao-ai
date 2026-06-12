import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/deepseek';
import { fillPrompt, SCHOOL_ANALYSIS_PROMPT } from '@/lib/prompts';
import { allSchools, getAllAdmissionRecords } from '@/lib/seed_data';
import { checkRateLimit, getClientIP, RATE_LIMIT_CONFIG } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  // 限流检查（查询较便宜，宽松限制）
  const ip = getClientIP(req);
  const { allowed } = checkRateLimit(
    `school:${ip}`,
    RATE_LIMIT_CONFIG.school.max,
    RATE_LIMIT_CONFIG.school.windowMs,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429 },
    );
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少学校ID' }, { status: 400 });
  }

  const schoolId = Number(id);
  if (isNaN(schoolId)) {
    return NextResponse.json({ error: '学校ID格式错误' }, { status: 400 });
  }

  const school = allSchools.find((s) => s.id === schoolId);
  if (!school) {
    return NextResponse.json({ error: '学校不存在' }, { status: 404 });
  }

  const allRecords = getAllAdmissionRecords();
  const schoolRecords = allRecords
    .filter((r) => r.school_id === schoolId)
    .sort((a, b) => b.year - a.year);

  // 尝试 AI 分析
  let aiAnalysis = '';
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    try {
      const schoolData = JSON.stringify({
        name: school.name,
        type: school.school_type,
        city: school.city,
        description: school.description,
        admissionRecords: schoolRecords.slice(0, 15).map((r) => ({
          year: r.year,
          major: r.major_name,
          minScore: r.min_score,
          avgScore: r.avg_score,
          minRank: r.min_rank,
        })),
      }, null, 2);

      const prompt = fillPrompt(SCHOOL_ANALYSIS_PROMPT, { school_data: schoolData });
      aiAnalysis = await chat([{ role: 'user', content: prompt }]);
    } catch {
      aiAnalysis = '';
    }
  }

  // 缓存头：学校数据不会变
  return NextResponse.json(
    {
      school,
      admissionRecords: schoolRecords,
      ai_analysis: aiAnalysis,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    },
  );
}
