'use client';

/**
 * 玫瑰 NPC：小王子星球上的玫瑰，作为星图里的向导 / 探访对象。
 * 纯 SVG 手绘，带玻璃罩与露珠，可缩放，支持点击与漂浮动画。
 */
export default function Rose({
  size = 100,
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
      aria-label={title || '玫瑰'}
      role={onClick ? 'button' : undefined}
      className="relative select-none outline-none"
      style={{
        width: size,
        height: size * 1.15,
        animation: floating ? 'roseFloat 5s ease-in-out infinite' : undefined,
        cursor: onClick ? 'pointer' : 'default',
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
    >
      <svg viewBox="0 0 120 138" width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* 玻璃罩 */}
        <path
          d="M60 34 Q60 10 78 12 Q96 14 96 34 L96 92 Q96 110 60 110 Q24 110 24 92 L24 34 Q24 14 42 12 Q60 10 60 34 Z"
          fill="rgba(255,255,255,0.16)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />
        {/* 玻璃罩高光 */}
        <path d="M38 26 Q34 50 36 80" stroke="rgba(255,255,255,0.5)" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* 花茎 */}
        <path d="M60 112 Q58 90 60 78" stroke="#5b9a46" strokeWidth="3.5" fill="none" />
        {/* 叶子 */}
        <path d="M52 98 Q44 92 46 84 Q54 86 54 96 Z" fill="#6fae52" />
        <path d="M68 92 Q76 86 74 78 Q66 80 66 90 Z" fill="#6fae52" />
        {/* 花瓣（多层） */}
        <ellipse cx="60" cy="58" rx="17" ry="13" fill="#f47f92" />
        <ellipse cx="60" cy="52" rx="11" ry="9" fill="#f0617c" />
        <ellipse cx="60" cy="48" rx="7" ry="6" fill="#e84a68" />
        {/* 花瓣卷边 */}
        <path d="M48 50 Q44 42 52 42 Q50 48 48 50 Z" fill="#ffd7e0" />
        <path d="M72 50 Q76 42 68 42 Q70 48 72 50 Z" fill="#ffd7e0" />
        {/* 花蕊 */}
        <circle cx="60" cy="48" r="2.5" fill="#f7c86b" />
        {/* 露珠 */}
        <circle cx="48" cy="60" r="2" fill="rgba(255,255,255,0.75)" />
        {/* 底座 */}
        <ellipse cx="60" cy="112" rx="16" ry="4" fill="rgba(120,90,60,0.25)" />
      </svg>

      <style jsx>{`
        @keyframes roseFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </Tag>
  );
}
