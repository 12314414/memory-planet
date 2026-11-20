'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { hashId } from '@/components/FloatingPlanet';
import FriendsPanel from '@/components/FriendsPanel';
import PlanetScene from '@/components/PlanetScene';
import Rose from '@/components/Rose';
import WarpTransition from '@/components/WarpTransition';
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

/** 散布的小星球坐标（公开星球），中间横向均匀散布，避开左右两颗大星球，不重叠 */
const SMALL_POS = [
  { top: 20, left: 30 },
  { top: 16, left: 42 },
  { top: 22, left: 54 },
  { top: 34, left: 22 },
  { top: 36, left: 36 },
  { top: 32, left: 50 },
  { top: 34, left: 64 },
  { top: 48, left: 28 },
  { top: 50, left: 44 },
  { top: 48, left: 60 },
  { top: 62, left: 22 },
  { top: 64, left: 36 },
  { top: 60, left: 50 },
  { top: 62, left: 64 },
];

/** 星尘（大量，营造深邃星空） */
const DUST = Array.from({ length: 80 }, (_, i) => ({
  top: (i * 37 + 11) % 100,
  left: (i * 53 + 7) % 100,
  s: 1 + ((i * 13) % 3),
  d: ((i * 17) % 60) / 10,
  o: 0.25 + ((i * 23) % 60) / 100,
}));

/** 十字星光（少数更亮的大星） */
const CROSSES = [
  { top: 6, left: 22, size: 13, d: 0.4 },
  { top: 20, left: 70, size: 10, d: 1.6 },
  { top: 34, left: 88, size: 12, d: 0.9 },
  { top: 56, left: 6, size: 9, d: 2.4 },
  { top: 72, left: 48, size: 11, d: 1.2 },
  { top: 84, left: 90, size: 14, d: 3.1 },
  { top: 48, left: 40, size: 8, d: 0.7 },
  { top: 92, left: 8, size: 10, d: 1.8 },
];

