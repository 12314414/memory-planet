import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, parsePetProfile } from '@/lib/auth';
import { getTheme } from '@/lib/theme';
import { fallbackText, generateAiText, type AiContext, type AiType } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const VALID_TYPES: AiType[] = ['welcome', 'reply', 'brief', 'polish'];

/** 异常兜底：即使数据库/网络出错也返回可直接展示的文案 */
function safeFallback(type: AiType, content?: string) {
  if (type === 'welcome') return '欢迎来到这颗星球，小宠物轻轻蹭了蹭你的脚边。';
  if (type === 'reply') return '宠物凑近看了看你的话，轻轻记在了心里。';
  if (type === 'polish') return (content || '').slice(0, 50);
  return '今天有访客来过，去留言板看看他们说了什么吧。';
}

/**
 * 统一 AI 代理：前端与内部路由都只调用这里。
 * - ZAI_API_KEY 只存在于服务端环境变量
 * - 宠物人格一律从数据库读取，忽略前端传入（防注入）
 * - welcome / brief 命中 AiCache（24h），避免重复调用智谱
 * - 任何异常都返回 { text, fallback: true }，绝不抛 500 堆栈
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const type = body?.type as AiType;
  const planetId = String(body?.planetId ?? '');

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ text: safeFallback('welcome'), fallback: true });
  }

  let content: string | undefined;
  try {
    if (!planetId) return NextResponse.json({ text: safeFallback(type), fallback: true });

    const viewer = await getCurrentUser();
    if (!viewer) return NextResponse.json({ error: '请先输入昵称进入' }, { status: 401 });

    const planet = await prisma.planet.findUnique({ where: { id: planetId } });
    if (!planet) return NextResponse.json({ text: safeFallback(type), fallback: true });

    const isOwner = viewer.id === planet.ownerId;
    if (planet.visibility === 'PRIVATE' && !isOwner) {
      return NextResponse.json({ error: '私密星球不对外开放' }, { status: 403 });
    }
    if (type === 'brief' && !isOwner) {
      return NextResponse.json({ error: '只有主人可以查看访客简报' }, { status: 403 });
    }
    if (type === 'polish' && !isOwner) {
      return NextResponse.json({ error: '只有主人可以润色回忆' }, { status: 403 });
    }

    const pet = parsePetProfile(planet.petProfileJson);
    const theme = getTheme(planet.theme);
    const cacheVisitorId = type === 'brief' ? planet.ownerId : viewer.id;
    const skipCacheRead = Boolean(body?.refresh);

    if ((type === 'welcome' || type === 'brief') && !skipCacheRead) {
      const cached = await prisma.aiCache.findFirst({
        where: {
          planetId: planet.id,
          visitorId: cacheVisitorId,
          type,
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: 'desc' },
      });
      if (cached) {
        return NextResponse.json({ text: cached.content, fallback: false, source: 'cache' });
      }
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

    content =
      typeof body?.content === 'string'
        ? body.content.slice(0, type === 'polish' ? 220 : 160)
        : undefined;

    if ((type === 'reply' || type === 'polish') && !content) {
      return NextResponse.json(
        { error: type === 'polish' ? '缺少回忆内容' : '缺少留言内容' },
        { status: 400 },
      );
    }

    const ctx: AiContext = {
      type,
      planetName: planet.name,
      themeLabel: theme.label,
      pet,
      visitorName: viewer.nickname,
      content,
      briefData,
    };

    const result = await generateAiText(ctx);

    if (!result.fallback && (type === 'welcome' || type === 'brief')) {
      await prisma.aiCache
        .create({
          data: {
            planetId: planet.id,
            visitorId: cacheVisitorId,
            type,
            content: result.text,
            expiresAt: new Date(Date.now() + CACHE_TTL),
          },
        })
        .catch(() => undefined);
    }

    return NextResponse.json({
      text: result.text,
      fallback: result.fallback,
      source: result.source,
    });
  } catch {
    return NextResponse.json({ text: safeFallback(type, content), fallback: true });
  }
}
