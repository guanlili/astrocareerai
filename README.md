# 面镜 MirrorHire

> 老师 IP × AI 数字分身，让每位求职者拥有随身专属导师。

入驻老师 100% 来自一线企业面试官。AI 分身基于老师**专属知识库**进行结构化追问，支持简历优化、模拟面试、能力评估，关键时刻一键转人工 1v1。

## ✨ 核心特性

- **老师专属知识库** — RAG 严格隔离，分身只用本人素材，不串用其他老师内容。
- **动态追问 ≠ 题库** — AI 基于上一轮回答生成下一题，告别固定脚本。
- **六维可追溯评估** — 雷达图分数可下钻到对话片段，不是黑盒打分。
- **AI + 真人闭环** — AI 处理 80% 重复问题，触发条件自动转人工。
- **数字人视频面试间** — 接入 HeyGen 数字人 + 语音 ASR，像视频会议一样开口练面试。

## 🧭 三端一览

| 端 | 入口 | 主要页面 |
|---|---|---|
| **学生端** | `/` | 首页、老师库 `/teachers`、老师详情 `/teachers/$id`、AI 文字对练 `/chat/$teacherId`、**视频面试间** `/video/$teacherId`、预约 1v1 `/booking/$teacherId`、评估报告 `/report/$sessionId`、个人中心 `/me`、成长追踪 `/growth` |
| **老师端** | `/teacher` | 工作台、数据分析 `analytics`、AI 分身 `avatar`、**老师配置平台** `publish`、收益 `earnings`、学员 `students`、服务定价 `pricing`、排期 `schedule` |
| **管理后台** | `/admin` | 总览、用户 `users`、审核 `review`、合规 `compliance`、支付 `payments`、内容 `content`、培训 `training` |

> 本仓库目前使用 `src/mock/*` 提供 Mock 数据，后端接口接入后逐步替换。

## 🛠 技术栈

