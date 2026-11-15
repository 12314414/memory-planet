import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensurePlanetForUser, getCurrentUser } from '@/lib/auth';
import { callAiProxy, fallbackText } from '@/lib/ai';
import { parsePetProfile } from '@/lib/auth';
import { getTheme } from '@/lib/theme';

export const dynamic = 'force-dynamic';

/** 主人端生成「今日访客简报」，AI 失败不阻塞，返回模板兜底 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const planet = await ensurePlanetForUser(user.id, user.nickname);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayVisits = await prisma.visit.findMany({
    where: { planetId: planet.id, visitorId: { not: user.id }, createdAt: { gte: todayStart } },
    select: { visitorId: true, visitorName: true, action: true },
  });
  const todayMessages = await prisma.guestbook.findMany({
    where: { planetId: planet.id, status: 'VISIBLE', createdAt: { gte: todayStart } },
    select: { visitorName: true, content: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const uniqueVisitors = new Set(todayVisits.map((v) => v.visitorId)).size;
  const lights = todayVisits.filter((v) => v.action === 'LIGHT').length;
  const stars = todayVisits.filter((v) => v.action === 'STAR').length;
  const feeds = todayVisits.filter((v) => v.action === 'FEED').length;

  const briefData = [
    `访客 ${uniqueVisitors} 人；点亮 ${lights} 次；送星 ${stars} 颗；投喂 ${feeds} 次；留言 ${todayMessages.length} 条。`,
    todayMessages.length
      ? `留言要点：${todayMessages.map((m) => `${m.visitorName}说「${m.content.slice(0, 24)}」`).join('；')}`
      : '今天还没有新的留言。',
  ].join('\n');

  const origin = new URL(request.url).origin;
  const ai = await callAiProxy(
    origin,
    {
      type: 'brief',
      planetId: planet.id,
      visitorName: user.nickname,
      refresh: true,
    },
    request.headers.get('cookie'),
  );

  const text =
    ai?.text ||
    fallbackText({
      type: 'brief',
      planetName: planet.name,
      themeLabel: getTheme(planet.theme).label,
      pet: parsePetProfile(planet.petProfileJson),
      visitorName: user.nickname,
      briefData,
    });

  return NextResponse.json({
    text,
    source: ai?.source ?? 'fallback',
    today: { visitors: uniqueVisitors, lights, stars, feeds, messages: todayMessages.length },
  });
}
