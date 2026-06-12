'use client';

/**
 * 法律免责声明组件
 *
 * ⚠️ 本组件是降低法律风险的核心模块。
 * 设计原则：
 *   1. "仅供参考"必须出现在每一个展示AI/数据结果的页面上
 *   2. "不构成合同要约/录取承诺/志愿填报建议"三重否定
 *   3. "用户自行承担全部风险"明确责任归属
 *   4. 每个页面都必须有可见的免责声明（不能仅靠footer）
 *   5. 数据时效性必须动态展示
 *
 * 法律依据参考：
 *   - 《中华人民共和国民法典》第472条（要约定义）
 *   - 《中华人民共和国广告法》第4条（真实性原则）
 *   - 《中华人民共和国个人信息保护法》
 *   - 《互联网信息服务算法推荐管理规定》
 *   - 《生成式人工智能服务管理暂行办法》
 */

import Link from 'next/link';

type DisclaimerVariant = 'full' | 'compact' | 'inline' | 'banner' | 'modal';

interface LegalDisclaimerProps {
  /** 显示变体 */
  variant?: DisclaimerVariant;
  /** 动态数据年份（用于时效性提示） */
  dataYears?: number[];
  /** 额外说明（页面特有的风险提示） */
  extraNotes?: string[];
  /** 额外的CSS类名 */
  className?: string;
}

const OFFICIAL_LINKS = (
  <>
    <a href="https://www.ynzs.cn" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">云南省招生考试院(ynzs.cn)</a>
    {' '}和{' '}
    <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">阳光高考网(gaokao.chsi.com.cn)</a>
  </>
);

export default function LegalDisclaimer({
  variant = 'full',
  dataYears,
  extraNotes,
  className = '',
}: LegalDisclaimerProps) {
  if (variant === 'inline') {
    return (
      <span className={`text-amber-700 ${className}`}>
        ⚠️ 仅供参考，不构成志愿填报建议或录取承诺。请以{OFFICIAL_LINKS}官方发布为准。
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800 ${className}`}>
        <strong>⚠️ 重要声明：</strong>
        所有分析和数据<strong>仅供参考</strong>，不构成志愿填报建议或录取承诺。
        最终决策请以{OFFICIAL_LINKS}官方发布为准。
        用户<strong>自行承担</strong>填报风险。
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 ${className}`}>
        <p className="mb-1 font-semibold">⚠️ 重要声明</p>
        <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed">
          <li>本工具为<strong>免费公益项目</strong>，所有数据与AI分析<strong>仅供参考</strong></li>
          <li><strong>不构成</strong>合同要约、录取承诺或志愿填报建议</li>
          {dataYears && dataYears.length > 0 && (
            <li>数据基于{dataYears.join('、')}年公开录取信息，可能存在误差或过时</li>
          )}
          <li>最终志愿填报请以{OFFICIAL_LINKS}官方发布为准</li>
          <li>用户<strong>自行承担</strong>使用本工具产生的全部风险和后果</li>
          {extraNotes?.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
    );
  }

  // ─── full / modal ───
  return (
    <div className={`rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">⚠️</span>
        <p className="font-bold text-amber-900">重要法律声明 · 请仔细阅读</p>
      </div>

      <div className="space-y-3 text-xs leading-relaxed sm:text-sm">
        {/* 1. 项目性质 */}
        <div>
          <p className="font-semibold text-amber-900">一、项目性质</p>
          <p className="mt-0.5">
            本工具（高考志愿AI助手）为<strong>免费公益项目</strong>，目的是帮助考生和家长快速了解历年公开录取数据。
            本工具<strong>不构成</strong>任何形式的合同要约、录取承诺或志愿填报建议。
            所有推荐结果均为算法自动生成，<strong>仅供参考</strong>，不具有任何法律约束力。
          </p>
        </div>

        {/* 2. 数据声明 */}
        <div>
          <p className="font-semibold text-amber-900">二、数据来源与准确性</p>
          <p className="mt-0.5">
            本工具数据从公开渠道收集整理，来源包括{OFFICIAL_LINKS}等官方网站。
            由于数据采集、清洗和转换过程中可能存在误差，<strong>本工具无法保证数据的100%完整性、准确性和时效性</strong>。
            {dataYears && dataYears.length > 0 && (
              <>当前数据覆盖年份：<strong>{dataYears.join('、')}年</strong>，更早或更晚年份的数据可能缺失。</>
            )}
          </p>
        </div>

        {/* 3. AI 分析声明 */}
        <div>
          <p className="font-semibold text-amber-900">三、AI 分析说明</p>
          <p className="mt-0.5">
            本工具使用AI大模型生成分析文本。AI分析基于历史数据推算，<strong>可能存在偏差、错误或过时信息</strong>。
            AI生成内容<strong>不代表</strong>任何官方机构、学校或招生办的立场。
            用户应理性对待AI分析结果，将其作为参考信息之一，而非决策的唯一依据。
          </p>
        </div>

        {/* 4. 责任归属 */}
        <div>
          <p className="font-semibold text-amber-900">四、责任声明</p>
          <p className="mt-0.5">
            用户使用本工具即表示已阅读并理解本声明。<strong>用户自行承担</strong>使用本工具所产生的全部风险和后果，
            包括但不限于：因依赖本工具数据或分析结果而导致的志愿填报失误、录取结果不理想等。
            本工具开发者<strong>不承担</strong>任何因使用或无法使用本工具而产生的直接或间接损失。
          </p>
        </div>

        {/* 5. 官方确认要求 */}
        <div>
          <p className="font-semibold text-amber-900">五、官方确认义务</p>
          <p className="mt-0.5">
            志愿填报的<strong>最终决策</strong>必须以{OFFICIAL_LINKS}官方实时发布的信息为准。
            建议用户同时参考：目标学校招生章程、班主任/老师建议、省招生考试院发布的志愿填报指南。
            <strong>请务必交叉验证</strong>本工具的推荐结果。
          </p>
        </div>

        {/* 6. 隐私与费用 */}
        <div>
          <p className="font-semibold text-amber-900">六、隐私保护与费用</p>
          <p className="mt-0.5">
            本工具<strong>不收集、不存储</strong>用户的个人隐私信息（姓名、身份证号、准考证号等）。
            所有查询在本地处理，分数/位次等输入数据不会上传至任何第三方服务器。
            本工具<strong>完全免费</strong>，无付费墙，无隐藏收费。如遇任何收费行为，请警惕诈骗。
          </p>
        </div>

        {/* 7. 适用法律 */}
        <div>
          <p className="font-semibold text-amber-900">七、法律适用</p>
          <p className="mt-0.5">
            本声明及本工具的使用受<strong>中华人民共和国法律</strong>管辖。
            如产生争议，双方应友好协商解决；协商不成的，提交开发者所在地有管辖权的人民法院裁决。
          </p>
        </div>

        {extraNotes && extraNotes.length > 0 && (
          <div>
            <p className="font-semibold text-amber-900">八、特别提示</p>
            {extraNotes.map((note, i) => (
              <p key={i} className="mt-0.5">{note}</p>
            ))}
          </div>
        )}
      </div>

      {/* 官方链接快捷入口 */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-amber-200 pt-3 text-xs">
        <a href="https://www.ynzs.cn" target="_blank" rel="noopener noreferrer"
          className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 hover:bg-blue-200">
          📋 云南省招生考试院
        </a>
        <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener noreferrer"
          className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700 hover:bg-green-200">
          🎓 阳光高考网
        </a>
      </div>
    </div>
  );
}
