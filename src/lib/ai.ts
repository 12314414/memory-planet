import { clip, fallbackText, type AiContext, type AiType } from './ai-text';

export type { AiContext, AiType } from './ai-text';
export { fallbackText } from './ai-text';

export type AiResult = { text: string; fallback: boolean; source: 'ai' | 'cache' | 'fallback' };

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 2000;

const SPECIES_LABEL: Record<string, string> = {
  cat: '猫',
  dog: '小狗',
  rabbit: '兔子',
};

const LIMIT: Record<AiType, number> = { welcome: 60, reply: 50, brief: 240, polish: 50 };

/** 智谱 Key 只在服务端读取，前端任何地方都拿不到 */
export function aiEnabled() {
  return Boolean(process.env.ZAI_API_KEY);
}

function systemPrompt(ctx: AiContext) {
  if (ctx.type === 'welcome') {
    return `你是'${ctx.pet.name}'，一只住在回忆星球上的宠物，性格'${ctx.pet.persona}'。用20-40字对来访的'${ctx.visitorName}'说一句欢迎。温和、简短、有画面感，不要问问题，不要编造主人的隐私，不要承诺线下见面。`;
  }
  if (ctx.type === 'reply') {
    return `你是'${ctx.pet.name}'，性格'${ctx.pet.persona}'。访客'${ctx.visitorName}'在星球留言板写下：'${(ctx.content || '').slice(0, 120)}'。用50字以内以宠物口吻回复，温和、简短，不透露主人隐私，不承诺见面，不编造事实。`;
  }
  if (ctx.type === 'brief') {
    return `你是回忆星球的助手。根据以下访客数据，为主人生成3条以内的中文简报，每条一行，口语化，不编造数据。数据：${ctx.briefData || '暂时还没有新的互动。'}`;
  }
  return '你是一个温暖治愈的文字助手，请将用户的这段宠物回忆润色得更加诗意、温暖，不超过 50 字，直接输出润色后的文字，不要解释。';
}

function userPrompt(ctx: AiContext) {
  if (ctx.type === 'welcome') return `访客「${ctx.visitorName}」刚刚推门进来，请说一句欢迎。`;
  if (ctx.type === 'reply') return `请回复访客的这条留言：「${(ctx.content || '').slice(0, 120)}」`;
  if (ctx.type === 'brief') return '请生成今日访客简报。';
  return `请润色这段回忆：「${(ctx.content || '').slice(0, 200)}」`;
}

type ZhipuReply = { choices?: { message?: { content?: string } }[]; error?: { code?: string | number } };

/**
 * 调用智谱 OpenAI 兼容 Chat Completions（仅服务端）。
 * HTTP 429 / 业务码 1305（服务过载）时等 2 秒重试一次，仍失败返回 null 走降级。
 */
async function callZhipu(system: string, user: string): Promise<string | null> {
  const key = process.env.ZAI_API_KEY || '';
  if (!key) return null;

  const base = (process.env.ZAI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  const model = process.env.ZAI_MODEL || 'glm-4-flash';
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.7,
    max_tokens: 200,
    stream: false,
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });

      const raw = await res.text();
      let data: ZhipuReply | null = null;
      try {
        data = JSON.parse(raw) as ZhipuReply;
      } catch {
        data = null;
      }

      const overloaded = String(data?.error?.code ?? '') === '1305';
      if (res.status === 429 || overloaded) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        return null;
      }

      if (!res.ok) return null;

      const content = data?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) return null;
      return content;
    } catch {
      // 超时 / 断网：不再重试，直接降级
      return null;
    }
  }
  return null;
}

/** 统一入口：永不抛错，失败返回降级模板 */
export async function generateAiText(ctx: AiContext): Promise<AiResult> {
  if (!aiEnabled()) return { text: fallbackText(ctx), fallback: true, source: 'fallback' };

  const raw = await callZhipu(systemPrompt(ctx), userPrompt(ctx));
  if (!raw) return { text: fallbackText(ctx), fallback: true, source: 'fallback' };

  const text = clip(raw, LIMIT[ctx.type]);
  if (!text) return { text: fallbackText(ctx), fallback: true, source: 'fallback' };
  return { text, fallback: false, source: 'ai' };
}

/**
 * 内部调用统一走 /api/ai/chat 代理（不直连厂商），保证“AI 只有一个出口”。
 * 代理本身失败（断网/超时）时返回 null，由调用方使用模板降级。
 */
export async function callAiProxy(
  origin: string,
  payload: {
    type: AiType;
    planetId: string;
    visitorName?: string;
    content?: string;
    refresh?: boolean;
  },
  cookieHeader?: string | null,
): Promise<AiResult | null> {
  try {
    const res = await fetch(`${origin}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS + 5000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string; fallback?: boolean };
    if (!data.text) return null;
    return {
      text: data.text,
      fallback: Boolean(data.fallback),
      source: data.fallback ? 'fallback' : 'ai',
    };
  } catch {
    return null;
  }
}
