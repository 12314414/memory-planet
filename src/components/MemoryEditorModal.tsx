'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

type MemoryEditorModalProps = {
  open: boolean;
  planetId: string;
  onClose: () => void;
  onSaved: () => void;
};

const MAX_TEXT = 200;
const MAX_FILE = 2 * 1024 * 1024; // 2MB
const MAX_SIDE = 1280;

/** 读文件 → 压到最长边 1280px 的 JPEG，控制 Base64 体积 */
async function compressImage(file: File): Promise<string> {
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
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);

  // 逐步降质量，目标 < 380KB（Base64 约 500KB，避免超出 localStorage 配额）
  let quality = 0.82;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length > 380_000 && quality > 0.4) {
    quality -= 0.12;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out;
}

export default function MemoryEditorModal({ open, planetId, onClose, onSaved }: MemoryEditorModalProps) {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [imageData, setImageData] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // 每次打开重置表单
  useEffect(() => {
    if (!open) return;
    setText('');
    setVisibility('PUBLIC');
    setImageData('');
    setPreview('');
    setError('');
    setSaving(false);
    setPolishing(false);
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const pickFile = async (file: File | null) => {
    setError('');
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
      const compressed = await compressImage(file);
      setImageData(compressed);
      setPreview(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片处理失败');
    }
  };

  const removeImage = () => {
    setImageData('');
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const polish = async () => {
    const content = text.trim();
    if (!content) {
      setError('先写一点回忆，再让 AI 润色');
      return;
    }
    if (polishing) return;
    setPolishing(true);
    setError('');
    try {
      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'polish', planetId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '润色失败');
      if (data?.text) setText(String(data.text).slice(0, MAX_TEXT));
    } catch (err) {
      setError(err instanceof Error ? err.message : '润色失败');
    } finally {
      setPolishing(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) {
      setError('回忆文字不能为空');
      return;
    }
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch('/api/planet/owner/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planetId, text: content, visibility, imageData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '保存失败');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center px-4">
      {/* 遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={() => !saving && onClose()}
        className="modal-mask absolute inset-0 cursor-default bg-[#3c2b48]/30 backdrop-blur-[3px]"
      />

      <form
        onSubmit={submit}
        className="modal-panel card relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">NEW MEMORY</p>
            <h2 className="title mt-1.5 text-xl">添加一段回忆</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-lg leading-none text-[#b09ec0] transition hover:text-[#8b7a97]"
            aria-label="关闭弹窗"
          >
            ✕
          </button>
        </div>

        {/* 图片上传 */}
        <div className="mt-4">
          <p className="text-[11px] text-[#b09ec0]">照片（可选 · 不超过 2MB）</p>
          {preview ? (
            <div className="relative mt-2 overflow-hidden rounded-2xl border border-white/90 bg-white/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="预览" className="h-44 w-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] text-[#8b7a97] shadow-sm transition hover:text-[#c26a86]"
              >
                移除
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex h-32 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#cdbcf5] bg-white/55 text-[11.5px] text-[#a596b0] transition hover:border-[#a691d6] hover:bg-white/80"
            >
              <span className="text-xl">🖼️</span>
              点击选择本地图片
              <span className="text-[10px] text-[#b7a8c2]">支持 PNG / JPG / WebP，自动压缩</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
          />
        </div>

        {/* 文字 */}
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <p className="text-[11px] text-[#b09ec0]">回忆文字</p>
            <span className="text-[10px] text-[#b7a8c2]">
              {text.length} / {MAX_TEXT}
            </span>
          </div>
          <textarea
            value={text}
            maxLength={MAX_TEXT}
            onChange={(event) => setText(event.target.value)}
            placeholder="写下一段和宠物有关的小事…"
            rows={4}
            className="field mt-2 resize-none leading-relaxed"
          />
          <button
            type="button"
            onClick={polish}
            disabled={polishing}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#f0ddb8] bg-[#fff8ec]/80 px-3 py-1 text-[11px] text-[#9a8259] transition hover:bg-[#fff3dd] disabled:opacity-60"
          >
            {polishing ? '正在润色…' : '✨ AI 润色'}
          </button>
        </div>

        {/* 可见性 */}
        <div className="mt-4">
          <p className="text-[11px] text-[#b09ec0]">谁可以看到</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { key: 'PUBLIC' as const, icon: '🌍', title: '公开', hint: '访客能看到' },
              { key: 'PRIVATE' as const, icon: '🔒', title: '私密', hint: '仅自己可见' },
            ].map((option) => {
              const active = visibility === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setVisibility(option.key)}
                  className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-[#cdbcf5] bg-white shadow-[0_10px_22px_-18px_rgba(94,68,110,0.6)]'
                      : 'border-white/80 bg-white/50 hover:bg-white/75'
                  }`}
                >
                  <p className="text-[12.5px] text-[#57465f]">
                    {option.icon} {option.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#a596b0]">{option.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-3 text-[11px] text-[#c26a86]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost btn-sm">
            取消
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
            {saving ? '保存中…' : '保存回忆'}
          </button>
        </div>
      </form>
    </div>
  );
}
