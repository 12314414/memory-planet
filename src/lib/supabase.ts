'use client';

import { createBrowserClient } from '@supabase/ssr';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** 是否配置了 Supabase（未配置时回退到「昵称进入」） */
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** 浏览器端 Supabase 客户端：会话写在 cookie 里，服务端 @supabase/ssr 能直接读到 */
export function getSupabaseBrowser() {
  if (!SUPABASE_ENABLED) return null;
  if (!browserClient) browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browserClient;
}
