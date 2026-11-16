import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensurePlanetForUser, getCurrentUser, parsePetProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_AVATAR_CHARS = 4_500_000;

/** 保存宠物虚拟形象到 Planet.petProfileJson.avatarUrl */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录后再操作' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const avatarUrl = String(body?.avatarUrl ?? '').trim();

  const valid =
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('http://') ||
    /^data:image\/(png|jpeg|jpg|webp);base64,/.test(avatarUrl);

  if (!valid || avatarUrl.length > MAX_AVATAR_CHARS) {
    return NextResponse.json({ error: '形象地址无效' }, { status: 400 });
  }

  const planet = await ensurePlanetForUser(user.id, user.nickname);
  const pet = parsePetProfile(planet.petProfileJson);
  const next = JSON.stringify({ ...pet, avatarUrl });
  await prisma.planet.update({ where: { id: planet.id }, data: { petProfileJson: next } });

  return NextResponse.json({ avatarUrl });
}
