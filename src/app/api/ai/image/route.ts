import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const TIMEOUT_MS = 15000;
const MAX_IMAGE_CHARS = 4_500_000;

type ImageReply = {
  data?: { url?: string; b64_json?: string }[];
  error?: { code?: string | number; message?: string };
};

/**
 * 宠物虚拟形象生成：唯一的智谱图片出口。
 * 任何失败都返回 { imageUrl: '', fallback: true }，前端展示剪影占位，不抛 500。
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ imageUrl: '', fallback: true });

    const body = await request.json().catch(() => null);
    const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';
    const petName = String(body?.petName ?? '宠物').slice(0, 20);
    const style = body?.style === '拟真' ? '拟真' : 'q版';

    if (!imageBase64 || imageBase64.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ imageUrl: '', fallback: true });
    }
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(imageBase64)) {
      return NextResponse.json({ imageUrl: '', fallback: true });
    }

    const key = process.env.ZAI_API_KEY || '';
    if (!key) return NextResponse.json({ imageUrl: '', fallback: true });

    const base = (process.env.ZAI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
    const model = process.env.ZAI_IMAGE_MODEL || 'glm-image';
    const prompt = `将图片中的${petName}生成${style}虚拟形象，保持毛色和主要特征，背景为温暖星空/星球，治愈风格`;

    const res = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, images: [imageBase64] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });

    if (!res.ok) return NextResponse.json({ imageUrl: '', fallback: true });

    const data = (await res.json()) as ImageReply;
    const first = data?.data?.[0];
    const imageUrl = first?.url
      ? String(first.url)
      : first?.b64_json
        ? `data:image/png;base64,${first.b64_json}`
        : '';

    if (!imageUrl) return NextResponse.json({ imageUrl: '', fallback: true });
    return NextResponse.json({ imageUrl, fallback: false });
  } catch {
    return NextResponse.json({ imageUrl: '', fallback: true });
  }
}
