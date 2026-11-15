import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  VISION_PROMPT,
  buildImagePrompt,
  normalizePetDesc,
  type PetDesc,
  type PetAvatarStyle,
} from '@/lib/petAvatarPrompt';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const IMAGE_API_BASE_URL = process.env.IMAGE_API_BASE_URL || '';
const IMAGE_API_KEY = process.env.IMAGE_API_KEY || '';
const IMAGE_API_MODEL = process.env.IMAGE_API_MODEL || '';
const IMAGE_API_PATH = process.env.IMAGE_API_PATH || '/images/generations';

const VISION_TIMEOUT = 15000;
const IMAGE_TIMEOUT = 60000;

/* ------------------------------------------------------------------ */
/* GET：返回当前用户星球的 petAvatarJson                                */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const planet = await prisma.planet.findFirst({ where: { ownerId: user.id } });
    if (!planet) {
      return NextResponse.json({ error: '星球不存在' }, { status: 404 });
    }

    let avatar: Record<string, unknown> | null = null;
    if (planet.petAvatarJson) {
      try {
        avatar = JSON.parse(planet.petAvatarJson);
      } catch {
        // 忽略损坏的 JSON
      }
    }

    return NextResponse.json({ ok: true, avatar });
  } catch (err) {
    console.error('[pet/avatar GET]', err);
    return NextResponse.json({ ok: false, error: '读取失败' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/* POST：拍照生成 2.5D Q 版宠物形象                                     */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  let planetId = '';

  try {
    // 1. 鉴权：从 httpOnly cookie 取 userId，不信任前端传参
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 2. 校验 owner 主星球归属
    const planet = await prisma.planet.findFirst({ where: { ownerId: user.id } });
    if (!planet) {
      return NextResponse.json({ error: '星球不存在' }, { status: 404 });
    }
    planetId = planet.id;

    // 3. 校验图片类型/大小
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const style = (formData.get('style') as PetAvatarStyle) || 'blindbox';

    if (!file) {
      return NextResponse.json({ error: '请选择照片' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '只支持 jpeg/png/webp 格式' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '图片不能超过 5MB' }, { status: 400 });
    }

    // 写入 PENDING 状态
    await mergeAvatarStatus(planet.id, { status: 'PENDING' });

    // 4. 视觉理解（失败用默认值继续）
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    let petDesc: PetDesc = normalizePetDesc(null);
    try {
      const visionResult = await callVisionApi(dataUrl);
      if (visionResult) {
        petDesc = normalizePetDesc(visionResult);
      }
    } catch (err) {
      console.warn('[pet/avatar] 视觉理解失败，使用默认描述', err);
    }

    // 5. 图像生成（只把结构化宠物描述送进 prompt，不拼 ownerId / 昵称 / 星球 id）
    let imageUrl = '';
    try {
      imageUrl = await callImageApi(petDesc, style);
    } catch (err) {
      console.error('[pet/avatar] 图像生成失败', err);
      await mergeAvatarStatus(planet.id, { status: 'FAILED' });
      return NextResponse.json({ ok: false, fallback: true, error: '图像生成失败，请重试' });
    }

    // 6. 保存结果，写回 petAvatarJson
    const avatarData = {
      status: 'READY',
      imageUrl,
      style,
      promptVersion: 'v1',
      createdAt: new Date().toISOString(),
    };
    await mergeAvatarStatus(planet.id, avatarData);

    return NextResponse.json({ ok: true, imageUrl, avatar: avatarData });
  } catch (err) {
    console.error('[pet/avatar POST]', err);
    if (planetId) {
      await mergeAvatarStatus(planetId, { status: 'FAILED' }).catch(() => {});
    }
    // 网络异常 / 未知错误：返回 fallback，不抛 500 白屏
    return NextResponse.json({ ok: false, fallback: true, error: '生成失败，请重试' });
  }
}

/* ------------------------------------------------------------------ */
/* 辅助函数                                                            */
/* ------------------------------------------------------------------ */

/** 合并写入 avatar 状态，保留已有字段 */
async function mergeAvatarStatus(planetId: string, data: Record<string, unknown>) {
  const existing = await prisma.planet.findUnique({ where: { id: planetId } });
  let existingData: Record<string, unknown> = {};
  if (existing?.petAvatarJson) {
    try {
      existingData = JSON.parse(existing.petAvatarJson);
    } catch {
      // ignore
    }
  }

  await prisma.planet.update({
    where: { id: planetId },
    data: {
      petAvatarJson: JSON.stringify({ ...existingData, ...data }),
    },
  });
}

/** 调视觉模型理解照片，输出结构化 JSON */
async function callVisionApi(imageDataUrl: string): Promise<Partial<PetDesc> | null> {
  if (!IMAGE_API_BASE_URL || !IMAGE_API_KEY || !IMAGE_API_MODEL) {
    throw new Error('IMAGE_API 未配置');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VISION_TIMEOUT);

  try {
    const res = await fetch(`${IMAGE_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${IMAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: IMAGE_API_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: VISION_PROMPT },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Vision API ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 从返回文本中提取 JSON（允许模型包裹在 ```json ... ``` 中）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

/** 调图像生成接口，返回图片 URL */
async function callImageApi(petDesc: PetDesc, style: PetAvatarStyle): Promise<string> {
  if (!IMAGE_API_BASE_URL || !IMAGE_API_KEY || !IMAGE_API_MODEL) {
    throw new Error('IMAGE_API 未配置');
  }

  const { prompt, negative } = buildImagePrompt(petDesc, style);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT);

  try {
    const res = await fetch(`${IMAGE_API_BASE_URL}${IMAGE_API_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${IMAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: IMAGE_API_MODEL,
        prompt,
        negative_prompt: negative,
        size: '1024x1024',
        n: 1,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Image API ${res.status}`);
    }

    const data = await res.json();
    const url = data.data?.[0]?.url;
    if (!url) {
      throw new Error('图像接口未返回 URL');
    }

    return url;
  } finally {
    clearTimeout(timeout);
  }
}
