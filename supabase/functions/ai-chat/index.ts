// Supabase Edge Function: ai-chat
// 静态站（GitHub Pages）的唯一 AI 文本出口，域名 *.supabase.co 在国内可直连
// 部署时请关闭 "Enforce JWT Verification"，并在 Secrets 配置 ZAI_API_KEY

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 2000;

const ALLOWED_ORIGINS = [
  'https://12314414.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const LIMIT: Record<string, number> = { welcome: 60, reply: 50, brief: 240, polish: 50 };

type Ctx = {
  type: string;
  petName: string;
  petPersona: string;
  visitorName: string;
  content: string;
  briefData: string;
};

function cors(origin: string) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, apikey, authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function clip(text: string, limit: number) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

function fallbackText(ctx: Ctx) {
  if (ctx.type === 'welcome') {
    return ctx.petName
      ? `欢迎来到这颗星球，${ctx.petName}轻轻蹭了蹭你的脚边。`
      : '欢迎来到这颗星球，小宠物轻轻蹭了蹭你的脚边。';
  }
  if (ctx.type === 'reply') {
    return ctx.petName
      ? `${ctx.petName}凑近看了看你的话，轻轻记在了心里。`
      : '宠物凑近看了看你的话，轻轻记在了心里。';
  }
  if (ctx.type === 'polish') return clip(ctx.content, LIMIT.polish);
  return '今天有访客来过，去留言板看看他们说了什么吧。';
}

function systemPrompt(ctx: Ctx) {
  const petName = ctx.petName || '小宠物';
  const persona = ctx.petPersona || '一只温柔的星球宠物';
  if (ctx.type === 'welcome') {
    return `你是'${petName}'，一只住在回忆星球上的宠物，性格'${persona}'。用20-40字对来访的'${ctx.visitorName || '旅人'}'说一句欢迎。温和、简短、有画面感，不要问问题，不要编造主人的隐私，不要承诺线下见面。`;
  }
  if (ctx.type === 'reply') {
    return `你是'${petName}'，性格'${persona}'。访客'${ctx.visitorName || '旅人'}'在星球留言板写下：'${ctx.content.slice(0, 120)}'。用50字以内以宠物口吻回复，温和、简短，不透露主人隐私，不承诺见面，不编造事实。`;
  }
  if (ctx.type === 'brief') {
    return `你是回忆星球的助手。根据以下访客数据，为主人生成3条以内的中文简报，每条一行，口语化，不编造数据。数据：${ctx.briefData || '暂时还没有新的互动。'}`;
  }
  return '你是一个温暖治愈的文字助手，请将用户的这段宠物回忆润色得更加诗意、温暖，不超过 50 字，直接输出润色后的文字，不要解释。';
}

function userPrompt(ctx: Ctx) {
  if (ctx.type === 'welcome') return `访客「${ctx.visitorName || '旅人'}」刚刚推门进来，请说一句欢迎。`;
  if (ctx.type === 'reply') return `请回复访客的这条留言：「${ctx.content.slice(0, 120)}」`;
  if (ctx.type === 'brief') return '请生成今日访客简报。';
  return `请润色这段回忆：「${ctx.content.slice(0, 200)}」`;
}

/** 智谱 OpenAI 兼容接口；429 / 业务码 1305 等 2 秒重试一次，仍失败返回 null 走降级 */
async function callZhipu(system: string, user: string): Promise<string | null> {
  const key = Deno.env.get('ZAI_API_KEY') ?? '';
  if (!key) return null;

  const base = (Deno.env.get('ZAI_BASE_URL') ?? DEFAULT_BASE).replace(/\/+$/, '');
  const model = Deno.env.get('ZAI_MODEL') ?? 'glm-4-flash';
  const payload = JSON.stringify({
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
        body: payload,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const raw = await res.text();
      let data: { choices?: { message?: { content?: string } }[]; error?: { code?: string | number } } | null = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }

      const overloaded = String(data?.error?.code ?? '') === '1305';
      if (res.status === 429 || overloaded) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        return null;
      }
      if (!res.ok) return null;

      const content = data?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) return null;
      return content;
    } catch {
      return null;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('origin') ?? '');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') {
    return Response.json({ text: '', fallback: true }, { status: 405, headers });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* 空 body 按无效处理 */ }

  const type = String(body.type ?? '');
  const ctx: Ctx = {
    type,
    petName: String(body.petName ?? '').slice(0, 20),
    petPersona: String(body.petPersona ?? '').slice(0, 60),
    visitorName: String(body.visitorName ?? '旅人').slice(0, 20),
    content: typeof body.content === 'string' ? body.content.slice(0, 220) : '',
    briefData: typeof body.briefData === 'string' ? body.briefData.slice(0, 600) : '',
  };

  if (!['welcome', 'reply', 'brief', 'polish'].includes(type)) {
    return Response.json({ text: fallbackText({ ...ctx, type: 'welcome' }), fallback: true }, { headers });
  }
  if ((type === 'reply' || type === 'polish') && !ctx.content) {
    return Response.json({ text: fallbackText(ctx), fallback: true }, { headers });
  }

  const raw = await callZhipu(systemPrompt(ctx), userPrompt(ctx));
  const text = raw ? clip(raw, LIMIT[type]) : '';
  if (!text) {
    return Response.json({ text: fallbackText(ctx), fallback: true }, { headers });
  }
  return Response.json({ text, fallback: false }, { headers });
});
