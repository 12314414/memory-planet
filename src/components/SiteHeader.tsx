'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch, appPath } from '@/lib/api-client';

type SiteHeaderProps = {
  nickname?: string;
  active?: 'home' | 'map' | 'owner';
};

const NAV = [
  { key: 'home', href: '/', label: '首页' },
  { key: 'map', href: '/star-map', label: '星图' },
  { key: 'owner', href: '/planet/owner', label: '我的星球' },
] as const;

export default function SiteHeader({ nickname, active }: SiteHeaderProps) {
  const [busy, setBusy] = useState(false);

  const switchIdentity = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/auth/exit', { method: 'POST' });
      window.location.href = appPath('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/55 backdrop-blur-xl">
      <div className="wrap flex h-16 items-center justify-between gap-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            className="relative block h-8 w-8 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #fff 0%, #f3e6ff 22%, #d3c0f5 55%, #a691d6 100%)',
              boxShadow: '0 6px 14px -6px rgba(140,110,180,.8)',
            }}
          >
            <span className="absolute left-1/2 top-1/2 h-[6px] w-[42px] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-full border border-[#eec97a]" />
          </span>
          <span className="leading-tight">
            <span className="title block text-[15px] font-medium tracking-wide">回忆星球</span>
            <span className="block text-[9px] uppercase tracking-[0.3em] text-[#b09ec0]">Memory Planet</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="rounded-full px-3.5 py-1.5 text-[13px] transition"
              style={
                active === item.key
                  ? { background: 'rgba(255,255,255,.9)', boxShadow: '0 8px 18px -14px rgba(94,68,110,.7)' }
                  : { color: 'var(--ink-soft)' }
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {nickname ? (
            <>
              <span className="chip max-w-[120px] truncate sm:max-w-none">
                <span className="text-[#d9b271]">✦</span>
                {nickname}
              </span>
              <button
                type="button"
                onClick={switchIdentity}
                disabled={busy}
                className="rounded-full border border-white/90 bg-white/70 px-3 py-1.5 text-[11px] text-[#8b7a97] transition hover:bg-white disabled:opacity-60"
                title="退出当前身份，重新输入昵称"
              >
                {busy ? '切换中…' : '切换身份'}
              </button>
            </>
          ) : (
            <span className="chip">未登录</span>
          )}
        </div>
      </div>
    </header>
  );
}
