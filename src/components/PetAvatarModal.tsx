'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import PlanetLoadingOverlay, { type LoadingOutcome } from '@/components/PlanetLoadingOverlay';

type PetAvatarModalProps = {
  open: boolean;
  planetId: string;
  petName: string;
  currentAvatarUrl?: string;
  onClose: () => void;
  onSaved: (avatarUrl: string) => void;
};

const MAX_FILE = 2 * 1024 * 1024;
const MAX_SIDE = 768;

/** 失败原因码 → 人话 */
const REASON_LABEL: Record<string, string> = {
  api_key_missing: '代理未配置 API Key',
  image_empty_or_too_large: '照片为空或过大',
  image_format_invalid: '照片格式不支持',
  upstream_timeout: 'AI 生成超时',
  generate_http_401: 'API Key 无效',
  generate_http_403: 'API Key 无权限',
  generate_http_429: '调用太频繁或额度不足',
  generate_no_result: 'AI 未返回图片',
  proxy_unreachable: 'AI 代理服务不可达',
  network_timeout: '网络超时或中断',
};

/** 压缩到最长边 768px 的 JPEG，减少上传给智谱的体积 */
async function compress(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解析失败'));
    image.src = dataUrl;
  });

  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

/** 内置宠物剪影：AI 不可用时的占位，不阻塞页面 */
function Silhouette() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <circle cx="60" cy="60" r="58" fill="#f3ecff" />
      <g fill="#b9a8d6">
        <circle cx="44" cy="40" r="12" />
        <circle cx="76" cy="40" r="12" />
        <path d="M60 44c-18 0-30 14-30 30 0 14 13 22 30 22s30-8 30-22c0-16-12-30-30-30Z" />
      </g>
      <g fill="#fffafd">
        <circle cx="50" cy="70" r="3.4" />
        <circle cx="70" cy="70" r="3.4" />
      </g>
      <path d="M57 80h6l-3 4Z" fill="#e3a7bd" />
    </svg>
  );
}

