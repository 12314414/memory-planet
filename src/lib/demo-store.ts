'use client';

import { fallbackText } from './ai-text';
import { maskSensitive } from './constants';
import {
  DEMO_DIRECT_MESSAGES,
  DEMO_FRIENDSHIPS,
  DEMO_GUESTBOOK,
  DEMO_INVITE_CODES,
  DEMO_MEMORIES,
  DEMO_MINE_PLANET_ID,
  DEMO_PLANETS,
  DEMO_USER_ID,
  DEMO_VISITS,
  type DemoDirectMessage,
  type DemoFriendship,
  type DemoGuestbook,
  type DemoMemory,
  type DemoPlanet,
  type DemoVisit,
} from './demo-seed';
import type { PetProfile } from './types';

const STORAGE_KEY = 'hx_demo_v1';

/** Vercel Serverless AI 代理地址（构建期注入；为空则纯模板降级） */
const AI_PROXY_URL = (process.env.NEXT_PUBLIC_AI_PROXY_URL || '').replace(/\/+$/, '');

type DemoAiCache = {
  planetId: string;
  visitorId: string;
  type: string;
  content: string;
  expiresAt: string;
};

type State = {
  user: { id: string; nickname: string } | null;
  planets: DemoPlanet[];
  memories: DemoMemory[];
  guestbooks: DemoGuestbook[];
  visits: DemoVisit[];
  friendships: DemoFriendship[];
  messages: DemoDirectMessage[];
  aiCache: DemoAiCache[];
};

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

function freshState(): State {
  return JSON.parse(
    JSON.stringify({
      user: null,
      planets: DEMO_PLANETS,
      memories: DEMO_MEMORIES,
      guestbooks: DEMO_GUESTBOOK,
      visits: DEMO_VISITS,
      friendships: DEMO_FRIENDSHIPS,
      messages: DEMO_DIRECT_MESSAGES,
      aiCache: [],
    }),
  ) as State;
}

function read(): State {
  if (typeof window === 'undefined') return freshState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as State;
    if (!parsed || !Array.isArray(parsed.planets)) return freshState();
    return parsed;
  } catch {
    return freshState();
  }
}

function write(state: State) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 隐私模式写入失败时退化为内存态，刷新后重置
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function parsePet(raw: string): PetProfile {
  try {
    const parsed = JSON.parse(raw) as Partial<PetProfile>;
    if (parsed && typeof parsed.name === 'string') {
      return {
        name: parsed.name,
        species: parsed.species === 'dog' || parsed.species === 'rabbit' ? parsed.species : 'cat',
        persona: typeof parsed.persona === 'string' ? parsed.persona : '一只温柔的星球宠物',
      };
    }
  } catch {
    // ignore
  }
  return { name: '团子', species: 'cat', persona: '一只温柔的星球宠物' };
}

function planetDTO(planet: DemoPlanet) {
  return {
    id: planet.id,
    name: planet.name,
    theme: planet.theme,
    visibility: planet.visibility,
    ownerName: planet.ownerName,
    petProfile: parsePet(planet.petProfileJson),
    statsVisits: planet.statsVisits,
    statsLights: planet.statsLights,
    statsStars: planet.statsStars,
  };
}

function myPlanet(state: State) {
  return state.planets.find((planet) => planet.id === DEMO_MINE_PLANET_ID) ?? state.planets[0];
}

/** 按 userId 找到星球主人昵称（好友/私信里展示对方名字用） */
function nicknameOf(state: State, userId: string): string {
  const planet = state.planets.find((item) => item.ownerId === userId);
  if (planet) return planet.ownerName;
  if (state.user && state.user.id === userId) return state.user.nickname;
  return '旅人';
}

/** 我是否已和对方是好友 */
function isFriend(state: State, otherId: string): boolean {
  return state.friendships.some(
    (f) =>
      f.status === 'ACCEPTED' &&
      ((f.requesterId === state.user?.id && f.addresseeId === otherId) ||
        (f.addresseeId === state.user?.id && f.requesterId === otherId)),
  );
}

