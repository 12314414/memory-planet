'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import CandySaturn from '@/components/CandySaturn';
import FriendsPanel from '@/components/FriendsPanel';
import Intro from '@/components/Intro';
import PaperClouds from '@/components/PaperClouds';
import PaperPlanet from '@/components/PaperPlanet';
import PlanetDetailModal from '@/components/PlanetDetailModal';
import PlanetScene from '@/components/PlanetScene';
import WarpTransition from '@/components/WarpTransition';
import { apiFetch, appPath, DEMO_MODE } from '@/lib/api-client';
import { INTRO_DURATION } from '@/lib/config';
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

/** 散布的小星球坐标（公开星球），集中在两颗大星球之间的云窗里，互不重叠 */
const SMALL_POS = [
  { top: 28, left: 38 },
  { top: 32, left: 47 },
  { top: 27, left: 57 },
  { top: 42, left: 34 },
  { top: 44, left: 43 },
  { top: 41, left: 52 },
  { top: 45, left: 61 },
  { top: 57, left: 37 },
  { top: 59, left: 46 },
  { top: 56, left: 55 },
  { top: 60, left: 64 },
  { top: 71, left: 34 },
  { top: 73, left: 44 },
  { top: 69, left: 54 },
  { top: 72, left: 63 },
];

/** 先导片同款的金色四芒星点缀 */
const GLINTS = [
  { top: 22, left: 50, size: 20, delay: 0 },
  { top: 36, left: 38, size: 12, delay: 1.4 },
  { top: 38, left: 60, size: 16, delay: 2.6 },
  { top: 52, left: 50, size: 22, delay: 0.8 },
  { top: 66, left: 41, size: 13, delay: 2 },
  { top: 64, left: 59, size: 15, delay: 3.2 },
];

/** 用户素材中挑选的水彩星球：补充云窗里的视觉密度，不占用真实星球的点击入口 */
const DECOR_PLANETS = [
  // 远处：靠上、体积小、透明度低
  { asset: 2, top: 15, left: 24, size: 30, delay: -3.8 },
  { asset: 6, top: 9, left: 52, size: 26, delay: -2.4 },
  { asset: 3, top: 27, left: 72, size: 36, delay: -4.6 },
  { asset: 5, top: 31, left: 48, size: 24, delay: -2.9 },
  // 中景：向左右两侧散开
  { asset: 4, top: 44, left: 6, size: 48, delay: -0.7 },
  { asset: 5, top: 39, left: 93, size: 42, delay: -1.8 },
  { asset: 7, top: 63, left: 29, size: 58, delay: -4.1 },
  { asset: 8, top: 65, left: 73, size: 66, delay: -0.4 },
  { asset: 1, top: 52, left: 54, size: 44, delay: -3.3 },
  // 近处：靠下、靠边缘，体积更大
  { asset: 1, top: 80, left: 8, size: 82, delay: -1.2 },
  { asset: 2, top: 82, left: 91, size: 94, delay: -5.1 },
  { asset: 6, top: 85, left: 40, size: 72, delay: -2.1 },
];

const STAR_COUNT = 900;