export default function PetAvatarModal({
  open,
  planetId,
  petName,
  currentAvatarUrl,
  onClose,
  onSaved,
}: PetAvatarModalProps) {
  const [source, setSource] = useState('');
  const [style, setStyle] = useState<'q版' | '拟真'>('q版');
  const [result, setResult] = useState('');
  const [fallback, setFallback] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 加载仪式：动画与接口"都完成"才揭晓
  const [overlayActive, setOverlayActive] = useState(false);
  const [genTask, setGenTask] = useState<Promise<'ok' | 'fail'> | null>(null);
  const settleRef = useRef<{ apiDone: boolean; animDone: boolean; outcome: 'ok' | 'fail' }>({
    apiDone: false,
    animDone: false,
    outcome: 'ok',
  });
  const resultRef = useRef('');
  const saveOkRef = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSource('');
    setStyle('q版');
    setResult('');
    setFallback(false);
    setFailReason('');
    setLoading(false);
    setError('');
    setOverlayActive(false);
    setGenTask(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const pick = async (file: File | null) => {
    setError('');
    setResult('');
    setFallback(false);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (file.size > MAX_FILE) {
      setError('图片不能超过 2MB');
      return;
    }
    try {
      setSource(await compress(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片处理失败');
    }
  };

  /** 接口与动画都完成后统一揭晓 */
  const trySettle = () => {
    const s = settleRef.current;
    if (!s.apiDone || !s.animDone) return;
    setLoading(false);
    setOverlayActive(false);
    setGenTask(null);
    if (s.outcome === 'ok' && resultRef.current) {
      setResult(resultRef.current);
      if (saveOkRef.current) onSaved(resultRef.current);
    } else if (s.outcome === 'fail') {
      setFallback(true);
    }
  };

  const handleCeremonyFinish = (outcome: LoadingOutcome) => {
    settleRef.current.animDone = true;
    if (outcome !== 'skip') settleRef.current.outcome = outcome;
    if (outcome === 'skip') setOverlayActive(false); // 放弃仪式，接口返回后直接揭晓
    trySettle();
  };

  const generate = async () => {
    if (!source || loading) return;
    setLoading(true);
    setError('');
    setFallback(false);
    setFailReason('');
    setResult('');
    resultRef.current = '';
    saveOkRef.current = false;
    settleRef.current = { apiDone: false, animDone: false, outcome: 'ok' };

    const task = (async (): Promise<'ok' | 'fail'> => {
      try {
        const res = await apiFetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: source, petName, style }),
          signal: AbortSignal.timeout(65000),
        });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.imageUrl) {
          // AI 失败：展示内置剪影，不阻塞页面；原因透出方便排查
          setFailReason(String(json?.reason || (res.ok ? 'no_image' : `http_${res.status}`)));
          return 'fail';
        }

        resultRef.current = json.imageUrl;
        const saveRes = await apiFetch('/api/planet/owner/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: json.imageUrl }),
        });
        if (!saveRes.ok) setError('形象生成成功，但保存失败');
        saveOkRef.current = saveRes.ok;
        return 'ok';
      } catch {
        setFailReason('network_timeout');
        return 'fail';
      }
    })();

    setGenTask(task);
    setOverlayActive(true);
    task.then((outcome) => {
      settleRef.current.apiDone = true;
      settleRef.current.outcome = outcome;
      trySettle();
    });
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center px-4">
      <button
        type="button"
        aria-label="关闭"
        onClick={() => !loading && onClose()}
        className="modal-mask absolute inset-0 cursor-default bg-[#3c2b48]/30 backdrop-blur-[3px]"
      />

      <div className="modal-panel card relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">PET AVATAR</p>
            <h2 className="title mt-1.5 text-xl">生成虚拟形象</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-lg leading-none text-[#b09ec0] transition hover:text-[#8b7a97]"
            aria-label="关闭弹窗"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-[#b09ec0]">上传宠物照片</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-[#cdbcf5] bg-white/55 text-[11px] text-[#a596b0] transition hover:border-[#a691d6] hover:bg-white/80"
            >
              {source ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={source} alt="上传预览" className="h-full w-full object-cover" />
              ) : (
                <span className="text-center leading-relaxed">
                  <span className="block text-xl">📷</span>
                  点击选择
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <p className="text-[11px] text-[#b09ec0]">生成结果</p>
            <div className="mt-2 grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border border-white/90 bg-white/60">
              {loading ? (
                <span className="text-[11px] text-[#b09ec0]">正在绘制…</span>
              ) : result ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result} alt="虚拟形象" className="h-full w-full object-cover" />
              ) : fallback ? (
                <div className="h-full w-full p-2">
                  <Silhouette />
                </div>
              ) : currentAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentAvatarUrl} alt="当前形象" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full p-2 opacity-60">
                  <Silhouette />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[11px] text-[#b09ec0]">风格</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['q版', '拟真'] as const).map((item) => {
              const active = style === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStyle(item)}
                  className={`rounded-2xl border px-3 py-2 text-[12.5px] transition ${
                    active
                      ? 'border-[#cdbcf5] bg-white text-[#57465f]'
                      : 'border-white/80 bg-white/50 text-[#8b7a97] hover:bg-white/75'
                  }`}
                >
                  {item === 'q版' ? '🧸 Q 版' : '📸 拟真'}
                </button>
              );
            })}
          </div>
        </div>

        {fallback && (
          <p className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-[11px] leading-relaxed text-[#a596b0]">
            图片生成暂时不可用{failReason ? `（原因：${REASON_LABEL[failReason] || failReason}）` : ''}
            ，已使用内置宠物剪影占位。不影响页面其他功能，稍后可以再试。
          </p>
        )}
        {error && <p className="mt-3 text-[11px] text-[#c26a86]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-ghost btn-sm">
            关闭
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={loading || !source}
            className="btn btn-primary btn-sm"
          >
            {loading ? '生成中…' : '✨ 生成虚拟形象'}
          </button>
        </div>
      </div>

      <PlanetLoadingOverlay
        active={overlayActive}
        photoUrl={source || null}
        task={genTask}
        onFinish={handleCeremonyFinish}
      />
    </div>
  );
}
