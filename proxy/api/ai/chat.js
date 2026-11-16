const {
  applyCors,
  clip,
  fallbackText,
  systemPrompt,
  userPrompt,
  callZhipu,
  LIMIT,
} = require('../_lib');

/**
 * 静态站唯一 AI 文本出口。输入来自浏览器（无数据库），
 * 只允许短文本场景，失败一律返回模板，绝不抛 500。
 */
module.exports = async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ text: '', fallback: true });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const type = String(body.type || '');
  const ctx = {
    type,
    petName: String(body.petName || '').slice(0, 20),
    petPersona: String(body.petPersona || '').slice(0, 60),
    visitorName: String(body.visitorName || '旅人').slice(0, 20),
    content: typeof body.content === 'string' ? body.content.slice(0, 220) : '',
    briefData: typeof body.briefData === 'string' ? body.briefData.slice(0, 600) : '',
  };

  if (!['welcome', 'reply', 'brief', 'polish'].includes(type)) {
    res.status(200).json({ text: fallbackText({ type: 'welcome', petName: ctx.petName }), fallback: true });
    return;
  }
  if ((type === 'reply' || type === 'polish') && !ctx.content) {
    res.status(200).json({ text: fallbackText(ctx), fallback: true });
    return;
  }

  try {
    const raw = await callZhipu(systemPrompt(ctx), userPrompt(ctx));
    if (!raw) {
      res.status(200).json({ text: fallbackText(ctx), fallback: true });
      return;
    }
    const text = clip(raw, LIMIT[type]);
    if (!text) {
      res.status(200).json({ text: fallbackText(ctx), fallback: true });
      return;
    }
    res.status(200).json({ text, fallback: false });
  } catch {
    res.status(200).json({ text: fallbackText(ctx), fallback: true });
  }
};