/** 三维星尘：球体空间随机分布，支持透视缩放、叠加发光和拖拽旋转 */
function ThreeStarfield() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 300);
    camera.position.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const palette = [0xffffff, 0xffe8b5, 0xffc9dd, 0xd7c9ff];
    const color = new THREE.Color();

    for (let i = 0; i < STAR_COUNT; i += 1) {
      // 在不同半径的球面上均匀取样，形成包含 Z 轴的三维球形星域。
      const radius = 30 + Math.random() * 90;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const index = i * 3;

      positions[index] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index + 2] = radius * Math.cos(phi);

      color.set(palette[Math.floor(Math.random() * palette.length)]);
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 径向渐变贴图让每颗星保持柔和、圆润的发光边缘。
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const context = glowCanvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    const material = new THREE.PointsMaterial({
      size: 0.75,
      map: glowTexture,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.4;
    controls.update();

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    window.addEventListener('resize', resize);

    renderer.setAnimationLoop((time) => {
      material.opacity = 0.72 + Math.sin(time * 0.0015) * 0.18;
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener('resize', resize);
      renderer.setAnimationLoop(null);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      glowTexture.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="dust-layer three-starfield" aria-hidden="true" />;
}

export default function StarMapView({ nickname, planet, pet, recentVisitors }: StarMapViewProps) {
  const [planets, setPlanets] = useState<PublicPlanetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [warpTarget, setWarpTarget] = useState<{ name: string; href: string } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showFilm, setShowFilm] = useState(false);
  const [activePlanet, setActivePlanet] = useState<PublicPlanetDTO | null>(null);
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
    <main className="relative min-h-screen">
      {/* 水彩星空底（先导片同款） */}
      <div className="sky-wash" aria-hidden />
      <ThreeStarfield />

      {/* 顶部导航 */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-5 pt-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow" style={{ color: '#b295bf' }}>
              STAR MAP · 宇宙
            </p>
            <h1
              className="title mt-2 text-3xl text-[#6a4a78] sm:text-4xl"
              style={{ textShadow: '0 2px 16px rgba(255, 255, 255, 0.9)' }}
            >
              星图 · 串门大厅
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[#826496]">
              {nickname}，这里的星空是纸雕做的。你的星球和小王子的星球，是云窗里最亮的两颗。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowFilm(true)} className="btn btn-ghost btn-sm">
              ▶ 先导片
            </button>
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

      {/* 纸雕云窗里的星球散布区 */}
      <div className="relative z-10 mx-auto mt-2 w-full max-w-7xl px-2 sm:px-6">
        <div className="map-stage relative h-[76vh] min-h-[580px] w-full max-sm:flex max-sm:h-auto max-sm:min-h-0 max-sm:flex-col max-sm:gap-6 max-sm:pb-10 max-sm:pt-24">
          <span className="stage-orbit" style={{ width: '56%', aspectRatio: '1 / 1' }} aria-hidden />
          <span
            className="stage-orbit"
            style={{ width: '78%', aspectRatio: '1 / 1', opacity: 0.6 }}
            aria-hidden
          />

          <PaperClouds corner="tl" />
          <PaperClouds corner="tr" />

          {/* 我的星球（大，左侧，糖果星环 + 宠物） */}
          <div className="absolute left-0 top-0 z-20 flex h-full w-[34%] flex-col items-center justify-center pb-24 max-sm:relative max-sm:left-auto max-sm:top-auto max-sm:h-auto max-sm:w-full max-sm:pb-0">
            <div className="relative w-[clamp(220px,24vw,340px)] max-sm:w-[52vw]">
              <div className="map-chip absolute -top-3 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap">
                🌟 我的星球
              </div>
              <button
                onClick={() => warpTo('我的星球', '/planet/owner')}
                className="group relative block w-full cursor-pointer"
                aria-label="进入我的星球"
              >
                <PlanetScene
                  mode="owner"
                  planet={planet}
                  petProfile={pet}
                  themeKey="candy"
                  variant="candy"
                  showCaption={false}
                />
                <span className="pointer-events-none absolute inset-0 rounded-full transition group-hover:ring-4 group-hover:ring-[rgba(232,190,118,0.35)]" />
              </button>
              <p className="mt-2 text-center text-[11px] tracking-[0.2em] text-[#7b5f8b]">
                {VISIBILITY_LABEL[planet.visibility]}可见 · {planet.statsLights} 次点亮
              </p>
            </div>
          </div>

          {/* 小王子的星球（大，右侧，玫瑰与糖金环） */}
          <div className="absolute right-0 top-0 z-20 flex h-full w-[34%] flex-col items-center justify-center pb-24 max-sm:relative max-sm:right-auto max-sm:top-auto max-sm:h-auto max-sm:w-full max-sm:pb-0">
            <div className="relative w-[clamp(210px,23vw,330px)] max-sm:w-[48vw]">
              <div className="map-chip absolute -top-3 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap">
                🌹 小王子的星球
              </div>
              <button
                onClick={() => warpTo('小王子的星球', '/planet/little-prince')}
                className="group relative block w-full cursor-pointer"
                aria-label="探访小王子的星球"
              >
                <CandySaturn rose />
                <span className="pointer-events-none absolute inset-0 rounded-full transition group-hover:ring-4 group-hover:ring-[rgba(232,190,118,0.3)]" />
              </button>
              <p className="mt-2 text-center text-[11px] tracking-[0.2em] text-[#7b5f8b]">
                小王子 · 等一个朋友
              </p>
            </div>
          </div>

          {/* 散布的纸雕小星球（移动端自动流式排列） */}
          <div className="max-sm:relative max-sm:mt-2 max-sm:flex max-sm:flex-wrap max-sm:justify-center max-sm:gap-5 sm:pointer-events-none sm:absolute sm:inset-0">
            {loading ? (
              SMALL_POS.slice(0, 5).map((pos, i) => (
                <span
                  key={i}
                  className="small-planet-slot absolute h-14 w-14 animate-pulse rounded-full bg-white/55"
                  style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                />
              ))
            ) : listError ? (
              <p className="absolute bottom-8 left-0 right-0 text-center text-xs text-[#826496]">
                {listError}
              </p>
            ) : planets.length === 0 ? (
              <p className="absolute bottom-10 left-0 right-0 px-8 text-center text-xs leading-relaxed text-[#826496]">
                这片宇宙还静悄悄的，把自己的星球设为「公开」，就会成为被看见的一颗。
              </p>
            ) : (
              planets.map((item, index) => {
                const pos = SMALL_POS[index % SMALL_POS.length];
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePlanet(item)}
                    className="small-planet-slot group absolute z-20 w-[60px] cursor-pointer outline-none sm:pointer-events-auto"
                    style={{
                      top: `${pos.top}%`,
                      left: `${pos.left}%`,
                    }}
                    aria-label={`飞向 ${item.name}`}
                  >
                    <div className="fp-float" style={{ animationDelay: `${-(index % 7)}s` }}>
                      <div className="relative transition duration-300 group-hover:scale-110">
                        <PaperPlanet index={index} ring={index % 3 === 1} />
                        <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 block w-32 -translate-x-1/2 whitespace-nowrap rounded-full bg-[rgba(255,252,246,0.92)] px-2.5 py-1 text-center text-[11px] text-[#7c6489] opacity-0 shadow-[0_8px_16px_-12px_rgba(120,84,108,0.7)] transition group-hover:opacity-100 group-focus-visible:opacity-100">
                          {item.name}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 从用户素材挑选的水彩星球：只作装饰，真实公开星球仍可独立点击 */}
          <div
            className="map-planet-art-layer max-sm:relative max-sm:mt-1 max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:justify-center max-sm:gap-2 sm:pointer-events-none sm:absolute sm:inset-0"
            aria-hidden="true"
          >
            {DECOR_PLANETS.map((item, index) => (
              <span
                key={`${item.asset}-${index}`}
                className="map-planet-art"
                style={{
                  top: `${item.top}%`,
                  left: `${item.left}%`,
                  width: item.size,
                  opacity: item.size < 38 ? 0.6 : item.size < 60 ? 0.82 : 0.98,
                  ['--decor-mobile-size' as string]: `${Math.max(30, Math.round(item.size * 0.68))}px`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={appPath(`/planets/candy-${String(item.asset).padStart(2, '0')}.png`)}
                  alt=""
                  className="fp-float h-auto w-full"
                  style={{ animationDelay: `${item.delay}s` }}
                />
              </span>
            ))}
          </div>

          {/* 金色四芒星与钻饰 */}
          {GLINTS.map((glint, index) => (
            <span
              key={index}
              className="gem-star pointer-events-none absolute hidden select-none sm:block"
              style={{
                top: `${glint.top}%`,
                left: `${glint.left}%`,
                fontSize: glint.size,
                animation: `twinkle 4.5s ease-in-out infinite ${glint.delay}s`,
              }}
              aria-hidden
            >
              ✦
            </span>
          ))}

          <PaperClouds corner="bl" />
          <PaperClouds corner="br" />
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
          <div className="modal-mask absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
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
              <button type="submit" className="btn btn-primary shrink-0">
                前往
              </button>
            </form>
            {codeError && <p className="mt-2 text-[11px] text-[#c26a86]">{codeError}</p>}
            <p className="mt-2 text-[11px] text-[#b09ec0]">邀请码由主人生成，私密星球即使有码也无法进入。</p>
          </div>
        </div>
      )}

      {/* 先导片（与首页开场同一支影片） */}
      {showFilm && (
        <Intro duration={INTRO_DURATION} skippable onFinish={() => setShowFilm(false)} />
      )}

      {/* 星球详情弹层 */}
      {activePlanet && (
        <PlanetDetailModal
          planet={activePlanet}
          onClose={() => setActivePlanet(null)}
          onEnter={() => {
            const target = activePlanet;
            setActivePlanet(null);
            warpTo(target.name, `/planet/${target.id}`);
          }}
        />
      )}

      {/* 穿越转场（视频） */}
      {warpTarget && <WarpTransition targetName={warpTarget.name} onDone={finishWarp} />}

      {/* 好友与私信浮层 */}
      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}

      <style jsx>{`
        :global(.three-starfield) {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: auto;
        }
        :global(.three-starfield canvas) {
          display: block;
          width: 100%;
          height: 100%;
          cursor: grab;
        }
        :global(.three-starfield canvas:active) {
          cursor: grabbing;
        }
      `}</style>
    </main>
  );
}
