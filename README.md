# 宠归星畔 · 联机「串门」版

给每段回忆一颗星球。打开链接就能去别人的星球串门：看宠物、看公开回忆、点亮、送星、喂食、留言；AI 宠物以主人设定的人格接待每一位访客。

这是**异步串门式轻社交**，不是元宇宙、不是实时聊天室、不做 3D。

- 技术栈：Next.js 14 App Router + TypeScript + Tailwind CSS + Prisma + SQLite
- 状态：只用 `useState / useEffect / fetch`，无 Redux
- 动画：纯 CSS（星球渐变、光晕、轨道环、宠物、星尘），无重资源
- 轻实时：主人端 5 秒轮询，页面隐藏自动暂停，无 WebSocket
- 部署：本地 `npm run dev` 可完整演示；也可部署 Vercel + 托管数据库

---

## 一、快速开始（3 分钟）

```bash
npm install

# 1. 环境变量
cp .env.example .env        # Windows: copy .env.example .env
#   AI_API_KEY 留空也能完整演示（所有 AI 文案自动走模板降级）

# 2. 建表 + 演示数据
npm run db:push
npm run db:seed

# 3. 启动
npm run dev
# http://localhost:3000
```

演示星球（seed 生成）：

| 邀请码 | 星球 | 权限 | 说明 |
| --- | --- | --- | --- |
| `ABC123` | 慢慢星球 | INVITE | 有 2 条公开 + 1 条私密回忆，可演示邀请码进入 |
| `MINT66` | 海盐星球 | PUBLIC | 星图里可直接进入 |
| `LUNA88` | 午夜花园 | PUBLIC | 无留言，适合演示“第一条留言” |
| `FRIEND` | 只给朋友的星球 | INVITE | 演示“没码进不去” |

重置数据库：`npm run db:reset`。

### 公网部署（GitHub + Vercel + Neon）

- 线上地址：<https://memory-planet-mpzscjogp-my-team-c72b.vercel.app>
- 代码仓库：<https://github.com/12314414/memory-planet>
- Vercel 项目：`my-team-c72b/memory-planet`（已连接上面的 GitHub 仓库，push 即自动部署）
- 数据库：Vercel Marketplace 的 **Neon Postgres**，连接串由集成自动注入 `DATABASE_URL`

生产构建走 `vercel-build`（`scripts/vercel-build.mjs`），本地 SQLite 流程完全不受影响：

1. 读取 `prisma/schema.prisma`，把 `sqlite` 替换为 `postgresql` 生成构建期 schema（该文件已 gitignore）
2. `prisma generate` + `prisma db push` 对 Neon 建表
3. 若设置 `SEED_DEMO=1`，运行幂等的演示数据脚本
4. `next build`

需要在 Vercel 项目里配置的环境变量：

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Neon 连接串（集成自动写入，无需手动） |
| `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` | AI 代理配置，留空则全程模板降级 |

> Vercel 的 Serverless 文件系统只读，因此公网环境必须用托管 Postgres；本地 `npm run dev` 仍用 SQLite。
>
> `vercel env pull` 生成的 `.env.local` 会覆盖 `.env` 里的 `DATABASE_URL`，让本地 dev 连到 Neon。要保持本地用 SQLite，把该文件改名为 `.env.local.neon.bak` 或删除即可（需要时再 `vercel env pull` 拉回）。
>
> 国内网络直连 `*.vercel.app` 常被 DNS 污染（本机解析到 `199.96.58.85`），访问线上站点需代理/VPN，或在 Vercel 绑定自有域名。

### GitHub Pages 静态演示版（国内可直连）

- 地址：<https://12314414.github.io/memory-planet/>（`12314414.github.io` 解析正常，国内可直接打开）
- 构建：`npm run build:gh-pages` → 产物在 `out/` → 发布到仓库的 `gh-pages` 分支（Pages 源即该分支根目录）
- 实现方式：`GH_PAGES=1` 时走 `output: 'export'` + `basePath: /memory-planet`；静态版没有服务端，`src/lib/demo-store.ts` 用 localStorage 模拟全部接口（`apiFetch` 统一分流），页面与组件代码和服务器版完全共用
- 演示账号：任意昵称即可进入；内置 5 颗星球，邀请码 `ABC123`（慢慢星球）/ `MINT66` / `LUNA88` / `FRIEND` / `MINE01`
- 静态版限制：
  1. 数据只存在当前浏览器，换设备或清缓存会回到初始演示数据
  2. AI 只用模板降级（Key 不进前端）
  3. 重置邀请码后分享链接形如 `/planet/p-mine?code=XXXXXX`（静态托管无法为新邀请码生成新路由）
