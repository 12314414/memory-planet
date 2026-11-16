import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 主人删除自己的回忆（物理删除；若图片落在 public/uploads 一并清理） */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录后再操作' }, { status: 401 });
  }

  const memory = await prisma.memory.findUnique({
    where: { id: params.id },
    select: { id: true, ownerId: true, imageUrl: true },
  });

  if (!memory) return NextResponse.json({ error: '回忆不存在' }, { status: 404 });
  if (memory.ownerId !== user.id) {
    return NextResponse.json({ error: '只有主人可以删除回忆' }, { status: 403 });
  }

  await prisma.memory.delete({ where: { id: memory.id } });

  if (memory.imageUrl?.startsWith('/uploads/')) {
    const file = path.join(process.cwd(), 'public', memory.imageUrl.replace(/^\//, ''));
    await fs.unlink(file).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