- **框架**：[TanStack Start](https://tanstack.com/start/latest) + [TanStack Router](https://tanstack.com/router/latest)（文件路由 + SSR）
- **UI**：React 19 · [Tailwind CSS v4](https://tailwindcss.com) · [Radix UI](https://www.radix-ui.com) / shadcn 风格组件
- **数据**：[TanStack Query](https://tanstack.com/query/latest) · [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev)
- **图表**：[Recharts](https://recharts.org)
- **LLM**：Qwen（阿里云 DashScope，OpenAI 兼容接口）
- **数字人**：[HeyGen Streaming Avatar SDK](https://github.com/HeyGen-Official/StreamingAvatarSDK)（REPEAT 模式，不走 HeyGen LLM）
- **构建**：Vite · TypeScript · [Bun](https://bun.sh)（包管理与 lockfile）
- **代码规范**：ESLint · Prettier

## 🚀 快速开始

```bash
# 安装依赖（推荐 Bun，与 bun.lock 一致）
bun install

# 复制环境变量模板，填入密钥
cp .env.example .env.local

# 本地开发
bun run dev

# 生产构建 / 预览
bun run build
bun run preview

# 代码检查与格式化
bun run lint
bun run format
```

> 也兼容 `npm` / `pnpm`，但 lockfile 为 `bun.lock`，混用会产生重复锁文件。

## 🔑 环境变量

复制 `.env.example` 为 `.env.local` 并填入：

| 变量 | 说明 | 必填 |
|---|---|---|
| `DASHSCOPE_API_KEY` | 阿里云 DashScope API Key（驱动 AI 面试官） | ✅ 启用真实 AI |
| `QWEN_MODELS` | 候选模型列表，逗号分隔，按序自动切换（如 `qwen3-max,qwen-plus`） | 可选 |
| `HEYGEN_API_KEY` | HeyGen API Key（驱动数字人视频面试间） | ✅ 启用视频模式 |

> 无密钥时自动降级：AI 面试官走打桩模拟回复；视频面试间显示「未配置」提示，可切回文字聊天室。

## 🗂 目录结构

```
src/
├── routes/            # 文件路由 —— 每个文件即一个页面
├── agent/interview/   # 面试 Agent 核心（纯 TS，无 UI 依赖）
│   ├── types.ts       # 数据模型契约（唯一事实来源）
│   ├── contracts.ts   # 行为接口（InterviewClient / ModelClient / SessionStore）
│   ├── agent.ts       # MockInterviewAgent：状态机 + 选题 + guardrails
│   ├── model.ts       # ModelClient 实现（QwenModelClient / StubModelClient）
│   ├── store.ts       # LocalSessionStore（断点续连）
│   └── prompt.ts      # 系统提示词组装
├── media/             # 数字人视听层（AvatarClient / ASRClient 接口 + HeyGen 实现）
│   ├── contracts.ts   # AvatarClient / ASRClient 接口 + TrialQuota（20 分钟额度）
│   ├── heygen.ts      # 服务端 token 端点（密钥不进客户端）
│   ├── heygenAvatarClient.ts  # HeyGen AvatarClient 实现
│   └── asr/           # ASRClient 实现（WebSpeechASRClient）
├── llm/               # LLM 服务端代理（Qwen via createServerFn）
├── i18n/              # 产品多语言（中 / 英，与面试语言无关）
├── components/
│   ├── ui/            # 基础组件（shadcn 风格）
│   ├── layouts/       # 三端外壳：StudentShell / TeacherShell / AdminShell
│   └── common/        # 通用展示组件（PanelKit 等）
├── mock/              # Mock 数据（老师 / 会话 / 面试配置 / 注册表）
├── lib/               # 工具函数
├── styles.css         # 全局样式与设计 Token
└── start.ts           # 应用入口
```

## 🎙 视频面试间（HeyGen 数字人）

`/video/$teacherId` 路由提供「数字人 + 语音」面试体验，架构上是文字聊天室的「视听升级版」：

```
候选人开口（麦克风）
  → Web Speech API ASR → 文字
  → InterviewClient.reply()（Qwen 驱动，与文字版完全相同）
  → response.say
  → HeyGen avatar.speak(REPEAT) → 数字人朗读
```

- **大脑不变**：对话内容、题目、即时反馈、报告全部来自 Qwen，HeyGen 只负责「脸 + 声音」。
- **免费额度**：20 分钟，耗尽后可一键切回文字聊天室（不计费）。
- **数字人形象**：有老师本人授权形象时用本人（`isPersonalAvatar: true`），否则走 HeyGen stock avatar。
- **密钥配置**：`avatarId` / `voiceId` 在 `src/mock/interview.ts` 的 `VIDEO_CONFIGS` 中填写；`HEYGEN_API_KEY` 放 `.env.local`。

## 🤖 面试 Agent 架构

面试 Agent（`src/agent/interview/`）独立于 UI，可脱离浏览器测试：

```bash
# 快速测试：打桩模式（无需密钥）
bun run scripts/interview-repl.ts --stub

# 真实 Qwen 模型
bun run scripts/interview-repl.ts --live
```

核心设计：
- **`InterviewClient` 接口**：`start / reply / finish / resume`，Mock ↔ 真实 API ↔ 后端三种实现可互换，UI 零改动。
- **断点续连**：每回合先落 `localStorage`，刷新/关页后进入聊天室自动提示「继续上次」。
- **事件日志**：每回合 append-only 记录，含模型 id / 提示词版本 / 延迟，可离线复盘与再训练。

## 📐 路由约定

使用 **TanStack Router 文件路由**，每个 `.tsx` 即一个路由。请勿创建 `src/pages/`、Next.js / Remix 风格目录。

| 文件 | URL |
|---|---|
| `index.tsx` | `/` |
| `teachers.index.tsx` | `/teachers` |
| `teachers.$id.tsx` | `/teachers/:id` |
| `chat.$teacherId.tsx` | `/chat/:teacherId` |
| `video.$teacherId.tsx` | `/video/:teacherId` |
| `teacher.publish.tsx` | `/teacher/publish` |

> `src/routeTree.gen.ts` 自动生成，**不要手改**，提交时一并带上。

## 🔌 Lovable 集成

本项目通过 [Lovable](https://lovable.dev) 连接构建，核心原则：

- **不要重写已发布的 Git 历史**（不强推、不变基、不压缩已推送的 commit）。
- push 的 commit 会自动同步回 Lovable 编辑器，保持分支可用状态。
- `@lovable.dev/vite-tanstack-config` 已接管 Vite 配置，**不要重复添加** tanstackStart / tailwind 等插件。

| 级别 | 范围 |
|---|---|
| ✅ 随便改 | `src/routes/**`、`src/components/**`、`src/mock/**`、`src/agent/**`、`src/media/**`、`src/styles.css` |
| ⚠️ 小心 | `package.json` 依赖版本、`vite.config.ts`（改完本地 `bun run build` 验证） |
| 🚫 别碰 | `.lovable/` 目录、`AGENTS.md` 的 `LOVABLE:BEGIN/END` 块、已推送的 Git 历史 |

## License

私有项目，保留所有权利。
