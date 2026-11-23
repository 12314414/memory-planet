'use client';

import type { User } from '@supabase/supabase-js';
import { fallbackText } from './ai-text';
import { maskSensitive } from './constants';
import { getSupabaseBrowser } from './supabase';
import { THEME_LIST } from './theme';
import type { PetProfile } from './types';

/**
 * GitHub Pages 静态版的「云端服务端」：
 * 路径、方法、返回 JSON 与 demo-store 的 demoFetch 保持一致，
 * 只是数据从 localStorage 换成 Supabase（依赖 schema-planets.sql 里的 RLS）。
 */

/** Vercel Serverless AI 代理地址（构建期注入；为空则纯模板降级） */
const AI_PROXY_URL = (process.env.NEXT_PUBLIC_AI_PROXY_URL || '').replace(/\/+$/, '');

const AI_CACHE_TTL = 24 * 60 * 60 * 1000;
/** 图片以 data URL 直接写文本字段，超过 800KB 直接拒绝 */
const MAX_IMAGE_CHARS = 800 * 1024;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Sb = NonNullable<ReturnType<typeof getSupabaseBrowser>>;

type PlanetRow = {
  id: string;
  owner_id: string;
  name: string;
  theme: string;
  pet_profile: unknown;
  visibility: 'PRIVATE' | 'INVITE' | 'PUBLIC';
  invite_code: string;
  stats_visits: number;
  stats_lights: number;
  stats_stars: number;
  updated_at: string;
};

type ProfileRow = { id: string; nickname: string };

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'PENDING' | 'ACCEPTED';
  created_at: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

type VisitRow = {
  id: string;
  planet_id: string;
  visitor_id: string;
  visitor_name: string;
  action: string;
  created_at: string;
};

type GuestbookRow = {
  id: string;
  planet_id: string;
  visitor_id: string;
  visitor_name: string;
  content: string;
  ai_reply: string | null;
  status: 'VISIBLE' | 'DELETED';
  created_at: string;
};

type MemoryRow = {
  id: string;
  planet_id: string;
  owner_id: string;
  text: string;
  image_url: string | null;
  visibility: 'PRIVATE' | 'PUBLIC';
  created_at: string;
};

type AiCacheEntry = { content: string; expiresAt: number };
const aiCache = new Map<string, AiCacheEntry>();

const now = () => new Date().toISOString();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function asRow<T>(value: unknown): T | null {
  return value ? (value as T) : null;
}

function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function randomCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

const PET_PRESETS: PetProfile[] = [
  { name: '团子', species: 'cat', persona: '一只爱收集星星的橘猫，说话轻轻的，会害羞' },
  { name: '奶糖', species: 'rabbit', persona: '一只毛茸茸的兔子，喜欢在回忆里打滚，很会安慰人' },
  { name: '小宇宙', species: 'dog', persona: '一只热情的柯基，负责在星球门口迎接每一位访客' },
];

function pickPreset(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return PET_PRESETS[sum % PET_PRESETS.length];
}

function pickTheme(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return THEME_LIST[sum % THEME_LIST.length].key;
}

/** hp_planets.pet_profile 是 jsonb 对象；兼容旧的字符串写法 */
function parsePet(raw: unknown): PetProfile {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  const value = (parsed ?? {}) as Partial<PetProfile>;
  if (value && typeof value.name === 'string') {
    return {
      name: value.name,
      species: value.species === 'dog' || value.species === 'rabbit' ? value.species : 'cat',
      persona: typeof value.persona === 'string' ? value.persona : '一只温柔的星球宠物',
      ...(typeof value.avatarUrl === 'string' ? { avatarUrl: value.avatarUrl } : {}),
    };
  }
  return { name: '团子', species: 'cat', persona: '一只温柔的星球宠物' };
}

function planetDTO(planet: PlanetRow, ownerName: string) {
  return {
    id: planet.id,
    name: planet.name,
    theme: planet.theme,
    visibility: planet.visibility,
    ownerName,
    petProfile: parsePet(planet.pet_profile),
    statsVisits: planet.stats_visits,
    statsLights: planet.stats_lights,
    statsStars: planet.stats_stars,
  };
}

function nicknameOfUser(user: User) {
  const meta = (user.user_metadata as Record<string, unknown> | undefined)?.nickname;
  const base = typeof meta === 'string' ? meta : (user.email || '旅人').split('@')[0];
  return String(base).trim().slice(0, 12) || '旅人';
}

/** 用户档案：不存在则按注册昵称/邮箱前缀创建 */
async function ensureProfile(sb: Sb, user: User): Promise<string> {
  const { data } = await sb.from('hp_profiles').select('nickname').eq('id', user.id).maybeSingle();
  const existing = asRow<{ nickname: string }>(data);
  if (existing?.nickname) return existing.nickname;

  const nickname = nicknameOfUser(user);
  const { error } = await sb
    .from('hp_profiles')
    .insert({ id: user.id, nickname, created_at: now() });
  if (!error) return nickname;

  const retry = await sb.from('hp_profiles').select('nickname').eq('id', user.id).maybeSingle();
  return asRow<{ nickname: string }>(retry.data)?.nickname || nickname;
}

