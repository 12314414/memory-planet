'use client';

import { useEffect, useRef, useState } from 'react';
import { appPath } from '@/lib/api-client';

/**
 * 飞向星球的穿越转场：播放用户提供的 mp4 视频（小王子牵千纸鹤飞行的动画）。
 * 视频结束后自动跳转；加载失败时降级为纯 CSS 光晕推进。
 */
export default function WarpTransition({
  targetName,
  duration = 5000,
  onDone,
}: {
  targetName: string;
  duration?: number;
  onDone: () => void;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // 兜底：无论视频是否正常结束，超时后强制跳转
    const timer = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(finish, 400);
    }, duration);
    return () => {
      document.body.style.overflow = '';
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div
      className="warp"
      style={{ opacity: leaving ? 0 : 1, transition: 'opacity 0.4s ease' }}
      role="status"
      aria-label={`正在飞向 ${targetName}`}
    >
      {/* 视频（铺满全屏） */}
      {!videoFailed ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          className="warp-video"
          src={appPath('/videos/warp.mp4')}
          autoPlay
          muted
          playsInline
          onEnded={finish}
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <div className="warp-fallback" />
      )}

      {/* 底部文案（叠加在视频上） */}
      <div className="warp-text">
        <p className="warp-title">正在飞向「{targetName}」…</p>
        <p className="warp-sub">乘着千纸鹤，穿过这片星空</p>
      </div>

      <style jsx>{`
        .warp {
          position: fixed;
          inset: 0;
          z-index: 90;
          overflow: hidden;
          background: #f6ecf4;
          display: grid;
          place-items: center;
        }
        .warp-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .warp-fallback {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #fbe3ee 0%, #fbeaf0 40%, #eef2fa 78%, #dfe9f8 100%);
          animation: warpFlare 2s ease-in forwards;
        }
        .warp-text {
          position: absolute;
          bottom: 12%;
          left: 0;
          right: 0;
          text-align: center;
          color: #6a4a78;
          text-shadow: 0 1px 8px rgba(255, 255, 255, 0.8);
          z-index: 2;
        }
        .warp-title {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 1px;
        }
        .warp-sub {
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.9;
          letter-spacing: 2px;
        }
        @keyframes warpFlare {
          from {
            opacity: 0.3;
          }
          to {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