- 构建脚本会在构建期间临时把 `src/app/api/**/route.ts` 改名为 `.off`（静态导出不支持 Route Handlers），结束后自动还原；因 Windows 下目录常被 IDE 占用，脚本只改文件名不改目录


### AI 配置（服务端）

`.env` 中的三项即可切换服务商，接口均为 OpenAI 兼容格式：

```env
# DeepSeek
AI_BASE_URL="https://api.deepseek.com/v1"
AI_MODEL="deepseek-chat"
# 混元
# AI_BASE_URL="https://api.hunyuan.cloud.tencent.com/v1"
# AI_MODEL="hunyuan-turbos-latest"
AI_API_KEY="sk-xxx"
AI_TIMEOUT_MS="9000"
```

> 这些变量**只在服务端**（`src/lib/ai.ts`、`/api/ai/chat`）读取，不挂 `NEXT_PUBLIC_`，前端代码与响应体都不会出现 Key。`AI_API_KEY` 为空时自动使用模板文案，页面表现完全正常。

### Supabase 登录（邮箱 + 密码）

未配置时页面自动回退到「输入昵称进入」，本地演示不受影响；配置后自动切换为邮箱注册 / 登录。

1. 在 <https://supabase.com> 新建项目（免费额度足够）。
2. Project Settings → API，复制 **Project URL** 和 **anon public key**，写入 `.env`：
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
   ```
3. Authentication → Sign In / Up：Email 保持开启；演示阶段建议**关闭 Confirm email**，否则注册后必须先去邮箱点确认链接。
4. Authentication → URL Configuration：Site URL 填线上地址（如 `https://12314414.github.io/memory-planet/`），Redirect URLs 追加 `http://localhost:3000`。
5. 本地 `npm run dev` 立刻生效；GitHub Pages 版需重新 `npm run build:gh-pages` 再发布（`NEXT_PUBLIC_*` 是**构建期**注入）。

实现方式：`@supabase/ssr` 把会话写进 cookie，服务端 `getCurrentUser()` 读 Supabase 用户，并以其 uid 作为本地 `User.id`（首次登录自动建号 + 建星球）；静态演示版用 `supabase-js` 在浏览器登录，业务数据仍存 localStorage。`service_role` key 任何情况下都不要写进前端。

---

## 二、文件结构

```
prisma/
  schema.prisma                # User / Planet / Memory / Visit / Guestbook / AiCache
scripts/
  seed.mjs                     # 演示星球数据
src/
  app/
    layout.tsx                 # 全局背景、字体、StarField
    page.tsx                   # / 首页（服务端取身份 + 星球）
    HomeView.tsx               # 首页交互层（开场动画、重播、入口卡片）
    globals.css                # 设计系统：水彩星球 / 玻璃卡 / 星球舞台 / 动画
    star-map/
      page.tsx                 # /star-map 服务端：我的星球 + 最近访客
      StarMapView.tsx          # 公开星球列表、邀请码输入
    planet/
      [id]/
        page.tsx               # /planet/[id] 壳
        VisitorPlanetView.tsx  # 访客页：欢迎语、互动、回忆墙、留言
      owner/
        page.tsx               # /planet/owner 服务端鉴权
        OwnerDashboard.tsx     # 主人端：轮询、权限、邀请码、简报、删除留言
      visit/
        [inviteCode]/page.tsx  # /planet/visit/[code] 校验后 307 跳转
    api/
      auth/enter|me|exit/      # 昵称进入 / 当前身份 / 退出切换
      planets/public/          # 公开星球列表（最多 10）
      planet/
        [id]/route.ts          # 星球详情 + 权限校验 + ENTER 去重记录
        [id]/action/route.ts   # LIGHT / STAR / FEED
        [id]/message/route.ts  # 留言 + AI 回复 + 敏感词过滤
        owner/dashboard/        # 主人轮询数据
        owner/brief/            # 今日访客简报
        owner/invite/           # 生成 / 重置邀请码
        owner/settings/         # 访问权限 PATCH
        owner/message/          # 删除留言（软删除）
      ai/chat/route.ts         # 唯一 AI 出口（缓存 + 降级）
  components/
    Intro.tsx                  # 开场动画占位（契约不变）
    PlanetScene.tsx            # 2.5D 星球 + 宠物
    VisitorActions.tsx         # 点亮 / 送星 / 喂食 / 留言
    Guestbook.tsx              # 留言列表 + AI 回复
    AiWelcomeBubble.tsx        # AI 欢迎语（加载 / 降级）
    InviteCard.tsx             # 邀请码 + 分享链接 + 复制
    AccessControlSheet.tsx     # 权限设置
    MemoryWall.tsx             # 公开回忆墙
    SiteHeader.tsx             # 导航 + 切换身份
    NicknameGate.tsx           # 昵称进入
    StarField.tsx              # 背景星尘
  lib/
    auth.ts                    # cookie 身份、邀请码、星球初始化
    permissions.ts             # 统一的访问裁决
    ai.ts                      # prompt 约束、调用、模板降级
    constants.ts               # 枚举、标签、敏感词
    theme.ts                   # 5 套水彩星球配色
    types.ts                   # DTO
```

