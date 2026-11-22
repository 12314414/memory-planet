'use client';

import Rose from './Rose';

/**
 * 先导片里的糖果土星：水彩条带星球 + 糖金环 + 钻饰 + 流金。
 * 纯 CSS / SVG 实现，用于星图里的装饰星球（如小王子的玫瑰星球）。
 */
export default function CandySaturn({ rose = false, className = '' }: { rose?: boolean; className?: string }) {
  return (
    <div className={`candy-saturn ${className}`}>
      <span className="candy-halo" aria-hidden />

      <div className="candy-ring-wrap" aria-hidden>
        <span className="candy-ring" />
        <i className="gem g1" />
        <i className="gem g2" />
      </div>

      <div className="candy-body">
        {rose && (
          <div className="candy-garden">
            <Rose size={92} floating={false} />
          </div>
        )}
      </div>

      <div className="candy-ring-wrap candy-ring-wrap--front" aria-hidden>
        <span className="candy-ring" />
        <i className="gem g3" />
      </div>

      <div className="candy-drip" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <span
        className="gem-star absolute left-[4%] top-[14%] text-2xl"
        style={{ animation: 'twinkle 4.2s ease-in-out infinite' }}
        aria-hidden
      >
        ✦
      </span>
      <span
        className="gem-star absolute right-[6%] top-[26%] text-base"
        style={{ animation: 'twinkle 5s ease-in-out infinite 0.8s' }}
        aria-hidden
      >
        ✧
      </span>
      <span
        className="gem-star absolute bottom-[16%] left-[10%] text-sm"
        style={{ animation: 'twinkle 4.6s ease-in-out infinite 1.6s' }}
        aria-hidden
      >
        ✦
      </span>
    </div>
  );
}
