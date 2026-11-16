'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FloatingPlanet, { hashId } from '@/components/FloatingPlanet';
import PlanetScene from '@/components/PlanetScene';
import { apiFetch, appPath, DEMO_MODE } from '@/lib/api-client';
import { resolveInviteCode } from '@/lib/demo-store';
import { VISIBILITY_LABEL, type Visibility } from '@/lib/constants';
import type { PetProfile, PublicPlanetDTO } from '@/lib/types';

type StarMapViewProps = {
  nickname: string;
  planet: {
    id: string;
    name: string;
    theme: string;
    visibility: Visibility;
    statsVisits: number;
    statsLights: number;
    statsStars: number;
  };
  pet: PetProfile;
  recentVisitors: { name: string; action: string; createdAt: string }[];
};

const ACTION_TEXT: Record<string, string> = {
  ENTER: '来星球坐了坐',
  LIGHT: '点亮了你的星球',
  STAR: '给你送了一颗星',
  FEED: '投喂了你的宠物',
  MESSAGE: '留下了留言',
};

type Pos = { top: number; left: number };

/** 只有 1 颗：居中 */
const LAYOUT_ONE: Pos[] = [{ top: 32, left: 40 }];
/** 2 颗：中心两侧 */
const LAYOUT_TWO: Pos[] = [
  { top: 24, left: 22 },
  { top: 42, left: 52 },
];
/** 3 颗：围绕中心的三角 */
const LAYOUT_THREE: Pos[] = [
  { top: 16, left: 38 },
  { top: 44, left: 12 },
  { top: 46, left: 60 },
];
/** 4–6 颗：中部区域错落 */
const LAYOUT_MID: Pos[] = [
  { top: 12, left: 30 },
  { top: 10, left: 62 },
  { top: 34, left: 8 },
  { top: 38, left: 46 },
  { top: 58, left: 24 },
  { top: 56, left: 66 },
];
/** 7 颗以上：全区域散布，互不重叠 */
const LAYOUT_FULL: Pos[] = [
  { top: 9, left: 10 },
  { top: 5, left: 46 },
  { top: 13, left: 78 },
  { top: 30, left: 30 },
  { top: 28, left: 62 },
  { top: 44, left: 6 },
  { top: 47, left: 82 },
  { top: 60, left: 40 },
  { top: 64, left: 68 },
  { top: 78, left: 16 },
];

function layoutFor(count: number): Pos[] {
  if (count <= 1) return LAYOUT_ONE;
  if (count === 2) return LAYOUT_TWO;
  if (count === 3) return LAYOUT_THREE;
  if (count <= 6) return LAYOUT_MID;
  return LAYOUT_FULL;
}

/** 装饰天体：月亮 / 星星 / 小号手绘星球，不可点击，让星空始终丰富 */
const DECOR = [
  { asset: 'moon', top: 2, left: 84, size: 46, opacity: 0.9, delay: -2 },
  { asset: 'star', top: 10, left: 4, size: 22, opacity: 0.95, delay: -1 },
  { asset: 'star', top: 66, left: 90, size: 18, opacity: 0.9, delay: -4 },
  { asset: 'violet-small', top: 84, left: 76, size: 30, opacity: 0.8, delay: -3 },
  { asset: 'yellow', top: 90, left: 36, size: 26, opacity: 0.75, delay: -5 },
  { asset: 'ring-teal', top: 4, left: 58, size: 36, opacity: 0.85, delay: -2.5 },
  { asset: 'earth-blue', top: 88, left: 6, size: 28, opacity: 0.75, delay: -1.5 },
  { asset: 'star', top: 38, left: 92, size: 14, opacity: 0.85, delay: -3.5 },
];
/** 真实星球 ≥7 颗时只保留小装饰，避免拥挤 */
const DECOR_COMPACT = [0, 1, 2, 7];

