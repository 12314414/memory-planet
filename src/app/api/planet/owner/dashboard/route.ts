import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensurePlanetForUser, getCurrentUser } from '@/lib/auth';
import type { OwnerDashboardDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** 主人端轮询接口：访客记录 / 留言 / stats / 今日计数 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const planet = await ensurePlanetForUser(user.id, user.nickname);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [visits, guestbook, memories, todayVisits, todayMessages, brief] = await Promise.all([
    prisma.visit.findMany({
      where: { planetId: planet.id, visitorId: { not: user.id } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.guestbook.findMany({
      where: { planetId: planet.id, status: 'VISIBLE' },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.memory.findMany({
      where: { planetId: planet.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.visit.findMany({
      where: { planetId: planet.id, visitorId: { not: user.id }, createdAt: { gte: todayStart } },
      select: { visitorId: true, action: true },
    }),
    prisma.guestbook.count({
      where: { planetId: planet.id, status: 'VISIBLE', createdAt: { gte: todayStart } },
    }),
    prisma.aiCache.findFirst({
      where: { planetId: planet.id, visitorId: user.id, type: 'brief', expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    }),
  ]);

  const uniqueVisitors = new Set(todayVisits.map((v) => v.visitorId));
  const countOf = (action: string) => todayVisits.filter((v) => v.action === action).length;

  const data: OwnerDashboardDTO = {
    planet: {
      id: planet.id,
      name: planet.name,
      theme: planet.theme,
      visibility: planet.visibility as OwnerDashboardDTO['planet']['visibility'],
      inviteCode: planet.inviteCode,
      statsVisits: planet.statsVisits,
      statsLights: planet.statsLights,
      statsStars: planet.statsStars,
    },
    today: {
      visitors: uniqueVisitors.size,
      lights: countOf('LIGHT'),
      stars: countOf('STAR'),
      feeds: countOf('FEED'),
      messages: todayMessages,
    },
    visits: visits.map((v) => ({
      id: v.id,
      visitorName: v.visitorName,
      action: v.action,
      createdAt: v.createdAt.toISOString(),
    })),
    guestbook: guestbook.map((g) => ({
      id: g.id,
      visitorName: g.visitorName,
      content: g.content,
      aiReply: g.aiReply,
      createdAt: g.createdAt.toISOString(),
    })),
    memories: memories.map((m) => ({
      id: m.id,
      text: m.text,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt.toISOString(),
      visibility: m.visibility as 'PRIVATE' | 'PUBLIC',
    })),
    aiBrief: brief?.content ?? null,
  };

  return NextResponse.json(data);
}
