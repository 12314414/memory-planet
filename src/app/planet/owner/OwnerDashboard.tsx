'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import AccessControlSheet from '@/components/AccessControlSheet';
import InviteCard from '@/components/InviteCard';
import MemoryEditorModal from '@/components/MemoryEditorModal';
import PetAvatarModal from '@/components/PetAvatarModal';
import PlanetScene from '@/components/PlanetScene';
import { apiFetch } from '@/lib/api-client';
import { ACTION_ICON, ACTION_LABEL, VISIBILITY_LABEL, type Visibility } from '@/lib/constants';
import type { OwnerDashboardDTO, PetProfile } from '@/lib/types';

type OwnerDashboardProps = {
  nickname: string;
  initial: {
    id: string;
    name: string;
    theme: string;
    visibility: Visibility;
    inviteCode: string;
    pet: PetProfile;
  };
};

const POLL_INTERVAL = 5000;

function timeLabel(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  return date.toLocaleDateString('zh-CN');
}

export default function OwnerDashboard({ nickname, initial }: OwnerDashboardProps) {
  const [data, setData] = useState<OwnerDashboardDTO | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
  const [inviteCode, setInviteCode] = useState(initial.inviteCode);
  const [brief, setBrief] = useState('');
  const [briefSource, setBriefSource] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [polling, setPolling] = useState(true);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [petAvatar, setPetAvatar] = useState(initial.pet.avatarUrl || '');
  const [deletingMemory, setDeletingMemory] = useState('');
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);
  const briefLoaded = useRef(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch('/api/planet/owner/dashboard', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || '读取失败');
      const next = json as OwnerDashboardDTO;
      setData(next);
      setVisibility(next.planet.visibility);
      setInviteCode(next.planet.inviteCode);
      // 只回填一次缓存简报，避免覆盖用户刚生成的新内容
      if (!briefLoaded.current && next.aiBrief) {
        briefLoaded.current = true;
        setBrief(next.aiBrief);
        setBriefSource('cache');
      }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取失败');
    }
  }, []);

  // 5 秒轮询；页面隐藏时暂停，重新可见时立刻补一次
  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        setPolling(true);
        fetchDashboard();
      } else {
        setPolling(false);
      }
    };

    fetchDashboard();
    timer.current = window.setInterval(tick, POLL_INTERVAL);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchDashboard();
      setPolling(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateBrief = async () => {
    if (briefLoading) return;
    setBriefLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/planet/owner/brief', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || '简报生成失败');
      briefLoaded.current = true;
      setBrief(json.text);
      setBriefSource(json.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : '简报生成失败');
    } finally {
      setBriefLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const res = await apiFetch(`/api/planet/owner/message?messageId=${messageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      setData((prev) =>
        prev ? { ...prev, guestbook: prev.guestbook.filter((item) => item.id !== messageId) } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (deletingMemory) return;
    setDeletingMemory(memoryId);
    setError('');
    try {
      const res = await apiFetch(`/api/planet/owner/memory/${memoryId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || '删除失败');
      setData((prev) =>
        prev ? { ...prev, memories: prev.memories.filter((item) => item.id !== memoryId) } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingMemory('');
    }
  };

  const stats = data?.today;
  const total = data?.planet;

  return (
    <main className="wrap pb-20 pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">OWNER DASHBOARD</p>
          <h1 className="title mt-3 text-3xl">{initial.name}</h1>
          <p className="muted mt-2 text-xs">
            {nickname} · 当前权限 {VISIBILITY_LABEL[visibility]} · 数据
            <span className="ml-1 inline-flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: polling ? '#8fcfae' : '#d9cbe4' }}
              />
              {polling ? '每 5 秒自动刷新' : '页面隐藏，已暂停轮询'}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/planet/${initial.id}`} className="btn btn-ghost btn-sm">
            访客视角
          </Link>
          <Link href="/star-map" className="btn btn-ghost btn-sm">
            星图
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#f4d3dc] bg-[#fff3f6] px-4 py-2 text-[11px] text-[#c26a86]">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <section className="card relative overflow-hidden px-4 pb-16 pt-6">
          <PlanetScene
            mode="owner"
            planet={initial}
            petProfile={{ ...initial.pet, avatarUrl: petAvatar || undefined }}
          />
          <div className="absolute left-4 top-4">
            <span className="chip">主星球 001</span>
          </div>
          <button
            type="button"
            onClick={() => setAvatarModalOpen(true)}
            className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/90 bg-white/70 px-3 py-1.5 text-[11px] text-[#6d5a7b] shadow-[0_10px_22px_-18px_rgba(94,68,110,0.6)] transition hover:bg-white hover:text-[#463653]"
          >
            ✨ 生成虚拟形象
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <span className="chip">
              ✨ {total?.statsLights ?? 0} · ⭐ {total?.statsStars ?? 0} · 🛰️ {total?.statsVisits ?? 0}
            </span>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">TODAY</p>
              <span className="text-[10px] text-[#b09ec0]">今日访客概览</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '访客', value: stats?.visitors ?? 0, icon: '🛰️' },
                { label: '点亮', value: stats?.lights ?? 0, icon: '✨' },
                { label: '送星', value: stats?.stars ?? 0, icon: '⭐' },
                { label: '留言', value: stats?.messages ?? 0, icon: '💌' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/60 px-2 py-3 text-center">
                  <p className="text-sm">{item.icon}</p>
                  <p className="title mt-1 text-lg leading-none">{item.value}</p>
                  <p className="mt-1 text-[10px] text-[#b09ec0]">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="eyebrow">AI VISITOR BRIEF</p>
                <h2 className="title mt-1.5 text-lg">今日访客简报</h2>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={generateBrief}
                disabled={briefLoading}
              >
                {briefLoading ? '宠物正在整理…' : brief ? '重新生成' : '生成简报'}
              </button>
            </div>
            {brief ? (
              <>
                <p className="whitespace-pre-wrap rounded-2xl border border-[#f4e7d2] bg-[#fff8ec]/80 px-3.5 py-3 text-[12.5px] leading-6 text-[#7a6349]">
                  {brief}
                </p>
                <p className="mt-2 text-[10px] text-[#b09ec0]">
                  {briefSource === 'fallback'
                    ? 'AI 暂不可用，已使用数据模板生成'
                    : briefSource === 'cache'
                      ? '来自 24 小时内的 AI 缓存'
                      : '由宠物人格生成，不会编造数据'}
                </p>
              </>
            ) : (
              <p className="rounded-2xl bg-white/50 px-3.5 py-4 text-[11.5px] leading-relaxed text-[#b09ec0]">
                还没有简报。点一下「生成简报」，让 {initial.pet.name} 汇总今天的访客、互动与留言要点。
                AI 不可用时不会阻塞页面，会退回到数据模板。
              </p>
            )}
          </section>
        </div>
      </div>

      {/* 访问控制 + 邀请码（条件显示） */}
      <section className="mt-4 space-y-4">
        <AccessControlSheet visibility={visibility} onChange={setVisibility} />

        {/* 邀请码卡片：仅 INVITE 可见 */}
        {visibility === 'INVITE' && (
          <div className="invite-fade">
            <InviteCard inviteCode={inviteCode} planetId={initial.id} onReset={setInviteCode} />
          </div>
        )}
      </section>

      {/* 内联关键帧动画 */}
      <style>{`
        @keyframes inviteFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .invite-fade { animation: inviteFadeIn 200ms ease-out; }
      `}</style>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">VISIT LOG</p>
              <h2 className="title mt-1.5 text-xl">访客记录</h2>
            </div>
            <span className="text-[10px] text-[#b09ec0]">最近 40 条</span>
          </div>

          {!data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-11 animate-pulse rounded-xl bg-white/55" />
              ))}
            </div>
          ) : data.visits.length === 0 ? (
            <p className="py-8 text-center text-xs leading-relaxed text-[#b09ec0]">
              还没有访客。
              <br />
              把邀请码发出去，或把星球设为公开。
            </p>
          ) : (
            <ul className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
              {data.visits.map((visit) => (
                <li
                  key={visit.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/55 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-[#57465f]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/90 text-[10px] text-[#8b7a97]">
                      {visit.visitorName.slice(0, 1)}
                    </span>
                    <span className="truncate">{visit.visitorName}</span>
                    <span className="shrink-0 text-[11px] text-[#a596b0]">
                      {ACTION_ICON[visit.action]} {ACTION_LABEL[visit.action] || visit.action}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-[#b7a8c2]">
                    {timeLabel(visit.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">MESSAGE CONTROL</p>
              <h2 className="title mt-1.5 text-xl">留言管理</h2>
            </div>
            <span className="text-[10px] text-[#b09ec0]">默认可见 · 可删除</span>
          </div>

          {!data ? (
            <div className="space-y-2">
              {[0, 1].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-white/55" />
              ))}
            </div>
          ) : data.guestbook.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#b09ec0]">还没有留言，宠物有点无聊。</p>
          ) : (
            <ul className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {data.guestbook.map((entry) => (
                <li key={entry.id} className="rounded-2xl bg-white/60 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-[#57465f]">
                      {entry.visitorName}
                      <span className="ml-2 text-[10px] font-normal text-[#b7a8c2]">
                        {timeLabel(entry.createdAt)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteMessage(entry.id)}
                      className="text-[10px] text-[#c99aab] underline decoration-dotted underline-offset-2 hover:text-[#c26a86]"
                    >
                      删除
                    </button>
                  </div>
                  <p className="mt-1 break-words text-[12.5px] leading-relaxed text-[#6d5a7b]">
                    {entry.content}
                  </p>
                  {entry.aiReply && (
                    <p className="mt-1.5 rounded-xl bg-[#fff8ec]/80 px-2.5 py-1.5 text-[11px] leading-relaxed text-[#9a8259]">
                      {initial.pet.name}：{entry.aiReply}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-4 p-5 sm:p-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">MEMORIES</p>
            <h2 className="title mt-1.5 text-xl">回忆可见性</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] text-[#b09ec0] sm:inline">访客只能看到公开回忆</span>
            <button
              type="button"
              onClick={() => setMemoryModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-white/90 bg-white/70 px-3 py-1.5 text-[11px] text-[#6d5a7b] shadow-[0_10px_22px_-18px_rgba(94,68,110,0.6)] transition hover:bg-white hover:text-[#463653]"
            >
              <span className="text-[13px] leading-none">+</span>
              添加回忆
            </button>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(data?.memories ?? []).map((memory) => (
            <li
              key={memory.id}
              className="group relative flex items-start gap-2 rounded-xl bg-white/55 px-3 py-2.5 text-[12px] leading-relaxed text-[#6d5a7b] transition hover:bg-white/80"
            >
              {memory.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={memory.imageUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="mt-0.5 shrink-0 text-[10px]" aria-hidden>
                  {memory.visibility === 'PUBLIC' ? '🌍' : '🔒'}
                </span>
              )}
              <span className="min-w-0 flex-1 break-words">
                {memory.imageUrl && (
                  <span className="mr-1 text-[10px]" aria-hidden>
                    {memory.visibility === 'PUBLIC' ? '🌍' : '🔒'}
                  </span>
                )}
                {memory.text}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${
                  memory.visibility === 'PUBLIC'
                    ? 'bg-[#e8f4ff] text-[#5f8fb8]'
                    : 'bg-[#f3ecff] text-[#8b7ab8]'
                }`}
              >
                {memory.visibility === 'PUBLIC' ? '公开' : '私密'}
              </span>
              <button
                type="button"
                onClick={() => deleteMemory(memory.id)}
                disabled={deletingMemory === memory.id}
                aria-label="删除这条回忆"
                title="删除这条回忆"
                className="absolute right-2 top-1.5 rounded-full px-1.5 py-0.5 text-[11px] text-[#c99aab] opacity-0 transition hover:bg-white hover:text-[#c26a86] focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
              >
                {deletingMemory === memory.id ? '…' : '🗑'}
              </button>
            </li>
          ))}
          {!data && <li className="text-xs text-[#b09ec0]">加载中…</li>}
          {data && data.memories.length === 0 && (
            <li className="text-xs leading-relaxed text-[#b09ec0]">
              还没有回忆。点右上角「+ 添加回忆」，把照片和文字收进这颗星球。
            </li>
          )}
        </ul>
      </section>

      <MemoryEditorModal
        open={memoryModalOpen}
        planetId={initial.id}
        onClose={() => setMemoryModalOpen(false)}
        onSaved={fetchDashboard}
      />

      <PetAvatarModal
        open={avatarModalOpen}
        planetId={initial.id}
        petName={initial.pet.name}
        currentAvatarUrl={petAvatar}
        onClose={() => setAvatarModalOpen(false)}
        onSaved={setPetAvatar}
      />
    </main>
  );
}
