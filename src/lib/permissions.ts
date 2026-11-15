import type { Planet } from '@prisma/client';
import { prisma } from './prisma';

export type AccessDenied = { ok: false; status: number; error: string };
export type AccessGranted = { ok: true; planet: Planet; isOwner: boolean };

/**
 * 统一的服务端访问裁决：
 * - 主人永远可以访问自己的星球
 * - PRIVATE：仅主人
 * - INVITE：必须携带正确的 inviteCode
 * - PUBLIC：任何人
 * 前端传参一律不可信，所有页面/接口都走这里。
 */
export async function resolvePlanetAccess(
  planetId: string,
  options: { inviteCode?: string | null; viewerId?: string | null },
): Promise<AccessGranted | AccessDenied> {
  const planet = await prisma.planet.findUnique({ where: { id: planetId } });
  if (!planet) return { ok: false, status: 404, error: '这颗星球不存在或已漂流走了' };

  const isOwner = Boolean(options.viewerId && options.viewerId === planet.ownerId);
  if (isOwner) return { ok: true, planet, isOwner: true };

  if (planet.visibility === 'PRIVATE') {
    return { ok: false, status: 403, error: '主人把星球设为了私密，暂时无法到访' };
  }

  if (planet.visibility === 'INVITE') {
    const code = (options.inviteCode || '').toUpperCase().trim();
    if (!code || code !== planet.inviteCode) {
      return { ok: false, status: 403, error: '需要有效的 6 位邀请码才能进入这颗星球' };
    }
  }

  return { ok: true, planet, isOwner: false };
}
