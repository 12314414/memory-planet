import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, parsePetProfile } from '@/lib/auth';
import type { PublicPlanetDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** 公开星球列表：仅 visibility=PUBLIC，按 updatedAt 倒序，最多 10 个 */
export async function GET() {
  const viewer = await getCurrentUser();

  const planets = await prisma.planet.findMany({
    where: {
      visibility: 'PUBLIC',
      ...(viewer ? { ownerId: { not: viewer.id } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: { owner: { select: { nickname: true } } },
  });

  const data: PublicPlanetDTO[] = planets.map((planet) => ({
    id: planet.id,
    name: planet.name,
    theme: planet.theme,
    ownerName: planet.owner.nickname,
    petName: parsePetProfile(planet.petProfileJson).name,
    statsVisits: planet.statsVisits,
    statsStars: planet.statsStars,
    updatedAt: planet.updatedAt.toISOString(),
  }));

  return NextResponse.json({ planets: data });
}
