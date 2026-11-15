'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';

type Stats = { statsVisits: number; statsLights: number; statsStars: number };

type VisitorActionsProps = {
  planetId: string;
  inviteCode?: string;
  onStats?: (stats: Stats) => void;
};

const ACTIONS = [
  { key: 'LIGHT', label: '点亮星球', icon: '✨', hint: '留下一束光' },
  { key: 'STAR', label: '送一颗星', icon: '⭐', hint: '把星星别在它身上' },
  { key: 'FEED', label: '喂食', icon: '🍬', hint: '给宠物一点甜' },
] as const;

export default function VisitorActions({ planetId, inviteCode, onStats }: VisitorActionsProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [done, setDone] = useState<string[]>([]);

  const fire = async (action: 'LIGHT' | 'STAR' | 'FEED') => {
    if (pending) return;
    setPending(action);
    setToast('');
    try {
      const res = await apiFetch(`/api/planet/${planetId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '互动失败了');
      onStats?.(data.stats);
      setDone((prev) => [...prev, action]);
      setToast(
        action === 'LIGHT'
          ? '星球亮了一点点，主人会看见的'
          : action === 'STAR'
            ? '一颗小星星已经挂在轨道上了'
            : '宠物嚼了嚼，朝你眨了眨眼',
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : '互动失败了');
    } finally {
      setPending(null);
    }
  };

  const scrollToGuestbook = () => {
    const el = document.getElementById('guestbook-input');
    if (el instanceof HTMLTextAreaElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">VISITOR ACTIONS</p>
        <span className="text-[11px] text-[#b09ec0]">只读模式 · 不会改动主人的回忆</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => fire(action.key)}
            disabled={pending !== null}
            className="group rounded-2xl border border-white/90 bg-white/70 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white disabled:opacity-60"
          >
            <span className="text-lg">{action.icon}</span>
            <span className="mt-1 block text-[13px] font-medium text-[#57465f]">{action.label}</span>
            <span className="mt-0.5 block text-[10px] text-[#b09ec0]">
              {pending === action.key ? '正在送达…' : action.hint}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={scrollToGuestbook}
          className="group rounded-2xl border border-[#f0e0c8] bg-[#fff7ea]/80 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:bg-[#fffaf0]"
        >
          <span className="text-lg">💌</span>
          <span className="mt-1 block text-[13px] font-medium text-[#57465f]">留言</span>
          <span className="mt-0.5 block text-[10px] text-[#b09ec0]">宠物会亲自回复</span>
        </button>
      </div>

      <div className="mt-3 min-h-[18px] text-[11px] text-[#8b7a97]">
        {toast || (done.length ? '你的痕迹已经留在 visits 里了' : ' ') }
      </div>
    </div>
  );
}
