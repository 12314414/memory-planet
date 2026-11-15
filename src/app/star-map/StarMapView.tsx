'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PlanetScene from '@/components/PlanetScene';
import { apiFetch, appPath, DEMO_MODE } from '@/lib/api-client';
import { resolveInviteCode } from '@/lib/demo-store';
import { getTheme } from '@/lib/theme';
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

  return (
    <main className="wrap pb-20 pt-10">
      <div className="mb-8 fade-up">
        <p className="eyebrow">STAR MAP · DOOR TO DOOR</p>
        <h1 className="title mt-3 text-3xl sm:text-4xl">星图 · 串门大厅</h1>
        <p className="muted mt-3 max-w-xl text-sm leading-7">
          {nickname}，这里能看到大家的公开星球。串门是异步的：你留下痕迹，主人在自己的时间里收到。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
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
        </div>

        <div className="space-y-4">
          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="eyebrow">PUBLIC PLANETS</p>
                <h2 className="title mt-1.5 text-xl">公开星球</h2>
              </div>
              <span className="text-[11px] text-[#b09ec0]">按更新时间 · 最多 10 个</span>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-[104px] animate-pulse rounded-2xl bg-white/55" />
                ))}
              </div>
            ) : listError ? (
              <p className="py-8 text-center text-xs text-[#b09ec0]">{listError}</p>
            ) : planets.length === 0 ? (
              <p className="py-8 text-center text-xs leading-relaxed text-[#b09ec0]">
                还没有公开的星球。
                <br />
                把自己的星球设为「公开」，就会出现在这里。
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {planets.map((item) => {
                  const theme = getTheme(item.theme);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/planet/${item.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/65 px-3 py-3 transition hover:-translate-y-0.5 hover:bg-white"
                      >
                        <span
                          className="relative block h-12 w-12 shrink-0 rounded-full"
                          style={{ background: theme.sphere, boxShadow: `0 8px 18px -10px ${theme.glow}` }}
                        >
                          <span
                            className="absolute left-1/2 top-1/2 h-[14px] w-[56px] -translate-x-1/2 -translate-y-1/2 rotate-[-17deg] rounded-full border-2"
                            style={{ borderColor: theme.ring }}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[#57465f]">
                            {item.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[#a596b0]">
                            {item.ownerName} · 宠物 {item.petName}
                          </span>
                          <span className="mt-1 block text-[10px] text-[#b7a8c2]">
                            ✨ {item.statsVisits} 次到访 · ⭐ {item.statsStars}
                          </span>
                        </span>
                        <span className="text-[#c9b6e8]">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
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
      </div>
    </main>
  );
}
