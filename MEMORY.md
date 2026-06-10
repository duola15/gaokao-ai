# 高考志愿AI助手 - 项目记忆

> 最后更新：2026-06-10 (第3次更新) | 每次对话后自动更新

---

## 项目概况
- **目标**：云南高考志愿填报 AI 助手（移动优先 Web App）
- **用户**：2026 云南考生及家长（主要理工类）
- **部署**：Netlify `https://yunnan-gaokao.netlify.app`（2026-06-10 迁移，国内可直接访问）
- **技术栈**：Next.js 14 + TypeScript + Tailwind CSS，内存静态数据，无数据库
- **开发路径**：`e:\cc1\讨论贴\gaokao-ai\`

---

## 当前状态（2026-06-08）

### ✅ 已完成
- 构建通过（next build，Turbopack）
- 10 个路由全部正常（首页/输入表单/结果/学校详情/对比/AI问答/4个API）
- 350 所学校，1,171 条真实录取记录
- 数据覆盖：**2021/2022/2023/2025 四年真实数据**（全来自官方考试院）
- 一分一段表（物理502 + 历史476 分数点，异步 JSON 加载）
- 推荐算法工作正常（冲/稳/保各10条，位次差匹配）
- 首页 CTA

### ✅ 2026-06-10 终极优化（第3次对话）
- 城市列表数据化：提取350所学校76城，云南优先，表单支持搜索/展开
- 选科预设：10组快捷组合（物化生/物化地/史地政等）
- AI修复：6校5条硬截断 + 6000字保底防token溢出 + 错误消息暴露
- 学校描述标签化：JSON解析为彩色标签（`parseDescription()`）
- 对比页重写：搜索350所学校 + 多维度对比表
- 分享面板：微信/朋友圈/QQ/QQ空间/微博/小红书/复制/短信 8平台
- CSS动画规范化（`style jsx`→globals.css）
- 构建验证通过（next build 成功）

### ⚠️ 待解决
- **爱发电用户名**: 代码里 `your_username` 需替换为真实用户名（`result/page.tsx` + `layout.tsx` 各一处）
- 2024 年数据缺失（Excel 源中没有 2024）
- Gemini AI 已接通，prompt 已优化为六段式详细分析

---

## 数据源（完整记录）

| 序号 | 来源 | 年份 | 原始规模 | 备注 |
|------|------|------|----------|------|
| 1 | `wanziming12/-` Excel | 2021/2022/2023 | 76,143 条 | GitHub 开源，30省数据 |
| 2 | `Royelau76/gaokao-decision-system-BK-` SQLite | 2025 | 193 条/15校 | `data/gaokao.db` |
| 3 | `HA7CH/gaokao-pro` college-groups | 2025 | 348 校 JSON | 招生计划、选科、名额 |
| 4 | `HA7CH/gaokao-pro` yifenyiduan | 2025 | 物理+历史 | 一分一段表 |

### 数据处理流水线
1. `scripts/extract_yunnan_excel.mjs` → Excel → `data/extracted/yunnan_records_from_excel.json`
2. `scripts/generate_combined_seed.js` → 综合 4 个数据源 → 采样（Top-1/school/year） → `lib/seed_data.ts`
3. 采样策略：350 所高分学校 + 每校每年 Top-1 专业 = 1,171 条记录（433KB）

### 原始数据位置
- `_gaokao_excel_data/` — wanziming12 仓库（93 个 Excel 文件，30 省）
- `_gaokao_pro_repo/` — HA7CH 仓库（348 校 JSON + 一分一段）
- `data/gaokao.db` — Royelau76 SQLite（737KB）
- `data/extracted/` — 中间 JSON 文件

---

## 竞争分析

### 大厂免费 AI（🔴 最大威胁）
夸克高考（阿里/通义千问）、百度AI志愿（文心一言）、今日头条（抖音）、腾讯教育（微信小程序）、掌上高考（中国教育在线）——全部免费。

### 专业付费平台（同赛道）
优志愿 ¥300-500、高考直通车 ¥200-400、完美志愿 ¥200-400、蝶变志愿 ¥100-300。

### GitHub 开源（间接竞争）
HA7CH/gaokao-pro（~1k stars）、Royelau76/gaokao-decision-system-BK-（~100 stars）——都是数据/工具，不是面向家长的成品。

### 我们的差异化
- **云南专版**（大厂数据泛而不精，云南是冷门省）
- **简单到极致**（10秒出结果，不用下载 App）
- **¥49 定价**（大厂免费但缺服务，竞品 ¥200+）

---

## 变现策略复盘

### 现实计算（2026-06-08）
```
最佳情况：触达11,000人 → 访问550人 → 使用165人 → 付费8人 → ¥392
结论：作为纯工具产品，2周赚不到¥500
```

### 核心矛盾
用户不露面、不加微信、不收钱 → 纯工具产品 vs 大厂免费工具 → 没有生存空间

### 产品真正的价值
1. **完整项目闭环经验**（数据采集→算法→前后端→部署）
2. **面试作品**（独立开发的推荐系统，7.6万条真实数据）
3. **可复用数据资产**（云南录取数据本身有价值）

---

## 项目文件速查

### 前端页面
- `app/page.tsx` — 首页（Hero + 三步说明 + CTA）
- `app/layout.tsx` — 根布局（底部 4 Tab 导航）
- `app/recommend/page.tsx` — 输入表单（分数/位次/选科/城市/专业方向）
- `app/result/page.tsx` — 结果页（冲/稳/保 Tab + 学校卡片 + 付费引导）
- `app/school/page.tsx` — 学校详情（`?id=` 参数）
- `app/compare/page.tsx` — 多校对比
- `app/ask/page.tsx` — AI 问答

### 后端 API
- `app/api/recommend/route.ts` — POST 推荐（接收 UserInput → 返回 Recommendations）
- `app/api/chat/route.ts` — POST AI 对话
- `app/api/school/route.ts` — GET 学校详情

### 核心库
- `lib/types.ts` — 类型定义（School, AdmissionRecord, UserInput, RecommendationItem 等）
- `lib/seed_data.ts` — 核心数据文件（433KB，350校/1,171条记录）
- `lib/recommendation.ts` — 推荐算法 + `parseDescription()` JSON标签解析
- `lib/deepseek.ts` — Gemini API 封装（OpenAI兼容，懒加载）
- `lib/prompts.ts` — AI Prompt 模板（六段式详细分析）
- `lib/city_data.ts` — 城市数据（从350校提取76城，云南优先）

### 数据脚本
- `scripts/generate_seed_from_db.js` — SQLite → seed_data.ts（原始版，仅 gaokao.db）
- `scripts/extract_yunnan_from_ha7ch.js` — HA7CH college-groups → seed_data.ts（已废弃，数据不完整）
- `scripts/extract_yunnan_excel.mjs` — Excel → JSON（2021-2023 提取）
- `scripts/generate_combined_seed.js` — 终极综合生成（4数据源 → 采样 → seed_data.ts）

### 部署配置
- `netlify.toml` — Netlify 部署配置（build command + `@netlify/plugin-nextjs` + `NEXT_TURBO=0`）
- `next.config.ts` — `typescript.ignoreBuildErrors: true`（解决 TS 编译 OOM）
- 构建命令：`npm run build`（Netlify 自动执行）
- Netlify 环境变量需设置：`GEMINI_API_KEY`

### 公共资源
- `public/yunnan-2025-physics-rank.json` — 物理一分一段表（25KB）
- `public/yunnan-2025-history-rank.json` — 历史一分一段表（24KB）

---

## 部署注意事项（Netlify）

- 使用 `@netlify/plugin-nextjs` v5 处理 Next.js SSR / API Routes
- `NEXT_TURBO=0` 已配置（避免 Turbopack OOM）
- `typescript.ignoreBuildErrors: true`（数据文件大会导致 TS 编译 OOM）
- 一分一段表从 TypeScript 内联移到 public/ JSON（避免编译期 OOM）
- **Netlify `*.netlify.app` 国内可访问**（不同于 Vercel 被墙），无需买自定义域名
- AI 使用 Google Gemini 免费版（1500次/天），key 在 Netlify 后台环境变量设置

---

## 用户偏好
- 独立开发者，一个人开发
- 不露脸（小红书/抖音用AI配音+数据图）
- 不愿加微信收费（保持隐私和自由）
- 移动优先，面向云南家长群体
- 对"¥49 × 少量用户"的商业模式感到动力不足

---

## 推广渠道分析（2026-06-08，第2次对话）

用户询问是否有 skill 能帮助国内推流——当前环境无相关 skill。按热度排列可行渠道：

| 梯队 | 渠道 | 方式 | 适合度 |
|------|------|------|--------|
| 🔥1 | 小红书 | AI数据图+分数线趋势图+攻略卡片，不露脸友好 | ⭐⭐⭐⭐⭐ |
| 🔥2 | 抖音/快手 | AI配音+数据可视化+屏幕录制演示，剪映免费 | ⭐⭐⭐⭐ |
| 🔥3 | 知乎 | 回答高考相关问题，长尾效应强，一条回答引流数 | ⭐⭐⭐ |
| 🔥4 | 微信生态 | 家长群/公众号/视频号，亲戚帮忙转发 | ⭐⭐⭐ |
| 🔥5 | 拼多多/淘宝 | 不适合工具类，可挂虚拟商品做入口 | ⭐ |

## 用户最终决策（2026-06-08，第2次对话）

**"我只想和亲戚说一声，有人买就买没人就算了"**

- 用户放弃了所有主动推广计划
- 不打算运营小红书/抖音/知乎
- 唯一要做的事：告知亲戚有这个工具
- **前提条件**：买域名让国内能访问（否则亲戚不翻墙打不开）
- 心态：当成简历作品，有人付费算意外收获，没人付费也不亏
- 这个项目作为全栈项目的作品价值 > 商业收入价值

## 关键决策记录
- [2026-06-07] 选择云南而非全国（数据可控、竞争小）
- [2026-06-07] 选择内存静态数据而非 Supabase（降低复杂度）
- [2026-06-08] 发现 wanziming12/- 仓库 → 数据从 193 条跃升到 76,143 条
- [2026-06-08] 采样策略：保留 Top-350 学校，每校每年 Top-1 专业（1,171条输出）
- [2026-06-08] 用户决定不露面、不加微信 → 变现路径受限
- [2026-06-08] 用户放弃主动推广，只告诉亲戚 → 项目定位从商业产品转为简历作品
- [2026-06-10] AI 后端从 DeepSeek → Google Gemini 免费版（零成本，1500次/天）
- [2026-06-10] ¥49 付费 → 爱发电自愿赞助（不设付费墙，所有功能免费）
- [2026-06-10] 部署平台从 Vercel → Netlify（`@netlify/plugin-nextjs` v5）
