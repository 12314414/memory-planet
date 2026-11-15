'use client';

import { useEffect, useRef, useState } from 'react';
import { INTRO_MODE } from '@/lib/config';

type IntroProps = {
  duration?: number;
  skippable?: boolean;
  onFinish: () => void;
};

/**
 * 开场动画占位组件。
 * 契约：{ duration?, skippable?, onFinish } —— 保持稳定，后续替换 lottie/video 不动调用方。
 * INTRO_MODE 控制形态：placeholder / lottie / video（后两者当前回退到 placeholder）。
 */
export default function Intro({ duration = 3000, skippable = true, onFinish }: IntroProps) {
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    window.setTimeout(onFinish, 320);
  };

  useEffect(() => {
    const timer = window.setTimeout(finish, duration);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div
      className="intro"
      style={{ opacity: leaving ? 0 : 1, transition: 'opacity 0.32s ease' }}
      role="dialog"
      aria-label="开场动画"
      data-intro-mode={INTRO_MODE}
    >
      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="relative mb-10">
          <div className="intro-ring" />
          <div className="intro-planet">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 68% 72%, rgba(255,214,232,0.85), rgba(255,214,232,0) 55%)',
              }}
            />
            <div
              className="absolute left-[16%] top-[18%] h-[10%] w-[26%] rounded-full bg-white/70 blur-[2px]"
              style={{ transform: 'rotate(-18deg)' }}
            />
          </div>
          <span className="absolute -right-6 -top-6 text-2xl text-[#f2cb78]" style={{ animation: 'twinkle 3s ease-in-out infinite' }}>
            ✦
          </span>
          <span
            className="absolute -left-8 bottom-2 text-lg text-[#f2cb78]"
            style={{ animation: 'twinkle 3.4s ease-in-out infinite 0.8s' }}
          >
            ✧
          </span>
        </div>

        <p className="eyebrow fade-up fade-up-1">MEMORY PLANET</p>
        <h1 className="title fade-up fade-up-1 mt-4 text-3xl leading-snug sm:text-[40px]">
          有些回忆，值得一颗星球
        </h1>
        <p className="fade-up fade-up-2 muted mt-4 max-w-sm text-sm leading-relaxed">
          把日子折成光，交给一只小宠物看守。
          <br />
          然后，等一阵来自别人的星风。
        </p>

        <div className="fade-up fade-up-3 mt-8 flex items-center gap-3 text-2xl">
          <span className="paw" style={{ animationDelay: '0.55s' }}>
            🐾
          </span>
          <span className="paw" style={{ animationDelay: '0.85s' }}>
            🐾
          </span>
          <span className="paw" style={{ animationDelay: '1.15s' }}>
            🐾
          </span>
        </div>
      </div>

      {skippable && (
        <button
          type="button"
          onClick={finish}
          className="absolute bottom-6 right-6 rounded-full border border-white/80 bg-white/60 px-4 py-1.5 text-xs text-[#8b7a97] backdrop-blur transition hover:bg-white"
        >
          跳过开场 →
        </button>
      )}
    </div>
  );
}
