const { applyCors } = require('../_lib');

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const TIMEOUT_MS = 15000;
const MAX_IMAGE_CHARS = 4500000;

/** 宠物虚拟形象生成：失败或超时统一返回 { imageUrl: '', fallback: true } */
module.exports = async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ imageUrl: '', fallback: true });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const petName = String(body.petName || '宠物').slice(0, 20);
    const style = body.style === '拟真' ? '拟真' : 'q版';

    if (!imageBase64 || imageBase64.length > MAX_IMAGE_CHARS) {
      res.status(200).json({ imageUrl: '', fallback: true });
      return;
    }
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(imageBase64)) {
      res.status(200).json({ imageUrl: '', fallback: true });
      return;
    }

    const key = process.env.ZAI_API_KEY || '';
    if (!key) {
      res.status(200).json({ imageUrl: '', fallback: true });
      return;
    }

    const base = (process.env.ZAI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
    const model = process.env.ZAI_IMAGE_MODEL || 'glm-image';
    const prompt = `将图片中的${petName}生成${style}虚拟形象，保持毛色和主要特征，背景为温暖星空/星球，治愈风格`;

    const upstream = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, images: [imageBase64] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!upstream.ok) {
      res.status(200).json({ imageUrl: '', fallback: true });
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
      res.status(200).json({ imageUrl: '', fallback: true });
      return;
    }
    res.status(200).json({ imageUrl, fallback: false });
  } catch {
    res.status(200).json({ imageUrl: '', fallback: true });
  }
};
