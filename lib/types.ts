// 高考志愿填报 - 核心类型定义

export type SubjectGroup = '物理类' | '历史类' | '理工类' | '文史类';

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
  year: number; // 2021-2025
  batch: string; // 本科批 | 专科批
  min_score: number;
  avg_score: number;
  min_rank: number;
  avg_rank: number;
  subject_group: SubjectGroup;
  subject_requirements: string;
  enrollment_quota: number;
  tuition: number;
}

export interface UserInput {
  score: number;
  rank: number;
  province: string;
  subject_group: SubjectGroup;
  subjects: string; // "物理,化学,生物"
  preferences: {
    cities: string[];
    major_direction?: string;
    exclude_types?: string[];
  };
}

export type RecommendationTier = '冲' | '稳' | '保';

/** 风险标签 */
export interface RiskTag {
  type: 'green' | 'yellow' | 'red';
  label: string;
  description: string;
}

/** 趋势数据点 */
export interface TrendPoint {
  year: number;
  min_score: number;
  avg_rank: number;
}

export interface RecommendationItem {
  school: School;
  major: AdmissionRecord;
  tier: RecommendationTier;
  rank_diff: number; // 位次差
  match_score: number; // 匹配度 0-100
  /** 该专业风险标签 */
  risk_tags?: RiskTag[];
  /** 该学校近3年录取趋势 */
  trend?: TrendPoint[];
  /** 趋势方向：'up'=录取位次上升(变难), 'down'=录取位次下降(变易), 'stable'=稳定 */
  trend_direction?: 'up' | 'down' | 'stable';
  /** 数据年份（用于时效性提示） */
  data_year?: number;
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
