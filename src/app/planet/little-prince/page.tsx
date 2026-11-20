'use client';

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import Rose from '@/components/Rose';

/**
 * 小王子的星球：产品叙事里的固定 NPC 星球。
 * 有玫瑰、有看日落的椅子、有和小王子的对话。
 * 这是一个独立页面（非用户创建的星球），点击星图里的「小王子的星球」进入。
 */

type Message = {
  speaker: 'me' | '小王子' | '玫瑰';
  text: string;
};

const OPENING: Message = {
  speaker: '小王子',
  text: '你好呀，欢迎来到 B-612。这是我的星球，很小，但很温暖。你可以和我说说话，或问问这朵玫瑰。',
};

/** 小王子的简单回复（关键词匹配，AI 之外的前端兜底） */
function littlePrinceReply(input: string): Message {
  const q = input.trim();
  if (!q) return { speaker: '小王子', text: '你想和我说点什么吗？' };
  if (/玫瑰|花/.test(q)) {
    return {
      speaker: '小王子',
      text: '这朵玫瑰是我每天浇水、除毛毛虫、给她挡风的那一朵。你在她身上花的时间，才让她变得珍贵。',
    };
  }
  if (/日落|夕阳|黄昏|难过|伤心/.test(q)) {
    return {
      speaker: '小王子',
      text: '有一天，我看了四十四次日落。人在难过的时候，就喜欢看日落。你也可以点一下左边的太阳，和我一起看一次日落。',
    };
  }
  if (/狐狸|驯服|朋友/.test(q)) {
    return {
      speaker: '小王子',
      text: '狐狸说过，如果你驯服了我，我们就会彼此需要。对我来说，你就是世界上独一无二的了。',
    };
  }
  if (/毛孩子|宠物|猫|狗|想它|想念/.test(q)) {
    return {
      speaker: '小王子',
      text: '你想念的那个小家伙，一定也变成了天上的一颗星星。把它带到这片星空来吧，这里永远有一盏灯为它亮着。',
    };
  }
  if (/你是谁|名字|哪里来/.test(q)) {
    return { speaker: '小王子', text: '我是小王子，来自一颗很小的星球 B-612。很高兴认识你。' };
  }
  if (/星球|星空|宇宙|星星/.test(q)) {
    return {
      speaker: '小王子',
      text: '这片星空里有很多星球，每一颗都住着一个被爱着的生命。你的那颗，也是最亮的一颗。',
    };
  }
  return {
    speaker: '小王子',
    text: '真正重要的东西，用眼睛是看不见的，要用心去看。谢谢你愿意和我说这些。',
  };
}

