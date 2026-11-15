import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { USER_COOKIE, ensurePlanetForUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nickname = String(body?.nickname ?? '').trim().slice(0, 12);

  if (!nickname) {
    return NextResponse.json({ error: '请输入一个昵称' }, { status: 400 });
  }

  // 每次进入都生成新的 userId，便于答辩时快速切换主人 / 访客身份
  const user = await prisma.user.create({ data: { nickname } });
  const planet = await ensurePlanetForUser(user.id, nickname);

  const response = NextResponse.json({
    user: { id: user.id, nickname: user.nickname },
    planet: { id: planet.id, name: planet.name, theme: planet.theme },
  });

  response.cookies.set(USER_COOKIE, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
