import { Suspense } from 'react';
import PageLoading from '@/components/PageLoading';
import { DEMO_INVITE_CODES } from '@/lib/demo-seed';
import InviteEntryClient from './InviteEntryClient';

export function generateStaticParams() {
  return DEMO_INVITE_CODES.map((inviteCode) => ({ inviteCode }));
}

export default function InviteEntryPage() {
  return (
    <Suspense fallback={<PageLoading hint="正在核对邀请码…" />}>
      <InviteEntryClient />
    </Suspense>
  );
}
