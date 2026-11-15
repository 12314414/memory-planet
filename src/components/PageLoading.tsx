'use client';

export default function PageLoading({ hint = '正在靠近星球…' }: { hint?: string }) {
  return (
    <main className="wrap flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div
        className="h-16 w-16 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, #fff, #e9dcff 40%, #c0a9ec 75%, #9a86c9 100%)',
          animation: 'floaty 3s ease-in-out infinite',
          boxShadow: '0 0 30px rgba(190,165,235,.5)',
        }}
      />
      <p className="text-xs text-[#b09ec0]">{hint}</p>
    </main>
  );
}
