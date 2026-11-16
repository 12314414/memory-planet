import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensurePlanetForUser, getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 超过该长度（字符）就落盘到 public/uploads，避免把超大 Base64 写进数据库 */
const BASE64_FALLBACK_LIMIT = 900_000;
const MAX_IMAGE_CHARS = 4_500_000; // ≈ 3.3MB 二进制
const MAX_TEXT = 200;

const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;

/** Base64 过长时写入 public/uploads，返回相对路径；失败则仍存 Base64 */
async function persistImage(imageData: string): Promise<string> {
  if (imageData.length <= BASE64_FALLBACK_LIMIT) return imageData;

  const match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  const ext = match && match[1] !== 'jpg' ? match[1] : 'jpeg';
  const base64 = imageData.slice(imageData.indexOf(',') + 1);
  const dir = path.join(process.cwd(), 'public', 'uploads');
  const file = path.join(dir, `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, Buffer.from(base64, 'base64'));
    return `/uploads/${path.basename(file)}`;
  } catch {
    // 只读文件系统（如 Serverless）时回退为 Base64
    return imageData;
  }
}

/** 主人新增一条回忆（图片转 Base64 存 imageUrl，过长则落盘） */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录后再添加回忆' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '请求格式有误' }, { status: 400 });

  const text = String(body.text ?? '').trim();
  const visibility = String(body.visibility ?? 'PUBLIC').toUpperCase();
  const imageData = typeof body.imageData === 'string' ? body.imageData : '';

  if (!text) return NextResponse.json({ error: '回忆文字不能为空' }, { status: 400 });
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: `回忆文字最多 ${MAX_TEXT} 字` }, { status: 400 });
  }
  if (!['PUBLIC', 'PRIVATE'].includes(visibility)) {
    return NextResponse.json({ error: '无效的可见性' }, { status: 400 });
  }
  if (imageData) {
    if (!DATA_URL_RE.test(imageData)) {
      return NextResponse.json({ error: '图片格式不支持，请选择 PNG / JPG / WebP' }, { status: 400 });
    }
    if (imageData.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: '图片太大了，请压缩后再试' }, { status: 400 });
    }
  }

  // 校验当前用户就是星球主人（ensurePlanetForUser 只会返回本人星球）
  const planet = await ensurePlanetForUser(user.id, user.nickname);
  if (body.planetId && String(body.planetId) !== planet.id) {
    return NextResponse.json({ error: '只能给自己的星球添加回忆' }, { status: 403 });
  }

  const imageUrl = imageData ? await persistImage(imageData) : null;

  const memory = await prisma.memory.create({
    data: {
      planetId: planet.id,
      ownerId: user.id,
      imageUrl,
      text,
      visibility,
    },
  });

  return NextResponse.json({
    memory: {
      id: memory.id,
      text: memory.text,
      imageUrl: memory.imageUrl,
      visibility: memory.visibility,
      createdAt: memory.createdAt.toISOString(),
    },
  });
}
