import { clip, fallbackText, type AiContext, type AiType } from './ai-text';

export type { AiContext, AiType } from './ai-text';
export { fallbackText } from './ai-text';

export type AiResult = { text: string; source: 'ai' | 'fallback' };

const SPECIES_LABEL: Record<string, string> = {
  cat: '猫',
  dog: '小狗',
  rabbit: '兔子',
};

const LIMIT: Record<AiType, number> = { welcome: 60, reply: 50, brief: 240 };

function systemPrompt(ctx: AiContext) {
  return [
    `你是「${ctx.pet.name}」，一只住在「${ctx.planetName}」的${SPECIES_LABEL[ctx.pet.species] || '小宠物'}，也是这颗星球的宠物接待员。`,
    `你的性格：${ctx.pet.persona}。`,
    `星球主题：${ctx.themeLabel}。`,
    '说话规则：',
    '1. 永远以宠物第一人称说话，温和、简短、口语化，不用列表、标题、表情包堆砌。',
    '2. 绝不透露主人的真实姓名、住址、联系方式、工作单位等隐私。',
    '3. 不承诺线下见面，不索要联系方式，不编造任何事实；不知道就说不知道。',
    '4. 只输出要说的那一句话，不要加引号、不要解释、不要写旁白。',
  ].join('\n');
}

function userPrompt(ctx: AiContext) {
  if (ctx.type === 'welcome') {
    return `访客「${ctx.visitorName}」刚刚推门进来。请用 20-40 个字欢迎他，可以轻轻提到星球主题，并邀请他看看回忆墙。`;
  }
  if (ctx.type === 'reply') {
    return `访客「${ctx.visitorName}」在留言板写下：「${(ctx.content || '').slice(0, 120)}」。请以宠物身份回复他，50 字以内，不要编造主人的事。`;
  }
  return [
    '以下是主人今日的访客数据：',
    ctx.briefData || '暂无数据',
    '请给主人一份今日访客简报：最多 3 条，每条一行、以「·」开头、每条 50 字以内，只依据上面的数据，不要编造。',
  ].join('\n');
}

export function aiEnabled() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_MODEL);
}

/** 直接调用 OpenAI 兼容接口（仅服务端执行，key 不会离开服务器） */
export async function generateAiText(ctx: AiContext): Promise<AiResult> {
  if (!aiEnabled()) return { text: fallbackText(ctx), source: 'fallback' };

  const base = (process.env.AI_BASE_URL || '').replace(/\/+$/, '');
  const timeout = Number(process.env.AI_TIMEOUT_MS || 9000);

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt(ctx) },
          { role: 'user', content: userPrompt(ctx) },
        ],
        temperature: ctx.type === 'brief' ? 0.5 : 0.85,
        max_tokens: ctx.type === 'brief' ? 320 : 160,
      }),
      signal: AbortSignal.timeout(timeout),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`AI ${res.status}`);

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw || !raw.trim()) throw new Error('AI empty');
    return { text: clip(raw, LIMIT[ctx.type]), source: 'ai' };
  } catch {
    return { text: fallbackText(ctx), source: 'fallback' };
  }
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
      signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 9000) + 3000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string; source?: 'ai' | 'fallback' };
    if (!data.text) return null;
    return { text: data.text, source: data.source || 'ai' };
  } catch {
    return null;
  }
}
