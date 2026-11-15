import NicknameGate from '@/components/NicknameGate';
import SiteHeader from '@/components/SiteHeader';
import { ensurePlanetForUser, getCurrentUser, parsePetProfile } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Visibility } from '@/lib/constants';
import StarMapView from './StarMapView';

export const dynamic = 'force-dynamic';

export default async function StarMapPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <SiteHeader />
        <NicknameGate />
      </>
    );
  }

  const planet = await ensurePlanetForUser(user.id, user.nickname);

  const rawVisits = await prisma.visit.findMany({
    where: { planetId: planet.id, visitorId: { not: user.id } },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

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

  return (
    <>
      <SiteHeader nickname={user.nickname} active="map" />
      <StarMapView
        nickname={user.nickname}
        planet={{
          id: planet.id,
          name: planet.name,
          theme: planet.theme,
          visibility: planet.visibility as Visibility,
          statsVisits: planet.statsVisits,
          statsLights: planet.statsLights,
          statsStars: planet.statsStars,
        }}
        pet={parsePetProfile(planet.petProfileJson)}
        recentVisitors={recentVisitors}
      />
    </>
  );
}
