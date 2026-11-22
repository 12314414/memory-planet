'use client';

import { useEffect, useRef, useState } from 'react';
import { appPath } from '@/lib/api-client';
import { INTRO_MODE, INTRO_VIDEO } from '@/lib/config';

type IntroProps = {
  duration?: number;
  skippable?: boolean;
  onFinish: () => void;
};

/**
 * 全屏先导片：纸雕云窗 → 水彩糖果土星。
 * 视频结束后淡出；加载失败或系统偏好减弱动效时，降级为同风格静态纸雕卡片。
 */
export default function Intro({ duration = 9600, skippable = true, onFinish }: IntroProps) {
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(INTRO_MODE !== 'video');
  const finished = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    window.setTimeout(onFinish, 420);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // 兜底：视频未触发 ended 时也能正常进入
    const timer = window.setTimeout(finish, duration);
    // 少数浏览器会拦截自动播放，静音手动播放一次兜底
    void videoRef.current?.play().catch(() => undefined);
    return () => {
      document.body.style.overflow = '';
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div
      className={`intro-film${ready ? ' is-ready' : ''}`}
      style={{ opacity: leaving ? 0 : 1 }}
      role="dialog"
      aria-label="先导片"
      data-intro-mode={videoFailed ? 'placeholder' : 'video'}
    >
      {!videoFailed && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          className="intro-film-video"
          src={appPath(INTRO_VIDEO)}
          autoPlay
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
          onEnded={finish}
          onError={() => setVideoFailed(true)}
        />
      )}

      {videoFailed && (
        <div className="intro-fallback" aria-hidden>
          <span className="intro-fallback-planet" />
          <span className="intro-fallback-ring" />
        </div>
      )}

      {/* 纸雕云边：让影片与整站的纸感画框衔接 */}
      <div className="intro-film-frame" aria-hidden />

      <div className="intro-film-brand">
        <p className="eyebrow">MEMORY PLANET · 先导片</p>
        <p className="intro-film-title">有些回忆，值得一颗星球</p>
      </div>

      {skippable && (
        <button type="button" onClick={finish} className="intro-film-skip">
          跳过先导片 →
        </button>
      )}
    </div>
  );
}