/** 用户的主星球：不存在则创建（6 位邀请码冲突时重试） */
async function ensurePlanet(sb: Sb, user: User, nickname: string): Promise<PlanetRow | null> {
  const { data } = await sb.from('hp_planets').select('*').eq('owner_id', user.id).maybeSingle();
  const existing = asRow<PlanetRow>(data);
  if (existing) return existing;

  const base = {
    owner_id: user.id,
    name: `${nickname}的小星球`,
    theme: pickTheme(user.id),
    pet_profile: pickPreset(user.id),
    visibility: 'INVITE',
    stats_visits: 0,
    stats_lights: 0,
    stats_stars: 0,
    updated_at: now(),
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: created, error } = await sb
      .from('hp_planets')
      .insert({ ...base, invite_code: randomCode() })
      .select('*')
      .single();
    const planet = asRow<PlanetRow>(created);
    if (!error && planet) return planet;
    // 并发下可能已由另一个请求创建，回读一次
    if (error?.code !== '23505') break;
    const retry = await sb.from('hp_planets').select('*').eq('owner_id', user.id).maybeSingle();
    const created2 = asRow<PlanetRow>(retry.data);
    if (created2) return created2;
  }
  return null;
}

async function nicknamesFor(sb: Sb, ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();
  const { data } = await sb.from('hp_profiles').select('id,nickname').in('id', unique);
  return new Map(asRows<ProfileRow>(data).map((item) => [item.id, item.nickname]));
}

/** 找两个用户之间唯一的 Friendship 记录（无视方向） */
async function friendshipBetween(sb: Sb, aId: string, bId: string): Promise<FriendshipRow | null> {
  const { data } = await sb
    .from('hp_friendships')
    .select('*')
    .or(
      `and(requester_id.eq.${aId},addressee_id.eq.${bId}),and(requester_id.eq.${bId},addressee_id.eq.${aId})`,
    )
    .limit(1)
    .maybeSingle();
  return asRow<FriendshipRow>(data);
}

async function areFriends(sb: Sb, aId: string, bId: string): Promise<boolean> {
  const friendship = await friendshipBetween(sb, aId, bId);
  return friendship?.status === 'ACCEPTED';
}

function friendDTO(friendship: FriendshipRow, meId: string, names: Map<string, string>) {
  const otherId = friendship.requester_id === meId ? friendship.addressee_id : friendship.requester_id;
  return {
    id: friendship.id,
    status: friendship.status,
    direction: friendship.requester_id === meId ? ('outgoing' as const) : ('incoming' as const),
    user: { id: otherId, nickname: names.get(otherId) ?? '旅人' },
    createdAt: friendship.created_at,
  };
}

function guestbookDTO(entry: GuestbookRow) {
  return {
    id: entry.id,
    visitorName: entry.visitor_name,
    content: entry.content,
    aiReply: entry.ai_reply,
    createdAt: entry.created_at,
  };
}

function memoryDTO(memory: MemoryRow) {
  return {
    id: memory.id,
    text: memory.text,
    imageUrl: memory.image_url,
    createdAt: memory.created_at,
    visibility: memory.visibility,
  };
}

function readAiCache(planetId: string, visitorId: string, type: string) {
  const hit = aiCache.get(`${planetId}|${visitorId}|${type}`);
  if (!hit || hit.expiresAt <= Date.now()) return null;
  return hit.content;
}

function writeAiCache(planetId: string, visitorId: string, type: string, content: string) {
  aiCache.set(`${planetId}|${visitorId}|${type}`, {
    content,
    expiresAt: Date.now() + AI_CACHE_TTL,
  });
}

function imageTooLarge(image: string) {
  return image.length > MAX_IMAGE_CHARS;
}

/** 今日访客简报数据（主人端 / AI brief 共用） */
async function briefDataOf(sb: Sb, planet: PlanetRow) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [visitsRes, messagesRes, totalRes] = await Promise.all([
    sb
      .from('hp_visits')
      .select('visitor_id,action')
      .eq('planet_id', planet.id)
      .neq('visitor_id', planet.owner_id)
      .gte('created_at', todayStart.toISOString()),
    sb
      .from('hp_guestbooks')
      .select('visitor_name,content')
      .eq('planet_id', planet.id)
      .eq('status', 'VISIBLE')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(5),
    sb
      .from('hp_guestbooks')
      .select('id', { count: 'exact', head: true })
      .eq('planet_id', planet.id)
      .eq('status', 'VISIBLE'),
  ]);

  const visits = asRows<{ visitor_id: string; action: string }>(visitsRes.data);
  const messages = asRows<{ visitor_name: string; content: string }>(messagesRes.data);
  const unique = new Set(visits.map((visit) => visit.visitor_id)).size;
  const count = (action: string) => visits.filter((visit) => visit.action === action).length;

  return [
    `访客 ${unique} 人；点亮 ${count('LIGHT')} 次；送星 ${count('STAR')} 颗；投喂 ${count('FEED')} 次；今日留言 ${messages.length} 条。`,
    messages.length
      ? `留言要点：${messages.map((m) => `${m.visitor_name}「${m.content.slice(0, 24)}」`).join('；')}`
      : '今日暂无留言。',
    `累计留言 ${totalRes.count ?? 0} 条。`,
  ].join('\n');
}