/** 细碎星尘（固定坐标，刷新不动） */
const ARENA_STARS = [
  { top: 4, left: 26, size: 3, delay: 0 },
  { top: 8, left: 66, size: 2, delay: 1.2 },
  { top: 18, left: 4, size: 2, delay: 2.1 },
  { top: 21, left: 48, size: 3, delay: 0.6 },
  { top: 24, left: 92, size: 2, delay: 1.8 },
  { top: 36, left: 16, size: 2, delay: 2.8 },
  { top: 38, left: 74, size: 3, delay: 0.3 },
  { top: 52, left: 26, size: 2, delay: 1.5 },
  { top: 55, left: 56, size: 2, delay: 2.4 },
  { top: 58, left: 94, size: 3, delay: 0.9 },
  { top: 70, left: 8, size: 2, delay: 1.1 },
  { top: 72, left: 52, size: 3, delay: 2.7 },
  { top: 82, left: 84, size: 2, delay: 0.4 },
  { top: 86, left: 34, size: 2, delay: 1.9 },
  { top: 90, left: 62, size: 3, delay: 2.2 },
  { top: 33, left: 44, size: 2, delay: 3.1 },
];

/** 预设坐标 + ±2% 哈希微抖动，兼顾不重叠与自然感，刷新不跳动 */
function positionFor(planet: PublicPlanetDTO, base: Pos) {
  const h = hashId(planet.id);
  const jx = (h % 5) - 2;
  const jy = ((h >> 3) % 5) - 2;
  return { top: `${base.top + jy}%`, left: `${base.left + jx}%` };
}

/** 大小按热度微调：72–112px，相差不过大 */
function sizeFor(planet: PublicPlanetDTO) {
  const heat = Math.min(planet.statsVisits + planet.statsStars * 2, 36);
  return Math.round(72 + (heat / 36) * 40);
}

