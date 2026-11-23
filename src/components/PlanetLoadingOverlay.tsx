'use client';

/**
 * PlanetLoadingOverlay —— 「生成虚拟形象」的水彩星球加载仪式
 *
 * 设计原则：接口与动画"都完成"才调用 onFinish，揭晓结果。
 * - active: true 时播放完整仪式（照片飞入 → 扫描 → 星化 → 小猫沿星环走来留爪印）
 * - photoUrl: 当前照片（dataURL / URL），星球会染上照片主色
 * - task: 真实生成接口的 Promise（'ok' | 'fail'）。动画先走完就等接口，接口先返回就等动画
 * - onFinish: 动画被跳过或两者都完成时回调；outcome 为 'ok' | 'fail' | 'skip'
 */

import { useEffect, useRef, useState } from 'react';
import './planet-loading-overlay.css';

export type LoadingOutcome = 'ok' | 'fail' | 'skip';

type PlanetLoadingOverlayProps = {
  active: boolean;
  photoUrl: string | null;
  task: Promise<'ok' | 'fail'> | null;
  onFinish: (outcome: LoadingOutcome) => void;
};

type Tint = { h: number; s: number; l: number };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const prefersReduce = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ringPoint(deg: number, lift: number) {
  const a = (deg * Math.PI) / 180;
  const x = 188 * Math.cos(a);
  const y = 56 * Math.sin(a);
  const r = (-17 * Math.PI) / 180;
  return {
    x: 210 + x * Math.cos(r) - y * Math.sin(r),
    y: 210 + x * Math.sin(r) + y * Math.cos(r) - lift,
  };
}

