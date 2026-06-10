// 高考志愿填报 - 核心类型定义

export interface Province {
  id: number;
  name: string;
  code: string;
}

export interface School {
  id: number;
  name: string;
  city: string;
  province_code: string;
  school_type: string;
  website: string;
  description: string;
}

export interface AdmissionRecord {
  id: number;
  school_id: number;
  major_name: string;
  province_code: string;
  year: number; // 2023 | 2024 | 2025
  batch: string; // 本科批 | 专科批
  min_score: number;
  avg_score: number;
  min_rank: number;
  avg_rank: number;
  subject_group: '物理类' | '历史类' | '理工类' | '文史类';
  subject_requirements: string;
  enrollment_quota: number;
  tuition: number;
}

export interface UserInput {
  score: number;
  rank: number;
  province: string;
  subject_group: '物理类' | '历史类' | '理工类' | '文史类';
  subjects: string; // "物理,化学,生物"
  preferences: {
    cities: string[];
    major_direction?: string;
    exclude_types?: string[];
  };
}

export type RecommendationTier = '冲' | '稳' | '保';

export interface RecommendationItem {
  school: School;
  major: AdmissionRecord;
  tier: RecommendationTier;
  rank_diff: number; // 位次差
  match_score: number; // 匹配度 0-100
}

export interface RecommendationResult {
  input: UserInput;
  recommendations: {
    冲: RecommendationItem[];
    稳: RecommendationItem[];
    保: RecommendationItem[];
  };
  ai_analysis: string;
  generated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
