import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ZAI_BASE_URL = (process.env.ZAI_BASE_URL || '').replace(/\/+$/, '');
const ZAI_API_KEY = process.env.ZAI_API_KEY || '';
const ZAI_IMAGE_MODEL = process.env.ZAI_IMAGE_MODEL || 'glm-image';
const ZAI_IMAGE_TIMEOUT = 15000; // 用户要求 15 秒

const FALLBACK_PROMPT =
  '将图片中的宠物转换为 Q 版虚拟形象，保持毛色和主要特征，背景为温暖星空/星球，治愈风格';

/**
 * 智普 glm-image 图生图端点
 * - POST：{ imageBase64, petName?, style? } → { imageUrl, fallback }
 * - 鉴权：只允许 owner 调用，服务端校验 planet.ownerId === userId
 * - 失败/超时 → { imageUrl: '', fallback: true }，绝不抛 500
 */
export async function POST(request: Request) {
  try {
    // 鉴权
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ imageUrl: '', fallback: true });
    }
    const planet = await prisma.planet.findFirst({ where: { ownerId: user.id } });
    if (!planet) {
      return NextResponse.json({ imageUrl: '', fallback: true });
    }

    const body = await request.json().catch(() => null);
    const imageBase64 = String(body?.imageBase64 || '');
    const petName = String(body?.petName || '宠物');
    const style = (body?.style as string) || 'Q版';

    if (!imageBase64) {
      return NextResponse.json({ imageUrl: '', fallback: true });
    }

    if (!ZAI_API_KEY || !ZAI_BASE_URL) {
      // 服务端未配置 → 降级
      return NextResponse.json({ imageUrl: '', fallback: true });
    }

    // 组装 prompt
    const prompt = `将图片中的宠物转换为${style}虚拟形象，保持毛色和主要特征，背景为温暖星空/星球，治愈风格。宠物名字叫${petName}。`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ZAI_IMAGE_TIMEOUT);

    try {
      const res = await fetch(`${ZAI_BASE_URL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ZAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: ZAI_IMAGE_MODEL,
          prompt,
          // 智普 glm-image 图生图参数（参考官方文档）
          images: [imageBase64],
          size: '1024x1024',
          n: 1,
          response_format: 'b64_json',
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn('[ai/image] zhipu image api error', res.status, errText.slice(0, 300));
        return NextResponse.json({ imageUrl: '', fallback: true });
      }

      const payload = await res.json().catch(() => null);

      // 兼容 b64_json / url 两种返回
      const item = payload?.data?.[0];
      const imageUrl = item?.b64_json
        ? `data:image/png;base64,${item.b64_json}`
        : item?.url
          ? item.url
          : '';

      if (!imageUrl) {
        console.warn('[ai/image] empty result', payload);
        return NextResponse.json({ imageUrl: '', fallback: true });
      }

      return NextResponse.json({ imageUrl, fallback: false });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error('[ai/image] unexpected error', err);
    return NextResponse.json({ imageUrl: '', fallback: true });
  }
}
