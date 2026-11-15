'use client';

import { useEffect, useState } from 'react';

type InviteCardProps = {
  inviteCode: string;
  onReset?: (code: string) => void;
};

/** 邀请卡：展示 6 位邀请码 + /planet/visit/[code] 分享链接 */
export default function InviteCard({ inviteCode, onReset }: InviteCardProps) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin || ''}/planet/visit/${inviteCode}`;

  const copy = async () => {
    const legacyCopy = () => {
      try {
        const area = document.createElement('textarea');
        area.value = link;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        return ok;
      } catch {
        return false;
      }
    };

    let ok = false;
    try {
      await navigator.clipboard.writeText(link);
      ok = true;
    } catch {
      ok = legacyCopy();
    }

    if (ok) {
      setCopied(true);
      setError('');
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      setError('复制失败，请手动选中上面的链接');
    }
  };

  const reset = async () => {
    if (resetting) return;
    setResetting(true);
    setError('');
    try {
      const res = await fetch('/api/planet/owner/invite', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '重置失败');
      onReset?.(data.inviteCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">INVITATION</p>
          <h2 className="title mt-1.5 text-xl">邀请码与分享链接</h2>
        </div>
        <span className="chip">6 位 · 唯一 · 可重置</span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#f0e2cb] bg-[#fff8ec]/80 px-4 py-4">
        <span className="text-[11px] tracking-[0.18em] text-[#c0a06a]">CODE</span>
        <span className="title text-2xl tracking-[0.22em] text-[#6b5334]">{inviteCode}</span>
      </div>

      <p className="mt-3 break-all rounded-xl bg-white/60 px-3 py-2 text-[11px] text-[#8b7a97]">
        {link || '/planet/visit/······'}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
          {copied ? '已复制 ✓' : '复制链接'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={resetting}>
          {resetting ? '重置中…' : '重置邀请码'}
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] text-[#c26a86]">{error}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-[#b09ec0]">
        重置后旧链接立即失效。链接只携带邀请码，不包含 userId 等敏感信息。
      </p>
    </section>
  );
}
