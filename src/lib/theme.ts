export type ThemeKey = 'aurora' | 'sakura' | 'mint' | 'honey' | 'violet';

export type ThemeStyle = {
  key: ThemeKey;
  label: string;
  /** 星球球体水彩渐变 */
  sphere: string;
  /** 外发光颜色 */
  glow: string;
  /** 轨道环颜色 */
  ring: string;
  /** 星云色块 */
  blobA: string;
  blobB: string;
  /** 宠物身体渐变 */
  pet: string;
  /** 回忆卡纸封面 */
  cover: string;
};

export const THEMES: Record<ThemeKey, ThemeStyle> = {
  aurora: {
    key: 'aurora',
    label: '极光星云',
    sphere:
      'radial-gradient(circle at 30% 24%, #ffffff 0%, #f4e6ff 16%, #d9c5f7 40%, #b9a3ea 62%, #8f7cc6 82%, #6f5fa3 100%)',
    glow: 'rgba(185, 163, 234, 0.55)',
    ring: 'rgba(244, 208, 130, 0.75)',
    blobA: 'rgba(247, 199, 222, 0.55)',
    blobB: 'rgba(250, 231, 196, 0.6)',
    pet: 'linear-gradient(160deg, #fffdfa 0%, #ffe8f3 55%, #ffd3e6 100%)',
    cover: 'linear-gradient(140deg, #f3e6ff 0%, #ffd9ec 50%, #ffeccb 100%)',
  },
  sakura: {
    key: 'sakura',
    label: '樱色潮汐',
    sphere:
      'radial-gradient(circle at 32% 26%, #ffffff 0%, #ffe9f2 18%, #f9c2da 44%, #eaa7c8 66%, #c986ab 86%, #a66a8c 100%)',
    glow: 'rgba(249, 194, 218, 0.55)',
    ring: 'rgba(243, 207, 122, 0.8)',
    blobA: 'rgba(204, 235, 255, 0.5)',
    blobB: 'rgba(255, 236, 205, 0.65)',
    pet: 'linear-gradient(160deg, #fffdf9 0%, #ffeef2 55%, #ffd8de 100%)',
    cover: 'linear-gradient(140deg, #ffe3f0 0%, #ffd4c7 55%, #fff0cf 100%)',
  },
  mint: {
    key: 'mint',
    label: '薄荷星海',
    sphere:
      'radial-gradient(circle at 30% 25%, #ffffff 0%, #e9fbf6 18%, #bce8de 44%, #98cfc9 66%, #7bb0b5 86%, #5f8e97 100%)',
    glow: 'rgba(154, 210, 205, 0.5)',
    ring: 'rgba(243, 207, 122, 0.7)',
    blobA: 'rgba(199, 224, 255, 0.55)',
    blobB: 'rgba(255, 240, 214, 0.6)',
    pet: 'linear-gradient(160deg, #ffffff 0%, #eafaf7 55%, #d3f0ea 100%)',
    cover: 'linear-gradient(140deg, #ddf6f1 0%, #d9e8ff 55%, #fdeed2 100%)',
  },
  honey: {
    key: 'honey',
    label: '蜜糖晨昏',
    sphere:
      'radial-gradient(circle at 32% 24%, #ffffff 0%, #fff4e2 18%, #fbd6b4 44%, #f2b992 66%, #d59a7b 86%, #b47b63 100%)',
    glow: 'rgba(248, 202, 158, 0.55)',
    ring: 'rgba(240, 195, 110, 0.85)',
    blobA: 'rgba(255, 214, 225, 0.5)',
    blobB: 'rgba(255, 246, 210, 0.7)',
    pet: 'linear-gradient(160deg, #fffdf7 0%, #fff2e4 55%, #ffe0c7 100%)',
    cover: 'linear-gradient(140deg, #ffeacd 0%, #ffd6c2 50%, #f6d9ff 100%)',
  },
  violet: {
    key: 'violet',
    label: '紫罗兰夜',
    sphere:
      'radial-gradient(circle at 30% 24%, #ffffff 0%, #efe3ff 16%, #c9b2f0 38%, #a389db 60%, #7f66b4 82%, #5f4b8e 100%)',
    glow: 'rgba(163, 137, 219, 0.6)',
    ring: 'rgba(246, 214, 140, 0.75)',
    blobA: 'rgba(255, 207, 231, 0.5)',
    blobB: 'rgba(205, 226, 255, 0.55)',
    pet: 'linear-gradient(160deg, #fffdff 0%, #f4ebff 55%, #e6d5ff 100%)',
    cover: 'linear-gradient(140deg, #ece0ff 0%, #d9ccff 50%, #ffe4f2 100%)',
  },
};

export const THEME_LIST = Object.values(THEMES);

export function getTheme(key?: string | null): ThemeStyle {
  return THEMES[(key as ThemeKey) ?? 'aurora'] ?? THEMES.aurora;
}

const COVERS = [
  'linear-gradient(140deg, #f3e6ff 0%, #ffd9ec 52%, #ffeccb 100%)',
  'linear-gradient(140deg, #dff3ff 0%, #e3dcff 55%, #ffe7f3 100%)',
  'linear-gradient(140deg, #fff0d8 0%, #ffe0e6 52%, #e6e1ff 100%)',
  'linear-gradient(140deg, #e3fbf4 0%, #dcecff 55%, #fff1dc 100%)',
];

export function coverFor(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return COVERS[sum % COVERS.length];
}
