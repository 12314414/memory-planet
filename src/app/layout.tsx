import type { Metadata } from 'next';
import './globals.css';
import StarField from '@/components/StarField';

export const metadata: Metadata = {
  title: '宠归星畔 · 串门',
  description:
    '给每段回忆一颗星球。异步串门、AI 宠物接待、隐私可控的轻社交空间。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <StarField />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
