import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/friends/status?userId=xxx —— 查询我与某人的好友关系状态 */
export async function GET(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });

  const targetId = new URL(request.url).searchParams.get('userId') || '';
  if (!targetId || targetId === viewer.id) {
    return NextResponse.json({ error: '无效的目标用户' }, { status: 400 });
  }

  const direct = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: viewer.id, addresseeId: targetId } },
  });
  const reverse = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: targetId, addresseeId: viewer.id } },
  });
  const friendship = direct ?? reverse;

  if (!friendship) return NextResponse.json({ status: 'none' });

  if (friendship.status === 'PENDING') {
    return NextResponse.json({
      status: 'pending',
      direction: friendship.addresseeId === viewer.id ? 'incoming' : 'outgoing',
      friendshipId: friendship.id,
    });
  }

  return NextResponse.json({ status: 'accepted', friendshipId: friendship.id });
}
