'use client';

import { demoFetch } from './demo-store';

/** GitHub Pages 静态演示版：没有服务端，接口由 localStorage 数据层模拟 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

/** 部署在子路径（如 /memory-planet）时，手写的跳转需要带上前缀 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function appPath(path: string) {
  return `${BASE_PATH}${path}`;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (DEMO_MODE) return demoFetch(input, init);
  return fetch(`${BASE_PATH}${input}`, init);
}
