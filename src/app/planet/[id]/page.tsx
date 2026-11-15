import { Suspense } from 'react';
import PageLoading from '@/components/PageLoading';
import { DEMO_PLANET_IDS } from '@/lib/demo-seed';
import PlanetClient from './PlanetClient';

/** 静态导出（GitHub Pages）时预渲染演示星球；服务端模式下仍可访问任意真实 id */
export function generateStaticParams() {
  return DEMO_PLANET_IDS.map((id) => ({ id }));
}

export default function VisitorPlanetPage() {
  return (
    <Suspense fallback={<PageLoading hint="正在靠近这颗星球…" />}>
      <PlanetClient />
    </Suspense>
  );
}
