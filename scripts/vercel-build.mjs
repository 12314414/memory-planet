/**
 * Vercel 构建脚本：
 * 1. 把本地 SQLite schema 转成 Postgres（只在构建容器内生成，不改仓库里的 sqlite schema）
 * 2. prisma generate + db push（建表）
 * 3. 首次部署且 SEED_DEMO=1 时灌演示数据（脚本幂等，已存在则跳过）
 * 4. next build
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'prisma', 'schema.prisma');
const generatedPath = path.join(root, 'prisma', 'schema.postgres.generated.prisma');

if (!process.env.DATABASE_URL) {
  console.error('[vercel-build] 缺少 DATABASE_URL，请在 Vercel 项目里配置 Postgres 连接串');
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, 'utf8');
const postgres = source.replace('provider = "sqlite"', 'provider = "postgresql"');
if (postgres === source) {
  console.warn('[vercel-build] 未找到 sqlite provider，按原 schema 继续');
}
fs.writeFileSync(generatedPath, postgres);

const run = (command) => {
  console.log(`[vercel-build] $ ${command}`);
  execSync(command, { stdio: 'inherit', cwd: root });
};

run(`npx prisma generate --schema ${generatedPath}`);
run(`npx prisma db push --schema ${generatedPath} --skip-generate`);

if (process.env.SEED_DEMO === '1') {
  run('node scripts/seed.mjs');
}

run('npx next build');
