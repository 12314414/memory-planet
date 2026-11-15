'use client';

import NicknameGate from '@/components/NicknameGate';
import PageLoading from '@/components/PageLoading';
import SiteHeader from '@/components/SiteHeader';
import { useBootstrap } from '@/lib/use-bootstrap';
import OwnerDashboard from './OwnerDashboard';

export default function OwnerPage() {
  const { data, loading } = useBootstrap();

  if (loading) {
    return (
      <>
        <SiteHeader />
        <PageLoading hint="正在打开主人控制台…" />
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
      <SiteHeader nickname={data.user.nickname} active="owner" />
      <OwnerDashboard
        nickname={data.user.nickname}
        initial={{
          id: data.planet.id,
          name: data.planet.name,
          theme: data.planet.theme,
          visibility: data.planet.visibility,
          inviteCode: data.planet.inviteCode,
          pet: data.pet,
        }}
      />
    </>
  );
}
