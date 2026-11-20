import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import type { DirectMessageDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** GET /api/messages/with?userId=xxx —— 拉取与某人的私信记录，并把对方发来的标记为已读 */
export async function GET(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });

  const otherId = new URL(request.url).searchParams.get('userId') || '';
  if (!otherId || otherId === viewer.id) {
    return NextResponse.json({ error: '无效的对方' }, { status: 400 });
  }

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, nickname: true } });
  if (!other) return NextResponse.json({ error: '对方不存在' }, { status: 404 });

  const thread = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: viewer.id, recipientId: otherId },
        { senderId: otherId, recipientId: viewer.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  // 把「对方发给我」的未读消息标记为已读
  const unreadIds = thread.filter((m) => m.senderId === otherId && !m.read).map((m) => m.id);
  if (unreadIds.length) {
    await prisma.directMessage.updateMany({
      where: { id: { in: unreadIds } },
      data: { read: true },
    });
  }

  const messages: DirectMessageDTO[] = thread.map((m) => ({
    id: m.id,
    mine: m.senderId === viewer.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  return NextResponse.json({
    user: { id: other.id, nickname: other.nickname },
    messages,
  });
}
