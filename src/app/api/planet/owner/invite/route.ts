import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensurePlanetForUser, getCurrentUser, uniqueInviteCode } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 生成 / 重置 6 位唯一邀请码 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const planet = await ensurePlanetForUser(user.id, user.nickname);
  const inviteCode = await uniqueInviteCode();

  const updated = await prisma.planet.update({
    where: { id: planet.id },
    data: { inviteCode },
    select: { inviteCode: true },
  });

  return NextResponse.json({
    inviteCode: updated.inviteCode,
    path: `/planet/visit/${updated.inviteCode}`,
  });
}