export default function StarMapView({ nickname, planet, pet, recentVisitors }: StarMapViewProps) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [planets, setPlanets] = useState<PublicPlanetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await apiFetch('/api/planets/public', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || '加载失败');
        if (alive) setPlanets(data.planets || []);
      } catch {
        if (alive) setListError('星图暂时有点雾，稍后再试试');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const openByCode = (event: React.FormEvent) => {
    event.preventDefault();
    const value = code.trim().toUpperCase();
    if (value.length !== 6) {
      setCodeError('邀请码是 6 位字母或数字');
      return;
    }
    setCodeError('');
    if (DEMO_MODE) {
      const planetId = resolveInviteCode(value);
      if (!planetId) {
        setCodeError('没有找到这个邀请码对应的星球');
        return;
      }
      window.location.href = appPath(`/planet/${planetId}?code=${value}`);
      return;
    }
    window.location.href = appPath(`/planet/visit/${value}`);
  };

  const layout = layoutFor(planets.length);
  const decor = planets.length >= 7 ? DECOR.filter((_, i) => DECOR_COMPACT.includes(i)) : DECOR;

  return (
    <main className="wrap pb-20 pt-10">
      <div className="mb-8 fade-up">
        <p className="eyebrow">STAR MAP · DOOR TO DOOR</p>
        <h1 className="title mt-3 text-3xl sm:text-4xl">星图 · 串门大厅</h1>
        <p className="muted mt-3 max-w-xl text-sm leading-7">
          {nickname}，这里能看到大家的公开星球。串门是异步的：你留下痕迹，主人在自己的时间里收到。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* 左列：我的星球（大星球）+ 邀请码 + 最近访客 */}
        <div className="space-y-4">
          <section className="card p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">MY PLANET</p>
                <h2 className="title mt-1.5 text-xl">我的星球</h2>
              </div>
              <span className="chip">{VISIBILITY_LABEL[planet.visibility]}</span>
            </div>
            <div className="mt-2">
              <PlanetScene mode="owner" planet={planet} petProfile={pet} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="chip">✨ {planet.statsLights}</span>
              <span className="chip">⭐ {planet.statsStars}</span>
              <span className="chip">🛰️ {planet.statsVisits}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/planet/owner" className="btn btn-primary btn-sm">
                管理我的星球
              </Link>
              <Link href="/" className="btn btn-ghost btn-sm">
                回首页
              </Link>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <p className="eyebrow">INVITE CODE</p>
            <h2 className="title mt-1.5 text-xl">用邀请码敲门</h2>
            <form onSubmit={openByCode} className="mt-3 flex gap-2">
              <input
                className="field text-center text-lg tracking-[0.3em] uppercase"
                placeholder="ABC123"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
                  setCodeError('');
                }}
              />
              <button type="submit" className="btn btn-primary shrink-0">
                前往
              </button>
            </form>
            {codeError && <p className="mt-2 text-[11px] text-[#c26a86]">{codeError}</p>}
            <p className="mt-2 text-[11px] text-[#b09ec0]">
              邀请码由主人生成，私密星球即使有码也无法进入。
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="eyebrow">RECENT VISITORS</p>
                <h2 className="title mt-1.5 text-xl">最近来过的脚印</h2>
              </div>
              <Link href="/planet/owner" className="link-quiet">
                全部记录 →
              </Link>
            </div>

            {recentVisitors.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#b09ec0]">
                还没有人来过。把邀请码发给朋友，或在主人端生成分享链接。
              </p>
            ) : (
              <ul className="space-y-2.5">
                {recentVisitors.map((visitor, index) => (
                  <li
                    key={`${visitor.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/55 px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-[12.5px] text-[#57465f]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] text-[#8b7a97]">
                        {visitor.name.slice(0, 1)}
                      </span>
                      {visitor.name}
                    </span>
                    <span className="text-[11px] text-[#a596b0]">
                      {ACTION_TEXT[visitor.action] || '来过'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* 右侧：星空散布区 */}
        <section className="card fade-up fade-up-1 relative overflow-hidden p-5 sm:p-6">
          <div className="relative z-10 flex items-end justify-between">
            <div>
              <p className="eyebrow">PUBLIC PLANETS</p>
              <h2 className="title mt-1.5 text-xl">公开星球 · 星空散布</h2>
            </div>
            <span className="text-[11px] text-[#b09ec0]">
              {loading ? '正在点亮…' : `${planets.length} / 10 颗`}
            </span>
          </div>

          <div className="star-arena relative mt-4 h-[540px] overflow-hidden rounded-[22px] sm:h-[620px]">
            {/* 星轨：两个缓慢旋转的虚线轨道 */}
            <span className="arena-orbit" style={{ width: 440, height: 440, top: '-14%', left: '-12%' }} />
            <span
              className="arena-orbit"
              style={{ width: 560, height: 560, bottom: '-26%', right: '-16%', animationDuration: '160s' }}
            />

            {/* 细碎星尘 + 十字星光 */}
            {ARENA_STARS.map((star, index) => (
              <span
                key={index}
                className="arena-star"
                style={{
                  top: `${star.top}%`,
                  left: `${star.left}%`,
                  width: star.size,
                  height: star.size,
                  animationDelay: `${star.delay}s`,
                }}
              />
            ))}
            <span className="arena-cross" style={{ top: '16%', left: '34%', animationDelay: '0.8s' }}>✦</span>
            <span className="arena-cross" style={{ top: '56%', left: '12%', animationDelay: '2s', fontSize: 12 }}>✦</span>
            <span className="arena-cross" style={{ top: '80%', left: '58%', animationDelay: '1.4s', fontSize: 11 }}>✦</span>

            {/* 装饰天体：月亮、星星、小星球，始终点缀星空 */}
            {decor.map((item) => (
              <span
                key={`${item.asset}-${item.top}`}
                className="arena-decor"
                style={{
                  top: `${item.top}%`,
                  left: `${item.left}%`,
                  width: item.size,
                  opacity: item.opacity,
                  animationDelay: `${item.delay}s`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={appPath(`/planets/${item.asset}.png`)} alt="" draggable={false} className="w-full select-none" />
              </span>
            ))}

            {loading ? (
              LAYOUT_MID.slice(0, 4).map((pos, index) => (
                <span
                  key={index}
                  className="absolute h-20 w-20 animate-pulse rounded-full bg-white/60"
                  style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                />
              ))
            ) : listError ? (
              <p className="absolute inset-0 grid place-items-center text-xs text-[#b09ec0]">{listError}</p>
            ) : planets.length === 0 ? (
              <p className="absolute inset-0 grid place-items-center px-8 text-center text-xs leading-relaxed text-[#b09ec0]">
                这片星空还静悄悄的。
                <br />
                把自己的星球设为「公开」，就会成为第一颗被看见的星球。
              </p>
            ) : (
              planets.map((item, index) => {
                const pos = positionFor(item, layout[index % layout.length]);
                return (
                  <FloatingPlanet
                    key={item.id}
                    planet={item}
                    top={pos.top}
                    left={pos.left}
                    size={sizeFor(item)}
                    delay={-(hashId(item.id) % 7)}
                  />
                );
              })
            )}

            {!loading && !listError && planets.length > 0 && (
              <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[10px] tracking-wide text-[#b7a8c2]">
                点任意一颗星球，去它家里串门 →
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
