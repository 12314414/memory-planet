'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { appPath } from '@/lib/api-client';

/** 记住音乐开关，刷新后保留 */
const STORAGE_KEY = 'hx_bgm';
/** 从上传视频里抽出的圣诞歌曲音频，循环播放 */
const SRC = appPath('/bgm.m4a');
/** 背景音乐音量：轻一点，不压过页面内容 */
const VOLUME = 0.55;

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef(0);
  const pauseRef = useRef(0);
  const wantRef = useRef(true);
  const [playing, setPlaying] = useState(false);

  const fadeTo = useCallback((to: number) => {
    const el = audioRef.current;
    if (!el) return;
    window.clearInterval(fadeRef.current);
    const from = el.volume;
    let step = 0;
    fadeRef.current = window.setInterval(() => {
      step += 1;
      el.volume = Math.min(1, Math.max(0, from + ((to - from) * step) / 18));
      if (step >= 18) window.clearInterval(fadeRef.current);
    }, 60);
  }, []);

  const start = useCallback(async () => {
    window.clearTimeout(pauseRef.current);
    let el = audioRef.current;
    if (!el) {
      el = new Audio(SRC);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      audioRef.current = el;
    }
    try {
      // 浏览器可能因为「还没有用户手势」拒绝播放，失败时交给首次点击触发
      await el.play();
      fadeTo(VOLUME);
      setPlaying(true);
      return true;
    } catch {
      return false;
    }
  }, [fadeTo]);

  const stop = useCallback(() => {
    fadeTo(0);
    window.clearTimeout(pauseRef.current);
    // 先淡出再暂停，避免戛然而止
    pauseRef.current = window.setTimeout(() => audioRef.current?.pause(), 400);
    setPlaying(false);
  }, [fadeTo]);

  useEffect(() => {
    wantRef.current = window.localStorage.getItem(STORAGE_KEY) !== 'off';

    const gestures = ['pointerdown', 'keydown', 'touchstart'];
    let alive = true;

    const tryStart = () => {
      if (!alive || !wantRef.current) return;
      void start().then((ok) => {
        if (ok) gestures.forEach((event) => window.removeEventListener(event, tryStart));
      });
    };

    // 先试试自动播放；被拦截就等用户第一次点击/按键再开始
    tryStart();
    gestures.forEach((event) => window.addEventListener(event, tryStart, { passive: true }));

    return () => {
      alive = false;
      gestures.forEach((event) => window.removeEventListener(event, tryStart));
      window.clearInterval(fadeRef.current);
      window.clearTimeout(pauseRef.current);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [start]);

  const toggle = () => {
    if (playing) {
      wantRef.current = false;
      window.localStorage.setItem(STORAGE_KEY, 'off');
      stop();
      return;
    }
    wantRef.current = true;
    window.localStorage.setItem(STORAGE_KEY, 'on');
    void start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? '关闭背景音乐' : '播放背景音乐'}
      title={playing ? '背景音乐：开' : '背景音乐：关'}
      className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[#8b6fa0] shadow-[0_10px_24px_-12px_rgba(120,90,150,.8)] backdrop-blur transition-transform hover:scale-105 active:scale-95"
    >
      {playing ? (
        <span className="bgm-bars flex h-4 items-end gap-[3px]" aria-hidden>
          <span className="h-full w-[3px] rounded-full bg-current" />
          <span className="h-full w-[3px] rounded-full bg-current" />
          <span className="h-full w-[3px] rounded-full bg-current" />
        </span>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M9 17V6l10-2v11" />
          <circle cx="6.5" cy="17.5" r="2.5" />
          <circle cx="16.5" cy="15.5" r="2.5" />
          <path d="M4 4l16 16" />
        </svg>
      )}
    </button>
  );
}
