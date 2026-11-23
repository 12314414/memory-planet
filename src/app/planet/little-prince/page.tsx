'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import Rose from '@/components/Rose';
import './little-prince.css';

/**
 * 小王子的星球：产品叙事里的固定 NPC 星球。
 * 有玫瑰、有狐狸、有可以点开的日落，以及和小王子的对话。
 * 场景（晚霞天空、起伏草甸、野花）全部由 CSS 渐变与内联 SVG 绘制。
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
      text: '有一天，我看了四十四次日落。人在难过的时候，就喜欢看日落。你也可以点一下中间的太阳，和我一起看一次日落。',
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

  const fieldRef = useRef<SVGGElement>(null);
  const flowersRef = useRef<SVGGElement>(null);
  const foregroundRef = useRef<SVGGElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);

  /** 草叶、野花、前景草丛与星星都用固定种子随机生成，保证每次渲染一致 */
  useEffect(() => {
    const NS = 'http://www.w3.org/2000/svg';
    const make = (name: string, attrs: Record<string, string | number>) => {
      const node = document.createElementNS(NS, name);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      return node;
    };
    let seed = 20261025;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const greens = ['#7f9a4a', '#93ad5c', '#68873e', '#a9bd6c', '#5d7a37'];
    const petals = ['#fff6ea', '#ffe2ee', '#ffd0dd', '#fff3cf', '#ffffff'];

    const field = fieldRef.current;
    const flowers = flowersRef.current;
    const foreground = foregroundRef.current;
    const stars = starsRef.current;
    if (!field || !flowers || !foreground || !stars) return;

    for (let i = 0; i < 200; i++) {
      const x = rnd() * 420;
      const y = 296 + rnd() * 124;
      const depth = (y - 296) / 124;
      const len = 4 + depth * 16 + rnd() * 5;
      const lean = (rnd() - 0.5) * 5;
      field.appendChild(
        make('path', {
          d: `M${x.toFixed(1)} ${y.toFixed(1)} q ${lean.toFixed(1)} ${(-len * 0.6).toFixed(1)} ${(lean * 1.7).toFixed(1)} ${(-len).toFixed(1)}`,
          stroke: greens[Math.floor(rnd() * greens.length)],
          'stroke-width': (0.7 + depth * 1.1).toFixed(2),
          'stroke-linecap': 'round',
          fill: 'none',
          opacity: (0.35 + depth * 0.45).toFixed(2),
        })
      );
    }

    for (let i = 0; i < 46; i++) {
      const fx = rnd() * 420;
      const fy = 302 + rnd() * 96;
      const scale = (fy - 302) / 96;
      const r = 1.1 + scale * 1.9;
      flowers.appendChild(
        make('circle', {
          cx: fx.toFixed(1),
          cy: fy.toFixed(1),
          r: r.toFixed(2),
          fill: petals[Math.floor(rnd() * petals.length)],
          opacity: (0.55 + scale * 0.4).toFixed(2),
        })
      );
      if (scale > 0.45) {
        flowers.appendChild(
          make('circle', {
            cx: (fx + r * 0.3).toFixed(1),
            cy: (fy + r * 0.3).toFixed(1),
            r: (r * 0.34).toFixed(2),
            fill: '#e9b45c',
            opacity: '0.8',
          })
        );
      }
    }

    for (let i = 0; i < 90; i++) {
      const gx = rnd() * 420;
      const len = 14 + rnd() * 26;
      const lean = (rnd() - 0.5) * 10;
      foreground.appendChild(
        make('path', {
          d: `M${gx.toFixed(1)} 420 q ${(lean * 0.5).toFixed(1)} ${(-len * 0.6).toFixed(1)} ${lean.toFixed(1)} ${(-len).toFixed(1)}`,
          stroke: greens[Math.floor(rnd() * greens.length)],
          'stroke-width': (1.6 + rnd() * 1.6).toFixed(2),
          'stroke-linecap': 'round',
          fill: 'none',
          opacity: '0.9',
        })
      );
    }

    for (let i = 0; i < 26; i++) {
      const star = document.createElement('i');
      star.style.left = `${(rnd() * 100).toFixed(1)}%`;
      star.style.top = `${(rnd() * 42).toFixed(1)}%`;
      star.style.animationDelay = `${(rnd() * 3).toFixed(2)}s`;
      stars.appendChild(star);
    }

    return () => {
      field.innerHTML = '';
      flowers.innerHTML = '';
      foreground.innerHTML = '';
      stars.innerHTML = '';
    };
  }, []);

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

  const toggleSunset = () => {
    setSunset((prev) => {
      const next = !prev;
      if (next) {
        setMessages((list) => [
          ...list,
          { speaker: '小王子', text: '有一天，我看了四十四次日落。人在难过的时候，就喜欢看日落。' },
        ]);
      }
      return next;
    });
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
          <section className="card scene-card">
            <div className={`lp-scene${sunset ? ' is-dusk' : ''}`}>
              <div className="lp-frame">
                <div className="lp-sky lp-sky-day" />
                <div className="lp-sky lp-sky-dusk" />
                <div className="lp-stars" ref={starsRef} />

                <div className="lp-cloud c1" />
                <div className="lp-cloud c2" />
                <div className="lp-cloud c3" />
                <div className="lp-cloud c4" />

                <button className="lp-sun-btn" onClick={toggleSunset} aria-label="看日落" title="看一次日落">
                  <div className="lp-sun" />
                </button>

                <svg className="lp-art" viewBox="0 0 420 420" aria-hidden="true">
                  <defs>
                    <filter id="lp-wc" x="-8%" y="-8%" width="116%" height="116%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="9" result="n" />
                      <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    <filter id="lp-soft" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3" />
                    </filter>
                    <linearGradient id="lp-mid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b6c47a" />
                      <stop offset="100%" stopColor="#7e9a4e" />
                    </linearGradient>
                    <linearGradient id="lp-near" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93ac5c" />
                      <stop offset="55%" stopColor="#6d8b43" />
                      <stop offset="100%" stopColor="#4f6b34" />
                    </linearGradient>
                    <radialGradient id="lp-sun-patch" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(255,214,146,.85)" />
                      <stop offset="60%" stopColor="rgba(255,198,120,.28)" />
                      <stop offset="100%" stopColor="rgba(255,198,120,0)" />
                    </radialGradient>
                    <linearGradient id="lp-haze" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255,240,214,0)" />
                      <stop offset="60%" stopColor="rgba(255,240,214,.55)" />
                      <stop offset="100%" stopColor="rgba(255,240,214,.15)" />
                    </linearGradient>
                    <linearGradient id="lp-wash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e8874f" stopOpacity="0" />
                      <stop offset="16%" stopColor="#e8874f" stopOpacity="1" />
                      <stop offset="100%" stopColor="#e8874f" stopOpacity="1" />
                    </linearGradient>
                  </defs>

                  {/* 远景雾带 */}
                  <rect x="0" y="236" width="420" height="70" fill="url(#lp-haze)" />

                  {/* 远山与树线 */}
                  <g filter="url(#lp-wc)">
                    <path
                      d="M0 272 Q 40 262 78 268 Q 112 258 148 266 Q 186 258 220 266 Q 258 258 296 266 Q 336 256 372 266 Q 398 262 420 268 L420 300 L0 300 Z"
                      fill="#8f9a5c"
                      opacity="0.72"
                    />
                    <path
                      d="M0 278 Q 50 270 96 276 Q 140 268 184 276 Q 230 268 274 276 Q 320 268 364 276 Q 396 272 420 278 L420 306 L0 306 Z"
                      fill="#78884c"
                      opacity="0.8"
                    />
                  </g>

                  {/* 中景草坡 */}
                  <g filter="url(#lp-wc)">
                    <path
                      d="M0 292 Q 58 278 116 288 Q 176 298 236 286 Q 296 274 356 286 Q 392 292 420 288 L420 420 L0 420 Z"
                      fill="url(#lp-mid)"
                    />
                  </g>
                  <ellipse cx="212" cy="300" rx="150" ry="30" fill="url(#lp-sun-patch)" opacity="0.55" />
                  <path
                    d="M0 300 Q 62 286 122 296 Q 182 306 244 294 Q 306 282 366 294 Q 394 299 420 296"
                    fill="none"
                    stroke="#e8dc9a"
                    strokeOpacity="0.5"
                    strokeWidth="2.4"
                    filter="url(#lp-soft)"
                  />

                  {/* 近景草甸 */}
                  <g filter="url(#lp-wc)">
                    <path
                      d="M0 330 Q 70 318 140 330 Q 210 342 280 328 Q 350 314 420 330 L420 420 L0 420 Z"
                      fill="url(#lp-near)"
                    />
                  </g>
                  <ellipse cx="196" cy="344" rx="170" ry="34" fill="url(#lp-sun-patch)" opacity="0.5" />

                  {/* 草叶与野花（脚本生成） */}
                  <g ref={fieldRef} />
                  <g ref={flowersRef} />

                  {/* 影子 */}
                  <g filter="url(#lp-soft)" opacity="0.5">
                    <ellipse cx="258" cy="340" rx="23" ry="5" fill="#3c4a22" />
                    <ellipse cx="180" cy="345" rx="13" ry="3.5" fill="#3c4a22" />
                    <ellipse cx="216" cy="350" rx="15" ry="3.5" fill="#3c4a22" />
                  </g>

                  {/* 小王子 */}
                  <g transform="translate(224,284) scale(.50)">
                    <path d="M76 54 Q98 46 118 32 Q132 22 144 25 Q137 34 126 41 Q104 55 84 59 Q79 60 76 54 Z" fill="#f3c24d" />
                    <path d="M80 52 Q100 46 118 35" stroke="#e0ad3c" strokeWidth="2" fill="none" opacity="0.5" />
                    <circle cx="42" cy="34" r="14" fill="#e9a938" />
                    <circle cx="82" cy="34" r="13" fill="#e9a938" />
                    <circle cx="62" cy="22" r="15" fill="#e9a938" />
                    <circle cx="46" cy="30" r="12" fill="#f6c95c" />
                    <circle cx="60" cy="20" r="13" fill="#f6c95c" />
                    <circle cx="76" cy="26" r="12" fill="#f6c95c" />
                    <circle cx="84" cy="38" r="10" fill="#f6c95c" />
                    <circle cx="40" cy="42" r="9" fill="#f6c95c" />
                    <circle cx="58" cy="26" r="6" fill="#ffd971" opacity="0.85" />
                    <circle cx="46" cy="36" r="5" fill="#ffd971" opacity="0.7" />
                    <ellipse cx="62" cy="46" rx="17" ry="15" fill="#ffe9d0" />
                    <path d="M46 38 Q52 30 58 34 Q54 38 46 38 Z" fill="#f6c95c" />
                    <circle cx="55" cy="46" r="2.2" fill="#3d2c4a" />
                    <circle cx="69" cy="46" r="2.2" fill="#3d2c4a" />
                    <circle cx="51" cy="52" r="3.2" fill="#f7b8a0" opacity="0.75" />
                    <circle cx="73" cy="52" r="3.2" fill="#f7b8a0" opacity="0.75" />
                    <path d="M58 55 Q62 58 66 55" stroke="#c07a5a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                    <path d="M50 60 Q62 66 74 60 L78 66 Q62 74 46 66 Z" fill="#f3c24d" />
                    <path d="M52 64 Q48 80 54 92 L90 92 Q94 78 88 64 Q72 58 52 64 Z" fill="#5aa86a" />
                    <rect x="52" y="78" width="38" height="5" rx="2.5" fill="#e8bd6a" />
                    <path d="M50 92 Q62 100 92 92 Q94 98 88 100 L56 100 Q50 98 50 92 Z" fill="#4f9a60" />
                    <ellipse cx="54" cy="101" rx="7" ry="4" fill="#5b4636" />
                    <ellipse cx="88" cy="101" rx="7" ry="4" fill="#5b4636" />
                    <path d="M56 70 Q58 78 64 82" stroke="#4f9a60" strokeWidth="5" fill="none" strokeLinecap="round" />
                    <path d="M86 70 Q82 78 74 82" stroke="#4f9a60" strokeWidth="5" fill="none" strokeLinecap="round" />
                    <circle cx="64" cy="82" r="3.4" fill="#ffe9d0" />
                    <circle cx="74" cy="82" r="3.4" fill="#ffe9d0" />
                    <path d="M69 82 L69 90" stroke="#5b9a46" strokeWidth="2" fill="none" />
                    <circle cx="69" cy="78" r="6" fill="#e84a68" />
                    <circle cx="69" cy="78" r="3.6" fill="#f47f92" />
                    <path d="M65 75 Q67 72 70 73" stroke="#ffd7e0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  </g>

                  {/* 玫瑰 */}
                  <g transform="translate(155,293) scale(.42)">
                    <path d="M60 112 Q58 90 60 78" stroke="#5b9a46" strokeWidth="3.5" fill="none" />
                    <path d="M52 98 Q44 92 46 84 Q54 86 54 96 Z" fill="#6fae52" />
                    <path d="M68 92 Q76 86 74 78 Q66 80 66 90 Z" fill="#6fae52" />
                    <ellipse cx="60" cy="58" rx="17" ry="13" fill="#f47f92" />
                    <ellipse cx="60" cy="52" rx="11" ry="9" fill="#f0617c" />
                    <ellipse cx="60" cy="48" rx="7" ry="6" fill="#e84a68" />
                    <path d="M48 50 Q44 42 52 42 Q50 48 48 50 Z" fill="#ffd7e0" />
                    <path d="M72 50 Q76 42 68 42 Q70 48 72 50 Z" fill="#ffd7e0" />
                    <circle cx="60" cy="48" r="2.5" fill="#f7c86b" />
                    <ellipse cx="60" cy="112" rx="16" ry="4" fill="rgba(120,90,60,0.25)" />
                  </g>

                  {/* 狐狸 */}
                  <g transform="translate(191,314) scale(.40)">
                    <path d="M84 74 Q104 72 108 56 Q110 44 100 40 Q104 52 96 60 Q88 68 78 70 Z" fill="#e88b4a" />
                    <path d="M100 44 Q104 48 100 56 Q96 62 90 64 Q98 58 100 44 Z" fill="#fff6ea" />
                    <path d="M40 76 Q38 60 52 56 L72 56 Q88 60 86 76 Q64 84 40 76 Z" fill="#e88b4a" />
                    <ellipse cx="63" cy="72" rx="14" ry="9" fill="#fff6ea" />
                    <path d="M44 34 L40 16 L56 26 Z" fill="#e88b4a" />
                    <path d="M46 30 L44 22 L52 27 Z" fill="#4a3855" />
                    <path d="M76 34 L80 16 L64 26 Z" fill="#e88b4a" />
                    <path d="M74 30 L76 22 L68 27 Z" fill="#4a3855" />
                    <ellipse cx="60" cy="42" rx="20" ry="17" fill="#e88b4a" />
                    <ellipse cx="60" cy="50" rx="12" ry="8" fill="#fff6ea" />
                    <path d="M50 40 Q54 37 58 40" stroke="#4a3855" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M64 40 Q68 37 72 40" stroke="#4a3855" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <circle cx="60" cy="48" r="2.4" fill="#4a3855" />
                    <path d="M56 53 Q60 56 64 53" stroke="#c97a4a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                    <ellipse cx="52" cy="80" rx="5" ry="3" fill="#fff6ea" />
                    <ellipse cx="74" cy="80" rx="5" ry="3" fill="#fff6ea" />
                  </g>

                  {/* 前景草丛 */}
                  <g ref={foregroundRef} />

                  {/* 黄昏暖色滤镜 */}
                  <rect className="dusk-wash" x="0" y="228" width="420" height="192" fill="url(#lp-wash)" />
                </svg>

                <div className="lp-grain" />
                <p className="lp-sun-hint">
                  {sunset ? <b>第四十四次日落 ✧</b> : <b>☀️ 点太阳看日落</b>}
                </p>
              </div>
            </div>
            <p className="lp-caption">「你在你的玫瑰身上花费的时间，让你的玫瑰变得如此重要」</p>
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
