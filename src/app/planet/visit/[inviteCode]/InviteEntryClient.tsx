'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PageLoading from '@/components/PageLoading';
import SiteHeader from '@/components/SiteHeader';
import { apiFetch, appPath } from '@/lib/api-client';

type Status = 'loading' | 'invalid' | 'private';

/** 邀请码入口：校验存在性后跳转到对应星球，页面本身不渲染星球内容 */
export default function InviteEntryClient() {
  const params = useParams<{ inviteCode: string }>();
  const code = decodeURIComponent(String(params?.inviteCode ?? '')).toUpperCase().trim();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let alive = true;

    const resolve = async () => {
      try {
        const res = await apiFetch(`/api/invite/${encodeURIComponent(code)}`, { cache: 'no-store' });
        if (!res.ok) {
          if (!alive) return;
          setStatus(res.status === 403 ? 'private' : 'invalid');
          return;
        }
        const data = (await res.json()) as { id?: string };
        if (!data?.id) {
          if (alive) setStatus('invalid');
          return;
        }
        window.location.replace(appPath(`/planet/${data.id}?code=${encodeURIComponent(code)}`));
      } catch {
        if (alive) setStatus('invalid');
      }
    };

    resolve();
    return () => {
      alive = false;
    };
  }, [code]);

  if (status === 'loading') return <PageLoading hint="正在核对邀请码…" />;

  return (
    <>
      <SiteHeader />
      <main className="wrap flex min-h-[64vh] items-center justify-center py-12">
        <div className="card w-full max-w-md p-7 text-center">
          <span className="text-3xl">🔒</span>
          <h1 className="title mt-4 text-xl">
            {status === 'private' ? '这颗星球现在是私密的' : '邀请码无效'}
          </h1>
          <p className="muted mt-3 text-sm leading-relaxed">
            {status === 'private'
              ? '主人关闭了串门入口，即使有邀请码也无法进入。'
              : '请确认 6 位邀请码是否输入正确，或让主人重新生成一个。'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/star-map" className="btn btn-primary w-full">
              去星图大厅
            </Link>
            <Link href="/" className="btn btn-ghost w-full">
              回到首页
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
