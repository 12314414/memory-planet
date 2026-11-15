import { cookies } from 'next/headers';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from './prisma';
import { getSupabaseUser, SUPABASE_SERVER_ENABLED } from './supabase-server';
import type { PetProfile } from './types';
import { THEME_LIST } from './theme';

export const USER_COOKIE = 'hx_uid';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const PET_PRESETS: PetProfile[] = [
  { name: '团子', species: 'cat', persona: '一只爱收集星星的橘猫，说话轻轻的，会害羞' },
  { name: '奶糖', species: 'rabbit', persona: '一只毛茸茸的兔子，喜欢在回忆里打滚，很会安慰人' },
  { name: '小宇宙', species: 'dog', persona: '一只热情的柯基，负责在星球门口迎接每一位访客' },
];

export function generateInviteCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** 生成一个数据库内唯一的邀请码（6 位） */
export async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 12; i += 1) {
    const code = generateInviteCode();
    const exists = await prisma.planet.findUnique({ where: { inviteCode: code } });
    if (!exists) return code;
  }
  return `${generateInviteCode(4)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

/**
 * 当前用户：
 * 1. 配置了 Supabase → 用 Supabase 会话（本地 User 表按 Supabase uid 映射）
 * 2. 未配置 → 回退到昵称 cookie（本地演示 / 纯静态演示版）
 */
export async function getCurrentUser() {
  if (SUPABASE_SERVER_ENABLED) {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) return null;
    return ensureUserForSupabase(supabaseUser);
  }

  const id = cookies().get(USER_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

/** Supabase 用户 → 本地 User（首次登录时落地一行，nickname 取注册时填的展示名） */
async function ensureUserForSupabase(user: SupabaseUser) {
  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (existing) return existing;

  const metaName = typeof user.user_metadata?.nickname === 'string' ? user.user_metadata.nickname : '';
  const fallbackName = (user.email || '旅人').split('@')[0];
  const nickname = (metaName || fallbackName).trim().slice(0, 12) || '旅人';

  return prisma.user.create({ data: { id: user.id, nickname } });
}

function pickPreset(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return PET_PRESETS[sum % PET_PRESETS.length];
}

function pickTheme(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return THEME_LIST[sum % THEME_LIST.length];
}

/**
 * 一个用户一个主星球：不存在则创建，附带 3 条示例回忆（2 公开 / 1 私密）。
 * 供首页 / 主人页 / 星图复用，保证任何入口都能拿到自己的星球。
 */
export async function ensurePlanetForUser(userId: string, nickname: string) {
  const existing = await prisma.planet.findFirst({ where: { ownerId: userId } });
  if (existing) return existing;

  const pet = pickPreset(userId);
  const theme = pickTheme(userId);
  const planet = await prisma.planet.create({
    data: {
      ownerId: userId,
      name: `${nickname}的小星球`,
      theme: theme.key,
      petProfileJson: JSON.stringify(pet),
      visibility: 'INVITE',
      inviteCode: await uniqueInviteCode(),
      memories: {
        create: [
          {
            ownerId: userId,
            text: '第一次把回忆放到星球上，风都变甜了一点。',
            visibility: 'PUBLIC',
          },
          {
            ownerId: userId,
            text: '那只总在窗台打盹的小家伙，替我看过很多次日落。',
            visibility: 'PUBLIC',
          },
          {
            ownerId: userId,
            text: '写给自己的悄悄话：不用急着长大。',
            visibility: 'PRIVATE',
          },
        ],
      },
    },
  });
  return planet;
}

export function parsePetProfile(raw: string): PetProfile {
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
    // ignore malformed json
  }
  return { name: '团子', species: 'cat', persona: '一只温柔的星球宠物' };
}
