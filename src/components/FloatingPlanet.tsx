'use client';

import Link from 'next/link';
import { appPath } from '@/lib/api-client';
import { getTheme } from '@/lib/theme';
import type { PublicPlanetDTO } from '@/lib/types';

/** 从参考图抠出的手绘星球素材（透明底 PNG），按 id 哈希稳定分配 */
export const PLANET_ASSETS = [
  'earth-teal',
  'ring-purple',
  'violet-small',
  'jupiter',
  'yellow',
  'earth-blue',
  'ring-brown',
  'ring-teal',
] as const;

export function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function planetAsset(id: string) {
  return PLANET_ASSETS[hashId(id) % PLANET_ASSETS.length];
}

type FloatingPlanetProps = {
  planet: PublicPlanetDTO;
  /** 星空容器内的百分比坐标 */
  top: string;
  left: string;
  /** 星球宽度 px，按热度微调；高度按素材比例自适应 */
  size: number;
  /** 漂浮动画相位，负延迟让每颗星球错开 */
  delay?: number;
};

/**
 * 星图大厅里的单个漂浮星球（手绘抠图素材）。
 * 定位层（Link）/ 漂浮层（fp-float）/ 交互层（hover scale）分离，
 * 避免 CSS 漂浮动画与 hover 缩放互相覆盖 transform。
 */
export default function FloatingPlanet({ planet, top, left, size, delay = 0 }: FloatingPlanetProps) {
  const theme = getTheme(planet.theme);
  const asset = planetAsset(planet.id);

  return (
    <Link
      href={`/planet/${planet.id}`}
      aria-label={`去「${planet.name}」串门`}
      className="group absolute z-10 block outline-none transition-all duration-300 hover:z-30 focus-visible:z-30"
      style={{ top, left, width: size }}
    >
      <div className="fp-float" style={{ animationDelay: `${delay}s` }}>
        <div className="relative w-full transition-all duration-300 group-hover:scale-110 group-focus-visible:scale-110">
          {/* 手绘星球 PNG，发光用 drop-shadow 贴合透明轮廓 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={appPath(`/planets/${asset}.png`)}
            alt=""
            draggable={false}
            className="fp-img w-full select-none"
            style={{ ['--fp-glow' as string]: theme.glow }}
          />
        </div>
      </div>

      {/* 悬浮提示卡 */}
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-4 block w-44 -translate-x-1/2 translate-y-1 rounded-2xl border border-white/90 bg-white/90 px-3 py-2.5 text-center opacity-0 shadow-[0_18px_36px_-18px_rgba(94,68,110,0.45)] backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <span className="block truncate text-[13px] font-medium text-[#57465f]">{planet.name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-[#a596b0]">
          {planet.ownerName} · 宠物 {planet.petName}
        </span>
        <span className="mt-1 block text-[10px] text-[#b7a8c2]">
          🛰️ {planet.statsVisits} 次到访 · ⭐ {planet.statsStars}
        </span>
        <span className="mt-1 block text-[10px] text-[#c9b6e8]">点击去串门 →</span>
      </span>
    </Link>
  );
}
