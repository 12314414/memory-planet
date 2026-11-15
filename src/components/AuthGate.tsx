'use client';

import { useState } from 'react';
import { apiFetch, DEMO_MODE } from '@/lib/api-client';
import { setDemoNickname } from '@/lib/demo-store';
import { getSupabaseBrowser, SUPABASE_ENABLED } from '@/lib/supabase';

type Mode = 'login' | 'register';

function mapAuthError(message: string) {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return '邮箱或密码不正确';
  if (text.includes('email not confirmed')) return '邮箱还没确认，请先去邮箱点确认链接';
  if (text.includes('user already registered')) return '这个邮箱已经注册过了，直接登录吧';
  if (text.includes('password should be at least')) return '密码至少 6 位';
  if (text.includes('unable to validate email')) return '邮箱格式看起来不太对';
  if (text.includes('rate limit')) return '操作太频繁，稍等一会儿再试';
  return message;
}

/** 登录闸门：配置了 Supabase 走邮箱+密码，未配置时回退到昵称进入 */
export default function AuthGate() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError('');
    setNotice('');
  };

  const finish = async (name: string) => {
    if (DEMO_MODE) setDemoNickname(name.trim().slice(0, 12) || '旅人');
    window.location.reload();
  };

  const submitNickname = async () => {
    const name = nickname.trim();
    if (!name) {
      setError('先给自己起个昵称吧');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '进入失败，请再试一次');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '进入失败，请再试一次');
      setLoading(false);
    }
  };

  const submitSupabase = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError('Supabase 未初始化，请检查环境变量');
      return;
    }
    const mail = email.trim();
    const name = nickname.trim() || mail.split('@')[0];
    if (!mail || !password) {
      setError('邮箱和密码都要填哦');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { data: { nickname: name.slice(0, 12) } },
        });
        if (signUpError) throw new Error(mapAuthError(signUpError.message));
        if (!data.session) {
          setNotice('注册成功，请去邮箱点击确认链接，然后再回来登录。');
          setMode('login');
          setLoading(false);
          return;
        }
        await finish(name);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mail,
        password,
      });
      if (signInError) throw new Error(mapAuthError(signInError.message));

      const { data } = await supabase.auth.getUser();
      const metaName =
        typeof data.user?.user_metadata?.nickname === 'string' ? data.user.user_metadata.nickname : '';
      await finish(metaName || mail.split('@')[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请再试一次');
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (SUPABASE_ENABLED) await submitSupabase();
    else await submitNickname();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="relative mx-auto mb-6 h-32 w-32">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 32% 26%, #fff 0%, #f6e9ff 18%, #d9c4f6 45%, #b7a0e7 68%, #8d78c1 100%)',
                boxShadow: '0 22px 44px -20px rgba(120,95,160,.55), inset -10px -12px 26px rgba(88,64,110,.2)',
                animation: 'floaty 8s ease-in-out infinite',
              }}
            >
              <span className="absolute left-[22%] top-[26%] h-[8%] w-[26%] rounded-full bg-white/60 blur-[3px]" />
            </div>
            <span
              className="absolute left-1/2 top-1/2 h-[38px] w-[168px] -translate-x-1/2 -translate-y-1/2 rotate-[-17deg] rounded-full border-[7px] border-[#f3d693]/80"
              style={{ boxShadow: '0 0 18px rgba(243,207,122,.4)' }}
            />
            <span className="absolute -right-3 top-1 text-xl text-[#f2cb78]">✦</span>
          </div>
          <p className="eyebrow">WELCOME ABOARD</p>
          <h1 className="title mt-3 text-3xl">欢迎来到宠归星畔</h1>
          <p className="muted mt-3 text-sm leading-relaxed">
            {SUPABASE_ENABLED ? '登录后，你就是自己星球的主人。' : '输入一个昵称，就拥有一颗自己的星球。'}
          </p>
        </div>

        <form onSubmit={submit} className="card p-6">
          {SUPABASE_ENABLED ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-[#f4ecfb] p-1">
                {(['login', 'register'] as Mode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMode(item);
                      resetMessages();
                    }}
                    className={
                      mode === item
                        ? 'rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#6b5580] shadow-sm'
                        : 'rounded-full px-3 py-1.5 text-xs text-[#b09ec0]'
                    }
                  >
                    {item === 'login' ? '登录' : '注册'}
                  </button>
                ))}
              </div>

              {mode === 'register' && (
                <>
                  <label className="eyebrow mb-2 block" htmlFor="nickname">
                    你的昵称
                  </label>
                  <input
                    id="nickname"
                    className="field mb-3"
                    placeholder="比如：阿桃、星星饲养员"
                    value={nickname}
                    maxLength={12}
                    onChange={(event) => {
                      setNickname(event.target.value);
                      resetMessages();
                    }}
                    autoComplete="nickname"
                  />
                </>
              )}

              <label className="eyebrow mb-2 block" htmlFor="email">
                邮箱
              </label>
              <input
                id="email"
                className="field mb-3"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  resetMessages();
                }}
                autoComplete="email"
              />

              <label className="eyebrow mb-2 block" htmlFor="password">
                密码
              </label>
              <input
                id="password"
                className="field"
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  resetMessages();
                }}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </>
          ) : (
            <>
              <label className="eyebrow mb-2 block" htmlFor="nickname">
                你的昵称
              </label>
              <input
                id="nickname"
                className="field"
                placeholder="比如：阿桃、星星饲养员"
                value={nickname}
                maxLength={12}
                onChange={(event) => {
                  setNickname(event.target.value);
                  resetMessages();
                }}
                autoComplete="off"
              />
            </>
          )}

          {error && <p className="mt-2 text-xs text-[#c26a86]">{error}</p>}
          {notice && <p className="mt-2 text-xs text-[#6f8f7a]">{notice}</p>}

          <button type="submit" className="btn btn-primary mt-4 w-full" disabled={loading}>
            {loading
              ? '正在为你点亮星球…'
              : SUPABASE_ENABLED
                ? mode === 'login'
                  ? '登录'
                  : '注册并进入'
                : '进入我的星球'}
          </button>

          <p className="mt-3 text-center text-[11px] text-[#b09ec0]">
            {SUPABASE_ENABLED
              ? '账号由 Supabase 托管，只用于区分你是谁'
              : '当前未配置 Supabase，先用昵称进入；配置后自动切换为邮箱登录'}
          </p>
        </form>
      </div>
    </main>
  );
}