export default function StarMapView({ nickname, planet, pet, recentVisitors }: StarMapViewProps) {
  const [planets, setPlanets] = useState<PublicPlanetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [warpTarget, setWarpTarget] = useState<{ name: string; href: string } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

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

  const warpTo = useCallback((name: string, href: string) => {
    setWarpTarget({ name, href });
  }, []);

  const finishWarp = useCallback(() => {
    if (!warpTarget) return;
    window.location.href = appPath(warpTarget.href);
  }, [warpTarget]);

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
      warpTo('这颗星球', `/planet/${planetId}?code=${value}`);
      return;
    }
    warpTo('这颗星球', `/planet/visit/${value}`);
  };

  return (
    <main className="cosmos-page">
      {/* 全屏深空背景 */}
      <div className="nebula" aria-hidden />
      <div className="dust-layer" aria-hidden>
        {DUST.map((star, i) => (
          <span
            key={i}
            className="dust-star"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: star.s,
              height: star.s,
              opacity: star.o,
              animationDelay: `${star.d}s`,
            }}
          />
        ))}
        {CROSSES.map((c, i) => (
          <span
            key={`c${i}`}
            className="dust-cross"
            style={{ top: `${c.top}%`, left: `${c.left}%`, fontSize: c.size, animationDelay: `${c.d}s` }}
          >
            ✦
          </span>
        ))}
      </div>

      {/* 顶部导航 */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-5 pt-8 sm:px-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow" style={{ color: 'rgba(150, 110, 160, 0.7)' }}>
              STAR MAP · 宇宙
            </p>
            <h1 className="title mt-2 text-3xl text-[#6a4a78] sm:text-4xl" style={{ textShadow: '0 1px 12px rgba(200,150,200,0.4)' }}>
              星图 · 串门大厅
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[#826496]">
              {nickname}，这里是大家的宇宙。你的星球和小王子的星球，是这片星空里最亮的两颗。
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFriends(true)} className="btn btn-primary btn-sm">
              💬 好友
            </button>
            <button onClick={() => setShowInvite((v) => !v)} className="btn btn-ghost btn-sm">
              邀请码
            </button>
            <Link href="/" className="btn btn-ghost btn-sm">
              回首页
            </Link>
          </div>
        </div>
      </div>

      {/* 全屏星球散布区（无卡片边框，沉浸式星空） */}
      <div className="relative z-10 mx-auto mt-2 w-full max-w-7xl px-2 sm:px-6">
        <div className="relative h-[74vh] min-h-[560px] w-full">
          {/* 我的星球（大，左侧，带光晕） */}
          <div className="absolute left-0 top-0 flex h-full w-[46%] flex-col items-center justify-center">
            <div className="relative scale-[1.12]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/70 px-4 py-1.5 text-[12px] text-[#6a4a78] backdrop-blur-md">
                🌟 我的星球
              </div>
              <button
                onClick={() => warpTo('我的星球', '/planet/owner')}
                className="group relative block cursor-pointer"
                aria-label="进入我的星球"
              >
                <PlanetScene mode="owner" planet={planet} petProfile={pet} />
                <span className="absolute inset-0 rounded-full transition group-hover:ring-4 group-hover:ring-purple-200/50" />
              </button>
              <p className="mt-3 text-center text-[11px] tracking-[0.2em] text-[#826496]">
                {VISIBILITY_LABEL[planet.visibility]} · {planet.statsLights} 点亮
              </p>
            </div>
          </div>

          {/* 小王子的星球（大，右侧，玫瑰长在上面） */}
          <div className="absolute right-0 top-0 flex h-full w-[46%] flex-col items-center justify-center">
            <div className="relative scale-[1.12]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-rose-200/60 px-4 py-1.5 text-[12px] text-[#6a4a78] backdrop-blur-md">
                🌹 小王子的星球
              </div>
              <button
                onClick={() => warpTo('小王子的星球', '/planet/little-prince')}
                className="group relative block cursor-pointer"
                aria-label="探访小王子的星球"
              >
                <RosePlanet />
                <span className="absolute inset-0 rounded-full transition group-hover:ring-4 group-hover:ring-rose-200/50" />
              </button>
              <p className="mt-3 text-center text-[11px] tracking-[0.2em] text-[#826496]">
                小王子 · 等一个朋友
              </p>
            </div>
          </div>

          {/* 散布的小星球 */}
          {loading ? (
            SMALL_POS.slice(0, 5).map((pos, i) => (
              <span
                key={i}
                className="absolute h-16 w-16 animate-pulse rounded-full bg-white/25"
                style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
              />
            ))
          ) : listError ? (
            <p className="absolute bottom-8 left-0 right-0 text-center text-xs text-[#826496]">{listError}</p>
          ) : planets.length === 0 ? (
            <p className="absolute bottom-10 left-0 right-0 px-8 text-center text-xs leading-relaxed text-[#826496]">
              这片宇宙还静悄悄的，把自己的星球设为「公开」，就会成为被看见的一颗。
            </p>
          ) : (
            planets.map((item, index) => {
              const pos = SMALL_POS[index % SMALL_POS.length];
              // 统一大小，去掉哈希抖动，保证均匀不重叠
              const size = 52;
              return (
                <button
                  key={item.id}
                  onClick={() => warpTo(item.name, `/planet/${item.id}`)}
                  className="group absolute z-20 cursor-pointer outline-none"
                  style={{
                    top: `${pos.top}%`,
                    left: `${pos.left}%`,
                    width: size,
                  }}
                  aria-label={`飞向 ${item.name}`}
                >
                  <div className="fp-float" style={{ animationDelay: `${-(index % 7)}s` }}>
                    <div className="relative transition group-hover:scale-110">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={appPath(`/planets/${planetAsset(item.id)}.png`)}
                        alt=""
                        draggable={false}
                        className="fp-img w-full select-none"
                      />
                      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 block w-32 -translate-x-1/2 whitespace-nowrap text-center text-[11px] text-[#7a5a8a] opacity-0 transition group-hover:opacity-100">
                        {item.name}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {/* 玫瑰已移入小王子星球内，不单独出现 */}
        </div>
      </div>

      {/* 最近访客 */}
      <div className="relative z-20 mx-auto mt-6 w-full max-w-7xl px-5 pb-20 sm:px-8">
        <section className="card p-5">
          <p className="eyebrow">RECENT VISITORS</p>
          <h2 className="title mt-1.5 text-xl">最近来过的脚印</h2>
          {recentVisitors.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#b09ec0]">还没有人来过你的星球。</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {recentVisitors.map((visitor, index) => (
                <span key={`${visitor.name}-${index}`} className="chip">
                  {visitor.name} · {ACTION_TEXT[visitor.action] || '来过'}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 邀请码弹层 */}
      {showInvite && (
        <div className="fixed inset-0 z-[80] grid place-items-center px-4">
          <div className="modal-mask absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="modal-panel card relative z-10 w-full max-w-sm p-6">
            <p className="eyebrow">INVITE CODE</p>
            <h2 className="title mt-1.5 text-xl">用邀请码敲门</h2>
            <form onSubmit={openByCode} className="mt-3 flex gap-2">
              <input
                className="field text-center text-lg uppercase tracking-[0.3em]"
                placeholder="ABC123"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
                  setCodeError('');
                }}
              />
              <button type="submit" className="btn btn-primary shrink-0">前往</button>
            </form>
            {codeError && <p className="mt-2 text-[11px] text-[#c26a86]">{codeError}</p>}
            <p className="mt-2 text-[11px] text-[#b09ec0]">邀请码由主人生成，私密星球即使有码也无法进入。</p>
          </div>
        </div>
      )}

      {/* 穿越转场（视频） */}
      {warpTarget && <WarpTransition targetName={warpTarget.name} onDone={finishWarp} />}

      {/* 好友与私信浮层 */}
      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}

      <style jsx>{`
        .cosmos-page {
          position: relative;
          min-height: 100vh;
        }
        .nebula {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(1000px 700px at 20% 0%, rgba(255, 205, 225, 0.55) 0%, rgba(255, 205, 225, 0) 60%),
            radial-gradient(900px 650px at 82% 6%, rgba(214, 200, 250, 0.5) 0%, rgba(214, 200, 250, 0) 60%),
            radial-gradient(800px 600px at 50% 110%, rgba(180, 215, 245, 0.55) 0%, rgba(180, 215, 245, 0) 62%),
            linear-gradient(180deg, #fbe3ee 0%, #fbeaf0 30%, #fdf6f4 52%, #eef2fa 78%, #dfe9f8 100%);
        }
        .dust-layer {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
        .dust-star {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 35%, #fff 0%, #ffeccc 55%, rgba(243, 207, 122, 0) 100%);
          animation: twinkle 4.5s ease-in-out infinite;
        }
        .dust-cross {
          position: absolute;
          color: rgba(200, 150, 180, 0.8);
          text-shadow: 0 0 10px rgba(220, 170, 200, 0.6);
          animation: twinkle 5s ease-in-out infinite;
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.85);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.1);
          }
        }
      `}</style>
    </main>
  );
}

/** 星球素材按 id 哈希分配 */
function planetAsset(id: string) {
  const assets = [
    'earth-teal',
    'ring-purple',
    'violet-small',
    'jupiter',
    'yellow',
    'earth-blue',
    'ring-brown',
    'ring-teal',
  ] as const;
  return assets[hashId(id) % assets.length];
}

/** 玫瑰的星球（小行星 + 玫瑰 + 草地） */
function RosePlanet() {
  return (
    <div className="relative aspect-square w-[300px] select-none">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_26%,#fffdf6_0%,#fbe7c8_24%,#ecc58f_50%,#d9a06b_72%,#b8794e_100%)] shadow-[0_30px_60px_-20px_rgba(50,28,20,0.6),inset_-18px_-22px_40px_rgba(90,52,30,0.35)]" />
      <div className="absolute bottom-0 left-0 right-0 h-[46%] rounded-[50%_50%_0_0] bg-[linear-gradient(180deg,#bfe08a_0%,#7fb65a_55%,#5e9a46_100%)] shadow-[inset_0_12px_20px_rgba(255,255,255,0.3)]" />
      {/* 玫瑰（在星球上，放大） */}
      <div className="absolute bottom-[18%] left-1/2" style={{ transform: 'translateX(-50%) scale(0.62)', transformOrigin: 'bottom center' }}>
        <Rose size={110} floating={false} />
      </div>
    </div>
  );
}
