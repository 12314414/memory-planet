'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Intro from '@/components/Intro';
import PlanetScene from '@/components/PlanetScene';
import { INTRO_DURATION } from '@/lib/config';
import { VISIBILITY_LABEL, type Visibility } from '@/lib/constants';
import type { PetProfile } from '@/lib/types';

type HomeViewProps = {
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
  publicMemories: number;
  privateMemories: number;
};

const INTRO_KEY = 'hx_intro_played';

export default function HomeView({
  nickname,
  planet,
  pet,
  publicMemories,
  privateMemories,
}: HomeViewProps) {
  const [showIntro, setShowIntro] = useState<boolean | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);

  useEffect(() => {
    let played = false;
    try {
      played = sessionStorage.getItem(INTRO_KEY) === '1';
    } catch {
      // 隐私模式下忽略
    }
    setShowIntro(!played);
  }, []);

  const finishIntro = () => {
    setShowIntro(false);
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      // ignore
    }
  };

  const replay = () => {
    setReplayNonce((value) => value + 1);
    setShowIntro(true);
  };

  return (
    <>
      {showIntro && (
        <Intro key={replayNonce} duration={INTRO_DURATION} skippable onFinish={finishIntro} />
      )}

      <section className="wrap grid items-center gap-8 pb-10 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pb-16 lg:pt-16">
        <div className="fade-up">
          <p className="eyebrow">YOUR LITTLE UNIVERSE</p>
          <h1 className="title mt-4 text-[34px] leading-[1.25] sm:text-[46px]">
            把回忆，
            <br />
            安放在一颗星球上
          </h1>
          <p className="muted mt-5 max-w-md text-sm leading-7">
            {nickname}，这是属于你的第 001 号星球。宠物「{pet.name}」已经住进来了，
            它会替你看守回忆，也会替你接待每一位来串门的人。
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/planet/owner" className="btn btn-primary">
              进入我的星球 <span aria-hidden>→</span>
            </Link>
            <Link href="/star-map" className="btn btn-ghost">
              去星图串门
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <span className="chip">✨ 点亮 {planet.statsLights}</span>
            <span className="chip">⭐ 收到 {planet.statsStars} 颗星</span>
            <span className="chip">🛰️ 到访 {planet.statsVisits}</span>
            <span className="chip">📮 {publicMemories} 条公开回忆</span>
          </div>
        </div>

        <div className="fade-up fade-up-2">
          <div className="card relative overflow-hidden px-4 pb-16 pt-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#ffeaf3] blur-2xl" />
            <PlanetScene mode="owner" planet={planet} petProfile={pet} />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="chip">当前访问权限：{VISIBILITY_LABEL[planet.visibility]}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap grid gap-4 pb-20 md:grid-cols-3">
        <article className="card p-5">
          <p className="eyebrow">HOME PLANET</p>
          <h2 className="title mt-2 text-lg">{planet.name}</h2>
          <p className="muted mt-2 text-xs leading-relaxed">
            设置访问权限、生成邀请码、查看访客记录与 AI 访客简报。
          </p>
          <Link href="/planet/owner" className="link-quiet mt-4 inline-block">
            星球设置 →
          </Link>
        </article>

        <article className="card p-5">
          <p className="eyebrow">VISIT OTHERS</p>
          <h2 className="title mt-2 text-lg">去别人的星球看看</h2>
          <p className="muted mt-2 text-xs leading-relaxed">
            星图里有公开的星球，也可以用手上的 6 位邀请码直接敲门。
          </p>
          <Link href="/star-map" className="link-quiet mt-4 inline-block">
            打开星图 →
          </Link>
        </article>

        <article className="card p-5">
          <p className="eyebrow">PRIVACY</p>
          <h2 className="title mt-2 text-lg">
            {privateMemories} 条回忆上着锁
          </h2>
          <p className="muted mt-2 text-xs leading-relaxed">
            私密回忆不会出现在访客页，访客也拿不到你的 userId 与邀请码。
          </p>
          <button type="button" onClick={replay} className="link-quiet mt-4 inline-block">
            重播开场动画 ↻
          </button>
        </article>
      </section>
    </>
  );
}
