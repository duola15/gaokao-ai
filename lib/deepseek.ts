import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  }
  return _client;
}

/** 检查 API Key 是否已配置 */
export function hasApiKey(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
}

/** 带重试的 chat：遇 429 自动等 2s/4s/8s 重试，仍失败切备用模型 */
export async function chat(messages: { role: string; content: string }[], temperature = 0.3) {
  if (!hasApiKey()) {
    throw new Error('Gemini API Key 未配置');
  }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await getClient().chat.completions.create({
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
          console.log(`[Gemini] 429 限流，${delay/1000}s 后重试 (${model}, attempt ${attempt+1}/3)`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // 非 429 直接抛，不重试
        throw err;
      }
    }
    // 该模型 3 次都失败，尝试下一个模型
    console.log(`[Gemini] ${model} 不可用，切换备用模型`);
  }

  throw lastError || new Error('所有 Gemini 模型均不可用');
}

export async function chatStream(messages: { role: string; content: string }[]) {
  if (!hasApiKey()) {
    throw new Error('Gemini API Key 未配置');
  }
  const stream = await getClient().chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });
  return stream;
}
