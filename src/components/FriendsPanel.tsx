'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { ConversationDTO, DirectMessageDTO, FriendDTO } from '@/lib/types';

/** 好友与私信的统一浮层：待处理申请 + 好友列表 + 私信聊天。 */
export default function FriendsPanel({ onClose }: { onClose: () => void }) {
  const [friends, setFriends] = useState<FriendDTO[]>([]);
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [activeChat, setActiveChat] = useState<{ id: string; nickname: string } | null>(null);
  const [thread, setThread] = useState<DirectMessageDTO[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [friendsRes, convRes] = await Promise.all([
        apiFetch('/api/friends', { cache: 'no-store' }),
        apiFetch('/api/messages', { cache: 'no-store' }),
      ]);
      const friendsData = await friendsRes.json();
      const convData = await convRes.json();
      if (friendsRes.ok) setFriends(friendsData.friends || []);
      if (convRes.ok) setConversations(convData.conversations || []);
      if (!friendsRes.ok && !convRes.ok) {
        setError(friendsData?.error || convData?.error || '加载失败');
      }
    } catch {
      setError('网络似乎断开了，稍后再试试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openChat = useCallback(async (userId: string, nickname: string) => {
    setActiveChat({ id: userId, nickname });
    setThread([]);
    setError('');
    try {
      const res = await apiFetch(`/api/messages/with?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '加载私信失败');
      setThread(data.messages || []);
      // 已读后刷新会话列表的未读数
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载私信失败');
    }
  }, [loadAll]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread]);

  const handleRequest = async (id: string, action: 'accept' | 'reject') => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, friendshipId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '操作失败');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || busy || !activeChat) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: activeChat.id, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '发送失败');
      setThread((prev) => [...prev, data.message]);
      setDraft('');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setBusy(false);
    }
  };

  const pending = friends.filter((f) => f.status === 'PENDING');
  const accepted = friends.filter((f) => f.status === 'ACCEPTED');

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center px-4 py-6">
      <div className="modal-mask absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative z-10 flex h-[82vh] w-full max-w-3xl flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-[#eee6f5] px-5 py-3.5">
          <div>
            <p className="eyebrow">FRIENDS & CHAT</p>
            <h2 className="title mt-0.5 text-lg">好友与私信</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-[#8b7a97] transition hover:bg-[#f5f2ff]"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* 左栏：申请 + 好友列表 */}
          <aside className="flex w-[40%] min-w-[200px] flex-col border-r border-[#eee6f5]">
            <div className="border-b border-[#eee6f5] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#b09ec0]">待处理申请</p>
              {pending.length === 0 ? (
                <p className="mt-2 text-[12px] text-[#b09ec0]">没有新的好友申请</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {pending.map((f) => (
                    <div key={f.id} className="rounded-xl bg-[#fff7ea]/70 px-3 py-2">
                      <p className="text-[13px] text-[#57465f]">
                        {f.direction === 'incoming' ? (
                          <>
                            <span className="font-medium">{f.user.nickname}</span> 想加你为好友
                          </>
                        ) : (
                          <>
                            已向 <span className="font-medium">{f.user.nickname}</span> 发出申请
                          </>
                        )}
                      </p>
                      {f.direction === 'incoming' && (
                        <div className="mt-1.5 flex gap-2">
                          <button
                            onClick={() => handleRequest(f.id, 'accept')}
                            disabled={busy}
                            className="btn btn-primary btn-sm"
                          >
                            接受
                          </button>
                          <button
                            onClick={() => handleRequest(f.id, 'reject')}
                            disabled={busy}
                            className="btn btn-ghost btn-sm"
                          >
                            忽略
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#b09ec0]">我的好友</p>
              {accepted.length === 0 ? (
                <p className="mt-2 text-[12px] text-[#b09ec0]">
                  还没有好友。去别人的星球坐坐，认识新朋友吧。
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {accepted.map((f) => {
                    const conv = conversations.find((c) => c.user.id === f.user.id);
                    const active = activeChat?.id === f.user.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => openChat(f.user.id, f.user.nickname)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                          active ? 'bg-[#efe8ff]' : 'hover:bg-[#f5f2ff]'
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffe9d0] to-[#f7cfc0] text-sm">
                          {f.user.nickname.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-[#57465f]">{f.user.nickname}</span>
                          <span className="block truncate text-[11px] text-[#b09ec0]">
                            {conv ? conv.lastMessage : '开始聊天'}
                          </span>
                        </span>
                        {conv && conv.unread > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e9a6b8] px-1 text-[10px] text-white">
                            {conv.unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* 右栏：聊天窗口 */}
          <section className="flex min-w-0 flex-1 flex-col">
            {!activeChat ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                <span className="text-3xl">💬</span>
                <p className="text-[13px] text-[#b09ec0]">选择一位好友，开始你们的对话。</p>
              </div>
            ) : (
              <>
                <div className="border-b border-[#eee6f5] px-4 py-3">
                  <p className="text-[13px] font-medium text-[#57465f]">{activeChat.nickname}</p>
                </div>
                <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
                  {thread.length === 0 ? (
                    <p className="text-center text-[12px] text-[#b09ec0]">
                      还没有消息，打个招呼吧。
                    </p>
                  ) : (
                    thread.map((m) => (
                      <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-[13px] leading-6 ${
                            m.mine
                              ? 'rounded-br-sm bg-[#f7e9c8] text-[#6a4a30]'
                              : 'rounded-bl-sm bg-[#f5f2ff] text-[#57465f]'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-[#eee6f5] p-3">
                  <div className="flex gap-2">
                    <input
                      className="field flex-1"
                      placeholder="说点什么…"
                      value={draft}
                      maxLength={500}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
                      }}
                    />
                    <button onClick={send} disabled={!draft.trim() || busy} className="btn btn-primary shrink-0">
                      发送
                    </button>
                  </div>
                </div>
              </>
            )}
            {error && <p className="px-4 pb-2 text-[11px] text-[#c26a86]">{error}</p>}
          </section>
        </div>

        {loading && (
          <p className="absolute inset-0 grid place-items-center bg-white/40 text-[12px] text-[#b09ec0]">
            正在加载…
          </p>
        )}
      </div>
    </div>
  );
}
