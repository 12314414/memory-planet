'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AiWelcomeBubble from '@/components/AiWelcomeBubble';
import Guestbook from '@/components/Guestbook';
import MemoryWall from '@/components/MemoryWall';
import PlanetScene from '@/components/PlanetScene';
import SiteHeader from '@/components/SiteHeader';
import VisitorActions from '@/components/VisitorActions';
import { apiFetch, appPath } from '@/lib/api-client';
import type { GuestbookDTO, MemoryDTO, PlanetDTO } from '@/lib/types';

type PageData = {
  viewer: { id: string; nickname: string; isOwner: boolean };
  planet: PlanetDTO;
  memories: MemoryDTO[];
  guestbook: GuestbookDTO[];
};

type VisitorPlanetViewProps = {
  planetId: string;
  inviteCode?: string;
};

export default function VisitorPlanetView({ planetId, inviteCode }: VisitorPlanetViewProps) {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [code, setCode] = useState('');
  const [stats, setStats] = useState({ statsVisits: 0, statsLights: 0, statsStars: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = inviteCode ? `?code=${encodeURIComponent(inviteCode)}` : '';
      const res = await apiFetch(`/api/planet/${planetId}${query}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json?.error || '无法进入这颗星球', status: res.status });
        return;
      }
      setData(json as PageData);
      setStats({
        statsVisits: json.planet.statsVisits,
        statsLights: json.planet.statsLights,
        statsStars: json.planet.statsStars,
      });
    } catch {
      setError({ message: '网络似乎断开了，稍后再试试', status: 0 });
    } finally {
      setLoading(false);
    }
  }, [planetId, inviteCode]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <>
        <SiteHeader />
        <main className="wrap flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div
            className="h-16 w-16 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #fff, #e9dcff 40%, #c0a9ec 75%, #9a86c9 100%)',
              animation: 'floaty 3s ease-in-out infinite',
              boxShadow: '0 0 30px rgba(190,165,235,.5)',
            }}
          />
          <p className="text-xs text-[#b09ec0]">正在靠近这颗星球…</p>
        </main>
      </>
    );
  }

  if (error || !data) {
    const needCode = error?.status === 403 && error.message.includes('邀请码');
    return (
      <>
        <SiteHeader />
        <main className="wrap flex min-h-[64vh] items-center justify-center py-12">
          <div className="card w-full max-w-md p-7 text-center">
            <span className="text-3xl">🛰️</span>
            <h1 className="title mt-4 text-xl">这颗星球暂时进不去</h1>
            <p className="muted mt-3 text-sm leading-relaxed">
              {error?.message || '星球不存在或已漂流走了'}
            </p>

            {needCode && (
              <form
                className="mt-5 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = code.trim().toUpperCase();
                  if (value.length === 6) {
                    window.location.href = appPath(`/planet/${planetId}?code=${value}`);
                  }
                }}
              >
                <input
                  className="field text-center uppercase tracking-[0.3em]"
                  placeholder="ABC123"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
                  }
                />
                <button type="submit" className="btn btn-primary shrink-0">
                  敲门
                </button>
              </form>
            )}

            {error?.status === 401 && (
              <Link href="/" className="btn btn-primary mt-5 w-full">
                先输入昵称进入
              </Link>
            )}

            <Link href="/star-map" className="link-quiet mt-5 inline-block">
              返回星图大厅 →
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { planet, memories, guestbook, viewer } = data;

  return (
    <>
      <SiteHeader nickname={viewer.nickname} />
      <main className="wrap pb-20 pt-8">
        {viewer.isOwner && (
          <div className="mb-4 rounded-2xl border border-[#f0e2cb] bg-[#fff8ec]/80 px-4 py-2.5 text-[11px] text-[#9a8259]">
            你正在看自己的星球访客视角。
            <Link href="/planet/owner" className="ml-1 underline decoration-dotted">
              去主人端管理 →
            </Link>
          </div>
        )}

        <div className="mb-4">
          <AiWelcomeBubble
            planetId={planet.id}
            visitorName={viewer.nickname}
            petName={planet.petProfile.name}
            planetName={planet.name}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="card relative overflow-hidden px-4 pb-16 pt-8">
            <div className="pointer-events-none absolute -left-12 top-6 h-32 w-32 rounded-full bg-[#e9e0ff] blur-3xl" />
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="chip">🛰️ {planet.ownerName} 的星球</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#b09ec0]">VISITOR VIEW</span>
            </div>
            <PlanetScene mode="visitor" planet={planet} petProfile={planet.petProfile} />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="chip">只读访问 · 可以互动，不会改动回忆</span>
            </div>
          </section>

          <div className="space-y-4">
            <VisitorActions
              planetId={planet.id}
              inviteCode={inviteCode}
              onStats={(next) => setStats(next)}
            />

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: '到访', value: stats.statsVisits, icon: '🛰️' },
                { label: '被点亮', value: stats.statsLights, icon: '✨' },
                { label: '收到星星', value: stats.statsStars, icon: '⭐' },
              ].map((item) => (
                <div key={item.label} className="card-soft px-3 py-3 text-center">
                  <p className="text-base">{item.icon}</p>
                  <p className="title mt-1 text-lg leading-none">{item.value}</p>
                  <p className="mt-1 text-[10px] text-[#b09ec0]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="card-soft px-4 py-3 text-[11px] leading-relaxed text-[#a596b0]">
              「{planet.petProfile.name}」{planet.petProfile.persona}。
              <br />
              它的回复由 AI 扮演，不会透露主人的隐私，也不代表主人本人。
            </div>
          </div>
        </div>

        <div className="mt-10">
          <MemoryWall
            memories={memories}
            mode="visitor"
            emptyHint="主人还没有公开任何回忆。也许可以留句话，让宠物转达。"
          />
        </div>

        <div className="mt-10">
          <Guestbook
            planetId={planet.id}
            inviteCode={inviteCode}
            entries={guestbook}
            petName={planet.petProfile.name}
            onPosted={(entry) =>
              setData((prev) => (prev ? { ...prev, guestbook: [entry, ...prev.guestbook] } : prev))
            }
            onReplyUpdated={(id, aiReply) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      guestbook: prev.guestbook.map((item) =>
                        item.id === id ? { ...item, aiReply } : item,
                      ),
                    }
                  : prev,
              )
            }
          />
        </div>
      </main>
    </>
  );
}
