import OpenAI from 'openai';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const CALL_TIMEOUT_MS = 5000; // 单次调用超时 5s

/** 收集所有已配置的 API Key（去重去空） */
function getApiKeys(): string[] {
  const keys: string[] = [];
  const k1 = process.env.GEMINI_API_KEY;
  if (k1 && k1 !== 'your_gemini_api_key_here') keys.push(k1);
  const k2 = process.env.GEMINI_API_KEY_2;
  if (k2 && k2 !== 'your_gemini_api_key_2_here') keys.push(k2);
  const k3 = process.env.GEMINI_API_KEY_3;
  if (k3 && k3 !== 'your_gemini_api_key_3_here') keys.push(k3);
  return [...new Set(keys)];
}

const clientCache = new Map<string, OpenAI>();
function getClient(apiKey: string): OpenAI {
  if (!clientCache.has(apiKey)) {
    clientCache.set(apiKey, new OpenAI({ apiKey, baseURL: BASE_URL }));
  }
  return clientCache.get(apiKey)!;
}

export function hasApiKey(): boolean {
  return getApiKeys().length > 0;
}

/**
 * 快速轮换 chat：
 *   遍历所有 (key, model) 组合，每个只试 1 次，3s 超时。
 *   第一轮全部失败 → 等 1s → 第二轮再全试一次。
 *   两轮后仍失败 → 抛错。
 *
 * 最坏耗时：(keys × models) × 3s × 2轮 + 1s ≈ 13s (2key×2model)
 * 远好于之前每个 key 重试 3 次 × 2s/4s/8s = 14s 仍切下一 key 的瀑布延迟。
 */
export async function chat(
  messages: { role: string; content: string }[],
  temperature = 0.3,
): Promise<string> {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('Gemini API Key 未配置');

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  // 预生成所有 (key, model) 组合
  const combos: { key: string; model: string }[] = [];
  for (const key of keys) {
    for (const model of models) {
      combos.push({ key, model });
    }
  }

  let lastError: any = null;

  // 两轮尝试
  for (let round = 0; round < 2; round++) {
    for (const { key, model } of combos) {
      const client = getClient(key);
      const label = `key=${key.slice(0, 10)}... model=${model}`;

      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);

        const response = await client.chat.completions.create(
          {
            model,
            messages: messages as any,
            temperature,
            max_tokens: 2048,
          },
          { signal: ctrl.signal },
        );

        clearTimeout(timer);
        return response.choices[0].message.content || '';
      } catch (err: any) {
        clearTimeout(undefined); // 保底（timer 在 catch 前可能未被清理）
        lastError = err;
        const status = err?.status || err?.response?.status || 0;
        const isTimeout = err?.name === 'AbortError' || err?.code === 'ETIMEDOUT';

        if (status === 429) {
          console.log(`[Gemini] 429 ${label} → 下一个`);
          continue; // 立即切下一个组合
        }
        if (isTimeout) {
          console.log(`[Gemini] 超时 ${label} → 下一个`);
          continue;
        }
        // 其他错误（4xx 非429, 5xx）也跳过，尝试下个组合
        console.log(`[Gemini] 错误(status=${status}) ${label} → 下一个`);
      }
    }

    // 第一轮全失败 → 短暂等待后第二轮
    if (round === 0) {
      console.log('[Gemini] 第一轮全部失败，1s后第二轮...');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw lastError || new Error('所有 Gemini API Key + 模型组合均不可用');
}

/** 流式 chat（仅主 key + 主模型） */
export async function chatStream(messages: { role: string; content: string }[]) {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('Gemini API Key 未配置');
  const client = getClient(keys[0]);
  return client.chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });
}