export async function remoteFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await handleRemote(input, init);
  } catch {
    return json({ error: '云端数据暂时不可用，请稍后再试' }, 500);
  }
}

async function handleRemote(input: string, init?: RequestInit): Promise<Response> {
  const url = new URL(input, 'https://remote.local');
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

  const sb = getSupabaseBrowser();
  if (!sb) return json({ error: '云端数据层未配置 Supabase，请检查环境变量' }, 500);

  let cachedUser: User | null | undefined;
  const me = async (): Promise<User | null> => {
    if (cachedUser !== undefined) return cachedUser;
    try {
      const { data } = await sb.auth.getUser();
      cachedUser = data?.user ?? null;
    } catch {
      cachedUser = null;
    }
    return cachedUser ?? null;
  };

  // ==================== 身份 ====================

  if (path === '/api/auth/enter' && method === 'POST') {
    return json({ error: '已启用邮箱登录，请使用邮箱和密码进入' }, 400);
  }

  if (path === '/api/auth/exit' && method === 'POST') {
    try {
      await sb.auth.signOut();
    } catch {
      // 登出异常也当作已退出，前端只关心 ok
    }
    return json({ ok: true });
  }

  if (path === '/api/auth/me') {
    const user = await me();
    if (!user) return json({ user: null });
    const nickname = await ensureProfile(sb, user);
    return json({ user: { id: user.id, nickname } });
  }

  // ==================== 引导数据 ====================

  if (path === '/api/bootstrap') {
    const user = await me();
    if (!user) return json({ user: null });
    const nickname = await ensureProfile(sb, user);
    const planet = await ensurePlanet(sb, user, nickname);
    if (!planet) return json({ error: '星球暂时无法创建，请稍后再试' }, 500);

    const [publicRes, privateRes, visitsRes] = await Promise.all([
      sb
        .from('hp_memories')
        .select('id', { count: 'exact', head: true })
        .eq('planet_id', planet.id)
        .eq('visibility', 'PUBLIC'),
      sb
        .from('hp_memories')
        .select('id', { count: 'exact', head: true })
        .eq('planet_id', planet.id)
        .eq('visibility', 'PRIVATE'),
      sb
        .from('hp_visits')
        .select('visitor_id,visitor_name,action,created_at')
        .eq('planet_id', planet.id)
        .neq('visitor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    const seen = new Set<string>();
    const recentVisitors: { name: string; action: string; createdAt: string }[] = [];
    for (const visit of asRows<VisitRow>(visitsRes.data)) {
      if (seen.has(visit.visitor_id)) continue;
      seen.add(visit.visitor_id);
      recentVisitors.push({
        name: visit.visitor_name,
        action: visit.action,
        createdAt: visit.created_at,
      });
      if (recentVisitors.length >= 6) break;
    }

    return json({
      user: { id: user.id, nickname },
      planet: planetDTO(planet, nickname),
      pet: parsePet(planet.pet_profile),
      publicMemories: publicRes.count ?? 0,
      privateMemories: privateRes.count ?? 0,
      recentVisitors,
    });
  }

  // ==================== 公开星球 ====================

  if (path === '/api/planets/public') {
    const user = await me();
    let query = sb
      .from('hp_planets')
      .select('id,name,theme,owner_id,pet_profile,stats_visits,stats_stars,updated_at')
      .eq('visibility', 'PUBLIC')
      .order('updated_at', { ascending: false })
      .limit(10);
    if (user) query = query.neq('owner_id', user.id);
    const { data } = await query;
    const rows = asRows<PlanetRow>(data);
    const names = await nicknamesFor(sb, rows.map((row) => row.owner_id));
    const planets = rows.map((row) => ({
      id: row.id,
      name: row.name,
      theme: row.theme,
      ownerName: names.get(row.owner_id) ?? '星球主人',
      petName: parsePet(row.pet_profile).name,
      statsVisits: row.stats_visits,
      statsStars: row.stats_stars,
      updatedAt: row.updated_at,
    }));
    return json({ planets });
  }

  // ==================== 好友关系 ====================

  if (path === '/api/friends' && method === 'GET') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const { data } = await sb
      .from('hp_friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    const rows = asRows<FriendshipRow>(data);
    const names = await nicknamesFor(
      sb,
      rows.map((row) => (row.requester_id === user.id ? row.addressee_id : row.requester_id)),
    );
    return json({ friends: rows.map((row) => friendDTO(row, user.id, names)) });
  }

  if (path === '/api/friends' && method === 'POST') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const targetId = String(body?.targetId ?? '');
    const action = String(body?.action ?? 'request');

    if (action === 'request') {
      if (!targetId || targetId === user.id) return json({ error: '无效的对方' }, 400);
      const existing = await friendshipBetween(sb, user.id, targetId);
      if (existing) {
        if (existing.status === 'ACCEPTED') return json({ error: '你们已经是好友了' }, 409);
        return json({ error: '已经发过申请，等待对方回应' }, 409);
      }
      const { data: created, error } = await sb
        .from('hp_friendships')
        .insert({ requester_id: user.id, addressee_id: targetId, status: 'PENDING', created_at: now() })
        .select('*')
        .single();
      const friendship = asRow<FriendshipRow>(created);
      if (error || !friendship) return json({ error: '好友申请没有送达，请稍后再试' }, 500);
      const names = await nicknamesFor(sb, [targetId]);
      return json({ friend: friendDTO(friendship, user.id, names) });
    }

    const friendshipId = String(body?.friendshipId ?? '');
    const { data: found } = await sb
      .from('hp_friendships')
      .select('*')
      .eq('id', friendshipId)
      .maybeSingle();
    const friendship = asRow<FriendshipRow>(found);
    if (!friendship || friendship.addressee_id !== user.id) {
      return json({ error: '申请不存在或无权处理' }, 404);
    }

    if (action === 'accept') {
      const { data: updated } = await sb
        .from('hp_friendships')
        .update({ status: 'ACCEPTED' })
        .eq('id', friendshipId)
        .select('*')
        .single();
      await sb.from('hp_messages').insert({
        sender_id: user.id,
        recipient_id: friendship.requester_id,
        content: '我通过你的好友申请啦，欢迎来我的星球坐坐 🌟',
        is_read: false,
        created_at: now(),
      });
      const names = await nicknamesFor(sb, [friendship.requester_id]);
      return json({
        friend: friendDTO(asRow<FriendshipRow>(updated) ?? { ...friendship, status: 'ACCEPTED' }, user.id, names),
      });
    }

    if (action === 'reject') {
      await sb.from('hp_friendships').delete().eq('id', friendshipId);
      return json({ ok: true });
    }

    return json({ error: '无效的操作' }, 400);
  }

  if (path.startsWith('/api/friends/status')) {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const targetId = url.searchParams.get('userId') || '';
    if (!targetId) return json({ error: '缺少目标用户' }, 400);
    const friendship = await friendshipBetween(sb, user.id, targetId);
    if (!friendship) return json({ status: 'none' });
    if (friendship.status === 'PENDING') {
      const incoming = friendship.addressee_id === user.id;
      return json({
        status: 'pending',
        direction: incoming ? 'incoming' : 'outgoing',
        friendshipId: friendship.id,
      });
    }
    return json({ status: 'accepted', friendshipId: friendship.id });
  }

  // ==================== 私信 ====================

  if (path === '/api/messages' && method === 'GET') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const { data } = await sb
      .from('hp_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    const rows = asRows<MessageRow>(data);

    const partners = new Map<string, MessageRow[]>();
    for (const message of rows) {
      const otherId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
      if (!partners.has(otherId)) partners.set(otherId, []);
      partners.get(otherId)!.push(message);
    }

    const names = await nicknamesFor(sb, Array.from(partners.keys()));
    const conversations = Array.from(partners.entries())
      .map(([otherId, msgs]) => {
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter((message) => message.sender_id === otherId && !message.is_read).length;
        return {
          user: { id: otherId, nickname: names.get(otherId) ?? '旅人' },
          lastMessage: last.content,
          lastAt: last.created_at,
          unread,
        };
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

    return json({ conversations });
  }

  if (path.startsWith('/api/messages/with')) {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const otherId = url.searchParams.get('userId') || '';
    if (!otherId) return json({ error: '缺少对方' }, 400);

    const [threadRes, profileRes] = await Promise.all([
      sb
        .from('hp_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`,
        )
        .order('created_at', { ascending: true }),
      sb.from('hp_profiles').select('nickname').eq('id', otherId).maybeSingle(),
    ]);
    const thread = asRows<MessageRow>(threadRes.data);

    const unreadIds = thread
      .filter((message) => message.sender_id === otherId && !message.is_read)
      .map((message) => message.id);
    if (unreadIds.length) {
      await sb.from('hp_messages').update({ is_read: true }).in('id', unreadIds);
    }

    return json({
      user: {
        id: otherId,
        nickname: asRow<{ nickname: string }>(profileRes.data)?.nickname ?? '旅人',
      },
      messages: thread.map((message) => ({
        id: message.id,
        mine: message.sender_id === user.id,
        content: message.content,
        createdAt: message.created_at,
      })),
    });
  }

  if (path === '/api/messages' && method === 'POST') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const recipientId = String(body?.recipientId ?? '');
    const content = maskSensitive(String(body?.content ?? '').trim());
    if (!recipientId) return json({ error: '缺少收信人' }, 400);
    if (!content) return json({ error: '消息不能为空' }, 400);
    if (content.length > 500) return json({ error: '消息最多 500 字' }, 400);
    if (!(await areFriends(sb, user.id, recipientId))) {
      return json({ error: '你们还不是好友，先加好友再聊吧' }, 403);
    }
    const { data: created, error } = await sb
      .from('hp_messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        content,
        is_read: false,
        created_at: now(),
      })
      .select('*')
      .single();
    const message = asRow<MessageRow>(created);
    if (error || !message) return json({ error: '消息没有送达，请稍后再试' }, 500);
    return json({
      message: {
        id: message.id,
        mine: true,
        content: message.content,
        createdAt: message.created_at,
      },
    });
  }

  // ==================== 邀请码解析 ====================

  const inviteMatch = path.match(/^\/api\/invite\/([^/]+)$/);
  if (inviteMatch) {
    const code = decodeURIComponent(inviteMatch[1]).toUpperCase().trim();
    const { data } = await sb
      .from('hp_planets')
      .select('id,visibility,invite_code')
      .eq('invite_code', code)
      .maybeSingle();
    const planet = asRow<PlanetRow>(data);
    if (!planet) return json({ error: '邀请码无效' }, 404);
    if (planet.visibility === 'PRIVATE') return json({ error: '这颗星球现在是私密的' }, 403);
    return json({ id: planet.id, code });
  }

  // ==================== 主人端 ====================

  if (path === '/api/planet/owner/dashboard') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const nickname = await ensureProfile(sb, user);
    const planet = await ensurePlanet(sb, user, nickname);
    if (!planet) return json({ error: '星球暂时无法创建，请稍后再试' }, 500);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [visitsRes, guestbookRes, memoriesRes, todayVisitsRes, todayMessagesRes] = await Promise.all([
      sb
        .from('hp_visits')
        .select('id,visitor_name,action,created_at')
        .eq('planet_id', planet.id)
        .neq('visitor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40),
      sb
        .from('hp_guestbooks')
        .select('*')
        .eq('planet_id', planet.id)
        .eq('status', 'VISIBLE')
        .order('created_at', { ascending: false })
        .limit(30),
      sb
        .from('hp_memories')
        .select('*')
        .eq('planet_id', planet.id)
        .order('created_at', { ascending: false }),
      sb
        .from('hp_visits')
        .select('visitor_id,action')
        .eq('planet_id', planet.id)
        .neq('visitor_id', user.id)
        .gte('created_at', todayStart.toISOString()),
      sb
        .from('hp_guestbooks')
        .select('id', { count: 'exact', head: true })
        .eq('planet_id', planet.id)
        .eq('status', 'VISIBLE')
        .gte('created_at', todayStart.toISOString()),
    ]);

    const todayVisits = asRows<{ visitor_id: string; action: string }>(todayVisitsRes.data);
    const countOf = (action: string) => todayVisits.filter((visit) => visit.action === action).length;

    return json({
      planet: {
        id: planet.id,
        name: planet.name,
        theme: planet.theme,
        visibility: planet.visibility,
        inviteCode: planet.invite_code,
        statsVisits: planet.stats_visits,
        statsLights: planet.stats_lights,
        statsStars: planet.stats_stars,
      },
      today: {
        visitors: new Set(todayVisits.map((visit) => visit.visitor_id)).size,
        lights: countOf('LIGHT'),
        stars: countOf('STAR'),
        feeds: countOf('FEED'),
        messages: todayMessagesRes.count ?? 0,
      },
      visits: asRows<VisitRow>(visitsRes.data).map((visit) => ({
        id: visit.id,
        visitorName: visit.visitor_name,
        action: visit.action,
        createdAt: visit.created_at,
      })),
      guestbook: asRows<GuestbookRow>(guestbookRes.data).map(guestbookDTO),
      memories: asRows<MemoryRow>(memoriesRes.data).map(memoryDTO),
      aiBrief: readAiCache(planet.id, user.id, 'brief'),
    });
  }

  if (path === '/api/planet/owner/brief' && method === 'POST') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const nickname = await ensureProfile(sb, user);
    const planet = await ensurePlanet(sb, user, nickname);
    if (!planet) return json({ error: '星球暂时无法创建，请稍后再试' }, 500);

    const text = fallbackText({
      type: 'brief',
      planetName: planet.name,
      themeLabel: '',
      pet: parsePet(planet.pet_profile),
      visitorName: nickname,
      briefData: await briefDataOf(sb, planet),
    });
    writeAiCache(planet.id, user.id, 'brief', text);
    return json({ text, fallback: true, source: 'fallback' });
  }

  if (path === '/api/planet/owner/invite' && method === 'POST') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const nickname = await ensureProfile(sb, user);
    const planet = await ensurePlanet(sb, user, nickname);
    if (!planet) return json({ error: '星球暂时无法创建，请稍后再试' }, 500);

    let code = planet.invite_code;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const next = randomCode();
      const { error } = await sb
        .from('hp_planets')
        .update({ invite_code: next, updated_at: now() })
        .eq('owner_id', user.id);
      if (!error) {
        code = next;
        break;
      }
    }
    return json({ inviteCode: code, path: `/planet/view?id=${planet.id}&code=${code}` });
  }

  if (path === '/api/planet/owner/settings' && method === 'PATCH') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const visibility = String(body?.visibility ?? '');
    if (!['PRIVATE', 'INVITE', 'PUBLIC'].includes(visibility)) {
      return json({ error: '无效的权限值' }, 400);
    }
    await sb
      .from('hp_planets')
      .update({ visibility, updated_at: now() })
      .eq('owner_id', user.id);
    return json({ visibility });
  }

  if (path === '/api/planet/owner/message' && method === 'DELETE') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const nickname = await ensureProfile(sb, user);
    const planet = await ensurePlanet(sb, user, nickname);
    if (!planet) return json({ error: '星球暂时无法创建，请稍后再试' }, 500);

    const messageId = url.searchParams.get('messageId') || '';
    const { data } = await sb
      .from('hp_guestbooks')
      .select('id,planet_id')
      .eq('id', messageId)
      .maybeSingle();
    const entry = asRow<GuestbookRow>(data);
    if (!entry || entry.planet_id !== planet.id) {
      return json({ error: '留言不存在或无权限' }, 403);
    }
    await sb.from('hp_guestbooks').update({ status: 'DELETED' }).eq('id', messageId);
    return json({ ok: true });
  }

  if (path === '/api/planet/owner/memory' && method === 'POST') {
    const user = await me();
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
    if (imageData && imageTooLarge(imageData)) {
      return json({ error: '图片太大了（超过 800KB），请压缩后再试' }, 400);
    }

    const nickname = await ensureProfile(sb, user);
    const planet = await ensurePlanet(sb, user, nickname);
    if (!planet) return json({ error: '星球暂时无法创建，请稍后再试' }, 500);
    if (body?.planetId && String(body.planetId) !== planet.id) {
      return json({ error: '只能给自己的星球添加回忆' }, 403);
    }

    const { data: created, error } = await sb
      .from('hp_memories')
      .insert({
        planet_id: planet.id,
        owner_id: user.id,
        text,
        image_url: imageData || null,
        visibility,
        created_at: now(),
      })
      .select('*')
      .single();
    const memory = asRow<MemoryRow>(created);
    if (error || !memory) return json({ error: '回忆没有保存成功，请稍后再试' }, 500);
    await sb.from('hp_planets').update({ updated_at: now() }).eq('id', planet.id);

    return json({
      memory: {
        id: memory.id,
        planetId: memory.planet_id,
        ownerId: memory.owner_id,
        text: memory.text,
        imageUrl: memory.image_url,
        visibility: memory.visibility,
        createdAt: memory.created_at,
      },
    });
  }

  const memoryDeleteMatch = path.match(/^\/api\/planet\/owner\/memory\/([^/]+)$/);
  if (memoryDeleteMatch && method === 'DELETE') {
    const user = await me();
    if (!user) return json({ error: '请先登录后再操作' }, 401);
    const nickname = await ensureProfile(sb, user);
    const planet = await ensurePlanet(sb, user, nickname);
    if (!planet) return json({ error: '星球暂时无法创建，请稍后再试' }, 500);

    const memoryId = decodeURIComponent(memoryDeleteMatch[1]);
    const { data } = await sb
      .from('hp_memories')
      .select('id,planet_id')
      .eq('id', memoryId)
      .maybeSingle();
    const memory = asRow<MemoryRow>(data);
    if (!memory) return json({ error: '回忆不存在' }, 404);
    if (memory.planet_id !== planet.id) return json({ error: '只有主人可以删除回忆' }, 403);
    await sb.from('hp_memories').delete().eq('id', memoryId);
    return json({ ok: true });
  }

  if (path === '/api/planet/owner/avatar' && method === 'POST') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const avatarUrl = String(body?.avatarUrl ?? '');
    if (!/^(https?:\/\/|data:image\/)/.test(avatarUrl)) {
      return json({ error: '形象地址无效' }, 400);
    }
    if (avatarUrl.startsWith('data:image/') && imageTooLarge(avatarUrl)) {
      return json({ error: '图片太大了（超过 800KB），请压缩后再试' }, 400);
    }

    const nickname = await ensureProfile(sb, user);
    const planet = await ensurePlanet(sb, user, nickname);
    if (!planet) return json({ error: '星球暂时无法创建，请稍后再试' }, 500);

    const current =
      planet.pet_profile && typeof planet.pet_profile === 'object'
        ? { ...(planet.pet_profile as Record<string, unknown>) }
        : {};
    await sb
      .from('hp_planets')
      .update({ pet_profile: { ...current, avatarUrl }, updated_at: now() })
      .eq('id', planet.id);
    return json({ avatarUrl });
  }

  // ==================== AI（不查库，走代理 + 模板降级） ====================

  if (path === '/api/ai/chat' && method === 'POST') {
    const type = String(body?.type ?? '');
    const planetId = String(body?.planetId ?? '');
    if (!['welcome', 'reply', 'brief', 'polish'].includes(type)) {
      return json({ error: '无效的 AI 类型' }, 400);
    }
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const nickname = await ensureProfile(sb, user);

    const { data } = await sb
      .from('hp_planets')
      .select('id,owner_id,name,theme,visibility,pet_profile')
      .eq('id', planetId)
      .maybeSingle();
    const planet = asRow<PlanetRow>(data);
    if (!planet) return json({ error: '星球不存在' }, 404);

    const isOwner = planet.owner_id === user.id;
    if (planet.visibility === 'PRIVATE' && !isOwner) {
      return json({ error: '私密星球不对外开放' }, 403);
    }
    if (type === 'brief' && !isOwner) {
      return json({ error: '只有主人可以查看访客简报' }, 403);
    }
    if (type === 'polish' && !isOwner) {
      return json({ error: '只有主人可以润色回忆' }, 403);
    }

    const cacheOwner = type === 'brief' ? planet.owner_id : user.id;
    if ((type === 'welcome' || type === 'brief') && !body?.refresh) {
      const cached = readAiCache(planet.id, cacheOwner, type);
      if (cached) return json({ text: cached, fallback: false, source: 'cache' });
    }

    const pet = parsePet(planet.pet_profile);
    const briefData = type === 'brief' ? await briefDataOf(sb, planet) : undefined;

    if (AI_PROXY_URL) {
      try {
        const upstream = await fetch(`${AI_PROXY_URL}/ai-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            planetId: planet.id,
            planetName: planet.name,
            visitorName: nickname,
            content: typeof body?.content === 'string' ? body.content : undefined,
            briefData,
            petName: pet.name,
            petPersona: pet.persona,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const data2 = await upstream.json().catch(() => null);
        if (upstream.ok && data2?.text) {
          if (!data2.fallback && (type === 'welcome' || type === 'brief')) {
            writeAiCache(planet.id, cacheOwner, type, String(data2.text));
          }
          return json({
            text: data2.text,
            fallback: Boolean(data2.fallback),
            source: data2.fallback ? 'fallback' : 'ai',
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
      visitorName: nickname,
      content: typeof body?.content === 'string' ? body.content : undefined,
      briefData,
    });
    if (type === 'welcome' || type === 'brief') {
      writeAiCache(planet.id, cacheOwner, type, text);
    }
    return json({ text, fallback: true, source: 'fallback' });
  }

  if (path === '/api/ai/image' && method === 'POST') {
    if (AI_PROXY_URL) {
      try {
        const upstream = await fetch(`${AI_PROXY_URL}/ai-image`, {
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
        return json({
          imageUrl: '',
          fallback: true,
          reason: data?.reason ?? `proxy_http_${upstream.status}`,
        });
      } catch {
        // 代理不可达：走剪影占位
      }
    }
    return json({ imageUrl: '', fallback: true, reason: 'proxy_unreachable' });
  }

  // ==================== 异步回写宠物回复 ====================

  const replyMatch = path.match(/^\/api\/planet\/([^/]+)\/message\/([^/]+)\/reply$/);
  if (replyMatch && method === 'POST') {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const entryId = decodeURIComponent(replyMatch[2]);
    const { data } = await sb
      .from('hp_guestbooks')
      .select('id,planet_id,ai_reply')
      .eq('id', entryId)
      .maybeSingle();
    const entry = asRow<GuestbookRow>(data);
    if (!entry || entry.planet_id !== replyMatch[1]) {
      return json({ error: '留言不存在' }, 404);
    }
    let aiReply = entry.ai_reply;
    if (!aiReply) {
      aiReply = String(body?.aiReply ?? '').slice(0, 200) || null;
      if (aiReply) {
        await sb.from('hp_guestbooks').update({ ai_reply: aiReply }).eq('id', entryId);
      }
    }
    return json({ aiReply });
  }

  // ==================== 访客星球 ====================

  const planetMatch = path.match(/^\/api\/planet\/([^/]+)(?:\/(action|message))?$/);
  if (planetMatch) {
    const user = await me();
    if (!user) return json({ error: '请先输入昵称进入' }, 401);
    const nickname = await ensureProfile(sb, user);

    const planetId = planetMatch[1];
    const sub = planetMatch[2];
    const code = sub
      ? typeof body?.inviteCode === 'string'
        ? body.inviteCode
        : null
      : url.searchParams.get('code');

    const { data } = await sb.from('hp_planets').select('*').eq('id', planetId).maybeSingle();
    const planet = asRow<PlanetRow>(data);
    if (!planet) return json({ error: '这颗星球不存在或已漂流走了' }, 404);

    const isOwner = planet.owner_id === user.id;
    if (!isOwner) {
      if (planet.visibility === 'PRIVATE') {
        return json({ error: '主人把星球设为了私密，暂时无法到访' }, 403);
      }
      if (planet.visibility === 'INVITE') {
        const normalized = (code || '').toUpperCase().trim();
        if (!normalized || normalized !== planet.invite_code) {
          return json({ error: '需要有效的 6 位邀请码才能进入这颗星球' }, 403);
        }
      }
    }

    if (!sub && method === 'GET') {
      let viewPlanet = planet;
      if (!isOwner) {
        const { data: recent } = await sb
          .from('hp_visits')
          .select('id')
          .eq('planet_id', planet.id)
          .eq('visitor_id', user.id)
          .eq('action', 'ENTER')
          .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
          .maybeSingle();
        if (!recent) {
          // 安全定义函数：写足迹 + 累加 stats（访客无直接更新星球权限）
          await sb.rpc('hp_record_visit', { p_planet: planet.id, p_action: 'ENTER' });
          const { data: refreshed } = await sb
            .from('hp_planets')
            .select('*')
            .eq('id', planet.id)
            .maybeSingle();
          viewPlanet = asRow<PlanetRow>(refreshed) ?? planet;
        }
      }

      const [memoriesRes, guestbookRes, ownerRes] = await Promise.all([
        sb
          .from('hp_memories')
          .select('*')
          .eq('planet_id', planet.id)
          .eq('visibility', 'PUBLIC')
          .order('created_at', { ascending: false })
          .limit(12),
        sb
          .from('hp_guestbooks')
          .select('*')
          .eq('planet_id', planet.id)
          .eq('status', 'VISIBLE')
          .order('created_at', { ascending: false })
          .limit(30),
        sb.from('hp_profiles').select('nickname').eq('id', planet.owner_id).maybeSingle(),
      ]);

      const ownerName = asRow<{ nickname: string }>(ownerRes.data)?.nickname ?? '星球主人';
      return json({
        viewer: { id: user.id, nickname, isOwner },
        planet: { ...planetDTO(viewPlanet, ownerName), ownerId: planet.owner_id },
        memories: asRows<MemoryRow>(memoriesRes.data).map((memory) => ({
          id: memory.id,
          text: memory.text,
          imageUrl: memory.image_url,
          createdAt: memory.created_at,
        })),
        guestbook: asRows<GuestbookRow>(guestbookRes.data).map(guestbookDTO),
      });
    }

    if (sub === 'action' && method === 'POST') {
      const action = String(body?.action ?? '');
      if (!['LIGHT', 'STAR', 'FEED'].includes(action)) {
        return json({ error: '不支持的互动类型' }, 400);
      }

      // 安全定义函数：写足迹 + 累加 stats（访客无直接更新星球权限）
      const { error: rpcError } = await sb.rpc('hp_record_visit', {
        p_planet: planet.id,
        p_action: action,
      });
      const { data: refreshed } = await sb
        .from('hp_planets')
        .select('stats_visits,stats_lights,stats_stars')
        .eq('id', planet.id)
        .maybeSingle();
      const row = asRow<{
        stats_visits: number;
        stats_lights: number;
        stats_stars: number;
      }>(refreshed);

      const stats =
        row && !rpcError
          ? {
              statsVisits: row.stats_visits,
              statsLights: row.stats_lights,
              statsStars: row.stats_stars,
            }
          : {
              statsVisits: planet.stats_visits,
              statsLights: planet.stats_lights + (action === 'LIGHT' ? 1 : 0),
              statsStars: planet.stats_stars + (action === 'STAR' ? 1 : 0),
            };

      return json({ ok: true, action, stats });
    }

    if (sub === 'message' && method === 'POST') {
      const raw = String(body?.content ?? '').trim();
      if (!raw) return json({ error: '留言不能为空' }, 400);
      if (raw.length > 200) return json({ error: '留言最多 200 字' }, 400);
      const content = maskSensitive(raw);

      const { data: created, error } = await sb
        .from('hp_guestbooks')
        .insert({
          planet_id: planet.id,
          visitor_id: user.id,
          visitor_name: nickname,
          content,
          ai_reply: null,
          status: 'VISIBLE',
          created_at: now(),
        })
        .select('*')
        .single();
      const entry = asRow<GuestbookRow>(created);
      if (error || !entry) return json({ error: '留言没有送达，请稍后再试' }, 500);

      await sb.from('hp_visits').insert({
        planet_id: planet.id,
        visitor_id: user.id,
        visitor_name: nickname,
        action: 'MESSAGE',
        created_at: now(),
      });

      return json({ guestbook: guestbookDTO(entry) });
    }
  }

  return json({ error: '接口不存在' }, 404);
}
