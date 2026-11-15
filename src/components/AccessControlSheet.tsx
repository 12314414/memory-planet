'use client';

import { useState } from 'react';
import { VISIBILITY_LABEL, type Visibility } from '@/lib/constants';

type AccessControlSheetProps = {
  visibility: Visibility;
  onChange: (next: Visibility) => void;
};

const OPTIONS: { value: Visibility; title: string; desc: string; icon: string }[] = [
  {
    value: 'PRIVATE',
    title: '私密',
    desc: '只有自己能看到，任何人都无法通过链接访问',
    icon: '🔒',
  },
  {
    value: 'INVITE',
    title: '邀请码',
    desc: '需要 6 位邀请码才能进入，适合发给特定的人',
    icon: '✉️',
  },
  {
    value: 'PUBLIC',
    title: '公开',
    desc: '会出现在星图大厅，任何人都能来串门',
    icon: '🌌',
  },
];

export default function AccessControlSheet({ visibility, onChange }: AccessControlSheetProps) {
  const [pending, setPending] = useState<Visibility | null>(null);
  const [error, setError] = useState('');

  const update = async (next: Visibility) => {
    if (next === visibility || pending) return;
    setPending(next);
    setError('');
    try {
      const res = await fetch('/api/planet/owner/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '设置失败');
      onChange(data.visibility as Visibility);
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置失败');
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">ACCESS CONTROL</p>
          <h2 className="title mt-1.5 text-xl">谁能来串门</h2>
        </div>
        <span className="chip">当前：{VISIBILITY_LABEL[visibility]}</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {OPTIONS.map((option) => {
          const active = option.value === visibility;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => update(option.value)}
              disabled={pending !== null}
              className="flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:opacity-70"
              style={{
                borderColor: active ? 'rgba(214,178,120,.75)' : 'rgba(255,255,255,.9)',
                background: active ? 'rgba(255,248,236,.9)' : 'rgba(255,255,255,.6)',
              }}
            >
              <span className="mt-0.5 text-base">{option.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13px] font-medium text-[#57465f]">
                  {option.title}
                  {active && <span className="text-[10px] text-[#c0a06a]">· 当前</span>}
                  {pending === option.value && (
                    <span className="text-[10px] text-[#b09ec0]">保存中…</span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-[#a596b0]">
                  {option.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[11px] text-[#c26a86]">{error}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-[#b09ec0]">
        权限校验全部在服务端完成：PRIVATE 直接拒绝，INVITE 核对邀请码，前端传参不被信任。
      </p>
    </section>
  );
}
