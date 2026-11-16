import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { resolvePlanetAccess } from '@/lib/permissions';
import { maskSensitive } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * 留言：默认 VISIBLE，写入后立即返回（不等 AI）。
 * 宠物回复由前端异步请求 /api/ai/chat，再回写 aiReply，避免留言被 AI 超时拖慢。
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const raw = String(body?.content ?? '').trim();
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode : null;

  if (!raw) return NextResponse.json({ error: '留言不能为空' }, { status: 400 });
  if (raw.length > 200) {
    return NextResponse.json({ error: '留言最多 200 字' }, { status: 400 });
  }

  const access = await resolvePlanetAccess(params.id, { inviteCode, viewerId: viewer.id });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const content = maskSensitive(raw);

  const entry = await prisma.guestbook.create({
    data: {
      planetId: params.id,
      visitorId: viewer.id,
      visitorName: viewer.nickname,
      content,
      status: 'VISIBLE',
    },
  });

  await prisma.visit.create({
    data: {
      planetId: params.id,
      visitorId: viewer.id,
      visitorName: viewer.nickname,
      action: 'MESSAGE',
    },
  });

  return NextResponse.json({
    guestbook: {
      id: entry.id,
      visitorName: entry.visitorName,
      content: entry.content,
      aiReply: null,
      createdAt: entry.createdAt.toISOString(),
    },
  });
}
