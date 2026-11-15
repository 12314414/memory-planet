'use client';

import AuthGate from '@/components/AuthGate';
import PageLoading from '@/components/PageLoading';
import SiteHeader from '@/components/SiteHeader';
import { useBootstrap } from '@/lib/use-bootstrap';
import HomeView from './HomeView';

export default function HomePage() {
  const { data, loading } = useBootstrap();

  if (loading) {
    return (
      <>
        <SiteHeader />
        <PageLoading hint="正在点亮你的星球…" />
      </>
    );
  }

  if (!data?.user || !data.planet || !data.pet) {
    return (
      <>
        <SiteHeader />
        <AuthGate />
      </>
    );
  }

  return (
    <>
      <SiteHeader nickname={data.user.nickname} active="home" />
      <main>
        <HomeView
          nickname={data.user.nickname}
          planet={data.planet}
          pet={data.pet}
          publicMemories={data.publicMemories ?? 0}
          privateMemories={data.privateMemories ?? 0}
        />
      </main>
    </>
  );
}
