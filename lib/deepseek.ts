import OpenAI from 'openai';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

/** 收集所有已配置的 API Key（去重去空） */
function getApiKeys(): string[] {
  const keys: string[] = [];
  // 主 key
  const k1 = process.env.GEMINI_API_KEY;
  if (k1 && k1 !== 'your_gemini_api_key_here') keys.push(k1);
  // 备用 key 1
  const k2 = process.env.GEMINI_API_KEY_2;
  if (k2 && k2 !== 'your_gemini_api_key_2_here') keys.push(k2);
  // 备用 key 2（预留）
  const k3 = process.env.GEMINI_API_KEY_3;
  if (k3 && k3 !== 'your_gemini_api_key_3_here') keys.push(k3);
  // 去重
  return [...new Set(keys)];
}

/** 按 key 缓存 client，避免重复创建 */
const clientCache = new Map<string, OpenAI>();
function getClient(apiKey: string): OpenAI {
  if (!clientCache.has(apiKey)) {
    clientCache.set(apiKey, new OpenAI({ apiKey, baseURL: BASE_URL }));
  }
  return clientCache.get(apiKey)!;
}

/** 检查是否至少有一个 API Key 已配置 */
export function hasApiKey(): boolean {
  return getApiKeys().length > 0;
}

/**
 * 带重试 + 多 key 轮换 + 多模型降级的 chat。
 *
 * 策略（从高到低）：
 *   key1 × gemini-2.5-flash  （3次重试）
 *   → key1 × gemini-2.0-flash  （3次重试）
 *   → key2 × gemini-2.5-flash  （3次重试）
 *   → key2 × gemini-2.0-flash  （3次重试）
 *   → key3 × ...（同上）
 *
 * 每次 429 等 2s/4s/8s；非 429 不重试直接下一组合。
 */
export async function chat(messages: { role: string; content: string }[], temperature = 0.3) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error('Gemini API Key 未配置');
  }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError: any = null;

  for (const apiKey of keys) {
    const client = getClient(apiKey);
    const keyLabel = `key-${apiKey.slice(0, 10)}...`;

    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await client.chat.completions.create({
            model,
            messages: messages as any,
            temperature,
            max_tokens: 2048,
          });
          return response.choices[0].message.content || '';
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.response?.status || 0;
          if (status === 429) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`[Gemini] 429 ${keyLabel} × ${model}，${delay / 1000}s后重试(attempt ${attempt + 1}/3)`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          // 非 429 → 直接放弃当前模型（可能是 key 无效等）
          console.log(`[Gemini] ${keyLabel} × ${model} 失败(status=${status})，跳过`);
          break;
        }
      }
    }
  }

  throw lastError || new Error('所有 Gemini API Key + 模型组合均不可用');
}

/** 流式 chat（仅用主 key + 主模型，不做复杂降级） */
export async function chatStream(messages: { role: string; content: string }[]) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error('Gemini API Key 未配置');
  }
  const client = getClient(keys[0]);
  const stream = await client.chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });
  return stream;
}
