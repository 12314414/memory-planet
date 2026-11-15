import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** 邀请码解析：存在且非 PRIVATE 才返回星球 id */
export async function GET(_request: Request, { params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || '').toUpperCase().trim();
  const planet = await prisma.planet.findUnique({
    where: { inviteCode: code },
    select: { id: true, visibility: true },
  });

  if (!planet) return NextResponse.json({ error: '邀请码无效' }, { status: 404 });
  if (planet.visibility === 'PRIVATE') {
    return NextResponse.json({ error: '这颗星球现在是私密的' }, { status: 403 });
  }

  return NextResponse.json({ id: planet.id, code });
}
