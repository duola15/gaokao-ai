import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/deepseek';
import { fillPrompt, SCHOOL_ANALYSIS_PROMPT } from '@/lib/prompts';
import { yunnanSchools, getYunnanAdmissionRecords } from '@/lib/seed_data';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少学校ID' }, { status: 400 });
  }

  const schoolId = Number(id);
  const school = yunnanSchools.find((s) => s.id === schoolId);
  if (!school) {
    return NextResponse.json({ error: '学校不存在' }, { status: 404 });
  }

  const allRecords = getYunnanAdmissionRecords();
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

  return NextResponse.json({
    school,
    admissionRecords: schoolRecords,
    ai_analysis: aiAnalysis,
  });
}
