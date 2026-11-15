'use client';

import { useState } from 'react';
import type { GuestbookDTO } from '@/lib/types';

type GuestbookProps = {
  planetId: string;
  inviteCode?: string;
  entries: GuestbookDTO[];
  petName: string;
  onPosted: (entry: GuestbookDTO) => void;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minute = 60 * 1000;
  if (diff < minute) return '刚刚';
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))} 小时前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export default function Guestbook({
  planetId,
  inviteCode,
  entries,
  petName,
  onPosted,
}: GuestbookProps) {
  const [content, setContent] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = content.trim();
    if (!text || pending) return;
    setPending(true);
    setError('');
    try {
      const res = await fetch(`/api/planet/${planetId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '留言没有送达');
      onPosted(data.guestbook as GuestbookDTO);
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '留言没有送达');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6" id="guestbook">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="eyebrow">GUESTBOOK</p>
          <h2 className="title mt-1.5 text-xl">留言板</h2>
        </div>
        <span className="chip">{entries.length} 条公开留言</span>
      </div>

      <form onSubmit={submit} className="mb-5">
        <textarea
          id="guestbook-input"
          className="field min-h-[92px] resize-none"
          placeholder={`和${petName}说点什么…（留言默认公开展示，主人可以删除）`}
          value={content}
          maxLength={200}
          onChange={(event) => {
            setContent(event.target.value);
            setError('');
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#b09ec0]">{content.length}/200</span>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !content.trim()}>
            {pending ? '宠物正在读…' : '留下这句话'}
          </button>
        </div>
        {error && <p className="mt-2 text-[11px] text-[#c26a86]">{error}</p>}
      </form>

      <div className="divider mb-4" />

      {entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#b09ec0]">
          这里还很安静，做第一个留下脚印的人吧。
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="fade-up">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-[10px] text-[#8b7a97]">
                  {entry.visitorName.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13px] font-medium text-[#57465f]">{entry.visitorName}</span>
                    <span className="text-[10px] text-[#b7a8c2]">{timeAgo(entry.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#6d5a7b]">
                    {entry.content}
                  </p>

                  {entry.aiReply && (
                    <div className="mt-2 rounded-2xl rounded-tl-md border border-[#f4e7d2] bg-[#fff8ec]/85 px-3 py-2">
                      <p className="text-[10px] text-[#c0a06a]">{petName} 的回复</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#7a6349]">
                        {entry.aiReply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