---

## 三、关键设计

### 身份
配置了 Supabase 时，身份 = Supabase 会话（`@supabase/ssr` 写入 cookie，服务端 `auth.getUser()` 校验，本地 `User.id` 直接用 Supabase uid）。未配置时回退 `POST /api/auth/enter` 写入 **httpOnly cookie**（`hx_uid`），供本地与静态演示使用。前端传的 userId 一律不采信。右上角「切换身份」= 退出登录回登录页，答辩时可 20 秒内切换主人 / 访客。

### 权限矩阵（`src/lib/permissions.ts`）

| 星球 visibility | 主人 | 访客（带正确邀请码） | 访客（无码） |
| --- | --- | --- | --- |
| PRIVATE | ✅ | ❌ 403 | ❌ 403 |
| INVITE | ✅ | ✅ | ❌ 403 |
| PUBLIC | ✅ | ✅ | ✅ |

- 访客 DTO 不含 `ownerId` 与 `inviteCode`；分享链接只有 6 位邀请码。
- 回忆按 `visibility=PUBLIC` 在服务端过滤，私密回忆不进入响应体。
- 留言默认 `VISIBLE`，主人软删除为 `DELETED`；只有星球主人可删。
- ENTER 记录按 `visitorId` 做 30 分钟去重，避免刷新刷量。

### AI 宠物接待员
统一入口 `POST /api/ai/chat`，入参 `{ type, planetId, visitorName, content }`，出参 `{ text, source }`。

- `type=welcome`：访客进入时 20–40 字欢迎语（缓存 24h）
- `type=reply`：留言后的宠物回复，50 字内
- `type=brief`：主人今日访客简报，最多 3 条（缓存 24h，手动重新生成可绕过）

Prompt 约束写在 `src/lib/ai.ts`：以宠物第一人称、简短温和、不透露主人隐私、不承诺线下见面、不编造事实、只输出一句话。**宠物人格与星球信息从数据库读**，不接受前端传入，防提示词注入。

降级链路：厂商失败/超时/未配 Key → 模板文案；`/api/ai/chat` 本身不可用 → 留言回复用「{宠物名}记下了你的话」，简报不阻塞页面。

### 轻实时
主人端每 5 秒请求 `/api/planet/owner/dashboard`，`document.visibilityState !== 'visible'` 时跳过，切回页面立即补一次。访客页是一次性拉取 + 动作后局部更新，不做轮询。

### 开场动画
`src/components/Intro.tsx` 保持契约：

```ts
type IntroProps = { duration?: number; skippable?: boolean; onFinish: () => void };
```

`INTRO_MODE`（`src/lib/config.ts` / `NEXT_PUBLIC_INTRO_MODE`）控制 `placeholder | lottie | video`。当前 placeholder 版本：CSS 渐变背景 + 星球淡入 + 金色轨道环 + 爪印 + 文案「有些回忆，值得一颗星球」，3 秒自动 `onFinish`，右下角可跳过；首页「重播开场动画」可再次播放；每次对话首次进入才播放（sessionStorage）。

---

## 四、联调清单（答辩演示脚本）

准备两个浏览器（或一个正常窗口 + 一个无痕窗口），分别扮演 A 主人、B 访客。

**A 主人**
1. 打开 `/`，输入昵称「阿桃」，看开场动画 → 跳过；确认首页显示自己的星球与权限「邀请码」。
2. 进入 `/planet/owner`：确认邀请码为 6 位；点「复制链接」；点「公开」或保留「邀请码」。
3. 记录邀请码，保持该页面不动（可观察 5 秒轮询指示灯）。

