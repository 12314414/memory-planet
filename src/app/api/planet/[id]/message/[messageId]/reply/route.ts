import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 异步回写宠物回复：仅留言作者本人或星球主人可以写入，且只在为空时写一次 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; messageId: string } },
) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const aiReply = String(body?.aiReply ?? '').trim().slice(0, 200);
  if (!aiReply) return NextResponse.json({ error: '回复内容为空' }, { status: 400 });

  const entry = await prisma.guestbook.findUnique({
    where: { id: params.messageId },
    select: { id: true, planetId: true, visitorId: true, aiReply: true, planet: { select: { ownerId: true } } },
  });

  if (!entry || entry.planetId !== params.id) {
    return NextResponse.json({ error: '留言不存在' }, { status: 404 });
  }
  if (entry.visitorId !== viewer.id && entry.planet.ownerId !== viewer.id) {
    return NextResponse.json({ error: '无权写入这条回复' }, { status: 403 });
  }
  if (entry.aiReply) return NextResponse.json({ aiReply: entry.aiReply, skipped: true });

  const updated = await prisma.guestbook.update({
    where: { id: entry.id },
    data: { aiReply },
    select: { aiReply: true },
  });

  return NextResponse.json({ aiReply: updated.aiReply });
}
