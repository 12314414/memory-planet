import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 主人删除留言（软删除，仅本人星球的留言） */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const messageId = new URL(request.url).searchParams.get('messageId');
  if (!messageId) {
    return NextResponse.json({ error: '缺少 messageId' }, { status: 400 });
  }

  const entry = await prisma.guestbook.findUnique({
    where: { id: messageId },
    include: { planet: { select: { ownerId: true } } },
  });

  if (!entry) return NextResponse.json({ error: '留言不存在' }, { status: 404 });
  if (entry.planet.ownerId !== user.id) {
    return NextResponse.json({ error: '只有主人可以删除留言' }, { status: 403 });
  }

  await prisma.guestbook.update({ where: { id: messageId }, data: { status: 'DELETED' } });
  return NextResponse.json({ ok: true });
}
