// Supabase Edge Function: ai-image
// 宠物虚拟形象生成（智谱 glm-image），失败一律返回空地址由前端显示剪影
// 部署时请关闭 "Enforce JWT Verification"，并在 Secrets 配置 ZAI_API_KEY

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const TIMEOUT_MS = 18000;
const MAX_IMAGE_CHARS = 4_500_000;

const ALLOWED_ORIGINS = [
  'https://12314414.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

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

type ImageReply = {
  data?: { url?: string; b64_json?: string }[];
  error?: { code?: string | number; message?: string };
};

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('origin') ?? '');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') {
    return Response.json({ imageUrl: '', fallback: true }, { status: 405, headers });
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch { /* 空 body 按无效处理 */ }

    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const petName = String(body.petName ?? '宠物').slice(0, 20);
    const style = body.style === '拟真' ? '拟真' : 'q版';

    if (!imageBase64 || imageBase64.length > MAX_IMAGE_CHARS) {
      return Response.json({ imageUrl: '', fallback: true }, { headers });
    }
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(imageBase64)) {
      return Response.json({ imageUrl: '', fallback: true }, { headers });
    }

    const key = Deno.env.get('ZAI_API_KEY') ?? '';
    if (!key) return Response.json({ imageUrl: '', fallback: true }, { headers });

    const base = (Deno.env.get('ZAI_BASE_URL') ?? DEFAULT_BASE).replace(/\/+$/, '');
    const model = Deno.env.get('ZAI_IMAGE_MODEL') ?? 'glm-image';
    const prompt = `将图片中的${petName}生成${style}虚拟形象，保持毛色和主要特征，背景为温暖星空/星球，治愈风格`;

    const upstream = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, images: [imageBase64] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!upstream.ok) {
      console.error('智谱图片接口错误:', upstream.status, (await upstream.text().catch(() => '')).slice(0, 200));
      return Response.json({ imageUrl: '', fallback: true }, { headers });
    }

    const data = (await upstream.json()) as ImageReply;
    const first = data?.data?.[0];
    const imageUrl = first?.url
      ? String(first.url)
      : first?.b64_json
        ? `data:image/png;base64,${first.b64_json}`
        : '';

    if (!imageUrl) return Response.json({ imageUrl: '', fallback: true }, { headers });
    return Response.json({ imageUrl, fallback: false }, { headers });
  } catch (err) {
    console.error('形象生成异常:', err);
    return Response.json({ imageUrl: '', fallback: true }, { headers });
  }
});
