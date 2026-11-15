import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, parsePetProfile } from '@/lib/auth';
import { getTheme } from '@/lib/theme';
import { fallbackText, generateAiText, type AiContext, type AiType } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const VALID_TYPES: AiType[] = ['welcome', 'reply', 'brief'];

/**
 * 统一 AI 代理：前端与内部路由都只调用这里。
 * - API Key 只存在于服务端环境变量
 * - petProfile / 星球信息一律从数据库读取，忽略前端传入（防注入）
 * - welcome / brief 命中 AiCache（24h），避免重复调用
 * - 任何异常都返回模板文案 + source: 'fallback'
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const type = body?.type as AiType;
  const planetId = String(body?.planetId ?? '');

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: '无效的 AI 类型' }, { status: 400 });
  }
  if (!planetId) {
    return NextResponse.json({ error: '缺少 planetId' }, { status: 400 });
  }

  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });
  }

  const planet = await prisma.planet.findUnique({ where: { id: planetId } });
  if (!planet) {
    return NextResponse.json({ error: '星球不存在' }, { status: 404 });
  }

  const isOwner = viewer.id === planet.ownerId;
  if (planet.visibility === 'PRIVATE' && !isOwner) {
    return NextResponse.json({ error: '私密星球不对外开放' }, { status: 403 });
  }
  if (type === 'brief' && !isOwner) {
    return NextResponse.json({ error: '只有主人可以查看访客简报' }, { status: 403 });
  }

  const pet = parsePetProfile(planet.petProfileJson);
  const theme = getTheme(planet.theme);
  const cacheType = type;
  const cacheVisitorId = type === 'brief' ? planet.ownerId : viewer.id;
  // 主人手动重新生成简报时绕过读取缓存（仍会写入新缓存）
  const skipCacheRead = Boolean(body?.refresh);

  if ((type === 'welcome' || type === 'brief') && !skipCacheRead) {
    const cached = await prisma.aiCache.findFirst({
      where: {
        planetId: planet.id,
        visitorId: cacheVisitorId,
        type: cacheType,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });
    if (cached) return NextResponse.json({ text: cached.content, source: 'cache' });
  }

  let briefData: string | undefined;
  if (type === 'brief') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [visits, messages, guestbook] = await Promise.all([
      prisma.visit.findMany({
        where: {
          planetId: planet.id,
          visitorId: { not: planet.ownerId },
          createdAt: { gte: todayStart },
        },
        select: { visitorId: true, visitorName: true, action: true },
      }),
      prisma.guestbook.findMany({
        where: { planetId: planet.id, status: 'VISIBLE', createdAt: { gte: todayStart } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { visitorName: true, content: true },
      }),
      prisma.guestbook.count({ where: { planetId: planet.id, status: 'VISIBLE' } }),
    ]);
    const unique = new Set(visits.map((v) => v.visitorId)).size;
    briefData = [
      `访客 ${unique} 人；点亮 ${visits.filter((v) => v.action === 'LIGHT').length} 次；送星 ${visits.filter((v) => v.action === 'STAR').length} 颗；投喂 ${visits.filter((v) => v.action === 'FEED').length} 次；今日留言 ${messages.length} 条。`,
      messages.length
        ? `留言要点：${messages.map((m) => `${m.visitorName}「${m.content.slice(0, 24)}」`).join('；')}`
        : '今日暂无留言。',
      `累计留言 ${guestbook} 条。`,
    ].join('\n');
  }

  const ctx: AiContext = {
    type,
    planetName: planet.name,
    themeLabel: theme.label,
    pet,
    visitorName: viewer.nickname,
    content: typeof body?.content === 'string' ? body.content.slice(0, 160) : undefined,
    briefData,
  };

  if (type === 'reply' && !ctx.content) {
    return NextResponse.json({ error: '缺少留言内容' }, { status: 400 });
  }

  const result = await generateAiText(ctx);

  if (type === 'welcome' || type === 'brief') {
    await prisma.aiCache
      .create({
        data: {
          planetId: planet.id,
          visitorId: cacheVisitorId,
          type: cacheType,
          content: result.text,
          expiresAt: new Date(Date.now() + CACHE_TTL),
        },
      })
      .catch(() => undefined);
  }

  return NextResponse.json({
    text: result.text,
    source: result.source,
    fallback: result.source === 'fallback' ? fallbackText(ctx) : undefined,
  });
}
