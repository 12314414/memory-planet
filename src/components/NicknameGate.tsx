'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NicknameGate() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = nickname.trim();
    if (!name) {
      setError('先给自己起个昵称吧');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '进入失败，请再试一次');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '进入失败，请再试一次');
      setLoading(false);
    }
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
          <h1 className="title mt-3 text-3xl">先认识一下你</h1>
          <p className="muted mt-3 text-sm leading-relaxed">
            输入一个昵称，就拥有一颗自己的回忆星球。
            <br />
            没有密码，没有注册表，只有一颗星球和一只能说话的宠物。
          </p>
        </div>

        <form onSubmit={submit} className="card p-6">
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
              setError('');
            }}
            autoComplete="off"
          />
          {error && <p className="mt-2 text-xs text-[#c26a86]">{error}</p>}
          <button type="submit" className="btn btn-primary mt-4 w-full" disabled={loading}>
            {loading ? '正在为你点亮星球…' : '进入我的星球'}
          </button>
          <p className="mt-3 text-center text-[11px] text-[#b09ec0]">
            昵称只用于串门时打招呼，不收集手机号与真实姓名
          </p>
        </form>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-[#b09ec0]">
          想体验“主人 / 访客”两种视角？右上角随时可切换身份。
        </p>
      </div>
    </main>
  );
}
