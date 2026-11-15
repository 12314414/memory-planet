'use client';

import { useEffect, useState } from 'react';

type AiWelcomeBubbleProps = {
  planetId: string;
  visitorName: string;
  petName: string;
  planetName: string;
};

/** AI 欢迎语气泡：自带加载态与失败降级，绝不阻塞页面 */
export default function AiWelcomeBubble({
  planetId,
  visitorName,
  petName,
  planetName,
}: AiWelcomeBubbleProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'loading' | 'ai' | 'fallback'>('loading');

  useEffect(() => {
    let alive = true;
    const fallback = `欢迎${visitorName}来到${planetName}～我是${petName}，这里的回忆都晒过太阳啦。`;

    const run = async () => {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'welcome', planetId }),
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) throw new Error('ai failed');
        const data = await res.json();
        if (!alive) return;
        if (!data?.text) throw new Error('empty');
        setText(data.text);
        setStatus('fallback');
        // AI 真正生成时后端返回 source=ai；缓存命中同样是 AI 文案
        setStatus(data.source === 'fallback' ? 'fallback' : 'ai');
      } catch {
        if (!alive) return;
        setText(fallback);
        setStatus('fallback');
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [planetId, visitorName, petName, planetName]);

  return (
    <div className="card flex items-start gap-3 p-4 sm:p-5">
      <span
        className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base"
        style={{
          background: 'linear-gradient(150deg,#fffdfa,#ffe6f2 60%,#f6dcc0)',
          boxShadow: 'inset -4px -6px 12px rgba(190,160,205,.25), 0 8px 16px -12px rgba(120,90,140,.8)',
        }}
      >
        🐾
        <span className="absolute -right-1 -top-1 text-[10px] text-[#e6b96b]">✦</span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#6d5a7b]">{petName}</span>
          <span className="chip !py-0.5 !text-[10px]">
            {status === 'loading' ? '正在醒来…' : status === 'ai' ? 'AI 宠物接待' : '模板问候'}
          </span>
        </div>

        {status === 'loading' ? (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c9b6e8]" />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c9b6e8]"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c9b6e8]"
              style={{ animationDelay: '0.3s' }}
            />
            <span className="ml-1 text-[11px] text-[#b09ec0]">宠物正在门口探出头…</span>
          </div>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-[#57465f]">{text}</p>
        )}
      </div>
    </div>
  );
}
