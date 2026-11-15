import NicknameGate from '@/components/NicknameGate';
import SiteHeader from '@/components/SiteHeader';
import { ensurePlanetForUser, getCurrentUser, parsePetProfile } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Visibility } from '@/lib/constants';
import HomeView from './HomeView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
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
  const [publicMemories, privateMemories] = await Promise.all([
    prisma.memory.count({ where: { planetId: planet.id, visibility: 'PUBLIC' } }),
    prisma.memory.count({ where: { planetId: planet.id, visibility: 'PRIVATE' } }),
  ]);

  return (
    <>
      <SiteHeader nickname={user.nickname} active="home" />
      <main>
        <HomeView
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
          publicMemories={publicMemories}
          privateMemories={privateMemories}
        />
      </main>
    </>
  );
}
