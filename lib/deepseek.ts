import OpenAI from 'openai';

const CALL_TIMEOUT_MS = 5000; // 单次调用超时 5s

// ─── 提供商定义 ────────────────────────────────────
// 优先级 = 数组顺序，AgnesAI 优先（完全免费无限量）
// 格式: { name, baseURL, models, envKeys }

interface Provider {
  name: string;
  baseURL: string;
  models: string[];
  /** 从环境变量收集 key */
  getKeys(): string[];
}

const providers: Provider[] = [
  {
    name: 'AgnesAI',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    models: ['agnes-2.0-flash'],
    getKeys() {
      const ks: string[] = [];
      const k = process.env.AGNES_API_KEY;
      if (k && k !== 'your_agnes_api_key_here') ks.push(k);
      return [...new Set(ks)];
    },
  },
  {
    name: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: ['gemini-2.5-flash', 'gemini-2.0-flash'],
    getKeys() {
      const ks: string[] = [];
      const k1 = process.env.GEMINI_API_KEY;
      if (k1 && k1 !== 'your_gemini_api_key_here') ks.push(k1);
      const k2 = process.env.GEMINI_API_KEY_2;
      if (k2 && k2 !== 'your_gemini_api_key_2_here') ks.push(k2);
      const k3 = process.env.GEMINI_API_KEY_3;
      if (k3 && k3 !== 'your_gemini_api_key_3_here') ks.push(k3);
      return [...new Set(ks)];
    },
  },
];

// ─── Client 缓存 (baseURL+apiKey) → OpenAI ──────────
const clientCache = new Map<string, OpenAI>();
function getClient(baseURL: string, apiKey: string): OpenAI {
  const cacheKey = `${baseURL}||${apiKey}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, new OpenAI({ apiKey, baseURL }));
  }
  return clientCache.get(cacheKey)!;
}

/** 是否至少有一个 API Key 已配置 */
export function hasApiKey(): boolean {
  for (const p of providers) {
    if (p.getKeys().length > 0) return true;
  }
  return false;
}

/**
 * 多提供商快速轮换 chat：
 *
 *   遍历 providers（AgnesAI → Gemini），
 *   每个 provider 遍取 (key, model) 组合，
 *   每个调用 5s 超时 + AbortController，
 *   失败立即切下一个组合。
 *
 *   第一轮全部失败 → 等 1s 再来一轮。
 *   两轮还失败 → 抛错。
 *
 * 最坏耗时：(总组合数) × 5s × 2 + 1s
 *   例 1: AgnesAI(1key×1model) + Gemini(2key×2model) = 5组合 × 5s × 2 ≈ 50s 最坏
 *   例 2: 只有 AgnesAI = 1组合 × 5s × 2 ≈ 10s 最坏
 */
export async function chat(
  messages: { role: string; content: string }[],
  temperature = 0.3,
): Promise<string> {
  // 预生成所有 (provider, key, model) 组合
  interface Combo {
    provider: string;
    baseURL: string;
    apiKey: string;
    model: string;
  }
  const combos: Combo[] = [];
  for (const p of providers) {
    const keys = p.getKeys();
    for (const apiKey of keys) {
      for (const model of p.models) {
        combos.push({ provider: p.name, baseURL: p.baseURL, apiKey, model });
      }
    }
  }

  if (combos.length === 0) throw new Error('未配置任何 API Key');

  let lastError: any = null;

  // 两轮尝试
  for (let round = 0; round < 2; round++) {
    for (const { provider, baseURL, apiKey, model } of combos) {
      const client = getClient(baseURL, apiKey);
      const label = `[${provider}] ${model} key=${apiKey.slice(0, 10)}...`;

      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);

        const response = await client.chat.completions.create(
          { model, messages: messages as any, temperature, max_tokens: 2048 },
          { signal: ctrl.signal },
        );

        clearTimeout(timer);
        console.log(`[AI] ✅ ${label}`);
        return response.choices[0].message.content || '';
      } catch (err: any) {
        clearTimeout(undefined);
        lastError = err;
        const status = err?.status || err?.response?.status || 0;
        const isTimeout = err?.name === 'AbortError' || err?.code === 'ETIMEDOUT';
        if (status === 429) {
          console.log(`[AI] 429 ${label} → 下一个`);
        } else if (isTimeout) {
          console.log(`[AI] 超时 ${label} → 下一个`);
        } else {
          console.log(`[AI] 错误(status=${status}) ${label} → 下一个`);
        }
      }
    }

    if (round === 0) {
      console.log('[AI] 第一轮全部失败，1s后第二轮...');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw lastError || new Error('所有 API 提供商均不可用');
}

/** 流式 chat（仅用第一个可用的 provider） */
export async function chatStream(messages: { role: string; content: string }[]) {
  for (const p of providers) {
    const keys = p.getKeys();
    if (keys.length === 0) continue;
    const client = getClient(p.baseURL, keys[0]);
    return client.chat.completions.create({
      model: p.models[0],
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });
  }
  throw new Error('未配置任何 API Key');
}
