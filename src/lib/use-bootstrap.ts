'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api-client';
import type { Visibility } from './constants';
import type { PetProfile } from './types';

export type BootstrapData = {
  user: { id: string; nickname: string } | null;
  planet?: {
    id: string;
    name: string;
    theme: string;
    visibility: Visibility;
    inviteCode: string;
    statsVisits: number;
    statsLights: number;
    statsStars: number;
  };
  pet?: PetProfile;
  publicMemories?: number;
  privateMemories?: number;
  recentVisitors?: { name: string; action: string; createdAt: string }[];
};

export function useBootstrap() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/bootstrap', { cache: 'no-store' });
      const json = (await res.json()) as BootstrapData;
      if (!res.ok) throw new Error('引导数据读取失败');
      setData(json);
      setError('');
    } catch {
      setError('星球暂时被云雾遮住了，刷新试试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
