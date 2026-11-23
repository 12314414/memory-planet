const { applyCors } = require('../_lib');

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const VISION_TIMEOUT_MS = 15000;
const IMAGE_TIMEOUT_MS = 50000;
const MAX_IMAGE_CHARS = 4500000;

/** 看图描述：GLM-Image 是纯文生图模型，先用视觉模型把照片转成文字特征 */
async function describePet(base, key, imageBase64) {
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.ZAI_VISION_MODEL || 'glm-4v-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageBase64 } },
              {
                type: 'text',
                text: '用不超过60字描述照片中主体（宠物或人物）的种类、毛色/发型、显著特征，直接输出描述，不要解释。',
              },
            ],
          },
        ],
        temperature: 0.4,
        max_tokens: 120,
        stream: false,
      }),
      signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[ai/image] vision failed', res.status, (await res.text().catch(() => '')).slice(0, 200));
      return '';
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' ? text.trim().slice(0, 160) : '';
  } catch (err) {
    console.error('[ai/image] vision error', err && err.message);
    return '';
  }
}

/** 宠物虚拟形象生成：失败统一返回 { imageUrl:'', fallback:true, reason } */
module.exports = async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(200).json({ imageUrl: '', fallback: true, reason: 'method_not_allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const petName = String(body.petName || '宠物').slice(0, 20);
    const style = body.style === '拟真' ? '拟真' : 'q版';

    if (!imageBase64 || imageBase64.length > MAX_IMAGE_CHARS) {
      res.status(200).json({ imageUrl: '', fallback: true, reason: 'image_empty_or_too_large' });
      return;
    }
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(imageBase64)) {
      res.status(200).json({ imageUrl: '', fallback: true, reason: 'image_format_invalid' });
      return;
    }

    const key = process.env.ZAI_API_KEY || '';
    if (!key) {
      console.error('[ai/image] ZAI_API_KEY not configured');
      res.status(200).json({ imageUrl: '', fallback: true, reason: 'api_key_missing' });
      return;
    }

    const base = (process.env.ZAI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');

    // 第 1 步：视觉模型读照片（失败不阻塞，退化为通用描述）
    const desc = await describePet(base, key, imageBase64);

    // 第 2 步：文生图
    const styleText = style === '拟真' ? '写实照片风格' : '可爱Q版卡通风格';
    const look = desc ? `主体外观特征：${desc}。` : '';
    const prompt = `${look}为这只名叫"${petName}"的宠物生成一张${styleText}的虚拟形象头像，保持毛色与主要特征，居中圆润构图，背景为温暖星空与星球，柔和光晕，治愈系插画风格`;

    const upstream = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.ZAI_IMAGE_MODEL || 'glm-image',
        prompt,
        size: '1024x1024',
      }),
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      const detail = (await upstream.text().catch(() => '')).slice(0, 300);
      console.error('[ai/image] generate failed', upstream.status, detail);
      res.status(200).json({ imageUrl: '', fallback: true, reason: `generate_http_${upstream.status}` });
      return;
    }

    const data = await upstream.json();
    const first = data?.data?.[0];
    const imageUrl = first?.url
      ? String(first.url)
      : first?.b64_json
        ? `data:image/png;base64,${first.b64_json}`
        : '';

    if (!imageUrl) {
      console.error('[ai/image] generate returned no image', JSON.stringify(data).slice(0, 300));
      res.status(200).json({ imageUrl: '', fallback: true, reason: 'generate_no_result' });
      return;
    }
    res.status(200).json({ imageUrl, fallback: false });
  } catch (err) {
    console.error('[ai/image] error', err && err.message);
    const timedOut = err && (err.name === 'TimeoutError' || /timeout|abort/i.test(String((err && err.message) || '')));
    res.status(200).json({ imageUrl: '', fallback: true, reason: timedOut ? 'upstream_timeout' : 'internal_error' });
  }
};
