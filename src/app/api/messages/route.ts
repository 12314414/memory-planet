import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { maskSensitive } from '@/lib/constants';
import type { ConversationDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** 判断两人是否已是好友 */
async function areFriends(aId: string, bId: string) {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: aId, addresseeId: bId },
        { requesterId: bId, addresseeId: aId },
      ],
    },
  });
  return Boolean(friendship);
}

/** GET /api/messages —— 我的会话列表（按对方聚合） */
export async function GET() {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });

  const all = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: viewer.id }, { recipientId: viewer.id }] },
    orderBy: { createdAt: 'asc' },
  });

  const byPartner = new Map<string, typeof all>();
  for (const m of all) {
    const otherId = m.senderId === viewer.id ? m.recipientId : m.senderId;
    if (!byPartner.has(otherId)) byPartner.set(otherId, []);
    byPartner.get(otherId)!.push(m);
  }

  const partnerIds = Array.from(byPartner.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, nickname: true },
  });
  const nicknameMap = new Map(users.map((u) => [u.id, u.nickname]));

  const conversations: ConversationDTO[] = Array.from(byPartner.entries())
    .map(([otherId, msgs]) => {
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => m.senderId === otherId && !m.read).length;
      return {
        user: { id: otherId, nickname: nicknameMap.get(otherId) ?? '旅人' },
        lastMessage: last.content,
        lastAt: last.createdAt.toISOString(),
        unread,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

  return NextResponse.json({ conversations });
}

/** POST /api/messages —— 给好友发私信 */
export async function POST(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const recipientId = String(body?.recipientId ?? '');
  const content = maskSensitive(String(body?.content ?? '').trim());

  if (!recipientId || recipientId === viewer.id) {
    return NextResponse.json({ error: '无效的收信人' }, { status: 400 });
  }
  if (!content) return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: '消息最多 500 字' }, { status: 400 });

  if (!(await areFriends(viewer.id, recipientId))) {
    return NextResponse.json({ error: '你们还不是好友，先加好友再聊吧' }, { status: 403 });
  }

  const message = await prisma.directMessage.create({
    data: { senderId: viewer.id, recipientId, content, read: false },
  });

  return NextResponse.json({
    message: { id: message.id, mine: true, content: message.content, createdAt: message.createdAt.toISOString() },
  });
}
