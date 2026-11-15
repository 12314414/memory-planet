import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, parsePetProfile } from '@/lib/auth';
import { resolvePlanetAccess } from '@/lib/permissions';
import type { GuestbookDTO, MemoryDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * 访客星球详情：服务端校验 PRIVATE / INVITE / PUBLIC，
 * 只返回脱敏数据（不含 ownerId、不含邀请码），并记录 ENTER（30 分钟内去重）。
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const inviteCode = new URL(request.url).searchParams.get('code');
  const access = await resolvePlanetAccess(params.id, { inviteCode, viewerId: viewer.id });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { planet, isOwner } = access;

  if (!isOwner) {
    const recent = await prisma.visit.findFirst({
      where: {
        planetId: planet.id,
        visitorId: viewer.id,
        action: 'ENTER',
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
    });
    if (!recent) {
      await prisma.visit.create({
        data: {
          planetId: planet.id,
          visitorId: viewer.id,
          visitorName: viewer.nickname,
          action: 'ENTER',
        },
      });
      await prisma.planet.update({
        where: { id: planet.id },
        data: { statsVisits: { increment: 1 } },
      });
    }
  }

  const [memories, guestbook, owner] = await Promise.all([
    prisma.memory.findMany({
      where: { planetId: planet.id, visibility: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.guestbook.findMany({
      where: { planetId: planet.id, status: 'VISIBLE' },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.user.findUnique({ where: { id: planet.ownerId }, select: { nickname: true } }),
  ]);

  const memoryDTO: MemoryDTO[] = memories.map((m) => ({
    id: m.id,
    text: m.text,
    imageUrl: m.imageUrl,
    createdAt: m.createdAt.toISOString(),
  }));

  const guestbookDTO: GuestbookDTO[] = guestbook.map((g) => ({
    id: g.id,
    visitorName: g.visitorName,
    content: g.content,
    aiReply: g.aiReply,
    createdAt: g.createdAt.toISOString(),
  }));

  return NextResponse.json({
    viewer: { id: viewer.id, nickname: viewer.nickname, isOwner },
    planet: {
      id: planet.id,
      name: planet.name,
      theme: planet.theme,
      visibility: planet.visibility,
      ownerName: owner?.nickname ?? '星球主人',
      petProfile: parsePetProfile(planet.petProfileJson),
      statsVisits: planet.statsVisits,
      statsLights: planet.statsLights,
      statsStars: planet.statsStars,
    },
    memories: memoryDTO,
    guestbook: guestbookDTO,
  });
}
