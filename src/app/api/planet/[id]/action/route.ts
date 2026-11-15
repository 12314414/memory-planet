import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { resolvePlanetAccess } from '@/lib/permissions';
import { isVisitorAction } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const STAT_FIELD = {
  LIGHT: 'statsLights',
  STAR: 'statsStars',
  FEED: null,
} as const;

/** 点亮 / 送星 / 喂食：写 visits + 更新 stats */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode : null;

  if (!isVisitorAction(action)) {
    return NextResponse.json({ error: '不支持的互动类型' }, { status: 400 });
  }

  const access = await resolvePlanetAccess(params.id, { inviteCode, viewerId: viewer.id });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const field = STAT_FIELD[action];
  const stats = field
    ? await prisma.planet.update({
        where: { id: params.id },
        data: { [field]: { increment: 1 } },
        select: { statsVisits: true, statsLights: true, statsStars: true },
      })
    : await prisma.planet.findUniqueOrThrow({
        where: { id: params.id },
        select: { statsVisits: true, statsLights: true, statsStars: true },
      });

  await prisma.visit.create({
    data: {
      planetId: params.id,
      visitorId: viewer.id,
      visitorName: viewer.nickname,
      action,
    },
  });

  return NextResponse.json({ ok: true, action, stats });
}
