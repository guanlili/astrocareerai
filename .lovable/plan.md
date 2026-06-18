# 面试辅导数字分身平台 — 前端高保真原型计划

## 目标
构建一个**纯前端高保真原型**，覆盖 PRD 中学员端、老师端、管理后台三端的核心页面，用于产品评审与汇报演示。所有数据使用本地 mock，不接入后端、AI、支付。视觉风格统一：**深色金融蓝（专业稳重）**，简体中文界面。

## 设计系统
- **基调**：深色背景（深海军蓝 #0A1628 / #0F1B2D），主色金融蓝（#2563EB → #3B82F6 渐变），辅助金色高光（#D4A84C，用于评分/付费高亮），中性灰阶用于卡片层级。
- **字体**：标题 `Sora`（现代有力），正文 `Noto Sans SC`（中文清晰），数字/数据 `JetBrains Mono`。通过 `@fontsource` 安装。
- **组件**：基于现有 shadcn（卡片、表格、Tabs、Dialog、Badge、Progress、Avatar、Sidebar），全部按深色 token 重写颜色。
- **图表**：使用 `recharts`（已存在）绘制雷达图、能力曲线、收益柱状图。
- **所有颜色走 `src/styles.css` 语义 token**，禁用硬编码颜色类。

## 信息架构与路由

学员端（公开壳）：
```
/                       首页（推荐老师 + 价值主张）
/teachers               老师列表（筛选）
/teachers/$id           老师详情
/chat/$teacherId        AI 对话辅导（核心交互页）
/report/$sessionId      评估报告（雷达图）
/growth                 成长追踪
/booking/$teacherId     转人工预约
/me                     我的（订单/订阅/消息 Tabs）
```

老师端（带左侧 Sidebar 布局 `_teacher`）：
```
/teacher                工作台首页（数据概览）
/teacher/avatar         分身管理（素材/训练状态/风格调优/预览）
/teacher/students       学员管理
/teacher/pricing        服务与定价
/teacher/schedule       档期管理
/teacher/analytics      数据看板
/teacher/earnings       收益结算
```

管理后台（带左侧 Sidebar 布局 `_admin`）：
```
/admin                  概览
/admin/review           老师入驻审核
/admin/content          题库/内容管理
/admin/users            用户管理
/admin/training         分身训练任务监控
/admin/payments         支付与结算
/admin/compliance       内容合规审核
```

顶部全局有一个**端切换器**（学员/老师/管理）便于演示。

## 关键页面交互细节
- **AI 对话辅导页**：左侧老师卡片 + 模式切换（自由问答 / 模拟面试 / 简历优化）；中间气泡对话流（含 mock 的动态追问），底部输入框；右侧实时显示"当前考察维度"小卡片，演示动态评估。免费试聊轮次计数条。触发"建议转人工"时弹出 CTA 卡片。
- **评估报告页**：六维雷达图（表达逻辑/专业知识/抗压应变/岗位匹配/简历亮点/整体印象），亮点 & 不足两栏，历史对比折线，可导出（按钮）。
- **分身管理**：素材上传区（拖拽占位）、训练状态时间轴（排队/处理/成功/失败状态徽章）、风格三滑块（语气/专业度/详细度），右侧预览对话窗口。
- **训练任务监控**：表格 + 队列堆积图 + 成功率仪表盘。
- **老师详情页**：Hero（头像 + 标签 + 评分 + 起价 CTA）、案例图文、价格表、学员评价、试聊按钮。
- 所有空状态、加载骨架（Skeleton）都做完，符合 PRD 验收要求。

## 实现步骤
1. **样式系统**：改写 `src/styles.css`，落地深色金融蓝 token（背景/前景/主色/金色高光/卡片/边框/雷达色板）；`bun add @fontsource/sora @fontsource/noto-sans-sc @fontsource/jetbrains-mono`，在 `src/routes/__root.tsx` 中 import。
2. **共享布局**：建 `src/components/layouts/StudentShell.tsx`（顶部导航 + 端切换）、`TeacherShell.tsx`、`AdminShell.tsx`（后两者用 shadcn Sidebar）。
3. **Mock 数据**：`src/mock/teachers.ts`、`students.ts`、`sessions.ts`、`trainingJobs.ts`、`orders.ts` 等，确保各页面数据自洽。
4. **学员端路由**：依次实现 8 个路由文件，每个 `head()` 写独立 SEO meta。
5. **老师端路由**：建 `_teacher.tsx` 布局 + 7 个子路由。
6. **管理后台路由**：建 `_admin.tsx` 布局 + 7 个子路由。
7. **替换 `routes/index.tsx`** 占位为真实首页。
8. **图表组件**：封装 `RadarChart`、`TrendLine`、`RevenueBar`、`GaugeMeter`。
9. **核心交互页（对话）**：用本地 state 模拟 AI 回复（预设脚本），演示打字机效果与"建议转人工"触发。
10. **校验**：检查所有路由 `createFileRoute` 路径与文件名一致，每个布局含 `<Outlet />`，无硬编码颜色，构建通过。

## 不在本期范围
- 真实后端、数据库、Lovable Cloud
- 真实 AI / RAG / 流式回复
- 真实支付、登录认证
- 3D 数字人、语音克隆
- 移动端深度适配（基础响应式即可）

完成后可作为产品评审的可点击 Demo；下一阶段再决定是否接入 Lovable Cloud + Lovable AI 做 MVP 实跑。
