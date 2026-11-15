import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { buildI2IPrompt, type PetAvatarStyle } from '@/lib/petAvatarPrompt';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 30 * 1024 * 1024; // 30MB（Seedream 单张上限）
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const IMAGE_API_BASE_URL = process.env.IMAGE_API_BASE_URL || '';
const IMAGE_API_KEY = process.env.IMAGE_API_KEY || '';
const IMAGE_API_MODEL = process.env.IMAGE_API_MODEL || '';
const IMAGE_API_PATH = process.env.IMAGE_API_PATH || '/v1/images/generations';

const IMAGE_TIMEOUT = 120000; // 图生图耗时较长，120s

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
/* POST：图生图 —— 以原照片为参考，生成 2.5D Q 版宠物形象                */
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

    // 3. 解析 FormData 并校验图片
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const style = (formData.get('style') as PetAvatarStyle) || 'clay';

    if (!file) {
      return NextResponse.json({ error: '请选择照片' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '只支持 jpeg/png/webp 格式' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '图片不能超过 30MB' }, { status: 400 });
    }

    // 写入 PENDING 状态
    await mergeAvatarStatus(planet.id, { status: 'PENDING' });

    // 4. 照片转 Base64 data URL（格式小写，Seedream 要求）
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // 5. 图生图：原照片 + 风格 prompt → Q 版形象
    //    只做图生图，不回退文生图（文生图会丢失"像原来那只"的关键特征）
    let imageUrl = '';
    try {
      imageUrl = await callSeedreamI2I(dataUrl, style);
    } catch (err) {
      console.error('[pet/avatar] 图生图失败', err);
      // 失败时保留旧 imageUrl，只更新状态为 FAILED
      await mergeAvatarStatus(planet.id, { status: 'FAILED', style });
      return NextResponse.json({ ok: false, fallback: true, error: '生成失败，保留当前形象，可重试' });
    }

    // 6. 保存结果，写回 petAvatarJson
    const avatarData = {
      status: 'READY',
      imageUrl,
      style,
      promptVersion: 'seedream-i2i-v1',
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

/** 合并写入 avatar 状态，保留已有字段（含旧 imageUrl） */
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

/**
 * 调图生图接口（自动适配阿里云通义万相 / Seedream）。
 * 以原照片为参考图，prompt 负责风格转换与特征保留。
 * 返回统一为 imageUrl（b64_json 转 data URL，或直接取 url）。
 */
async function callSeedreamI2I(photoDataUrl: string, style: PetAvatarStyle): Promise<string> {
  if (!IMAGE_API_BASE_URL || !IMAGE_API_KEY || !IMAGE_API_MODEL) {
    throw new Error('IMAGE_API 未配置（IMAGE_API_BASE_URL / IMAGE_API_KEY / IMAGE_API_MODEL）');
  }

  const { prompt, negative } = buildI2IPrompt(style);

  // 根据网关地址自动识别服务商，构造对应请求体
  const isAliyun =
    IMAGE_API_BASE_URL.includes('dashscope') || IMAGE_API_BASE_URL.includes('aliyun');

  const requestBody = isAliyun
    ? {
        // 阿里云百炼 · 通义万相 图像编辑（图生图）
        model: IMAGE_API_MODEL,
        prompt,
        negative_prompt: negative,
        image: photoDataUrl, // 阿里云：单个 data URL 字符串
        size: '1024*1024', // 阿里云尺寸格式（用 * 分隔）
        n: 1,
        response_format: 'b64_json',
      }
    : {
        // Seedream 5.0 Pro 图生图
        model: IMAGE_API_MODEL,
        prompt,
        negative_prompt: negative,
        image: [photoDataUrl], // Seedream：数组
        size: '2K',
        response_format: 'b64_json',
        watermark: false,
        optimize_prompt_options: { mode: 'standard' },
      };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT);

  try {
    const res = await fetch(`${IMAGE_API_BASE_URL}${IMAGE_API_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${IMAGE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Image API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const payload = await res.json();

    // 兼容两种返回：b64_json（优先，避免 url 过期/跨域）或 url
    const item = payload.data?.[0];
    const imageUrl = item?.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item?.url
        ? item.url
        : null;

    if (!imageUrl) {
      throw new Error('image_api_empty_result');
    }

    return imageUrl;
  } finally {
    clearTimeout(timeout);
  }
}
