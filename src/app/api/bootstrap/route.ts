import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensurePlanetForUser, getCurrentUser, parsePetProfile } from '@/lib/auth';
import type { Visibility } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * 首屏引导数据：当前用户 + 自己的星球 + 首页/星图需要的计数与最近访客。
 * 让页面可以做成纯客户端组件，从而同一份代码既能跑服务端版、也能静态导出。
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  const planet = await ensurePlanetForUser(user.id, user.nickname);

  const [publicMemories, privateMemories, rawVisits] = await Promise.all([
    prisma.memory.count({ where: { planetId: planet.id, visibility: 'PUBLIC' } }),
    prisma.memory.count({ where: { planetId: planet.id, visibility: 'PRIVATE' } }),
    prisma.visit.findMany({
      where: { planetId: planet.id, visitorId: { not: user.id } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  const seen = new Set<string>();
  const recentVisitors: { name: string; action: string; createdAt: string }[] = [];
  for (const visit of rawVisits) {
    if (seen.has(visit.visitorId)) continue;
    seen.add(visit.visitorId);
    recentVisitors.push({
      name: visit.visitorName,
      action: visit.action,
      createdAt: visit.createdAt.toISOString(),
    });
    if (recentVisitors.length >= 6) break;
  }

  return NextResponse.json({
    user: { id: user.id, nickname: user.nickname },
    planet: {
      id: planet.id,
      name: planet.name,
      theme: planet.theme,
      visibility: planet.visibility as Visibility,
      inviteCode: planet.inviteCode,
      statsVisits: planet.statsVisits,
      statsLights: planet.statsLights,
      statsStars: planet.statsStars,
    },
    pet: parsePetProfile(planet.petProfileJson),
    publicMemories,
    privateMemories,
    recentVisitors,
  });
}
