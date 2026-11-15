import { NextResponse } from 'next/server';
import { ensurePlanetForUser, getCurrentUser, parsePetProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, planet: null });

  const planet = await ensurePlanetForUser(user.id, user.nickname);
  return NextResponse.json({
    user: { id: user.id, nickname: user.nickname },
    planet: {
      id: planet.id,
      name: planet.name,
      theme: planet.theme,
      visibility: planet.visibility,
      petProfile: parsePetProfile(planet.petProfileJson),
    },
  });
}