/** 找两个用户之间唯一的 Friendship 记录（无视方向） */
function friendshipBetween(state: State, aId: string, bId: string): DemoFriendship | undefined {
  return state.friendships.find(
    (f) =>
      (f.requesterId === aId && f.addresseeId === bId) ||
      (f.requesterId === bId && f.addresseeId === aId),
  );
}

/** 好友申请 DTO：附带对方昵称，便于前端直接渲染 */
function friendDTO(state: State, f: DemoFriendship, meId: string) {
  const otherId = f.requesterId === meId ? f.addresseeId : f.requesterId;
  return {
    id: f.id,
    status: f.status,
    direction: f.requesterId === meId ? ('outgoing' as const) : ('incoming' as const),
    user: { id: otherId, nickname: nicknameOf(state, otherId) },
    createdAt: f.createdAt,
  };
}

/** 供组件在静态版里做本地跳转：按邀请码找星球 */
export function resolveInviteCode(code: string): string | null {
  const target = code.trim().toUpperCase();
  const planet = read().planets.find((item) => item.inviteCode === target);
  if (!planet || planet.visibility === 'PRIVATE') return null;
  return planet.id;
}

export function resetDemoState() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** 静态演示版：Supabase 登录成功后把展示名写入本地演示态 */
export function setDemoNickname(nickname: string) {
  if (typeof window === 'undefined') return;
  const state = read();
  state.user = { id: DEMO_USER_ID, nickname: nickname.trim().slice(0, 12) || '旅人' };
  write(state);
}

export function clearDemoUser() {
  if (typeof window === 'undefined') return;
  const state = read();
  state.user = null;
  write(state);
}

export const DEMO_CODES = DEMO_INVITE_CODES;

type Access =
  | { ok: true; planet: DemoPlanet; isOwner: boolean; state: State }
  | { ok: false; status: number; error: string };

function access(planetId: string, code: string | null, state: State): Access {
  const planet = state.planets.find((item) => item.id === planetId);
  if (!planet) return { ok: false, status: 404, error: '这颗星球不存在或已漂流走了' };
  const isOwner = Boolean(state.user && state.user.id === planet.ownerId);
  if (isOwner) return { ok: true, planet, isOwner, state };
  if (planet.visibility === 'PRIVATE') {
    return { ok: false, status: 403, error: '主人把星球设为了私密，暂时无法到访' };
  }
  if (planet.visibility === 'INVITE') {
    const normalized = (code || '').toUpperCase().trim();
    if (!normalized || normalized !== planet.inviteCode) {
      return { ok: false, status: 403, error: '需要有效的 6 位邀请码才能进入这颗星球' };
    }
  }
  return { ok: true, planet, isOwner, state };
}

function addVisit(state: State, planet: DemoPlanet, viewerName: string, action: string) {
  state.visits.unshift({
    id: uid('v'),
    planetId: planet.id,
    visitorId: DEMO_USER_ID,
    visitorName: viewerName,
    action,
    createdAt: now(),
  });
  if (action === 'LIGHT') planet.statsLights += 1;
  if (action === 'STAR') planet.statsStars += 1;
  if (action === 'ENTER') planet.statsVisits += 1;
}

function briefDataOf(state: State, planet: DemoPlanet) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const visits = state.visits.filter(
    (visit) =>
      visit.planetId === planet.id &&
      visit.visitorId !== planet.ownerId &&
      new Date(visit.createdAt) >= todayStart,
  );
  const messages = state.guestbooks
    .filter(
      (entry) =>
        entry.planetId === planet.id &&
        entry.status === 'VISIBLE' &&
        new Date(entry.createdAt) >= todayStart,
    )
    .slice(0, 5);
  const unique = new Set(visits.map((visit) => visit.visitorId)).size;
  const count = (action: string) => visits.filter((visit) => visit.action === action).length;
  return [
    `访客 ${unique} 人；点亮 ${count('LIGHT')} 次；送星 ${count('STAR')} 颗；投喂 ${count('FEED')} 次；今日留言 ${messages.length} 条。`,
    messages.length
      ? `留言要点：${messages.map((m) => `${m.visitorName}「${m.content.slice(0, 24)}」`).join('；')}`
      : '今日暂无留言。',
    `累计留言 ${state.guestbooks.filter((g) => g.planetId === planet.id && g.status === 'VISIBLE').length} 条。`,
  ].join('\n');
}

