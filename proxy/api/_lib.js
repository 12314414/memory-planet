// 宠归星畔 · AI 代理公共逻辑（Vercel 不会把 _ 开头的文件暴露成路由）

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 2000;

const ALLOWED_ORIGINS = [
  'https://12314414.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/** 静态站跨域调用：只放行自己的页面，避免被随便盗用额度 */
function applyCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function clip(text, limit) {
  const flat = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

const LIMIT = { welcome: 60, reply: 50, brief: 240, polish: 50 };

function fallbackText(ctx) {
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
  if (ctx.type === 'polish') return clip(ctx.content || '', LIMIT.polish);
  return '今天有访客来过，去留言板看看他们说了什么吧。';
}

function systemPrompt(ctx) {
  const petName = ctx.petName || '小宠物';
  const persona = ctx.petPersona || '一只温柔的星球宠物';
  if (ctx.type === 'welcome') {
    return `你是'${petName}'，一只住在回忆星球上的宠物，性格'${persona}'。用20-40字对来访的'${ctx.visitorName || '旅人'}'说一句欢迎。温和、简短、有画面感，不要问问题，不要编造主人的隐私，不要承诺线下见面。`;
  }
  if (ctx.type === 'reply') {
    return `你是'${petName}'，性格'${persona}'。访客'${ctx.visitorName || '旅人'}'在星球留言板写下：'${String(ctx.content || '').slice(0, 120)}'。用50字以内以宠物口吻回复，温和、简短，不透露主人隐私，不承诺见面，不编造事实。`;
  }
  if (ctx.type === 'brief') {
    return `你是回忆星球的助手。根据以下访客数据，为主人生成3条以内的中文简报，每条一行，口语化，不编造数据。数据：${ctx.briefData || '暂时还没有新的互动。'}`;
  }
  return '你是一个温暖治愈的文字助手，请将用户的这段宠物回忆润色得更加诗意、温暖，不超过 50 字，直接输出润色后的文字，不要解释。';
}

function userPrompt(ctx) {
  if (ctx.type === 'welcome') return `访客「${ctx.visitorName || '旅人'}」刚刚推门进来，请说一句欢迎。`;
  if (ctx.type === 'reply') return `请回复访客的这条留言：「${String(ctx.content || '').slice(0, 120)}」`;
  if (ctx.type === 'brief') return '请生成今日访客简报。';
  return `请润色这段回忆：「${String(ctx.content || '').slice(0, 200)}」`;
}

/**
 * 智谱 OpenAI 兼容接口；429 / 业务码 1305 等待 2 秒重试一次。
 * 任何失败返回 null，由调用方降级。
 */
async function callZhipu(system, user) {
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
      });
      const raw = await res.text();
      let data = null;
      try {
        data = JSON.parse(raw);
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
      return null;
    }
  }
  return null;
}

module.exports = { applyCors, clip, fallbackText, systemPrompt, userPrompt, callZhipu, LIMIT };
