import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#4a3b52',
        'ink-soft': '#7b6a86',
        'ink-mute': '#a596b0',
        cream: '#fffaf6',
        lav: '#cdbcf5',
        'lav-deep': '#a691d6',
        pink: '#f8c8dd',
        peach: '#fcd7bb',
        mint: '#bfe6dd',
        gold: '#f3cf7a',
      },
      borderRadius: {
        blob: '36px',
      },
      boxShadow: {
        soft: '0 18px 40px -24px rgba(94, 68, 110, 0.35)',
        lift: '0 26px 60px -30px rgba(94, 68, 110, 0.45)',
      },
      fontFamily: {
        display: ['Georgia', 'Songti SC', 'STSong', 'serif'],
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        fadeUp: 'fadeUp 0.6s ease both',
      },
    },
  },
  plugins: [],
};

export default config;
