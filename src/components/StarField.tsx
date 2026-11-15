'use client';

/** 背景星尘：固定随机序列，避免 SSR / CSR 不一致 */
const DOTS = Array.from({ length: 46 }, (_, i) => {
  const x = (i * 97 + 13) % 100;
  const y = (i * 61 + 31) % 100;
  const size = 2 + ((i * 17) % 4);
  const delay = ((i * 37) % 50) / 10;
  const opacity = 0.25 + ((i * 23) % 60) / 100;
  return { x, y, size, delay, opacity, id: i };
});

const CROSSES = [
  { x: 8, y: 22, size: 14, delay: 0.4 },
  { x: 88, y: 16, size: 10, delay: 1.6 },
  { x: 74, y: 68, size: 12, delay: 0.9 },
  { x: 18, y: 78, size: 9, delay: 2.4 },
  { x: 46, y: 8, size: 8, delay: 1.2 },
  { x: 94, y: 52, size: 13, delay: 3.1 },
];

export default function StarField() {
  return (
    <div className="starfield" aria-hidden>
      {DOTS.map((dot) => (
        <span
          key={dot.id}
          className="star-dot"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}
      {CROSSES.map((cross, index) => (
        <span
          key={index}
          className="star-cross"
          style={{
            left: `${cross.x}%`,
            top: `${cross.y}%`,
            fontSize: cross.size,
            animationDelay: `${cross.delay}s`,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
