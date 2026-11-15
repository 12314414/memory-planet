'use client';

import { useParams, useSearchParams } from 'next/navigation';
import VisitorPlanetView from './VisitorPlanetView';

export default function PlanetClient() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const planetId = String(params?.id ?? '');

  return <VisitorPlanetView planetId={planetId} inviteCode={search?.get('code') || undefined} />;
}
