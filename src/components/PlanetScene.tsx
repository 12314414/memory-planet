'use client';

import { getTheme } from '@/lib/theme';
import type { PetProfile } from '@/lib/types';

type PlanetLike = {
  id: string;
  name: string;
  theme: string;
};

type PlanetSceneProps = {
  mode: 'owner' | 'visitor';
  planet: PlanetLike;
  petProfile: PetProfile;
  onAction?: (action: 'LIGHT' | 'STAR' | 'FEED') => void;
  /** 覆盖主题（星图里统一使用先导片的糖果星环） */
  themeKey?: string;
  /** candy：追加水彩条带、钻饰与流金，贴合先导片画风 */
  variant?: 'paper' | 'candy';
  /** 星图里由外部自绘标题，关闭内部铭牌避免重叠 */
  showCaption?: boolean;
};

/**
 * 2.5D 星球 + 宠物渲染（纯 CSS，无重资源）。
 * owner 模式不响应互动点击；visitor 模式下点星球=点亮、点宠物=投喂。
 */
export default function PlanetScene({
  mode,
  planet,
  petProfile,
  onAction,
  themeKey,
  variant = 'paper',
  showCaption = true,
}: PlanetSceneProps) {
  const theme = getTheme(themeKey ?? planet.theme);
  const interactive = mode === 'visitor' && Boolean(onAction);
  const candy = variant === 'candy';

  return (
    <div className={`planet-scene select-none${candy ? ' planet-scene--candy' : ''}`}>
      <div className="planet-halo" style={{ background: theme.glow }} />
      <div className="planet-orbit" />

      <div className="planet-ring back spin" style={{ ['--ring-color' as string]: theme.ring }} />

      <div
        className="planet-sphere"
        style={{ background: theme.sphere, cursor: interactive ? 'pointer' : 'default' }}
        onClick={interactive ? () => onAction?.('LIGHT') : undefined}
        title={interactive ? '点亮这颗星球' : undefined}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? '点亮星球' : planet.name}
      >
        <span className="planet-blob b1" style={{ background: theme.blobA }} />
        <span className="planet-blob b2" style={{ background: theme.blobB }} />
        <span className="planet-blob b3" style={{ background: 'rgba(255,255,255,0.35)' }} />
        {candy && <span className="planet-band" />}
        <span className="planet-shine" />
        <span className="planet-meridian" />
      </div>

      <div className="planet-ring front" style={{ ['--ring-color' as string]: theme.ring }} />

      {candy && (
        <>
          <span className="scene-gem gm-a" aria-hidden />
          <span className="scene-gem gm-b" aria-hidden />
          <span className="scene-gem gm-c" aria-hidden />
          <span className="scene-drip" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </>
      )}

      <div
        className="pet"
        onClick={interactive ? () => onAction?.('FEED') : undefined}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
        title={interactive ? `投喂${petProfile.name}` : petProfile.name}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? `投喂${petProfile.name}` : petProfile.name}
      >
        {petProfile.avatarUrl ? (
          <>
            {/* AI 生成的宠物虚拟形象 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={petProfile.avatarUrl}
              alt={petProfile.name}
              className="pet-avatar"
              draggable={false}
            />
            <span className="pet-crown">✦</span>
          </>
        ) : (
          <>
            <span className="pet-tail" style={{ ['--pet-ear' as string]: '#fff8fc' }} />
            <span className="pet-ear left" style={{ ['--pet-ear' as string]: '#ffe6f1' }} />
            <span className="pet-ear right" style={{ ['--pet-ear' as string]: '#ffe6f1' }} />
            <span className="pet-body" style={{ background: theme.pet }}>
              <span className="pet-eye left" />
              <span className="pet-eye right" />
              <span className="pet-cheek left" />
              <span className="pet-cheek right" />
              <span className="pet-mouth" />
            </span>
            <span className="pet-crown">✦</span>
          </>
        )}
      </div>

      <span className="spark s1">✦</span>
      <span className="spark s2">✧</span>
      <span className="spark s3">✦</span>
      <span className="spark s4">✧</span>

      {showCaption && (
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className="title text-lg">{planet.name}</p>
          <p className="mt-1 text-[11px] tracking-[0.2em] text-[#b09ec0]">
            {theme.label} · {petProfile.name}
            {mode === 'visitor' ? ' 在门口等你' : ' 正在打盹'}
          </p>
        </div>
      )}
    </div>
  );
}
