/** 纸雕 / 水彩质感的小星球：外圈奶油纸边 + 水彩色块 + 可选糖金细环 */
const PALETTES = [
  {
    bg: 'radial-gradient(circle at 34% 26%, #fdfffb 0%, #d7ece3 38%, #abd6ca 72%, #8bbfb4 100%)',
    craters:
      'radial-gradient(34% 26% at 62% 64%, rgba(112, 164, 152, 0.4), transparent 70%), radial-gradient(22% 16% at 30% 58%, rgba(112, 164, 152, 0.3), transparent 70%)',
  },
  {
    bg: 'radial-gradient(circle at 34% 26%, #fffdfa 0%, #fbdbe6 36%, #eeaec8 72%, #d992ae 100%)',
    craters:
      'radial-gradient(32% 24% at 66% 62%, rgba(214, 134, 168, 0.35), transparent 70%), radial-gradient(20% 15% at 30% 54%, rgba(214, 134, 168, 0.26), transparent 70%)',
  },
  {
    bg: 'radial-gradient(circle at 34% 26%, #fffdfc 0%, #e3d8fb 36%, #c4b0ea 72%, #a48ed6 100%)',
    craters:
      'radial-gradient(32% 24% at 64% 62%, rgba(150, 126, 202, 0.32), transparent 70%), radial-gradient(20% 15% at 32% 56%, rgba(150, 126, 202, 0.24), transparent 70%)',
  },
  {
    bg: 'radial-gradient(circle at 34% 26%, #fffaf3 0%, #fcddbd 36%, #f3bb8f 72%, #dda076 100%)',
    craters:
      'radial-gradient(34% 26% at 64% 64%, rgba(206, 140, 96, 0.32), transparent 70%), radial-gradient(20% 15% at 30% 58%, rgba(206, 140, 96, 0.24), transparent 70%)',
  },
  {
    bg: 'radial-gradient(circle at 34% 26%, #fdffff 0%, #d6e7fc 36%, #aacaf0 72%, #86aad7 100%)',
    craters:
      'radial-gradient(34% 26% at 64% 62%, rgba(118, 156, 202, 0.32), transparent 70%), radial-gradient(20% 15% at 32% 56%, rgba(118, 156, 202, 0.24), transparent 70%)',
  },
  {
    bg: 'radial-gradient(circle at 34% 26%, #fffdf4 0%, #f9eabb 36%, #ecd08a 72%, #d9b565 100%)',
    craters:
      'radial-gradient(34% 26% at 64% 64%, rgba(200, 162, 88, 0.3), transparent 70%), radial-gradient(20% 15% at 30% 58%, rgba(200, 162, 88, 0.22), transparent 70%)',
  },
];

export default function PaperPlanet({ index = 0, ring = false }: { index?: number; ring?: boolean }) {
  const palette = PALETTES[index % PALETTES.length];

  return (
    <div className="paper-planet">
      {ring && <span className="paper-planet-ring paper-planet-ring--back" aria-hidden />}
      <span
        className="paper-planet-core"
        style={{
          ['--pp-bg' as string]: palette.bg,
          ['--pp-craters' as string]: palette.craters,
        }}
      />
      {ring && <span className="paper-planet-ring paper-planet-ring--front" aria-hidden />}
    </div>
  );
}
