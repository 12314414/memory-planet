/**
 * 开场动画开关：placeholder / lottie / video
 * 改动这里即可切换 Intro 形态，onFinish 契约保持不变。
 */
export const INTRO_MODE: 'placeholder' | 'lottie' | 'video' =
  (process.env.NEXT_PUBLIC_INTRO_MODE as 'placeholder' | 'lottie' | 'video') || 'video';

/** 先导片：纸雕云窗 → 水彩糖果土星（9.42s，1344×768） */
export const INTRO_VIDEO = '/videos/intro.mp4';

export const INTRO_DURATION = 9600;

export const BRAND = {
  cn: '宠归星畔',
  en: 'Memory Planet',
  tagline: '有些回忆，值得一颗星球',
};
