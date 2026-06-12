/**
 * 简单的内存限流器
 * 在 Netlify serverless 环境下，每次冷启动实例独立计数，
 * 主要用于防御同一实例内的突发请求。
 *
 * 前端辅助：在 localStorage 记录调用次数做兜底
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** 清理过期条目（每60秒触发一次） */
let lastCleanup = 0;
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * 检查是否超过速率限制
 * @param key 限流键（如 IP 或 IP+端点）
 * @param maxRequests 时间窗口内最大请求数
 * @param windowMs 时间窗口（毫秒）
 * @returns {{ allowed: boolean; remaining: number; resetAt: number }}
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/** 获取客户端 IP（兼容 Netlify/Vercel/直连） */
export function getClientIP(request: Request): string {
  // Netlify: x-nf-client-connection-ip
  // Vercel: x-real-ip / x-forwarded-for
  // 标准: x-forwarded-for
  const headers = request.headers;
  return (
    headers.get('x-nf-client-connection-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * API 端点限流配置
 * AI 调用较贵，限制更严；纯数据查询较宽松
 */
export const RATE_LIMIT_CONFIG = {
  recommend: { max: 30, windowMs: 60000 },   // 推荐：30次/分钟
  analyze: { max: 10, windowMs: 60000 },       // AI分析：10次/分钟（贵）
  chat: { max: 15, windowMs: 60000 },          // 问答：15次/分钟
  school: { max: 60, windowMs: 60000 },        // 学校查询：60次/分钟（便宜）
  poster: { max: 5, windowMs: 60000 },         // 海报：5次/分钟（最贵）
  video: { max: 3, windowMs: 120000 },         // 视频：3次/2分钟（极贵）
} as const;
