'use client';

/**
 * 小王子 NPC：金发、黄色围巾、绿上衣的小男孩，牵着一束彩色千纸鹤。
 * 正常形态（非狐狸），作为星图里的向导 / 探访对象。
 * 纯 SVG 手绘，可缩放，支持点击交互与漂浮动画。
 */
export default function LittlePrince({
  size = 120,
  floating = true,
  onClick,
  title,
}: {
  size?: number;
  floating?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      title={title}
      aria-label={title || '小王子'}
      role={onClick ? 'button' : undefined}
      className="relative select-none outline-none"
      style={{
        width: size,
        height: size * 1.25,
        animation: floating ? 'lpFloat 6s ease-in-out infinite' : undefined,
        cursor: onClick ? 'pointer' : 'default',
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
    >
      <svg viewBox="0 0 120 150" width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* 千纸鹤线 */}
        <path
          d="M66 14 Q70 30 66 46"
          stroke="#c9a86a"
          strokeWidth="1.2"
          fill="none"
          opacity="0.7"
        />
        {/* 千纸鹤（彩色小折纸，围绕头部上方） */}
        {[
          { x: 40, y: 4, c: '#e78fb3', r: -18 },
          { x: 58, y: -2, c: '#8fb7e8', r: -4 },
          { x: 76, y: 2, c: '#f3c06b', r: 10 },
          { x: 92, y: 8, c: '#a7d1a0', r: 22 },
        ].map((crane, i) => (
          <g key={i} transform={`translate(${crane.x} ${crane.y}) rotate(${crane.r})`}>
            <path d="M0 0 L7 -9 L0 -5 L-7 -9 Z" fill={crane.c} />
            <path d="M0 -5 L5 4 L0 2 L-5 4 Z" fill={crane.c} opacity="0.85" />
          </g>
        ))}

        {/* 头发（金发） */}
        <ellipse cx="60" cy="40" rx="20" ry="17" fill="#f6c95c" />
        <path d="M42 38 Q40 26 52 24 Q60 22 70 25 Q82 28 78 40 Q70 33 60 34 Q50 33 42 38 Z" fill="#f6c95c" />

        {/* 脸 */}
        <ellipse cx="60" cy="46" rx="17" ry="16" fill="#ffe9d0" />

        {/* 眼睛 */}
        <circle cx="54" cy="45" r="2" fill="#3d2c4a" />
        <circle cx="66" cy="45" r="2" fill="#3d2c4a" />

        {/* 腮红 */}
        <circle cx="50" cy="52" r="2.4" fill="#f7b8a0" opacity="0.7" />
        <circle cx="70" cy="52" r="2.4" fill="#f7b8a0" opacity="0.7" />

        {/* 微笑 */}
        <path d="M56 55 Q60 58 64 55" stroke="#c07a5a" strokeWidth="1.3" fill="none" strokeLinecap="round" />

        {/* 围巾（黄色，飘动） */}
        <path d="M48 58 Q60 64 72 58 L76 64 Q60 70 44 64 Z" fill="#f3c24d" />
        <path d="M44 62 Q30 68 24 84 Q22 90 28 92 Q34 90 32 80 Q36 70 48 64 Z" fill="#f3c24d" opacity="0.95" />

        {/* 身体（绿色上衣） */}
        <path d="M48 60 Q48 76 44 92 L76 92 Q72 76 72 60 Q60 68 48 60 Z" fill="#5aa86a" />
        <path d="M52 62 Q60 70 68 62 L68 74 L52 74 Z" fill="#4a8f5a" opacity="0.5" />

        {/* 手臂（牵着围巾/线） */}
        <path d="M48 66 Q40 70 36 76" stroke="#5aa86a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="36" cy="77" r="3" fill="#ffe9d0" />
        <path d="M72 66 Q80 70 84 76" stroke="#5aa86a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="84" cy="77" r="3" fill="#ffe9d0" />

        {/* 裤子/腿 */}
        <rect x="50" y="88" width="8" height="14" rx="3" fill="#4a6fa5" />
        <rect x="62" y="88" width="8" height="14" rx="3" fill="#4a6fa5" />

        {/* 靴子 */}
        <path d="M50 100 Q48 106 54 106 L58 106 L58 102 Z" fill="#5b4636" />
        <path d="M62 100 Q60 106 66 106 L70 106 L70 102 Z" fill="#5b4636" />
      </svg>

      <style jsx>{`
        @keyframes lpFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </Tag>
  );
}
