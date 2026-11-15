/**
 * GitHub Pages 静态构建。
 * 静态导出不支持 Route Handlers（src/app/api），构建期间把 route.ts 临时改名，
 * 构建完立即还原（Windows 下目录可能被 IDE 占用，所以只改文件名，不移动目录）。
 * 产物输出到 out/，可直接发布到 gh-pages 分支。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const apiDir = path.join(root, 'src', 'app', 'api');
const outDir = path.join(root, 'out');
const SUFFIX = '.off';

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

const renamed = [];
try {
  if (fs.existsSync(apiDir)) {
    for (const file of walk(apiDir)) {
      if (file.endsWith(`route.ts${SUFFIX}`)) {
        // 上次异常中断留下的文件，先还原再处理
        fs.renameSync(file, file.slice(0, -SUFFIX.length));
      }
    }
    for (const file of walk(apiDir)) {
      if (file.endsWith('route.ts')) {
        fs.renameSync(file, `${file}${SUFFIX}`);
        renamed.push(file);
      }
    }
    console.log(`[gh-pages] 临时停用 ${renamed.length} 个 API 路由文件`);
  }

  execSync('npx next build', {
    stdio: 'inherit',
    cwd: root,
    env: {
      ...process.env,
      GH_PAGES: '1',
      NEXT_PUBLIC_DEMO_MODE: '1',
      NEXT_PUBLIC_BASE_PATH: '/memory-planet',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  });

  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
  console.log('\n[gh-pages] 静态产物目录：out/（basePath=/memory-planet）');
} finally {
  for (const file of renamed) {
    if (fs.existsSync(`${file}${SUFFIX}`)) fs.renameSync(`${file}${SUFFIX}`, file);
  }
  console.log(`[gh-pages] 已还原 ${renamed.length} 个 API 路由文件`);
}