**B 访客**
4. 无痕窗口打开 `/`，昵称「小柚」→ 进入后打开 `/star-map`。
5. 若能找到 A 的公开星球，直接点击进入；或用 A 的邀请码在「用邀请码敲门」中输入 → 自动跳转 `/planet/visit/[code]` → `/planet/[id]?code=...`。
6. 访客页顶部出现 AI 欢迎语气泡（有 Key 显示「AI 宠物接待」，无 Key 显示「模板问候」）。
7. 点「点亮星球」「送一颗星」「喂食」；在留言板写下留言 → 立刻看到宠物回复。
8. 确认回忆墙只有公开回忆，看不到私密内容；页面无 ownerId、无邀请码字段。

**A 主人回看**
9. 回到 `/planet/owner`，5 秒内出现 B 的访客记录（ENTER/LIGHT/STAR/FEED/MESSAGE）与留言。
10. 点「生成简报」，出现 3 条以内的今日访客简报。
11. 点留言右上「删除」，访客页刷新后该留言消失。

**边界验证**
12. A 把权限改为「私密」→ B 刷新或重新打开链接 → 显示「这颗星球现在是私密的」，接口 403。
13. A 重置邀请码 → B 用旧码访问 → 提示需要有效邀请码。
14. 把 `.env` 的 `AI_API_KEY` 改错或断网 → 刷新访客页与留言 → 页面不崩，出现模板欢迎语与「记下了你的话」。
15. 浏览器 DevTools → Sources / Network 搜索 `AI_API_KEY`、`sk-`，确认前端无任何 Key。

---

## 五、验收清单

| # | 验收项 | 对应实现 | 自测 |
| --- | --- | --- | --- |
| A | 用户生成星球并设为 PUBLIC / INVITE | `ensurePlanetForUser`、`PATCH /api/planet/owner/settings` | ✅ |
| B | 通过星图或邀请码进入 A 的星球 | `StarMapView`、`/planet/visit/[code]` | ✅ |
| C | B 看到宠物与公开回忆，收到 AI 欢迎语 | `PlanetScene`、`MemoryWall`、`AiWelcomeBubble` | ✅ |
| D | B 点亮 / 留言成功 | `/action`、`/message` + visits | ✅ |
| E | A 端看到访客记录与留言 | `/owner/dashboard` 5s 轮询 | ✅ |
| F | AI 宠物回复出现 | `/api/ai/chat` reply + 回写 `aiReply` | ✅ |
| G | PRIVATE 星球不可访问 | `resolvePlanetAccess` 返回 403 | ✅ |
| H | 前端无 API Key | Key 只在服务端，无 `NEXT_PUBLIC_` | ✅ |
| I | 断网 / AI 失败页面不崩、有模板降级 | `fallbackText` + 双层兜底 | ✅ |
| J | 开场动画可跳过且不阻塞主流程 | `Intro` 3s 自动 / 跳过按钮 | ✅ |

已用脚本 + 浏览器实测：权限 403、错误邀请码、旧码失效、私密回忆过滤、敏感词打码（`傻逼` → `**`）、访客越权删除留言 403、未登录 401、邀请码入口 307 跳转均符合预期。

### 边界与已知取舍
- SQLite 不支持 Prisma enum，权限与动作字段用 `String`，取值集中在 `src/lib/constants.ts` 并在服务端校验。
- 留言的 AI 回复是**同步等待**（带 9s 超时 + 模板兜底）后返回，换取“提交即见回复”的演示效果；接口契约中留有 `source` 字段，可平滑改成异步回写。
- 部署 Vercel 时把 `datasource.provider` 换成 `postgresql`（Neon / Supabase 等），其余代码无需改动；本地演示继续用 SQLite。
- 不做实时同屏、聊天室、语音视频、3D；访客始终是只读权限，不能编辑回忆。

---

## 六、答辩叙事（30 秒版）

> 这是一个「异步串门式轻社交」。每个用户拥有一颗自己的星球，隐私分级由主人掌握：私密、邀请码、公开。
> 别人来串门时，AI 不是通用聊天机器人，而是**主人宠物的化身**——按宠物人格说欢迎语、回留言、给主人写访客简报，同时被严格约束不泄露隐私、不编造事实。
> 技术上刻意做减法：轻实时用轮询而不是 WebSocket，视觉用 CSS 而不是 3D 引擎，AI 全部走服务端代理并在失败时降级。
> 所以它可演示、可部署、也可解释：回忆值得被看见，但边界由主人决定。
