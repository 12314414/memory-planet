import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** 邀请码入口：校验存在性后跳转到对应星球，页面本身不渲染星球内容 */
export default async function InviteEntryPage({
  params,
}: {
  params: { inviteCode: string };
}) {
  const code = decodeURIComponent(params.inviteCode || '').toUpperCase().trim();
  const user = await getCurrentUser();
  const planet = await prisma.planet.findUnique({
    where: { inviteCode: code },
    select: { id: true, visibility: true },
  });

  if (planet && planet.visibility !== 'PRIVATE') {
    redirect(`/planet/${planet.id}?code=${code}`);
  }

  return (
    <>
      <SiteHeader nickname={user?.nickname} />
      <main className="wrap flex min-h-[64vh] items-center justify-center py-12">
        <div className="card w-full max-w-md p-7 text-center">
          <span className="text-3xl">🔒</span>
          <h1 className="title mt-4 text-xl">
            {planet?.visibility === 'PRIVATE' ? '这颗星球现在是私密的' : '邀请码无效'}
          </h1>
          <p className="muted mt-3 text-sm leading-relaxed">
            {planet?.visibility === 'PRIVATE'
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
