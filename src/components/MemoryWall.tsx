'use client';

import { coverFor } from '@/lib/theme';
import type { MemoryDTO } from '@/lib/types';

type MemoryWallProps = {
  memories: MemoryDTO[];
  mode: 'owner' | 'visitor';
  emptyHint?: string;
};

/** 回忆墙：访客只看到 visibility=PUBLIC 的回忆（由服务端过滤） */
export default function MemoryWall({ memories, mode, emptyHint }: MemoryWallProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">MEMORY WALL</p>
          <h2 className="title mt-1.5 text-xl">
            {mode === 'owner' ? '我的回忆墙' : '公开回忆墙'}
          </h2>
        </div>
        <span className="text-[11px] text-[#b09ec0]">
          {mode === 'owner' ? '包含私密回忆，仅自己可见' : '主人设为私密的回忆不会出现在这里'}
        </span>
      </div>

      {memories.length === 0 ? (
        <div className="card-soft px-6 py-10 text-center text-xs text-[#b09ec0]">
          {emptyHint || '这颗星球还没有公开的回忆。'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {memories.map((memory, index) => (
            <article
              key={memory.id}
              className="memory-card fade-up"
              style={{
                transform: `rotate(${index % 3 === 0 ? -1.2 : index % 3 === 1 ? 0.8 : -0.5}deg)`,
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <span className="tape" />
              <div
                className="memory-cover"
                style={{
                  background: memory.imageUrl
                    ? `url(${memory.imageUrl}) center/cover`
                    : coverFor(memory.id),
                }}
              >
                {!memory.imageUrl && (
                  <span className="relative z-[1] text-2xl opacity-70">✦</span>
                )}
              </div>
              <p className="mt-3 line-clamp-3 px-1 text-[12.5px] leading-relaxed text-[#6d5a7b]">
                {memory.text}
              </p>
              <p className="mt-2 px-1 text-[10px] text-[#b7a8c2]">
                {new Date(memory.createdAt).toLocaleDateString('zh-CN')}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
