import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import type { FriendDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

function toFriendDTO(
  friendship: { id: string; status: string; requesterId: string; addresseeId: string; createdAt: Date },
  meId: string,
  nicknames: Map<string, string>,
): FriendDTO {
  const otherId = friendship.requesterId === meId ? friendship.addresseeId : friendship.requesterId;
  return {
    id: friendship.id,
    status: friendship.status === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING',
    direction: friendship.requesterId === meId ? 'outgoing' : 'incoming',
    user: { id: otherId, nickname: nicknames.get(otherId) ?? '旅人' },
    createdAt: friendship.createdAt.toISOString(),
  };
}

/** 拉取对方昵称 */
async function nicknamesFor(ids: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, nickname: true },
  });
  return new Map(users.map((u) => [u.id, u.nickname]));
}

/** GET /api/friends —— 我的全部好友关系（含待处理申请） */
export async function GET() {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: viewer.id }, { addresseeId: viewer.id }] },
    orderBy: { createdAt: 'desc' },
  });

  const ids = friendships.map((f) =>
    f.requesterId === viewer.id ? f.addresseeId : f.requesterId,
  );
  const nicknames = await nicknamesFor(ids);

  return NextResponse.json({
    friends: friendships.map((f) => toFriendDTO(f, viewer.id, nicknames)),
  });
}

/** POST /api/friends —— request（发申请）/ accept（通过）/ reject（拒绝） */
export async function POST(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action ?? 'request');

  if (action === 'request') {
    const targetId = String(body?.targetId ?? '');
    if (!targetId || targetId === viewer.id) {
      return NextResponse.json({ error: '无效的对方' }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return NextResponse.json({ error: '对方不存在' }, { status: 404 });

    const existing = await prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: viewer.id,
          addresseeId: targetId,
        },
      },
    });
    const reverse = await prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: targetId,
          addresseeId: viewer.id,
        },
      },
    });
    const found = existing ?? reverse;
    if (found) {
      if (found.status === 'ACCEPTED') {
        return NextResponse.json({ error: '你们已经是好友了' }, { status: 409 });
      }
      return NextResponse.json({ error: '已经发过申请，等待对方回应' }, { status: 409 });
    }

    const created = await prisma.friendship.create({
      data: { requesterId: viewer.id, addresseeId: targetId, status: 'PENDING' },
    });
    const nicknames = await nicknamesFor([targetId]);
    return NextResponse.json({ friend: toFriendDTO(created, viewer.id, nicknames) });
  }

  // accept / reject 需按 friendshipId 定位，且只能是「我收到的」申请
  const friendshipId = String(body?.friendshipId ?? '');
  if (!friendshipId) return NextResponse.json({ error: '缺少申请 ID' }, { status: 400 });

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== viewer.id) {
    return NextResponse.json({ error: '申请不存在或无权处理' }, { status: 404 });
  }

  if (action === 'accept') {
    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    });
    // 接受后自动给对方回一条系统问候
    await prisma.directMessage.create({
      data: {
        senderId: viewer.id,
        recipientId: friendship.requesterId,
        content: '我通过你的好友申请啦，欢迎来我的星球坐坐 🌟',
        read: false,
      },
    });
    const nicknames = await nicknamesFor([friendship.requesterId]);
    return NextResponse.json({ friend: toFriendDTO(updated, viewer.id, nicknames) });
  }

  if (action === 'reject') {
    await prisma.friendship.delete({ where: { id: friendshipId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: '无效的操作' }, { status: 400 });
}
