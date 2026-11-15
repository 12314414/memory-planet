import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const SUPABASE_SERVER_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }));
        } catch {
          // Route Handler / Server Action 之外无法写 cookie，忽略即可
        }
      },
    },
  });
}

/** 服务端读取当前 Supabase 用户（无会话返回 null） */
export async function getSupabaseUser(): Promise<User | null> {
  if (!SUPABASE_SERVER_ENABLED) return null;
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}
