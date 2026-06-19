# 面镜 MirrorHire

> 老师 IP × AI 数字分身,让每位求职者拥有随身专属导师。

入驻老师 100% 来自一线企业面试官。AI 分身基于老师**专属知识库**进行结构化追问,支持简历优化、模拟面试、能力评估,关键时刻一键转人工 1v1。

## ✨ 核心特性

- **老师专属知识库** — RAG 严格隔离,分身只用本人素材,不串用其他老师内容。
- **动态追问 ≠ 题库** — AI 基于上一轮回答生成下一题,告别固定脚本。
- **六维可追溯评估** — 雷达图分数可下钻到对话片段,不是黑盒打分。
- **AI + 真人闭环** — AI 处理 80% 重复问题,触发条件自动转人工。

## 🧭 三端一览

| 端 | 入口 | 主要页面 |
| --- | --- | --- |
| **学生端** | `/` | 首页、老师库 `/teachers`、老师详情 `/teachers/$id`、AI 对练 `/chat/$teacherId`、预约 1v1 `/booking/$teacherId`、评估报告 `/report/$sessionId`、个人中心 `/me`、成长追踪 `/growth` |
| **老师端** | `/teacher` | 工作台、数据分析 `analytics`、AI 分身 `avatar`、收益 `earnings`、学员 `students`、服务定价 `pricing`、排期 `schedule` |
| **管理后台** | `/admin` | 总览、用户 `users`、审核 `review`、合规 `compliance`、支付 `payments`、内容 `content`、培训 `training` |

> 本仓库目前使用 `src/mock/*` 提供 Mock 数据,后端接口接入后逐步替换。

## 🛠 技术栈

- **框架**:[TanStack Start](https://tanstack.com/start/latest) + [TanStack Router](https://tanstack.com/router/latest)(文件路由 + SSR)
- **UI**:React 19 · [Tailwind CSS v4](https://tailwindcss.com) · [Radix UI](https://www.radix-ui.com) / shadcn 风格组件
- **数据**:[TanStack Query](https://tanstack.com/query/latest) · [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev)
- **图表**:[Recharts](https://recharts.org)
- **构建**:Vite · TypeScript · [Bun](https://bun.sh)(包管理与 lockfile)
- **代码规范**:ESLint · Prettier

## 🚀 快速开始

```bash
# 安装依赖(推荐 Bun,与 bun.lock 一致)
bun install

# 本地开发
bun run dev

# 生产构建 / 预览
bun run build
bun run preview

# 代码检查与格式化
bun run lint
bun run format
```

> 也兼容 `npm` / `pnpm`,但 lockfile 为 `bun.lock`,混用会产生重复锁文件。

## 📁 目录结构

```
src/
├── routes/            # 文件路由 —— 每个文件即一个页面(详见下方约定)
├── components/
│   ├── ui/            # 基础组件(shadcn 风格)
│   ├── layouts/       # 三端外壳:StudentShell / TeacherShell / AdminShell
│   └── common/        # 通用展示组件(PanelKit 等)
├── hooks/             # 自定义 Hooks
├── lib/               # 工具函数、错误上报
├── mock/              # Mock 数据(平台 / 老师 / 会话)
├── styles.css         # 全局样式与设计 Token
├── router.tsx         # 路由配置
├── server.ts          # SSR 服务入口
└── start.ts           # 应用入口
```

## 📐 路由约定

本项目使用 **TanStack Router 文件路由**,目录下每个 `.tsx` 即一个路由。请勿创建 `src/pages/`、`src/routes/_app/index.tsx` 或 `app/layout.tsx` 等 Next.js / Remix 风格目录 —— 唯一的根布局是 `src/routes/__root.tsx`。

| 文件 | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `teachers/index.tsx` | `/teachers` |
| `teachers/$id.tsx` | `/teachers/:id`(动态段,直接用 `$`,不要花括号) |
| `posts/{-$category}.tsx` | `/posts/:category?`(可选段) |
| `files/$.tsx` | `/files/*`(splat 段,用 `_splat` 读取,不要用 `*`) |
| `_layout.tsx` | 布局路由,通过 `<Outlet />` 渲染子路由 |
| `__root.tsx` | 应用外壳,包裹所有页面 —— 请保留 `<Outlet />` |

> `src/routeTree.gen.ts` 为自动生成,请勿手动编辑。

## 🔌 Lovable 集成

本项目通过 [Lovable](https://lovable.dev) 连接构建。Lovable 在仓库里的"触点"只有三处:

- **构建链**:`@lovable.dev/vite-tanstack-config`(`vite.config.ts` 引入,接管整个 Vite 配置)
- **平台元数据**:`.lovable/` 目录(`project.json` 标识项目,`plan.md` 是 Lovable AI 的上下文)
- **错误上报**:`src/lib/lovable-error-reporting.ts`(运行时报错回传编辑器)

> **核心原则**:Lovable 云端跑的就是这份代码。本地 `bun run build` / `bun run dev` 能跑通,Lovable 预览就是好的 —— 这是检验改动是否安全的可靠尺子。

### 改动安全分级

| 级别 | 范围 |
| --- | --- |
| ✅ **随便改** | `src/routes/**`、`src/components/**`、`src/mock/**`、`src/hooks/**`、`src/lib/**`(非 lovable)、`src/styles.css`、文档 |
| ⚠️ **小心** | `package.json` 依赖版本、`vite.config.ts`、`bunfig.toml` 里的 `@lovable.dev/*` 排除项 —— 改完务必本地 `bun run build` 验证 |
| 🚫 **别碰** | `.lovable/` 目录、`@lovable.dev/vite-tanstack-config` 依赖、`AGENTS.md` 的 `LOVABLE:BEGIN/END` 块、已推送的 Git 历史 |

### 新增页面 / 功能

- 在 `src/routes/` 下新建 `.tsx`,遵循上文「路由约定」,套用对应外壳(`StudentShell` / `TeacherShell` / `AdminShell`)。
- `routeTree.gen.ts` 自动生成,**不要手改**,提交时一并带上。
- 引入新 npm 包前注意 `bunfig.toml` 的 `minimumReleaseAge` 冷却期 —— 本地装通再 push。
- 新页面若不在 `.lovable/plan.md` 规划内,建议同步在 `plan.md` 补一条说明,Lovable AI 才跟得上。

### 协作纪律

- **不要同时**在本地和 Lovable 编辑器两边改 —— 单分支同步,并发会冲突。一边改完先同步,另一边拉到最新再动手。
- **不要**重写已发布的 Git 历史(强推 / 变基 / 压缩已推送的提交),否则会破坏 Lovable 侧的历史。
- push 前确保分支处于可用状态 —— commit 会同步回 Lovable 编辑器。

## License

私有项目,保留所有权利。
