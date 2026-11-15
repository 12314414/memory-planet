'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

type PetAvatarStudioProps = {
  initialAvatar?: { imageUrl?: string };
  onSaved?: (url: string) => void;
};

type AvatarState = {
  status: 'PENDING' | 'READY' | 'FAILED' | null;
  imageUrl?: string;
};

const STYLE_OPTIONS = [
  { key: 'blindbox', label: '盲盒' },
  { key: 'clay', label: '黏土' },
  { key: 'candy', label: '糖果' },
] as const;

export default function PetAvatarStudio({ initialAvatar, onSaved }: PetAvatarStudioProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<AvatarState>({
    status: initialAvatar?.imageUrl ? 'READY' : null,
    imageUrl: initialAvatar?.imageUrl,
  });
  const [error, setError] = useState('');
  const [style, setStyle] = useState<'blindbox' | 'clay' | 'candy'>('blindbox');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 如果没有初始 avatar，尝试从服务端拉取
  useEffect(() => {
    if (initialAvatar?.imageUrl) return;

    apiFetch('/api/pet/avatar')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.avatar?.imageUrl) {
          setAvatar({ status: 'READY', imageUrl: data.avatar.imageUrl });
        }
      })
      .catch(() => {
        // 静态版或网络失败时静默降级
      });
  }, [initialAvatar]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('只支持 jpeg/png/webp 格式');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError('图片不能超过 5MB');
      return;
    }

    setError('');
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const handleGenerate = async () => {
    if (!file || loading) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('style', style);

      const res = await apiFetch('/api/pet/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || '生成失败');
      }

      setAvatar({ status: 'READY', imageUrl: data.imageUrl });
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSaved?.(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，保留当前形象，可重试');
      setAvatar((prev) => ({ ...prev, status: 'FAILED' }));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentImage = avatar.imageUrl;

  return (
    <div className="space-y-4">
      {/* 当前已生效的形象 */}
      {currentImage && avatar.status === 'READY' && (
        <div className="flex items-center gap-4 rounded-2xl bg-[#f8f5ff] p-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-[#e9e0ff] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage}
              alt="宠物 Q 版形象"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-[#8b7a97]">当前 Q 版形象</p>
            <p className="mt-0.5 text-[10px] text-[#b09ec0]">已应用到星球展示</p>
          </div>
        </div>
      )}

      {/* 上传 / 预览区域 */}
      <div className="rounded-2xl border-2 border-dashed border-[#e9e0ff] bg-[#faf8ff] p-4 transition-colors hover:border-[#d9cbe4]">
        {!preview ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 py-5">
            <span className="text-3xl">📷</span>
            <span className="text-xs font-medium text-[#8b7a97]">拍照或从相册选择</span>
            <span className="text-[10px] text-[#b09ec0]">支持 jpeg / png / webp，最大 5MB</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="relative mx-auto h-44 w-44 overflow-hidden rounded-2xl border-2 border-[#e9e0ff] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="照片预览" className="h-full w-full object-cover" />
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost btn-sm"
                disabled={loading}
              >
                重新选择
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 风格选择 */}
      {preview && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] text-[#b09ec0]">风格：</span>
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStyle(opt.key)}
              disabled={loading}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                style === opt.key
                  ? 'bg-[#8b7a97] text-white shadow-sm'
                  : 'bg-white/70 text-[#8b7a97] hover:bg-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* 生成按钮 + 加载态（CSS 呼吸光圈） */}
      {preview && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="btn btn-primary relative w-full overflow-hidden"
        >
          {loading ? (
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                style={{ animation: 'spin 1s linear infinite' }}
              />
              AI 正在生成 Q 版形象…
            </span>
          ) : (
            '✨ 生成 Q 版形象'
          )}
          {loading && (
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
            />
          )}
        </button>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-xl border border-[#f4d3dc] bg-[#fff3f6] px-3 py-2 text-[11px] text-[#c26a86]">
          {error}
        </div>
      )}

      {/* 失败状态（非错误触发的兜底提示） */}
      {avatar.status === 'FAILED' && !error && (
        <div className="rounded-xl border border-[#f4d3dc] bg-[#fff3f6] px-3 py-2 text-[11px] text-[#c26a86]">
          生成失败，保留当前形象，可重试
        </div>
      )}

      {/* 内联关键帧，避免改动全局 CSS */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
