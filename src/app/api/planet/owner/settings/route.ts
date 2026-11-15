import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensurePlanetForUser, getCurrentUser } from '@/lib/auth';
import { isVisibility } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/** 主人设置访问权限：PRIVATE / INVITE / PUBLIC */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!isVisibility(body?.visibility)) {
    return NextResponse.json({ error: '无效的权限类型' }, { status: 400 });
  }

  const planet = await ensurePlanetForUser(user.id, user.nickname);
  const updated = await prisma.planet.update({
    where: { id: planet.id },
    data: { visibility: body.visibility },
    select: { visibility: true },
  });

  return NextResponse.json({ visibility: updated.visibility });
}