function readCached(state: State, planetId: string, visitorId: string, type: string) {
  const hit = state.aiCache.find(
    (item) =>
      item.planetId === planetId &&
      item.visitorId === visitorId &&
      item.type === type &&
      new Date(item.expiresAt) > new Date(),
  );
  return hit?.content ?? null;
}

function cacheText(state: State, planetId: string, visitorId: string, type: string, content: string) {
  state.aiCache = state.aiCache.filter(
    (item) => !(item.planetId === planetId && item.visitorId === visitorId && item.type === type),
  );
  state.aiCache.push({
    planetId,
    visitorId,
    type,
    content,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });
}

/**
 * 静态演示版的“服务端”：按真实 API 的路径与语义返回同样的 JSON。
 * 组件里统一走 apiFetch，因此服务器版与 GitHub Pages 版共用同一份 UI 代码。
 */
export async function demoFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = new URL(input, 'https://demo.local');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = (init?.method || 'GET').toUpperCase();
  let body: Record<string, unknown> | null = null;
  if (init?.body) {
    try {
      body = JSON.parse(String(init.body)) as Record<string, unknown>;
    } catch {
      body = null;
    }
  }

  const state = read();
  const save = () => write(state);
  const user = state.user;

  // 身份
  if (path === '/api/auth/enter' && method === 'POST') {
    const nickname = String(body?.nickname ?? '').trim().slice(0, 12);
    if (!nickname) return json({ error: '请输入一个昵称' }, 400);
    state.user = { id: DEMO_USER_ID, nickname };
    save();
    const planet = myPlanet(state);
    return json({
      user: state.user,
      planet: { id: planet.id, name: planet.name, theme: planet.theme },
    });
  }

  if (path === '/api/auth/exit' && method === 'POST') {
    state.user = null;
    save();
    return json({ ok: true });
  }

  if (path === '/api/auth/me') {
    return json({ user });
  }

  if (path === '/api/bootstrap') {
    if (!user) return json({ user: null });
    const planet = myPlanet(state);
    const publicMemories = state.memories.filter(
      (memory) => memory.planetId === planet.id && memory.visibility === 'PUBLIC',
    ).length;
    const privateMemories = state.memories.filter(
      (memory) => memory.planetId === planet.id && memory.visibility === 'PRIVATE',
    ).length;
    const seen = new Set<string>();
    const recentVisitors: { name: string; action: string; createdAt: string }[] = [];
    state.visits
      .filter((visit) => visit.planetId === planet.id && visit.visitorId !== user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .forEach((visit) => {
        if (seen.has(visit.visitorId)) return;
        seen.add(visit.visitorId);
        if (recentVisitors.length < 6) {
          recentVisitors.push({
            name: visit.visitorName,
            action: visit.action,
            createdAt: visit.createdAt,
          });
        }
      });
    return json({
      user,
      planet: planetDTO(planet),
      pet: parsePet(planet.petProfileJson),
      publicMemories,
      privateMemories,
      recentVisitors,
    });
  }

  // 公开星球
  if (path === '/api/planets/public') {
    const planets = state.planets
      .filter((planet) => planet.visibility === 'PUBLIC' && planet.ownerId !== user?.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10)
      .map((planet) => ({
        id: planet.id,
        name: planet.name,
        theme: planet.theme,
        ownerName: planet.ownerName,
        petName: parsePet(planet.petProfileJson).name,
        statsVisits: planet.statsVisits,
        statsStars: planet.statsStars,
        updatedAt: planet.updatedAt,
      }));
    return json({ planets });
  }

  // ============ 好友关系 ============

  // 我的好友列表（含待处理申请）
  if (path === '/api/friends' && method === 'GET') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const list = state.friendships
      .filter((f) => f.requesterId === user.id || f.addresseeId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((f) => friendDTO(state, f, user.id));
    return json({ friends: list });
  }

  // 发送好友申请 / 处理申请
  if (path === '/api/friends' && method === 'POST') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const targetId = String(body?.targetId ?? '');
    const action = String(body?.action ?? 'request'); // request | accept | reject
    if (action === 'request') {
      if (!targetId || targetId === user.id) return json({ error: '无效的对方' }, 400);
      const existing = friendshipBetween(state, user.id, targetId);
      if (existing) {
        if (existing.status === 'ACCEPTED') return json({ error: '你们已经是好友了' }, 409);
        return json({ error: '已经发过申请，等待对方回应' }, 409);
      }
      state.friendships.unshift({
        id: uid('f'),
        requesterId: user.id,
        addresseeId: targetId,
        status: 'PENDING',
        createdAt: now(),
      });
      save();
      return json({
        friend: friendDTO(
          state,
          state.friendships[0],
          user.id,
        ),
      });
    }
    // accept / reject：针对收到的申请，用 friendshipId 定位
    const friendshipId = String(body?.friendshipId ?? '');
    const friendship = state.friendships.find((f) => f.id === friendshipId);
    if (!friendship || friendship.addresseeId !== user.id) {
      return json({ error: '申请不存在或无权处理' }, 404);
    }
    if (action === 'accept') {
      friendship.status = 'ACCEPTED';
      // 接受后自动回一条系统问候
      state.messages.unshift({
        id: uid('dm'),
        senderId: user.id,
        recipientId: friendship.requesterId,
        content: `我通过你的好友申请啦，欢迎来我的星球坐坐 🌟`,
        read: false,
        createdAt: now(),
      });
      save();
      return json({ friend: friendDTO(state, friendship, user.id) });
    }
    if (action === 'reject') {
      state.friendships = state.friendships.filter((f) => f.id !== friendshipId);
      save();
      return json({ ok: true });
    }
    return json({ error: '无效的操作' }, 400);
  }

  // 好友状态查询（访客星球页判断是否已加好友）
  if (path.startsWith('/api/friends/status')) {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const targetId = url.searchParams.get('userId') || '';
    if (!targetId) return json({ error: '缺少目标用户' }, 400);
    const friendship = friendshipBetween(state, user.id, targetId);
    if (!friendship) return json({ status: 'none' });
    if (friendship.status === 'PENDING') {
      const incoming = friendship.addresseeId === user.id;
      return json({ status: 'pending', direction: incoming ? 'incoming' : 'outgoing', friendshipId: friendship.id });
    }
    return json({ status: 'accepted', friendshipId: friendship.id });
  }

  // ============ 私信 ============

  // 我的会话列表（按对方聚合，带最后一条与未读数）
  if (path === '/api/messages' && method === 'GET') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const partners = new Map<string, DemoDirectMessage[]>();
    for (const m of state.messages) {
      const isMine = m.senderId === user.id;
      const otherId = isMine ? m.recipientId : m.senderId;
      if (!isMine && m.recipientId !== user.id) continue;
      if (isMine && m.senderId !== user.id) continue;
      if (!partners.has(otherId)) partners.set(otherId, []);
      partners.get(otherId)!.push(m);
    }
    const conversations = Array.from(partners.entries())
      .map(([otherId, msgs]) => {
        const sorted = msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const last = sorted[sorted.length - 1];
        const unread = msgs.filter((m) => m.senderId === otherId && !m.read).length;
        return {
          user: { id: otherId, nickname: nicknameOf(state, otherId) },
          lastMessage: last.content,
          lastAt: last.createdAt,
          unread,
        };
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    return json({ conversations });
  }

  // 拉取与某人的私信记录（并把对方发给我的标记为已读）
  if (path.startsWith('/api/messages/with')) {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const otherId = url.searchParams.get('userId') || '';
    if (!otherId) return json({ error: '缺少对方' }, 400);
    const thread = state.messages
      .filter(
        (m) =>
          (m.senderId === user.id && m.recipientId === otherId) ||
          (m.senderId === otherId && m.recipientId === user.id),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    // 标记已读
    thread.forEach((m) => {
      if (m.senderId === otherId && !m.read) m.read = true;
    });
    save();
    return json({
      user: { id: otherId, nickname: nicknameOf(state, otherId) },
      messages: thread.map((m) => ({
        id: m.id,
        mine: m.senderId === user.id,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  }

  // 发送私信（仅好友之间）
  if (path === '/api/messages' && method === 'POST') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const recipientId = String(body?.recipientId ?? '');
    const content = maskSensitive(String(body?.content ?? '').trim());
    if (!recipientId) return json({ error: '缺少收信人' }, 400);
    if (!content) return json({ error: '消息不能为空' }, 400);
    if (content.length > 500) return json({ error: '消息最多 500 字' }, 400);
    if (!isFriend(state, recipientId)) {
      return json({ error: '你们还不是好友，先加好友再聊吧' }, 403);
    }
    const msg: DemoDirectMessage = {
      id: uid('dm'),
      senderId: user.id,
      recipientId,
      content,
      read: false,
      createdAt: now(),
    };
    state.messages.push(msg);
    save();
    return json({ message: { id: msg.id, mine: true, content: msg.content, createdAt: msg.createdAt } });
  }

  // 邀请码解析
  const inviteMatch = path.match(/^\/api\/invite\/([^/]+)$/);
  if (inviteMatch) {
    const code = decodeURIComponent(inviteMatch[1]).toUpperCase().trim();
    const planet = state.planets.find((item) => item.inviteCode === code);
    if (!planet) return json({ error: '邀请码无效' }, 404);
    if (planet.visibility === 'PRIVATE') return json({ error: '这颗星球现在是私密的' }, 403);
    return json({ id: planet.id, code });
  }

  // 主人端
  if (path === '/api/planet/owner/dashboard') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const planet = myPlanet(state);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayVisits = state.visits.filter(
      (visit) =>
        visit.planetId === planet.id &&
        visit.visitorId !== user.id &&
        new Date(visit.createdAt) >= todayStart,
    );
    const todayMessages = state.guestbooks.filter(
      (entry) =>
        entry.planetId === planet.id &&
        entry.status === 'VISIBLE' &&
        new Date(entry.createdAt) >= todayStart,
    ).length;
    const brief = readCached(state, planet.id, user.id, 'brief');
    return json({
      planet: {
        id: planet.id,
        name: planet.name,
        theme: planet.theme,
        visibility: planet.visibility,
        inviteCode: planet.inviteCode,
        statsVisits: planet.statsVisits,
        statsLights: planet.statsLights,
        statsStars: planet.statsStars,
      },
      today: {
        visitors: new Set(todayVisits.map((visit) => visit.visitorId)).size,
        lights: todayVisits.filter((visit) => visit.action === 'LIGHT').length,
        stars: todayVisits.filter((visit) => visit.action === 'STAR').length,
        feeds: todayVisits.filter((visit) => visit.action === 'FEED').length,
        messages: todayMessages,
      },
      visits: state.visits
        .filter((visit) => visit.planetId === planet.id && visit.visitorId !== user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 40)
        .map((visit) => ({
          id: visit.id,
          visitorName: visit.visitorName,
          action: visit.action,
          createdAt: visit.createdAt,
        })),
      guestbook: state.guestbooks
        .filter((entry) => entry.planetId === planet.id && entry.status === 'VISIBLE')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 30)
        .map((entry) => ({
          id: entry.id,
          visitorName: entry.visitorName,
          content: entry.content,
          aiReply: entry.aiReply,
          createdAt: entry.createdAt,
        })),
      memories: state.memories
        .filter((memory) => memory.planetId === planet.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((memory) => ({
          id: memory.id,
          text: memory.text,
          imageUrl: memory.imageUrl,
          createdAt: memory.createdAt,
          visibility: memory.visibility,
        })),
      aiBrief: brief,
    });
  }

  if (path === '/api/planet/owner/brief' && method === 'POST') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const planet = myPlanet(state);
    const briefData = briefDataOf(state, planet);
    const text = fallbackText({
      type: 'brief',
      planetName: planet.name,
      themeLabel: '',
      pet: parsePet(planet.petProfileJson),
      visitorName: user.nickname,
      briefData,
    });
    cacheText(state, planet.id, user.id, 'brief', text);
    save();
    return json({ text, fallback: true, source: 'fallback' });
  }

  if (path === '/api/planet/owner/invite' && method === 'POST') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const planet = myPlanet(state);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    planet.inviteCode = code;
    planet.updatedAt = now();
    save();
    return json({ inviteCode: code, path: `/planet/${planet.id}?code=${code}` });
  }

  if (path === '/api/planet/owner/settings' && method === 'PATCH') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const visibility = String(body?.visibility ?? '');
    if (!['PRIVATE', 'INVITE', 'PUBLIC'].includes(visibility)) {
      return json({ error: '无效的权限值' }, 400);
    }
    const planet = myPlanet(state);
    planet.visibility = visibility as DemoPlanet['visibility'];
    planet.updatedAt = now();
    save();
    return json({ visibility });
  }

  if (path === '/api/planet/owner/message' && method === 'DELETE') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const messageId = url.searchParams.get('messageId') || '';
    const entry = state.guestbooks.find((item) => item.id === messageId);
    if (!entry || entry.planetId !== myPlanet(state).id) {
      return json({ error: '留言不存在或无权限' }, 403);
    }
    entry.status = 'DELETED';
    save();
    return json({ ok: true });
  }

  // 主人新增回忆
  if (path === '/api/planet/owner/memory' && method === 'POST') {
    if (!user) return json({ error: '请先登录后再添加回忆' }, 401);
    const text = String(body?.text ?? '').trim();
    const visibility = String(body?.visibility ?? 'PUBLIC').toUpperCase();
    const imageData = typeof body?.imageData === 'string' ? body.imageData : '';
    if (!text) return json({ error: '回忆文字不能为空' }, 400);
    if (text.length > 200) return json({ error: '回忆文字最多 200 字' }, 400);
    if (!['PUBLIC', 'PRIVATE'].includes(visibility)) return json({ error: '无效的可见性' }, 400);
    if (imageData && !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(imageData)) {
      return json({ error: '图片格式不支持' }, 400);
    }
    const planet = myPlanet(state);
    const memory: DemoMemory = {
      id: uid('m'),
      planetId: planet.id,
      ownerId: user.id,
      imageUrl: imageData || null,
      text,
      visibility: visibility as DemoMemory['visibility'],
      createdAt: now(),
    };
    state.memories.unshift(memory);
    planet.updatedAt = now();
    save();
    return json({ memory });
  }

  // 主人删除回忆
  const memoryDeleteMatch = path.match(/^\/api\/planet\/owner\/memory\/([^/]+)$/);
  if (memoryDeleteMatch && method === 'DELETE') {
    if (!user) return json({ error: '请先登录后再操作' }, 401);
    const memoryId = decodeURIComponent(memoryDeleteMatch[1]);
    const index = state.memories.findIndex((item) => item.id === memoryId);
    if (index === -1) return json({ error: '回忆不存在' }, 404);
    if (state.memories[index].planetId !== myPlanet(state).id) {
      return json({ error: '只有主人可以删除回忆' }, 403);
    }
    state.memories.splice(index, 1);
    save();
    return json({ ok: true });
  }

  // AI 代理（静态版只有模板降级，Key 永远不会进入前端）
  if (path === '/api/ai/chat' && method === 'POST') {
    const type = String(body?.type ?? '');
    const planetId = String(body?.planetId ?? '');
    if (!['welcome', 'reply', 'brief', 'polish'].includes(type)) {
      return json({ error: '无效的 AI 类型' }, 400);
    }
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const planet = state.planets.find((item) => item.id === planetId);
    if (!planet) return json({ error: '星球不存在' }, 404);
    const isOwner = planet.ownerId === user.id;
    if (planet.visibility === 'PRIVATE' && !isOwner) {
      return json({ error: '私密星球不对外开放' }, 403);
    }
    if (type === 'brief' && !isOwner) {
      return json({ error: '只有主人可以查看访客简报' }, 403);
    }
    if (type === 'polish' && !isOwner) {
      return json({ error: '只有主人可以润色回忆' }, 403);
    }
    const cacheOwner = type === 'brief' ? planet.ownerId : user.id;
    if ((type === 'welcome' || type === 'brief') && !body?.refresh) {
      const cached = readCached(state, planet.id, cacheOwner, type);
      if (cached) return json({ text: cached, fallback: false, source: 'cache' });
    }
    const pet = parsePet(planet.petProfileJson);

    // 静态站没有服务端，AI 走 Vercel Serverless 代理；失败/未配置则模板降级
    if (AI_PROXY_URL) {
      try {
        const upstream = await fetch(`${AI_PROXY_URL}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            planetId: planet.id,
            planetName: planet.name,
            visitorName: user.nickname,
            content: typeof body?.content === 'string' ? body.content : undefined,
            briefData: type === 'brief' ? briefDataOf(state, planet) : undefined,
            petName: pet.name,
            petPersona: pet.persona,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const data = await upstream.json().catch(() => null);
        if (upstream.ok && data?.text) {
          if (!data.fallback && (type === 'welcome' || type === 'brief')) {
            cacheText(state, planet.id, cacheOwner, type, data.text);
            save();
          }
          return json({
            text: data.text,
            fallback: Boolean(data.fallback),
            source: data.fallback ? 'fallback' : 'ai',
          });
        }
      } catch {
        // 代理不可达：继续走模板
      }
    }

    const text = fallbackText({
      type: type as 'welcome' | 'reply' | 'brief' | 'polish',
      planetName: planet.name,
      themeLabel: '',
      pet,
      visitorName: user.nickname,
      content: typeof body?.content === 'string' ? body.content : undefined,
      briefData: type === 'brief' ? briefDataOf(state, planet) : undefined,
    });
    if (type === 'welcome' || type === 'brief') {
      cacheText(state, planet.id, cacheOwner, type, text);
    }
    save();
    return json({ text, fallback: true, source: 'fallback' });
  }

  // AI 图片：走同一个 Vercel 代理，失败返回空地址由前端显示剪影
  if (path === '/api/ai/image' && method === 'POST') {
    if (AI_PROXY_URL) {
      try {
        const upstream = await fetch(`${AI_PROXY_URL}/api/ai/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: body?.imageBase64,
            petName: body?.petName,
            style: body?.style,
          }),
          signal: AbortSignal.timeout(60000),
        });
        const data = await upstream.json().catch(() => null);
        if (upstream.ok && data?.imageUrl) {
          return json({ imageUrl: data.imageUrl, fallback: false });
        }
        return json({ imageUrl: '', fallback: true, reason: data?.reason ?? `proxy_http_${upstream.status}` });
      } catch {
        // 代理不可达：走剪影占位
      }
    }
    return json({ imageUrl: '', fallback: true, reason: 'proxy_unreachable' });
  }

  // 保存宠物虚拟形象（静态版存 localStorage）
  if (path === '/api/planet/owner/avatar' && method === 'POST') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const avatarUrl = String(body?.avatarUrl ?? '');
    if (!/^(https?:\/\/|data:image\/)/.test(avatarUrl)) {
      return json({ error: '形象地址无效' }, 400);
    }
    const planet = myPlanet(state);
    let pet: Record<string, unknown> = {};
    try {
      pet = JSON.parse(planet.petProfileJson) as Record<string, unknown>;
    } catch {
      pet = {};
    }
    planet.petProfileJson = JSON.stringify({ ...pet, avatarUrl });
    planet.updatedAt = now();
    save();
    return json({ avatarUrl });
  }
  // 异步回写宠物回复
  const replyMatch = path.match(/^\/api\/planet\/([^/]+)\/message\/([^/]+)\/reply$/);
  if (replyMatch && method === 'POST') {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const entry = state.guestbooks.find((item) => item.id === decodeURIComponent(replyMatch[2]));
    if (!entry || entry.planetId !== replyMatch[1]) {
      return json({ error: '留言不存在' }, 404);
    }
    if (!entry.aiReply) {
      entry.aiReply = String(body?.aiReply ?? '').slice(0, 200) || null;
      save();
    }
    return json({ aiReply: entry.aiReply });
  }

  const planetMatch = path.match(/^\/api\/planet\/([^/]+)(?:\/(action|message))?$/);
  if (planetMatch) {
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const planetId = planetMatch[1];
    const sub = planetMatch[2];
    const code = sub ? String(body?.inviteCode ?? '') || null : url.searchParams.get('code');
    const result = access(planetId, code, state);
    if (!result.ok) return json({ error: result.error }, result.status);
    const { planet, isOwner } = result;

    if (!sub && method === 'GET') {
      if (!isOwner) {
        const recent = state.visits.find(
          (visit) =>
            visit.planetId === planet.id &&
            visit.visitorId === user.id &&
            visit.action === 'ENTER' &&
            Date.now() - new Date(visit.createdAt).getTime() < 30 * 60 * 1000,
        );
        if (!recent) {
          addVisit(state, planet, user.nickname, 'ENTER');
          save();
        }
      }
      return json({
        viewer: { id: user.id, nickname: user.nickname, isOwner },
        planet: { ...planetDTO(planet), ownerId: planet.ownerId },
        memories: state.memories
          .filter((memory) => memory.planetId === planet.id && memory.visibility === 'PUBLIC')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 12)
          .map((memory) => ({
            id: memory.id,
            text: memory.text,
            imageUrl: memory.imageUrl,
            createdAt: memory.createdAt,
          })),
        guestbook: state.guestbooks
          .filter((entry) => entry.planetId === planet.id && entry.status === 'VISIBLE')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 30)
          .map((entry) => ({
            id: entry.id,
            visitorName: entry.visitorName,
            content: entry.content,
            aiReply: entry.aiReply,
            createdAt: entry.createdAt,
          })),
      });
    }

    if (sub === 'action' && method === 'POST') {
      const action = String(body?.action ?? '');
      if (!['LIGHT', 'STAR', 'FEED'].includes(action)) {
        return json({ error: '不支持的互动类型' }, 400);
      }
      addVisit(state, planet, user.nickname, action);
      save();
      return json({
        ok: true,
        action,
        stats: {
          statsVisits: planet.statsVisits,
          statsLights: planet.statsLights,
          statsStars: planet.statsStars,
        },
      });
    }

    if (sub === 'message' && method === 'POST') {
      const raw = String(body?.content ?? '').trim();
      if (!raw) return json({ error: '留言不能为空' }, 400);
      if (raw.length > 200) return json({ error: '留言最多 200 字' }, 400);
      const content = maskSensitive(raw);
      const entry: DemoGuestbook = {
        id: uid('g'),
        planetId: planet.id,
        visitorId: user.id,
        visitorName: user.nickname,
        content,
        aiReply: null,
        status: 'VISIBLE',
        createdAt: now(),
      };
      state.guestbooks.unshift(entry);
      addVisit(state, planet, user.nickname, 'MESSAGE');
      save();
      return json({
        guestbook: {
          id: entry.id,
          visitorName: entry.visitorName,
          content: entry.content,
          aiReply: null,
          createdAt: entry.createdAt,
        },
      });
    }
  }

  return json({ error: '静态演示版未实现该接口' }, 404);
}
