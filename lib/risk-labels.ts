/**
 * 专业风控标签系统
 * 基于教育部历年红绿牌专业榜单 + 就业市场数据
 *
 * 数据来源：
 *   - 教育部《普通高等学校本科专业目录》
 *   - 麦可思《中国大学生就业报告》历年红绿牌专业
 *   - 人社部紧缺人才目录
 *   - 公开的就业率/薪资统计数据
 */

export interface RiskLabel {
  /** 标签类型 */
  type: 'green' | 'yellow' | 'red';
  /** 标签文字 */
  label: string;
  /** 说明 */
  description: string;
  /** 匹配关键词（专业名包含任一即匹配） */
  keywords: string[];
}

/**
 * 🟢 绿牌专业：高就业率、高薪资、高满意度
 * 国家战略需求 + 市场紧缺
 */
export const GREEN_MAJORS: RiskLabel[] = [
  {
    type: 'green',
    label: '🟢 绿牌·就业好',
    description: '高就业率、高薪资，国家重点需求',
    keywords: [
      '人工智能', '数据科学', '数据科学与大数据技术', '大数据',
      '软件工程', '计算机科学', '计算机科学与技术', '信息安全', '网络空间安全',
      '集成电路', '微电子', '芯片', '电子信息工程',
      '新能源', '能源与动力', '储能科学',
      '机器人工程', '智能制造',
      '临床医学', '口腔医学', '麻醉学', '医学影像学',
      '电气工程', '自动化',
      '物联网工程',
    ],
  },
  {
    type: 'green',
    label: '🟢 绿牌·稳定编制',
    description: '公务员/事业单位/国企招聘需求大',
    keywords: [
      '法学', '会计学', '财务管理', '审计学',
      '汉语言文学', '行政管理', '公共管理',
      '统计学', '数学与应用数学',
      '土木工程', '水利水电工程',
      '师范', '教育学',
    ],
  },
];

/**
 * 🟡 黄牌专业：就业尚可但竞争激烈
 */
export const YELLOW_MAJORS: RiskLabel[] = [
  {
    type: 'yellow',
    label: '🟡 黄牌·竞争大',
    description: '就业尚可但毕业生多，竞争激烈',
    keywords: [
      '工商管理', '市场营销', '国际经济与贸易',
      '英语', '日语', '朝鲜语',
      '金融学', '经济学',
      '新闻学', '广告学', '传播学',
      '生物科学', '生物技术', '环境科学',
      '食品科学', '食品质量与安全',
    ],
  },
];

/**
 * 🔴 红牌专业：就业预警，连续多年就业率低
 * 麦可思历年红牌榜单
 */
export const RED_MAJORS: RiskLabel[] = [
  {
    type: 'red',
    label: '🔴 红牌·就业难',
    description: '连续多年就业率低，薪资偏低，谨慎选择',
    keywords: [
      '历史学', '考古学',
      '音乐表演', '音乐学', '绘画', '美术学', '雕塑',
      '法学', // 法学在红牌和绿牌中都有，取决于层次。双一流法学绿，普通院校法学红
      '应用心理学', '心理学',
      '化学', '应用化学',
      '生物技术', '生物工程',
      '旅游管理', '酒店管理',
      '社会学', '社会工作',
      '哲学',
      '公共事业管理',
    ],
  },
];

/** 所有风险标签 */
const ALL_LABELS: RiskLabel[] = [...GREEN_MAJORS, ...YELLOW_MAJORS, ...RED_MAJORS];

/**
 * 根据专业名称匹配风险标签
 * @param majorName 专业名称
 * @returns 匹配到的风险标签（最多返回2个，绿>黄>红优先级）
 */
export function getRiskLabels(majorName: string): RiskLabel[] {
  const matched: RiskLabel[] = [];

  for (const label of ALL_LABELS) {
    for (const kw of label.keywords) {
      if (majorName.includes(kw)) {
        // 避免重复匹配
        if (!matched.some((m) => m.label === label.label)) {
          matched.push(label);
        }
        break; // 该标签已匹配，跳到下一个标签
      }
    }
  }

  // 按优先级排序：绿 > 黄 > 红
  const typeOrder = { green: 0, yellow: 1, red: 2 };
  matched.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return matched.slice(0, 2);
}

/**
 * 获取专业推荐指数（0-100）
 * 基于风险标签的综合评分
 */
export function getMajorRecommendationScore(majorName: string): number {
  const labels = getRiskLabels(majorName);
  let score = 50; // 默认中性分

  for (const label of labels) {
    if (label.type === 'green') score += 20;
    else if (label.type === 'yellow') score -= 5;
    else if (label.type === 'red') score -= 25;
  }

  return Math.max(0, Math.min(100, score));
}
