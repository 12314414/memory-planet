import VisitorPlanetView from './VisitorPlanetView';

export const dynamic = 'force-dynamic';

export default function VisitorPlanetPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { code?: string };
}) {
  return <VisitorPlanetView planetId={params.id} inviteCode={searchParams?.code} />;
}