function rgb2hsl(r: number, g: number, b: number): Tint {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function sampleTint(img: HTMLImageElement): Tint | null {
  try {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const g = c.getContext('2d');
    if (!g) return null;
    g.drawImage(img, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data;
    let r = 0;
    let gg = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const t = rgb2hsl(d[i], d[i + 1], d[i + 2]);
      if (t.l < 0.14 || t.l > 0.92 || t.s < 0.08) continue;
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
      n += 1;
    }
    if (!n) return null;
    return rgb2hsl(r / n, gg / n, b / n);
  } catch {
    return null;
  }
}

const hslStr = (h: number, s: number, l: number) =>
  `hsl(${(((h % 360) + 360) % 360).toFixed(1)},${(s * 100).toFixed(1)}%,${(l * 100).toFixed(1)}%)`;

/** 默认占位插画：没有照片时显示 */
function CatIllustration() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="pamBgc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdeade" />
          <stop offset="100%" stopColor="#f9d5c0" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#pamBgc)" />
      <circle cx="26" cy="18" r="24" fill="#fff" opacity=".25" />
      <path d="M74 84 q16 -8 11 -24" stroke="#f2b184" strokeWidth="8" fill="none" strokeLinecap="round" />
      <ellipse cx="48" cy="78" rx="27" ry="19" fill="#f9c79b" />
      <path d="M30 34 l-4 -15 l15 8 z" fill="#f9c79b" />
      <path d="M66 34 l4 -15 l-15 8 z" fill="#f9c79b" />
      <path d="M32 32 l-2.5 -9 l9 4.8 z" fill="#f5a9b8" />
      <path d="M64 32 l2.5 -9 l-9 4.8 z" fill="#f5a9b8" />
      <circle cx="48" cy="47" r="23" fill="#fbd2aa" />
      <path d="M35 44 q4.5 5 9 0" stroke="#6b4a3a" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <path d="M52 44 q4.5 5 9 0" stroke="#6b4a3a" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <ellipse cx="48" cy="53" rx="3.1" ry="2.3" fill="#e08a86" />
      <ellipse cx="30" cy="53" rx="5" ry="3" fill="#f7a7b6" opacity=".55" />
      <ellipse cx="66" cy="53" rx="5" ry="3" fill="#f7a7b6" opacity=".55" />
      <path d="M19 48 h10 M19 54 h10 M67 48 h10 M67 54 h10" stroke="#e3ae86" strokeWidth="1.3" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

const PALETTE = [
  'rgba(243,207,122,ALPHA)',
  'rgba(249,190,212,ALPHA)',
  'rgba(206,175,235,ALPHA)',
  'rgba(255,249,224,ALPHA)',
];

type Particle = {
  t0: number;
  delay: number;
  dur: number;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  r: number;
  alpha: number;
  glow: boolean;
  color: string;
};

export default function PlanetLoadingOverlay({
  active,
  photoUrl,
  task,
  onFinish,
}: PlanetLoadingOverlayProps) {
  const [shown, setShown] = useState(false);
  const [on, setOn] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const starsRef = useRef<HTMLCanvasElement | null>(null);
  const fxRef = useRef<HTMLCanvasElement | null>(null);
  const photoRef = useRef<HTMLDivElement | null>(null);
  const scanRef = useRef<HTMLDivElement | null>(null);
  const cornersRef = useRef<HTMLDivElement | null>(null);
  const capRef = useRef<HTMLParagraphElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const arcRef = useRef<SVGEllipseElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const bloomRef = useRef<SVGGElement | null>(null);
  const catRef = useRef<SVGGElement | null>(null);
  const seedRef = useRef<SVGGElement | null>(null);
  const pawsRef = useRef<SVGGElement | null>(null);
  const t1 = useRef<SVGStopElement | null>(null);
  const t2 = useRef<SVGStopElement | null>(null);
  const t3 = useRef<SVGStopElement | null>(null);
  const t4 = useRef<SVGStopElement | null>(null);
  const stepRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const genRef = useRef(0);
  const lenRef = useRef(0);
  const pointerRef = useRef({ x: -999, y: -999 });
  const partsRef = useRef<Particle[]>([]);
  const tintRef = useRef<Tint | null>(null);
  const titleTimerRef = useRef(0);
  const skipTimerRef = useRef(0);
  const finishRef = useRef(onFinish);
  const taskRef = useRef(task);
  const photoUrlRef = useRef(photoUrl);
  const NS = 'http://www.w3.org/2000/svg';

  finishRef.current = onFinish;
  taskRef.current = task;
  photoUrlRef.current = photoUrl;

  /* ---------- 照片主色采样 ---------- */
  useEffect(() => {
    if (!photoUrl) {
      tintRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      tintRef.current = sampleTint(img);
    };
    img.src = photoUrl;
  }, [photoUrl]);

  /* ---------- 染色 ---------- */
  function applyTint(t: Tint | null) {
    const h = t ? t.h : 20;
    const s = t ? Math.min(0.62, Math.max(0.24, t.s)) : 0.45;
    t1.current?.setAttribute('stop-color', hslStr(h + 6, s * 0.62, 0.83));
    t2.current?.setAttribute('stop-color', hslStr(h + 168, s * 0.34, 0.88));
    t3.current?.setAttribute('stop-color', hslStr(h + 42, s * 0.5, 0.79));
    t4.current?.setAttribute('stop-color', hslStr(h - 12, s * 0.66, 0.86));
  }

  /* ---------- 粒子 ---------- */
  function burstParticles(rect: DOMRect, tx: number, ty: number, count: number) {
    const now = performance.now();
    for (let i = 0; i < count; i += 1) {
      const sx = rect.left + Math.random() * rect.width;
      const sy = rect.top + Math.random() * rect.height;
      partsRef.current.push({
        t0: now,
        delay: Math.random() * 380,
        dur: 1100 + Math.random() * 900,
        sx,
        sy,
        cx: (sx + tx) / 2 + (Math.random() - 0.5) * 200,
        cy: Math.min(sy, ty) - 40 - Math.random() * 160,
        tx: tx + (Math.random() - 0.5) * 70,
        ty: ty + (Math.random() - 0.5) * 70,
        r: 1 + Math.random() * 2.2,
        alpha: 0.5 + Math.random() * 0.45,
        glow: Math.random() > 0.6,
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
      });
    }
  }

  function puffAt(x: number, y: number, count: number) {
    const now = performance.now();
    for (let i = 0; i < count; i += 1) {
      const ang = Math.random() * 6.2832;
      const dist = 24 + Math.random() * 70;
      partsRef.current.push({
        t0: now,
        delay: Math.random() * 140,
        dur: 720 + Math.random() * 520,
        sx: x,
        sy: y,
        cx: x + Math.cos(ang) * dist * 0.55,
        cy: y + Math.sin(ang) * dist * 0.55 - 22,
        tx: x + Math.cos(ang) * dist,
        ty: y + Math.sin(ang) * dist,
        r: 0.9 + Math.random() * 1.9,
        alpha: 0.72,
        glow: true,
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
      });
    }
  }

  /* ---------- canvas 星尘 + 粒子 + 指针 ---------- */
  useEffect(() => {
    if (!shown) return;
    const starsCv = starsRef.current;
    const fxCv = fxRef.current;
    if (!starsCv || !fxCv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;
    let stars: Array<{ x: number; y: number; r: number; a: number; ph: number; sp: number; vy: number }> = [];
    const sctx = starsCv.getContext('2d');
    const fctx = fxCv.getContext('2d');
    if (!sctx || !fctx) return;

    const size = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      [starsCv, fxCv].forEach((cv) => {
        cv.width = Math.floor(W * dpr);
        cv.height = Math.floor(H * dpr);
        cv.style.width = `${W}px`;
        cv.style.height = `${H}px`;
      });
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      const n = Math.round((W * H) / 26000);
      for (let i = 0; i < n; i += 1) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.5 + Math.random() * 1.1,
          a: 0.12 + Math.random() * 0.3,
          ph: Math.random() * 6.28,
          sp: 0.35 + Math.random() * 0.8,
          vy: 0.015 + Math.random() * 0.05,
        });
      }
    };
    size();
    window.addEventListener('resize', size);

    let raf1 = 0;
    let raf2 = 0;
    let running = true;

    const starLoop = (now: number) => {
      if (!running) return;
      if (overlayRef.current?.classList.contains('pam-on')) {
        const t = now / 1000;
        sctx.clearRect(0, 0, W, H);
        for (let i = 0; i < stars.length; i += 1) {
          const s = stars[i];
          const a = s.a * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
          const dx = s.x - pointerRef.current.x;
          const dy = s.y - pointerRef.current.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 16000 && d2 > 60) {
            const f = (1 - d2 / 16000) * 0.9;
            s.x -= dx * f * 0.012;
            s.y -= dy * f * 0.012;
          }
          sctx.beginPath();
          sctx.arc(s.x, s.y, s.r, 0, 6.2832);
          sctx.fillStyle = `rgba(214,178,150,${a.toFixed(3)})`;
          sctx.fill();
          s.y -= s.vy;
          if (s.y < -4) {
            s.y = H + 4;
            s.x = Math.random() * W;
          }
        }
      }
      raf1 = requestAnimationFrame(starLoop);
    };

    const fxLoop = () => {
      if (!running) return;
      if (overlayRef.current?.classList.contains('pam-on')) {
        fctx.clearRect(0, 0, W, H);
        const now = performance.now();
        const parts = partsRef.current;
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          const lt = (now - p.t0 - p.delay) / p.dur;
          if (lt < 0) continue;
          if (lt >= 1) {
            parts.splice(i, 1);
            continue;
          }
          const e = lt < 0.5 ? 2 * lt * lt : 1 - (-2 * lt + 2) ** 2 / 2;
          const mt = 1 - e;
          const x = mt * mt * p.sx + 2 * mt * e * p.cx + e * e * p.tx;
          const y = mt * mt * p.sy + 2 * mt * e * p.cy + e * e * p.ty;
          const fade = lt < 0.12 ? lt / 0.12 : lt > 0.8 ? (1 - lt) / 0.2 : 1;
          const r = p.r * (0.5 + 0.5 * fade);
          fctx.beginPath();
          fctx.arc(x, y, r, 0, 6.2832);
          fctx.fillStyle = p.color.replace('ALPHA', (fade * p.alpha).toFixed(3));
          fctx.fill();
          if (p.glow) {
            fctx.beginPath();
            fctx.arc(x, y, r * 3.4, 0, 6.2832);
            fctx.fillStyle = p.color.replace('ALPHA', (fade * 0.14).toFixed(3));
            fctx.fill();
          }
        }
      }
      raf2 = requestAnimationFrame(fxLoop);
    };

    raf1 = requestAnimationFrame(starLoop);
    raf2 = requestAnimationFrame(fxLoop);

    const onMove = (e: MouseEvent) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      if (!overlayRef.current?.classList.contains('pam-on')) return;
      const cat = catRef.current;
      const head = cat?.querySelector('.pam-head');
      if (!cat || !head || !cat.classList.contains('pam-pop')) return;
      const b = cat.getBoundingClientRect();
      if (!b.width) return;
      const dx = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / 170));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / 170));
      (head as HTMLElement).style.transform = `translate(${(dx * 1.6).toFixed(2)}px,${(dy * 1.2).toFixed(2)}px) rotate(${(dx * 5).toFixed(1)}deg)`;
    };
    window.addEventListener('mousemove', onMove);

    return () => {
      running = false;
      window.removeEventListener('resize', size);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [shown]);

  /* ---------- 星环进度线初始化 ---------- */
  useEffect(() => {
    if (!shown) return;
    const arc = arcRef.current;
    if (!arc) return;
    let len = 0;
    try {
      len = arc.getTotalLength();
    } catch {
      len = 2 * Math.PI * Math.sqrt((188 * 188 + 56 * 56) / 2);
    }
    lenRef.current = len;
    arc.style.strokeDasharray = String(len);
    arc.style.strokeDashoffset = String(len);
  }, [shown]);

  /* ---------- active 挂载/卸载 + 播放 ---------- */
  useEffect(() => {
    if (active) {
      setShown(true);
      const raf = requestAnimationFrame(() => setOn(true));
      skipTimerRef.current = window.setTimeout(() => setShowSkip(true), 1200);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(skipTimerRef.current);
      };
    }
    if (shown) {
      setOn(false);
      setShowSkip(false);
      const timer = setTimeout(() => setShown(false), 420);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active || !shown) return;
    let cancelled = false;
    runPlay();
    return () => {
      cancelled = true;
      genRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, shown]);

  /* ---------- 文案 / 步骤 / 进度 ---------- */
  function setCapText(text: string) {
    const cap = capRef.current;
    if (!cap) return;
    cap.classList.add('pam-swap');
    setTimeout(() => {
      cap.textContent = text;
      cap.classList.remove('pam-swap');
    }, 250);
  }

  function setTitleText(t: string, s: string) {
    titleRef.current?.classList.add('pam-fade');
    subRef.current?.classList.add('pam-fade');
    clearTimeout(titleTimerRef.current);
    titleTimerRef.current = window.setTimeout(() => {
      if (titleRef.current) titleRef.current.textContent = t;
      if (subRef.current) subRef.current.textContent = s;
      titleRef.current?.classList.remove('pam-fade');
      subRef.current?.classList.remove('pam-fade');
    }, 240);
  }

  function setStep(i: number) {
    stepRefs.current.forEach((el, k) => {
      if (!el) return;
      el.classList.remove('pam-active', 'pam-done');
      if (k < i) el.classList.add('pam-done');
      if (k === i) el.classList.add('pam-active');
    });
  }

  function setProgress(p: number, dur: number) {
    const arc = arcRef.current;
    if (!arc) return;
    arc.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.25,.85,.3,1)`;
    arc.style.strokeDashoffset = String(lenRef.current * (1 - p));
  }

  /* ---------- 舞台坐标 ---------- */
  function toStage(px: number, py: number) {
    const b = orbRef.current?.getBoundingClientRect();
    if (!b) return { x: 0, y: 0 };
    const s = b.width / 420;
    return { x: b.left + px * s, y: b.top + py * s };
  }

  function centerStage() {
    const b = orbRef.current?.getBoundingClientRect();
    if (!b) return { x: 0, y: 0 };
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }

  /* ---------- 爪印 ---------- */
  function stampPaw(deg: number) {
    const paws = pawsRef.current;
    if (!paws) return;
    const p = ringPoint(deg, 3);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'pam-paw');
    g.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
    const pad = document.createElementNS(NS, 'ellipse');
    pad.setAttribute('rx', '2.6');
    pad.setAttribute('ry', '2.1');
    pad.setAttribute('fill', '#e9bd63');
    pad.setAttribute('opacity', '.8');
    g.appendChild(pad);
    for (let i = -1; i <= 1; i += 1) {
      const toe = document.createElementNS(NS, 'circle');
      toe.setAttribute('cx', String(i * 2.2));
      toe.setAttribute('cy', '-2.6');
      toe.setAttribute('r', '.95');
      toe.setAttribute('fill', '#f2c473');
      toe.setAttribute('opacity', '.75');
      g.appendChild(toe);
    }
    paws.appendChild(g);
  }

  /* ---------- 猫走星环 ---------- */
  function walkRing(fromDeg: number, toDeg: number, dur: number) {
    return new Promise<void>((res) => {
      const t0 = performance.now();
      let lastPaw = -999;
      const frame = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        const deg = fromDeg + (toDeg - fromDeg) * e;
        const p = ringPoint(deg, 4);
        const bobY = Math.sin(k * Math.PI * 13) * 1.2;
        catRef.current?.setAttribute(
          'transform',
          `translate(${p.x.toFixed(2)} ${(p.y + bobY).toFixed(2)})`,
        );
        if (now - lastPaw > 105) {
          lastPaw = now;
          stampPaw(deg + 3.5);
        }
        if (k < 1) requestAnimationFrame(frame);
        else res();
      };
      requestAnimationFrame(frame);
    });
  }

  /* ---------- 照片星化飞行 ---------- */
  function seedFly(fromEl: HTMLElement, to: { x: number; y: number }, dur: number) {
    return new Promise<void>((res) => {
      const orb = orbRef.current;
      if (!orb) {
        res();
        return;
      }
      const b = orb.getBoundingClientRect();
      const s = b.width / 420;
      const fb = fromEl.getBoundingClientRect();
      const sx = (fb.left + fb.width / 2 - b.left) / s;
      const sy = (fb.top + fb.height / 2 - b.top) / s;
      const cx = (sx + to.x) / 2 - 46;
      const cy = Math.min(sy, to.y) - 78;
      const seed = seedRef.current;
      seed?.setAttribute('opacity', '1');
      const t0 = performance.now();
      const frame = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        const mt = 1 - e;
        const x = mt * mt * sx + 2 * mt * e * cx + e * e * to.x;
        const y = mt * mt * sy + 2 * mt * e * cy + e * e * to.y;
        seed?.setAttribute(
          'transform',
          `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(k * 220).toFixed(0)}) scale(${(1.05 - 0.3 * k).toFixed(2)})`,
        );
        if (k < 1) requestAnimationFrame(frame);
        else res();
      };
      requestAnimationFrame(frame);
    });
  }

  /* ---------- 编排 ---------- */
  function resetState() {
    partsRef.current.length = 0;
    clearTimeout(titleTimerRef.current);
    const photo = photoRef.current;
    photo?.classList.remove('pam-in', 'pam-starify', 'pam-wobble');
    if (photo) photo.style.transform = '';
    scanRef.current?.classList.remove('pam-on');
    cornersRef.current?.classList.remove('pam-on');
    bloomRef.current?.classList.remove('pam-go');
    statusRef.current?.classList.remove('pam-hide');
    catRef.current?.classList.remove('pam-pop');
    catRef.current?.setAttribute('transform', 'translate(90 250)');
    seedRef.current?.setAttribute('opacity', '0');
    seedRef.current?.removeAttribute('transform');
    if (pawsRef.current) pawsRef.current.innerHTML = '';
    titleRef.current?.classList.remove('pam-fade');
    subRef.current?.classList.remove('pam-fade');
    if (titleRef.current) titleRef.current.textContent = '正在接它上星球…';
    if (subRef.current) subRef.current.textContent = '你的虚拟形象，正在从照片里醒来';
    if (capRef.current) {
      capRef.current.textContent = '照片已经出发了';
      capRef.current.classList.remove('pam-swap');
    }
    const arc = arcRef.current;
    if (arc) {
      arc.style.transition = 'none';
      arc.style.strokeDashoffset = String(lenRef.current);
    }
    applyTint(tintRef.current);
    setStep(1);
  }

  async function runPlay() {
    const my = genRef.current + 1;
    genRef.current = my;
    const guard = () => {
      if (genRef.current !== my) throw new Error('stale');
    };
    const R = prefersReduce();
    resetState();
    try {
      await wait(R ? 150 : 380); guard();
      photoRef.current?.classList.add('pam-in');
      await wait(R ? 350 : 860); guard();

      setCapText('正在认出它是谁…');
      scanRef.current?.classList.add('pam-on');
      cornersRef.current?.classList.add('pam-on');
      setProgress(0.3, 1500);
      await wait(R ? 450 : 800); guard();
      photoRef.current?.classList.add('pam-wobble');
      await wait(R ? 350 : 820); guard();

      setStep(2);
      setCapText('翻到了：一只橘猫，尾巴圆圆的');
      cornersRef.current?.classList.remove('pam-on');
      scanRef.current?.classList.remove('pam-on');
      setProgress(0.62, 1300);
      setTitleText('正在认领这颗星球', '你的星球染上了它的颜色');
      await wait(R ? 260 : 620); guard();

      const c = centerStage();
      const rect = photoRef.current?.getBoundingClientRect();
      if (rect) burstParticles(rect, c.x, c.y, R ? 26 : 96);
      photoRef.current?.classList.remove('pam-wobble');
      photoRef.current?.classList.add('pam-starify');
      const land = ringPoint(196, 4);
      await wait(R ? 380 : 640); guard();

      if (photoRef.current) await seedFly(photoRef.current, land, R ? 400 : 740);
      guard();

      const lp = toStage(land.x, land.y);
      puffAt(lp.x, lp.y, R ? 8 : 26);
      seedRef.current?.setAttribute('opacity', '0');
      catRef.current?.setAttribute(
        'transform',
        `translate(${land.x.toFixed(2)} ${land.y.toFixed(2)})`,
      );
      catRef.current?.classList.add('pam-pop');
      await wait(R ? 200 : 640); guard();

      setTitleText('它正沿着星环走过来', '爪子踩过的地方，会留下小星星');
      setProgress(0.86, 1700);
      await walkRing(196, 92, R ? 400 : 1400); guard();

      setCapText('它在新家门口，停了一下…');
      setProgress(0.965, 1300);
      await wait(R ? 300 : 900); guard();

      bloomRef.current?.classList.add('pam-go');
      setProgress(1, 700);
      const home = toStage(ringPoint(92, 4).x, ringPoint(92, 4).y);
      puffAt(home.x, home.y, R ? 8 : 18);
      setTitleText('形象已经准备好了', '它会在你串门的时候出来迎你');
      setCapText('正在把小窝递给它…');
      await wait(R ? 280 : 850); guard();

      // 动画走完：等接口（若有），然后揭晓
      let outcome: LoadingOutcome = 'ok';
      if (taskRef.current) {
        outcome = await taskRef.current;
      }
      guard();
      finishRef.current(outcome);
    } catch {
      /* 被跳过/关闭时静默退出 */
    }
  }

  function skip() {
    genRef.current += 1;
    setShowSkip(false);
    finishRef.current('skip');
  }

  function boop(e: React.MouseEvent) {
    const orb = orbRef.current;
    if (!orb || !overlayRef.current?.classList.contains('pam-on')) return;
    orb.classList.remove('pam-boop');
    void orb.offsetWidth;
    orb.classList.add('pam-boop');
    puffAt(e.clientX, e.clientY, 12);
    setTimeout(() => orb.classList.remove('pam-boop'), 640);
  }

  if (!shown) return null;

  return (
    <div className={`pam-overlay${on ? ' pam-on' : ''}`} ref={overlayRef} aria-hidden={!active}>
      <canvas className="pam-stars" ref={starsRef} />
      <div className="pam-scene">
        <div className="pam-deco"><span>✦</span><span>✦</span><span>✦</span></div>
        <h2 ref={titleRef}>正在接它上星球…</h2>
        <p className="pam-sub" ref={subRef}>你的虚拟形象，正在从照片里醒来</p>

        <div className="pam-orb" ref={orbRef} onClick={boop}>
          <svg className="pam-orbSvg" viewBox="0 0 420 420" aria-hidden="true">
            <defs>
              <filter id="pamWc" x="-25%" y="-25%" width="150%" height="150%">
                <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves="4" seed="9" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation=".7" />
              </filter>
              <filter id="pamWcSoft" x="-25%" y="-25%" width="150%" height="150%">
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.015" numOctaves="3" seed="4" result="n2" />
                <feDisplacementMap in="SourceGraphic" in2="n2" scale="6" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation=".5" />
              </filter>
              <radialGradient id="pamWPink" cx="50%" cy="50%" r="50%">
                <stop ref={t1} offset="0%" stopColor="#f9b8d0" stopOpacity=".95" />
                <stop offset="60%" stopColor="#f9c4d6" stopOpacity=".55" />
                <stop offset="100%" stopColor="#f9c4d6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="pamWSky" cx="50%" cy="50%" r="50%">
                <stop ref={t2} offset="0%" stopColor="#c8d6f7" stopOpacity=".95" />
                <stop offset="62%" stopColor="#d6e0fa" stopOpacity=".5" />
                <stop offset="100%" stopColor="#d6e0fa" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="pamWPur" cx="50%" cy="50%" r="50%">
                <stop ref={t3} offset="0%" stopColor="#c6a2e6" stopOpacity=".9" />
                <stop offset="60%" stopColor="#cfaee9" stopOpacity=".5" />
                <stop offset="100%" stopColor="#cfaee9" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="pamWPeach" cx="50%" cy="50%" r="50%">
                <stop ref={t4} offset="0%" stopColor="#fbd0b4" stopOpacity=".85" />
                <stop offset="62%" stopColor="#fddcc6" stopOpacity=".4" />
                <stop offset="100%" stopColor="#fddcc6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="pamWBase" cx="36%" cy="30%" r="82%">
                <stop offset="0%" stopColor="#fffdfa" />
                <stop offset="55%" stopColor="#fdf0f4" />
                <stop offset="100%" stopColor="#f0e0f2" />
              </radialGradient>
              <linearGradient id="pamGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffeeb8" /><stop offset="26%" stopColor="#f8d489" />
                <stop offset="52%" stopColor="#fff6d4" /><stop offset="76%" stopColor="#f2c473" />
                <stop offset="100%" stopColor="#e5ac54" />
              </linearGradient>
              <linearGradient id="pamGold2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffe9a8" /><stop offset="35%" stopColor="#fffbe6" />
                <stop offset="100%" stopColor="#efc06c" />
              </linearGradient>
              <linearGradient id="pamArcG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffe9b0" /><stop offset="50%" stopColor="#fff8dd" />
                <stop offset="100%" stopColor="#f3c778" />
              </linearGradient>
              <clipPath id="pamPclip"><circle cx="210" cy="210" r="103" /></clipPath>
              <clipPath id="pamFrontClip">
                <rect x="-60" y="210" width="540" height="260" transform="rotate(-17 210 210)" />
              </clipPath>
            </defs>

            <g filter="url(#pamWcSoft)">
              <g transform="rotate(-17 210 210)">
                <ellipse cx="210" cy="210" rx="188" ry="56" fill="none" stroke="url(#pamGold)" strokeWidth="17" opacity=".92" />
                <ellipse cx="210" cy="210" rx="188" ry="56" fill="none" stroke="#fffbe8" strokeWidth="5" opacity=".85" />
                <ellipse cx="210" cy="210" rx="188" ry="56" fill="none" stroke="#dca94f" strokeWidth="19" opacity=".18" />
              </g>
            </g>

            <g filter="url(#pamWc)">
              <circle cx="210" cy="210" r="103" fill="url(#pamWBase)" />
              <g clipPath="url(#pamPclip)">
                <ellipse cx="258" cy="170" rx="92" ry="76" fill="url(#pamWPink)" />
                <ellipse cx="160" cy="150" rx="76" ry="62" fill="url(#pamWSky)" />
                <ellipse cx="215" cy="268" rx="104" ry="70" fill="url(#pamWPur)" />
                <ellipse cx="160" cy="228" rx="62" ry="44" fill="url(#pamWPeach)" opacity=".8" />
                <ellipse cx="250" cy="240" rx="52" ry="38" fill="url(#pamWPur)" opacity=".7" />
                <ellipse cx="196" cy="196" rx="30" ry="22" fill="#fff" opacity=".35" />
              </g>
            </g>
            <circle cx="210" cy="210" r="103" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1.2" />

            <g filter="url(#pamWcSoft)" clipPath="url(#pamFrontClip)">
              <g transform="rotate(-17 210 210)">
                <ellipse cx="210" cy="210" rx="188" ry="56" fill="none" stroke="url(#pamGold)" strokeWidth="17" opacity=".95" />
                <ellipse cx="210" cy="210" rx="188" ry="56" fill="none" stroke="#fffbe8" strokeWidth="5" opacity=".9" />
              </g>
            </g>

            <g className="pam-drips" filter="url(#pamWcSoft)">
              <ellipse cx="372" cy="268" rx="7" ry="9" fill="url(#pamGold2)" opacity=".95" />
              <ellipse cx="386" cy="292" rx="4.5" ry="6" fill="url(#pamGold2)" opacity=".85" />
              <ellipse cx="366" cy="308" rx="3" ry="4" fill="url(#pamGold2)" opacity=".7" />
              <ellipse cx="392" cy="252" rx="3.4" ry="4.6" fill="url(#pamGold2)" opacity=".75" />
            </g>

            <g ref={pawsRef} />

            <ellipse
              ref={arcRef}
              className="pam-arc"
              cx="210"
              cy="210"
              rx="188"
              ry="56"
              fill="none"
              stroke="url(#pamArcG)"
              strokeWidth="2.4"
              strokeLinecap="round"
              transform="rotate(-17 210 210)"
              opacity=".9"
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,226,150,.9))' }}
            />

            <g className="pam-cat" ref={catRef} transform="translate(90 250)">
              <g className="pam-catInner">
                <g className="pam-body">
                  <g className="pam-tail">
                    <path d="M8 2 q14 1 12 -13 q-1 -7 -7 -6" stroke="#f0b184" strokeWidth="5.2" fill="none" strokeLinecap="round" />
                  </g>
                  <ellipse cx="0" cy="0" rx="11.5" ry="9" fill="#f7c19a" />
                  <ellipse cx="-3" cy="2" rx="6" ry="5.6" fill="#fde3d0" />
                  <g className="pam-head">
                    <path className="pam-earL" d="M-9.6 -14 l-2.6 -8.4 l8.4 3.4 z" fill="#f7c19a" />
                    <path className="pam-earR" d="M9.6 -14 l2.6 -8.4 l-8.4 3.4 z" fill="#f7c19a" />
                    <path d="M-8.6 -15.4 l-1.4 -4.4 l4.4 1.8 z" fill="#f6b9b0" opacity=".8" />
                    <path d="M8.6 -15.4 l1.4 -4.4 l-4.4 1.8 z" fill="#f6b9b0" opacity=".8" />
                    <circle cx="0" cy="-14" r="9.4" fill="#fbcba4" />
                    <path d="M-6 -14.6 q2.2 2.4 4.4 0" stroke="#7a5343" strokeWidth="1.25" fill="none" strokeLinecap="round" />
                    <path d="M1.6 -14.6 q2.2 2.4 4.4 0" stroke="#7a5343" strokeWidth="1.25" fill="none" strokeLinecap="round" />
                    <path d="M-1.1 -11.4 h2.2 l-1.1 1.5 z" fill="#e79a9a" />
                    <ellipse cx="-6.2" cy="-11.6" rx="2.6" ry="1.5" fill="#f8b3bd" opacity=".65" />
                    <ellipse cx="6.2" cy="-11.6" rx="2.6" ry="1.5" fill="#f8b3bd" opacity=".65" />
                    <path d="M-5 -12.4 h-5 M-5 -10.8 h-5 M5 -12.4 h5 M5 -10.8 h5" stroke="#e0b092" strokeWidth=".7" strokeLinecap="round" opacity=".8" />
                  </g>
                </g>
              </g>
            </g>

            <g className="pam-sparkles">
              <g className="pam-spark" transform="translate(96 96)"><path d="M0 -13 Q2 -2 13 0 Q2 2 0 13 Q-2 2 -13 0 Q-2 -2 0 -13Z" fill="url(#pamGold2)" /></g>
              <g className="pam-spark" transform="translate(330 118)"><path d="M0 -9 Q1.4 -1.4 9 0 Q1.4 1.4 0 9 Q-1.4 1.4 -9 0 Q-1.4 -1.4 0 -9Z" fill="url(#pamGold2)" /></g>
              <g className="pam-spark" transform="translate(74 208)"><path d="M0 -8 Q1.2 -1.2 8 0 Q1.2 1.2 0 8 Q-1.2 1.2 -8 0 Q-1.2 -1.2 0 -8Z" fill="url(#pamGold2)" /></g>
              <g className="pam-spark" transform="translate(346 232)"><path d="M0 -11 Q1.7 -1.7 11 0 Q1.7 1.7 0 11 Q-1.7 1.7 -11 0 Q-1.7 -1.7 0 -11Z" fill="url(#pamGold2)" /></g>
              <g className="pam-spark" transform="translate(300 340)"><path d="M0 -7 Q1 -1 7 0 Q1 1 0 7 Q-1 1 -7 0 Q-1 -1 0 -7Z" fill="url(#pamGold2)" /></g>
              <g className="pam-spark" transform="translate(130 342)"><path d="M0 -6 Q.9 -.9 6 0 Q.9 .9 0 6 Q-.9 .9 -6 0 Q-.9 -.9 0 -6Z" fill="url(#pamGold2)" /></g>
              <path d="M150 118 l4 4 M154 118 l-4 4" stroke="#e9bd63" strokeWidth="1.2" opacity=".7" />
              <path d="M318 176 l4 4 M322 176 l-4 4" stroke="#e9bd63" strokeWidth="1.2" opacity=".6" />
              <path d="M112 288 l3.4 3.4 M115.4 288 l-3.4 3.4" stroke="#e9bd63" strokeWidth="1.1" opacity=".55" />
              <circle cx="286" cy="96" r="1.4" fill="#e9bd63" opacity=".6" />
              <circle cx="62" cy="150" r="1.2" fill="#e9bd63" opacity=".5" />
              <circle cx="356" cy="196" r="1.3" fill="#e9bd63" opacity=".5" />
            </g>

            <g ref={seedRef} opacity="0" style={{ filter: 'drop-shadow(0 0 10px rgba(255,220,130,.95))' }}>
              <path d="M0 -15 Q2.2 -2.2 15 0 Q2.2 2.2 0 15 Q-2.2 2.2 0 15 Q-2.2 2.2 -15 0 Q-2.2 -2.2 0 -15Z" fill="#fff6d4" />
            </g>

            <g className="pam-bloom" ref={bloomRef} transform="translate(210 210)">
              <g className="pam-spark2" style={{ animationDelay: '0s' }}>
                <path d="M0 -150 Q2.5 -2.5 150 0 Q2.5 2.5 0 150 Q-2.5 2.5 -150 0 Q-2.5 -2.5 0 -150Z" fill="none" stroke="#f3cf7a" strokeWidth="1.2" />
              </g>
              <g className="pam-spark2" style={{ animationDelay: '.12s' }}>
                <circle r="120" fill="none" stroke="#f6b9cf" strokeWidth="1" opacity=".8" />
              </g>
              <g className="pam-spark2" style={{ animationDelay: '.2s' }}>
                <circle r="86" fill="none" stroke="#e9bd63" strokeWidth=".9" opacity=".8" />
              </g>
            </g>
          </svg>

          <div className="pam-photo" ref={photoRef}>
            <div className="pam-photoInner">
              {photoUrl ? <img src={photoUrl} alt="" /> : <CatIllustration />}
            </div>
            <div className="pam-scan" ref={scanRef} />
            <div className="pam-corners" ref={cornersRef}><i /><i /><i /><i /></div>
          </div>
        </div>

        <div className="pam-status" ref={statusRef}>
          <p className="pam-cap" ref={capRef}>照片已经出发了</p>
          <div className="pam-steps">
            <span className="pam-step pam-done" ref={(el) => { stepRefs.current[0] = el; }}><b />上传照片</span>
            <span className="pam-step pam-active" ref={(el) => { stepRefs.current[1] = el; }}><b />认出它是谁</span>
            <span className="pam-step" ref={(el) => { stepRefs.current[2] = el; }}><b />生成虚拟形象</span>
          </div>
          <p className="pam-privacy">这张照片只留在你的星球，<em>不会被别人看到</em></p>
        </div>
      </div>
      <canvas className="pam-fx" ref={fxRef} />
      <button
        type="button"
        className={`pam-skip${showSkip ? ' pam-on' : ''}`}
        onClick={skip}
      >
        跳过动画 ›
      </button>
    </div>
  );
}
