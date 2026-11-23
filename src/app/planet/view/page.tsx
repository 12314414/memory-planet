'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import { apiFetch } from '@/lib/api-client';
import VisitorPlanetView from '../[id]/VisitorPlanetView';

/**
 * 静态站（GitHub Pages）的星球入口：
 * 真实用户星球 id 是 uuid，无法预渲染 /planet/[id]，
 * 统一走 /planet/view?id=<id>&code=<code>（只带 query，不新增动态路由）。
 */
function PlanetViewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams?.get('id') || '';
  const code = searchParams?.get('code') || '';
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (id || !code) return;
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/invite/${encodeURIComponent(code)}`, { cache: 'no-store' });
        if (!res.ok) {
          if (alive) setInvalid(true);
          return;
        }
        const data = (await res.json()) as { id?: string };
        if (!alive) return;
        if (!data?.id) {
          setInvalid(true);
          return;
        }
        router.replace(`/planet/view?id=${data.id}&code=${encodeURIComponent(code)}`);
      } catch {
        if (alive) setInvalid(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, code, router]);

  if (id) return <VisitorPlanetView planetId={id} inviteCode={code || undefined} />;
  if (!code) return <PageLoading hint="这颗星球还在等你给它一个名字…" />;
  if (invalid) return <PageLoading hint="没有找到这个邀请码对应的星球" />;
  return <PageLoading hint="正在核对邀请码…" />;
}

export default function PlanetViewPage() {
  return (
    <Suspense fallback={<PageLoading hint="正在靠近这颗星球…" />}>
      <PlanetViewClient />
    </Suspense>
  );
}
