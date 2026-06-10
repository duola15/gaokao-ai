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

export async function chat(messages: { role: string; content: string }[], temperature = 0.7) {
  if (!hasApiKey()) {
    throw new Error('Gemini API Key 未配置');
  }
  const response = await getClient().chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: messages as any,
    temperature,
    max_tokens: 2048,
  });
  return response.choices[0].message.content || '';
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