export default function LittlePrincePlanetPage() {
  const [sunset, setSunset] = useState(false);
  const [messages, setMessages] = useState<Message[]>([OPENING]);
  const [input, setInput] = useState('');
  const [replying, setReplying] = useState(false);

  const send = () => {
    const value = input.trim();
    if (!value || replying) return;
    setMessages((prev) => [...prev, { speaker: 'me', text: value }]);
    setInput('');
    setReplying(true);
    // 模拟小王子思考后回复
    window.setTimeout(() => {
      setMessages((prev) => [...prev, littlePrinceReply(value)]);
      setReplying(false);
    }, 700);
  };

  return (
    <>
      <SiteHeader />
      <main className="wrap pb-20 pt-8">
        {/* 顶部标题 */}
        <div className="mb-6 text-center">
          <p className="eyebrow">THE LITTLE PRINCE · B-612</p>
          <h1 className="title mt-2 text-3xl sm:text-4xl">小王子的星球</h1>
          <p className="muted mt-3 text-sm">这是一颗关于「驯服」与「独一无二」的星球。</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* 星球场景 */}
          <section className="card relative overflow-hidden px-4 pb-14 pt-8">
            <div className="relative mx-auto aspect-square w-full max-w-[420px]">
              {/* 星球球体 */}
              <div
                className="absolute inset-[8%] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 32% 26%, #fffdf6 0%, #fbe7c8 24%, #ecc58f 50%, #d9a06b 72%, #b8794e 100%)',
                  boxShadow:
                    '0 30px 60px -20px rgba(90,52,30,0.5), inset -18px -22px 40px rgba(90,52,30,0.32)',
                }}
              />
              {/* 草地 */}
              <div
                className="absolute bottom-[6%] left-[4%] h-[46%] w-[92%]"
                style={{
                  borderRadius: '50% 50% 0 0',
                  background: 'linear-gradient(180deg, #c8e59a 0%, #8cc060 55%, #66a64a 100%)',
                  boxShadow: 'inset 0 12px 20px rgba(255,255,255,0.3)',
                }}
              />
              {/* 玫瑰（在星球上） */}
              <div className="absolute bottom-[30%] left-[24%]" style={{ transform: 'scale(0.7)' }}>
                <Rose size={110} floating={false} />
              </div>
              {/* 小王子（坐在星球上看日落，面朝西边） */}
              <div className="absolute bottom-[6%] right-[14%]" style={{ transform: 'scale(0.62)', transformOrigin: 'bottom center' }}>
                <LittlePrinceSitting />
              </div>
              {/* 日落：太阳从东边升起、在西边落下。默认在西边地平线附近 */}
              <button
                onClick={() => setSunset((v) => !v)}
                className="absolute left-[14%] top-[22%] cursor-pointer"
                aria-label="看日落"
                title="看一次日落"
              >
                <div
                  className="h-12 w-12 rounded-full transition-all duration-[1500ms] ease-in"
                  style={{
                    background: sunset
                      ? 'radial-gradient(circle at 50% 60%, #ffb06b 0%, #f07a50 45%, #d84e3a 100%)'
                      : 'radial-gradient(circle at 50% 50%, #fff6d8 0%, #ffe8a8 55%, #f7d98a 100%)',
                    boxShadow: sunset ? '0 0 44px rgba(240,120,80,0.85)' : '0 0 30px rgba(255,232,168,0.6)',
                    transform: sunset ? 'translate(30px, 90px)' : 'none',
                  }}
                />
              </button>
              <p className="absolute left-[6%] top-[44%] text-[11px] text-[#a07a5a]">
                {sunset ? '西边的日落' : '☀️ 点我看日落'}
              </p>
            </div>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-[#a596b0]">
              小王子 · 玫瑰 · 日落
            </p>
          </section>

          {/* 聊天区 */}
          <section className="card flex flex-col p-6">
            <p className="eyebrow">CHAT</p>
            <h2 className="title mt-1.5 text-xl">和星球里的朋友聊聊</h2>

            {/* 消息列表 */}
            <div className="mt-4 flex max-h-[360px] min-h-[260px] flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {messages.map((msg, index) => {
                const mine = msg.speaker === 'me';
                return (
                  <div key={index} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                    {!mine && (
                      <div className="h-9 w-9 shrink-0">
                        {msg.speaker === '玫瑰' ? (
                          <div className="h-full w-full overflow-hidden rounded-full bg-white/60">
                            <Rose size={36} floating={false} />
                          </div>
                        ) : (
                          <LittlePrinceAvatar />
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-7 ${
                        mine
                          ? 'rounded-br-sm bg-[#f7e9c8] text-[#6a4a30]'
                          : 'rounded-bl-sm bg-[#f5f2ff] text-[#57465f]'
                      }`}
                    >
                      {!mine && <p className="text-[10px] font-medium text-[#a07ac0]">{msg.speaker}</p>}
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              {replying && (
                <div className="flex items-end gap-2">
                  <div className="h-9 w-9 shrink-0">
                    <LittlePrinceAvatar />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-[#f5f2ff] px-4 py-3 text-sm text-[#a596b0]">
                    正在想…
                  </div>
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div className="mt-4 flex gap-2 border-t border-[#eee6f5] pt-4">
              <input
                className="field flex-1"
                placeholder="和他说点什么…"
                value={input}
                maxLength={100}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) send();
                }}
              />
              <button onClick={send} disabled={!input.trim() || replying} className="btn btn-primary shrink-0">
                发送
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link href="/star-map" className="btn btn-ghost btn-sm">
                ← 回到星图
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

/** 小王子头像（圆形） */
function LittlePrinceAvatar() {
  return (
    <div className="h-full w-full overflow-hidden rounded-full bg-[#ffe9d0]">
      <svg viewBox="0 0 120 150" width="100%" height="100%">
        <ellipse cx="60" cy="40" rx="24" ry="20" fill="#f6c95c" />
        <ellipse cx="60" cy="52" rx="20" ry="19" fill="#ffe9d0" />
        <circle cx="53" cy="50" r="2.5" fill="#3d2c4a" />
        <circle cx="67" cy="50" r="2.5" fill="#3d2c4a" />
        <circle cx="49" cy="58" r="3" fill="#f7b8a0" opacity="0.7" />
        <circle cx="71" cy="58" r="3" fill="#f7b8a0" opacity="0.7" />
        <path d="M55 62 Q60 66 65 62" stroke="#c07a5a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M46 64 Q60 70 74 64 L78 72 Q60 80 42 72 Z" fill="#f3c24d" />
        <path d="M46 66 Q46 84 42 104 L78 104 Q74 84 74 66 Q60 76 46 66 Z" fill="#5aa86a" />
      </svg>
    </div>
  );
}

/** 坐着的小王子（看日落姿态） */
function LittlePrinceSitting() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%">
      <ellipse cx="60" cy="34" rx="22" ry="19" fill="#f6c95c" />
      <ellipse cx="60" cy="44" rx="18" ry="16" fill="#ffe9d0" />
      <circle cx="54" cy="43" r="2" fill="#3d2c4a" />
      <circle cx="66" cy="43" r="2" fill="#3d2c4a" />
      <path d="M56 52 Q60 55 64 52" stroke="#c07a5a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M46 54 Q60 60 74 54 L78 62 Q60 70 42 62 Z" fill="#f3c24d" />
      <path d="M44 84 Q40 88 46 88 L58 88 L58 62 L74 62 L74 88 L86 88 Q92 88 88 84" fill="#5aa86a" />
      <path d="M50 60 Q44 66 42 74" stroke="#5aa86a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="42" cy="76" r="3" fill="#ffe9d0" />
      <path d="M70 60 Q76 66 78 74" stroke="#5aa86a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="78" cy="76" r="3" fill="#ffe9d0" />
      <path d="M48 88 L54 88 L54 100 Q54 104 50 104 L48 104 Z" fill="#5b4636" />
      <path d="M66 88 L72 88 L72 100 Q72 104 68 104 L66 104 Z" fill="#5b4636" />
    </svg>
  );
}
