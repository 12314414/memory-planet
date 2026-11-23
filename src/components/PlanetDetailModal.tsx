'use client';

import { useEffect } from 'react';
import { appPath } from '@/lib/api-client';
import { planetAsset } from '@/components/FloatingPlanet';
import type { PublicPlanetDTO } from '@/lib/types';

type PlanetDetailModalProps = {
  planet: PublicPlanetDTO;
  onClose: () => void;
  onEnter: () => void;
};

/** 星图里点开某颗星球的详情弹窗：毛玻璃、渐变标题、弹性入场。 */
export default function PlanetDetailModal({ planet, onClose, onEnter }: PlanetDetailModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center px-4">
      <div className="planet-modal-mask absolute inset-0 bg-[#2c1e38]/35 backdrop-blur-[6px]" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${planet.name} 的星球详情`}
        className="planet-modal-panel relative z-10 flex w-[min(90vw,420px)] flex-col overflow-hidden rounded-[20px] border border-white/70 bg-white/55 p-5 shadow-[0_36px_90px_-32px_rgba(94,68,110,0.6)] backdrop-blur-2xl sm:p-6"
      >
        {/* 顶部：星球名 + 关闭 */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">PLANET · 星球</p>
            <h2 className="planet-modal-title mt-1 truncate text-2xl font-semibold">{planet.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭星球详情"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/80 bg-white/70 text-lg leading-none text-[#7a5a8a] transition duration-200 hover:-translate-y-[2px] hover:bg-white hover:text-[#4f3a5e]"
          >
            ×
          </button>
        </div>

        {/* 中部：插画预览 + 简介 */}
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0">
            <div className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(255,225,245,0.9),rgba(255,225,245,0)_70%)] blur-md" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={appPath(`/planets/${planetAsset(planet.id)}.png`)}
              alt=""
              draggable={false}
              className="relative h-full w-full select-none object-contain drop-shadow-[0_14px_22px_rgba(120,86,140,0.35)]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-[#6a4a78]">主人 · {planet.ownerName}</p>
            <p className="mt-1 truncate text-xs text-[#8f7a9e]">宠物 · {planet.petName}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="chip">🛰️ {planet.statsVisits} 次到访</span>
              <span className="chip">⭐ {planet.statsStars} 颗星</span>
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-2xl bg-white/60 px-3.5 py-2.5 text-xs leading-relaxed text-[#826496]">
          这颗星球在宇宙里安静地亮着。进去坐坐，也许会遇到主人留下的回忆。
        </p>

        {/* 底部：按钮组等分 */}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="planet-modal-btn flex-1 rounded-full border border-white/90 bg-white/70 py-2.5 text-sm font-medium text-[#6a4a78]">
            再看看
          </button>
          <button type="button" onClick={onEnter} className="planet-modal-btn flex-1 rounded-full bg-[linear-gradient(135deg,#ffe7b8_0%,#f7cf8b_45%,#f9c7d9_100%)] py-2.5 text-sm font-medium text-[#5a4420] shadow-[0_14px_26px_-14px_rgba(214,160,90,0.9)]">
            去串门 →
          </button>
        </div>
      </div>
    </div>
  );
}
