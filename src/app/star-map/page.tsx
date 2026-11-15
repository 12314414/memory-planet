'use client';

import NicknameGate from '@/components/NicknameGate';
import PageLoading from '@/components/PageLoading';
import SiteHeader from '@/components/SiteHeader';
import { useBootstrap } from '@/lib/use-bootstrap';
import StarMapView from './StarMapView';

export default function StarMapPage() {
  const { data, loading } = useBootstrap();

  if (loading) {
    return (
      <>
        <SiteHeader />
        <PageLoading hint="正在铺开星图…" />
      </>
    );
  }

  if (!data?.user || !data.planet || !data.pet) {
    return (
      <>
        <SiteHeader />
        <NicknameGate />
      </>
    );
  }

  return (
    <>
      <SiteHeader nickname={data.user.nickname} active="map" />
      <StarMapView
        nickname={data.user.nickname}
        planet={data.planet}
        pet={data.pet}
        recentVisitors={data.recentVisitors ?? []}
      />
    </>
  );
}
