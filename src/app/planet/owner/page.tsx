import NicknameGate from '@/components/NicknameGate';
import SiteHeader from '@/components/SiteHeader';
import { ensurePlanetForUser, getCurrentUser, parsePetProfile } from '@/lib/auth';
import type { Visibility } from '@/lib/constants';
import OwnerDashboard from './OwnerDashboard';

export const dynamic = 'force-dynamic';

export default async function OwnerPage() {
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

  return (
    <>
      <SiteHeader nickname={user.nickname} active="owner" />
      <OwnerDashboard
        nickname={user.nickname}
        initial={{
          id: planet.id,
          name: planet.name,
          theme: planet.theme,
          visibility: planet.visibility as Visibility,
          inviteCode: planet.inviteCode,
          pet: parsePetProfile(planet.petProfileJson),
        }}
      />
    </>
  );
}
