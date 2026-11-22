/**
 * 纸雕云层：四角的云朵团，像先导片里那圈围着星空的云窗。
 * 三个色阶的剪纸云叠在一起（樱花粉 → 奶油粉 → 纸白），带纸张投影。
 * 通过 transform 镜像复用到四个角。
 */
type Corner = 'tl' | 'tr' | 'bl' | 'br';

const PUFFS = [
  { x: 138, y: 130, rx: 122, ry: 74 },
  { x: 300, y: 172, rx: 128, ry: 80 },
  { x: 456, y: 216, rx: 106, ry: 66 },
  { x: 566, y: 248, rx: 72, ry: 44 },
];

/** 每层不是同心缩小，而是整体向下错位，露出上一层的纸边 */
const LAYERS = [
  { color: '#f3d1e0', opacity: 0.9, dx: 0, dy: 0, scale: 1 },
  { color: '#fce6ef', opacity: 0.96, dx: -8, dy: 20, scale: 0.92 },
  { color: '#fffcf6', opacity: 1, dx: -16, dy: 40, scale: 0.84 },
];

export default function PaperClouds({ corner = 'tl' }: { corner?: Corner }) {
  return (
    <div className={`cloud-corner cloud-corner--${corner}`} aria-hidden>
      <svg viewBox="0 0 660 300" preserveAspectRatio="none">
        {LAYERS.map((layer, layerIndex) => (
          <g key={layerIndex} className="paper-cloud-layer" opacity={layer.opacity}>
            {PUFFS.map((puff, index) => {
              const rx = puff.rx * layer.scale;
              const ry = puff.ry * layer.scale;
              return (
                <g key={index}>
                  <ellipse
                    cx={puff.x + layer.dx}
                    cy={puff.y + layer.dy}
                    rx={rx}
                    ry={ry}
                    fill={layer.color}
                  />
                  <circle
                    cx={puff.x + layer.dx + rx * 0.2}
                    cy={puff.y + layer.dy - ry * 0.64}
                    r={ry * 0.56}
                    fill={layer.color}
                  />
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
