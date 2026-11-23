'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

type Status = 'none' | 'pending_incoming' | 'pending_outgoing' | 'accepted';

type AddFriendButtonProps = {
  ownerId?: string;
  ownerName: string;
};

/** 访客星球页的「加好友」按钮：根据与主人的关系显示不同状态。 */
export default function AddFriendButton({ ownerId, ownerName }: AddFriendButtonProps) {
  const [status, setStatus] = useState<Status>('none');
  const [friendshipId, setFriendshipId] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!ownerId) return;
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/friends/status?userId=${encodeURIComponent(ownerId)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!alive || !res.ok) return;
        if (data.status === 'accepted') setStatus('accepted');
        else if (data.status === 'pending') {
          setStatus(data.direction === 'incoming' ? 'pending_incoming' : 'pending_outgoing');
          setFriendshipId(data.friendshipId || '');
        } else setStatus('none');
      } catch {
        // 忽略：保持 none
      }
    })();
    return () => {
      alive = false;
    };
  }, [ownerId]);

  if (!ownerId) return null;

  const sendRequest = async () => {
    if (busy) return;
    setBusy(true);
    setToast('');
    try {
      const res = await apiFetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', targetId: ownerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '发送失败，请稍后再试');
      setStatus('pending_outgoing');
      setToast(`已向 ${ownerName} 发出好友申请，等待回应 🌟`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : '发送失败，请稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const acceptIncoming = async () => {
    if (busy || !friendshipId) return;
    setBusy(true);
    setToast('');
    try {
      const res = await apiFetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', friendshipId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '操作失败');
      setStatus('accepted');
      setToast(`你和 ${ownerName} 已经是好友啦 🎉`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const labels: Record<Status, { text: string; disabled?: boolean }> = {
    none: { text: '加好友' },
    pending_outgoing: { text: '已申请 · 等待回应', disabled: true },
    pending_incoming: { text: '对方想加你 · 接受', disabled: false },
    accepted: { text: '已是好友', disabled: true },
  };

  const label = labels[status];

  return (
    <div>
      <button
        onClick={status === 'pending_incoming' ? acceptIncoming : sendRequest}
        disabled={busy || label.disabled || status === 'accepted'}
        className={`btn w-full ${status === 'accepted' ? 'btn-ghost' : 'btn-primary'}`}
      >
        {busy ? '处理中…' : label.text}
      </button>
      {toast && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 rounded-xl bg-[#fff7ea]/90 px-3 py-2 text-[11px] leading-relaxed text-[#8b7a97]"
        >
          {toast}
        </p>
      )}
    </div>
  );
}
