// 统一 Mock 状态层 —— 三端共享的唯一可变演示数据（纯前端 Demo）
//
// 本模块是全仓唯一的可变状态真相源（admin / teacher / student 三端共用）：
//   - 跨端同步：学生下单 → 写入 orders → 管理端「支付与结算」、老师端「收益结算」、
//     学生端「我的」均读同一份 orders，即时反映；管理端退款同样联动三端。
//   - SSR 安全：localStorage 仅客户端可用，服务端读不到 → 初始快照用确定性 SEED，
//     useAppState()/useMockState() 首帧渲染 SEED（与 SSR 一致，避免水合不一致），
//     挂载后 hydrate 读 localStorage 真实值并 emit 重渲染（沿用既有 teacherStudio 模式）。
//   - 避免 Math.random：SEED 全部来自 platform.ts 的静态常量；新增 id 用 Date.now()
//     （仅客户端交互后产生，不在 SSR/渲染期执行）。
//   - 持久化：localStorage（key 见下），刷新保留；resetAppState() 一键重置回种子。
//
// 既有 src/mock/store.ts 现为对本模块的再导出（向后兼容 admin/teacher 路由的导入）。
// 替换为真实后端时：保留本模块对外形状（types + 钩子 + 动作），把 read/commit 换成
// fetch/POST 即可，消费侧（routes/*）无需改动。

import { useEffect, useState } from "react";
import {
  orders as platformOrders,
  reviewQueue,
  trainingJobs as platformTraining,
  adminComplianceItems,
  students as platformStudents,
  type Order as PlatformOrder,
  type Student,
} from "./platform";
import { resetStudio } from "./teacherStudio";
import { resetPublishedTeachers } from "./teacherRegistry";

// ──────────────────────────────────────────────────────────────────────────
// 类型
// ──────────────────────────────────────────────────────────────────────────

export type OrderStatus = "已支付" | "待确认" | "已完成" | "退款" | "退款中" | "已退款";
export type OrderType = "试聊" | "订阅" | "1v1辅导" | "Package";

/** 订单（统一事务流水；admin 支付、teacher 收益、student 我的共用）。 */
export type Order = {
  id: string;
  student: string;
  teacher: string; // 姓名（兼容 platform 种子）
  teacherId?: string; // 学生下单的 1v1 才有
  type: OrderType;
  amount: number;
  status: OrderStatus;
  date: string; // YYYY-MM-DD
  // 学生 1v1 预约的额外字段（可选）
  slot?: string;
  duration?: 60 | 120;
  createdAt?: number;
};

export type BookingStatus = OrderStatus;

/** 学生 1v1 预约（booking 页下单、me 页展示）。与同 id 的 Order 保持同步。 */
export type Booking = {
  id: string;
  teacherId: string;
  teacherName: string;
  studentName: string;
  slot: string;
  duration: 60 | 120;
  amount: number;
  status: BookingStatus;
  createdAt: number;
};

export type Favorite = string; // teacherId（简单模型：收藏只存老师 id）
export type Subscription = { teacherId: string; active: boolean };

export type SessionRecord = {
  sessionId: string;
  teacherId: string;
  teacherName: string;
  scene: string;
  overall: number;
  date: string;
};

export type TrialUsage = { teacherId: string; used: number };

export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewItem = {
  id: string;
  name: string;
  title: string;
  submittedAt: string;
  status: ReviewStatus;
  materials: number;
};

export type TrainingStatus = "queued" | "running" | "success" | "failed";
export type TrainingJob = {
  id: string;
  teacher: string;
  status: TrainingStatus;
  progress: number;
  startedAt: string;
  duration: string;
  failReason?: string;
};

/** 合规处置状态：allowed=放行，takenDown=下线（与 admin 路由用词一致）。 */
export type ComplianceStatus = "pending" | "allowed" | "takenDown";
export type ComplianceItem = {
  id: string;
  type: string;
  teacher: string;
  risk: "低" | "中" | "高";
  reason: string;
  time: string;
  status: ComplianceStatus;
};

// ──────────────────────────────────────────────────────────────────────────
// 后台运营任务（统一聚合） + 审计日志
// ──────────────────────────────────────────────────────────────────────────

/** 运营任务来源模块（与各业务状态机一一对应）。 */
export type TaskType = "review" | "training" | "compliance" | "refund";
export type TaskPriority = "P0" | "P1" | "P2";

/**
 * 统一优先级运营任务（纯派生，不入库）：把分散在 reviews / trainingJobs /
 * compliance / orders 里的待处理项归一为同一张可筛选、可执行的任务列表，
 * 供「运营待办」中心与首页「今日待办」复用。
 */
export type OpsTask = {
  id: string; // 形如 task:<type>:<entityId>，保证全局唯一
  type: TaskType;
  priority: TaskPriority;
  title: string;
  subtitle: string;
  targetId: string; // 原始实体 id（review / training / compliance / order）
  meta: Record<string, string>; // 展开上下文（已格式化为可读字符串）
};

/** 审计动作（后台运营动作归类，便于「最近处理记录」展示）。 */
export type AuditAction =
  | "review.approve"
  | "review.reject"
  | "training.retry"
  | "training.cancel"
  | "compliance.allow"
  | "compliance.takedown"
  | "refund.request"
  | "refund.approve";

/** 审计日志条目（仅客户端交互后产生，SSR/首帧为空 → 无水合不一致）。 */
export type AuditEntry = {
  id: string;
  action: AuditAction;
  targetType: TaskType;
  targetId: string;
  summary: string; // 人类可读摘要
  at: number; // epoch ms（仅客户端、非渲染期产生）
};

export type AppState = {
  favorites: Favorite[];
  bookings: Booking[]; // 学生 1v1 预约（booking/me 页用）
  orders: Order[]; // 统一事务流水（admin 支付 / teacher 收益 / 联动来源）
  seedOrders: Order[]; // 静态种子副本（me 页合并展示，只读）
  subscriptions: Subscription[];
  sessions: SessionRecord[];
  trialUsage: TrialUsage[];
  reviews: ReviewItem[];
  trainingJobs: TrainingJob[];
  compliance: ComplianceItem[];
  auditLog: AuditEntry[]; // 后台运营动作审计（SSR 为空，客户端交互后追加）
  version: number;
};

// store.ts 兼容别名类型
export type MockState = AppState;

// ──────────────────────────────────────────────────────────────────────────
// SEED —— 全部确定性（来自 platform.ts 静态常量），SSR 与首帧一致
// ──────────────────────────────────────────────────────────────────────────

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);
}

function seedOrdersFromPlatform(): Order[] {
  return (platformOrders as PlatformOrder[]).map((o) => ({
    id: o.id,
    student: o.student,
    teacher: o.teacher,
    type: o.type,
    amount: o.amount,
    status: o.status as OrderStatus,
    date: o.date,
  }));
}

function seedSessions(): SessionRecord[] {
  // 给成长追踪一个有内容的起点；sessionId 以 seed- 前缀，报告页读不到真实报告时回退到 reportData。
  return [
    {
      sessionId: "seed-bytedance-pm",
      teacherId: "t-001",
      teacherName: "陈昊",
      scene: "字节 PM 终面 · 模拟",
      overall: 82,
      date: "2026-06-18",
    },
    {
      sessionId: "seed-tencent-pcg",
      teacherId: "t-001",
      teacherName: "陈昊",
      scene: "腾讯 PCG 业务面",
      overall: 76,
      date: "2026-06-15",
    },
    {
      sessionId: "seed-resume",
      teacherId: "t-006",
      teacherName: "Anna Liu",
      scene: "简历优化 · 自由问答",
      overall: 70,
      date: "2026-06-09",
    },
  ];
}

export function seed(): AppState {
  const orders = seedOrdersFromPlatform();
  return {
    favorites: [],
    bookings: [],
    orders,
    seedOrders: clone(orders),
    subscriptions: [{ teacherId: "t-001", active: true }],
    sessions: seedSessions(),
    trialUsage: [],
    reviews: clone(reviewQueue) as ReviewItem[],
    trainingJobs: clone(platformTraining) as TrainingJob[],
    compliance: clone(adminComplianceItems).map(
      (c): ComplianceItem => ({ ...c, risk: c.risk as ComplianceItem["risk"], status: "pending" }),
    ),
    auditLog: [],
    version: 1,
  };
}

export const APP_STORE_SEED = seed();

// ──────────────────────────────────────────────────────────────────────────
// 持久化（SSR 安全）
// ──────────────────────────────────────────────────────────────────────────

const KEY = "mirrorhire:appState:v1";

function readFromStorage(): AppState {
  try {
    if (typeof localStorage === "undefined") return seed();
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = seed();
    return {
      ...base,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : base.favorites,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : base.bookings,
      orders: Array.isArray(parsed.orders) ? parsed.orders : base.orders,
      seedOrders: base.seedOrders, // 种子恒定，不持久化覆盖
      subscriptions: Array.isArray(parsed.subscriptions)
        ? parsed.subscriptions
        : base.subscriptions,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : base.sessions,
      trialUsage: Array.isArray(parsed.trialUsage) ? parsed.trialUsage : base.trialUsage,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : base.reviews,
      trainingJobs: Array.isArray(parsed.trainingJobs) ? parsed.trainingJobs : base.trainingJobs,
      compliance: Array.isArray(parsed.compliance) ? parsed.compliance : base.compliance,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : base.auditLog,
    };
  } catch {
    return seed();
  }
}

function writeToStorage(s: AppState): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 隐私模式等 → 忽略 */
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 反应式核心（订阅 / 通知）
// ──────────────────────────────────────────────────────────────────────────

let snapshot: AppState = APP_STORE_SEED;
const subscribers = new Set<() => void>();

function notify(): void {
  subscribers.forEach((fn) => fn());
}

export function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function getAppState(): AppState {
  return snapshot;
}

/** store.ts 别名。 */
export function getMockState(): AppState {
  return snapshot;
}

function commit(next: AppState): AppState {
  snapshot = next;
  writeToStorage(next);
  notify();
  return next;
}

function update(recipe: (s: AppState) => AppState): AppState {
  return commit(recipe(snapshot));
}

// ──────────────────────────────────────────────────────────────────────────
// 审计日志（轻量记录 helper）—— 仅在客户端交互后调用，故 Date.now() 安全
// ──────────────────────────────────────────────────────────────────────────

const AUDIT_CAP = 200;

/** 在 recipe 内追加一条审计日志（与业务变更同一 commit，保证原子）。 */
function appendAudit(s: AppState, entry: Omit<AuditEntry, "id" | "at">): AuditEntry[] {
  return [
    {
      ...entry,
      id: `AUD-${Date.now().toString(36).toUpperCase()}`,
      at: Date.now(),
    },
    ...s.auditLog,
  ].slice(0, AUDIT_CAP);
}

/**
 * 记录一条后台运营审计（公开 helper）。
 * 业务动作（审核 / 训练 / 合规 / 退款）内部已自动调用，多数情况下无需手动调用；
 * 仅在需要补充自定义事件时使用。
 */
export function logAudit(entry: Omit<AuditEntry, "id" | "at">): void {
  update((s) => ({ ...s, auditLog: appendAudit(s, entry) }));
}

/** 客户端挂载后：把 localStorage 真实数据灌入快照并 emit（SSR 安全，幂等）。 */
export function loadSnapshot(): void {
  snapshot = readFromStorage();
  notify();
}

/** store.ts 别名：在 __root 挂载时调用一次。 */
export function hydrateMockStore(): void {
  loadSnapshot();
}

// 跨标签同步：其它标签写入 localStorage → 本标签重读 + 通知
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      snapshot = readFromStorage();
      notify();
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────
// React 钩子（SSR 安全：首帧 SEED，挂载后加载真实值 + 订阅）
// ──────────────────────────────────────────────────────────────────────────

export function useAppState(): AppState {
  const [state, setState] = useState<AppState>(APP_STORE_SEED);
  useEffect(() => {
    loadSnapshot();
    setState(getAppState());
    return subscribe(() => setState(getAppState()));
  }, []);
  return state;
}

/** store.ts 别名（admin / teacher.earnings 用）。 */
export function useMockState(): AppState {
  return useAppState();
}

// ──────────────────────────────────────────────────────────────────────────
// 订单 / 预约互转（bookings ⇄ orders 同步的唯一通道）
// ──────────────────────────────────────────────────────────────────────────

/**
 * Booking → Order 的唯一换算（学生「我的」、admin 支付、老师收益共用）。
 * 导出供 me 页复用，避免各处重复换算导致 type / date 跨端不一致。
 * 1v1 预约页下单的均按「1v1辅导」计（时长差异已记在 duration 字段）。
 */
export function bookingToOrder(b: Booking): Order {
  return {
    id: b.id,
    student: b.studentName,
    teacher: b.teacherName,
    teacherId: b.teacherId,
    type: "1v1辅导",
    amount: b.amount,
    status: b.status,
    date: isoDate(b.createdAt),
    slot: b.slot,
    duration: b.duration,
    createdAt: b.createdAt,
  };
}

function isoDate(ms: number): string {
  try {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  } catch {
    return "2026-06-18";
  }
}

/** 让 orders 与 bookings 中的同 id 条目状态保持一致。 */
function syncStatusById(id: string, status: OrderStatus): (s: AppState) => AppState {
  return (s) => ({
    ...s,
    orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 学生端动作
// ──────────────────────────────────────────────────────────────────────────

export function isFavorite(teacherId: string): boolean {
  return snapshot.favorites.includes(teacherId);
}

export function toggleFavorite(teacherId: string): boolean {
  const exists = isFavorite(teacherId);
  update((s) => ({
    ...s,
    favorites: exists ? s.favorites.filter((id) => id !== teacherId) : [...s.favorites, teacherId],
  }));
  return !exists;
}

export function trialRemaining(teacherId: string, total = 5): number {
  const used = snapshot.trialUsage.find((t) => t.teacherId === teacherId)?.used ?? 0;
  return Math.max(0, total - used);
}

export function consumeTrial(teacherId: string): void {
  update((s) => {
    const idx = s.trialUsage.findIndex((t) => t.teacherId === teacherId);
    const next = [...s.trialUsage];
    if (idx >= 0) next[idx] = { teacherId, used: next[idx].used + 1 };
    else next.push({ teacherId, used: 1 });
    return { ...s, trialUsage: next };
  });
}

export function isSubscribed(teacherId: string): boolean {
  return snapshot.subscriptions.some((sub) => sub.teacherId === teacherId && sub.active);
}

export function setSubscription(teacherId: string, active: boolean): void {
  update((s) => {
    const idx = s.subscriptions.findIndex((sub) => sub.teacherId === teacherId);
    const next = [...s.subscriptions];
    if (idx >= 0) next[idx] = { teacherId, active };
    else next.push({ teacherId, active });
    return { ...s, subscriptions: next };
  });
}

export type NewBooking = Omit<Booking, "id" | "status" | "createdAt">;

/** 学生下单 1v1：同时写 bookings（学生视图）与 orders（管理/老师视图），保证跨端同步。 */
export function createBooking(input: NewBooking, status: BookingStatus = "待确认"): Booking {
  const booking: Booking = {
    ...input,
    id: `BKG-${Date.now().toString(36).toUpperCase()}`,
    status,
    createdAt: Date.now(),
  };
  update((s) => ({
    ...s,
    bookings: [booking, ...s.bookings],
    orders: [bookingToOrder(booking), ...s.orders],
  }));
  return booking;
}

export function setBookingStatus(id: string, status: BookingStatus): void {
  update(syncStatusById(id, status));
}

/** 报告页：幂等登记一次完成会话（供成长追踪列出）。 */
export function ensureSession(record: SessionRecord): void {
  update((s) => {
    if (s.sessions.some((x) => x.sessionId === record.sessionId)) return s;
    return { ...s, sessions: [record, ...s.sessions] };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 通用订单动作（admin 支付 / teacher 收益 / student 退款联动共用）
// ──────────────────────────────────────────────────────────────────────────

export type NewOrder = Omit<Order, "id" | "date"> & { id?: string; date?: string };

/** 追加一条订单（admin 手动开单 / 通用入口）。返回订单 id。 */
export function addOrder(input: NewOrder): string {
  const id = input.id ?? `ORD-${Date.now().toString().slice(-7)}`;
  const order: Order = {
    ...input,
    id,
    date: input.date ?? isoDate(Date.now()),
  };
  update((s) => ({ ...s, orders: [order, ...s.orders] }));
  return id;
}

export function setOrderStatus(orderId: string, status: OrderStatus): void {
  update(syncStatusById(orderId, status));
}

/** 发起退款：→ 退款中。 */
export function requestRefund(orderId: string): void {
  update((s) => {
    const next = syncStatusById(orderId, "退款中")(s);
    const order = s.orders.find((o) => o.id === orderId);
    return {
      ...next,
      auditLog: appendAudit(s, {
        action: "refund.request",
        targetType: "refund",
        targetId: orderId,
        summary: order
          ? `提交退款申请 ${orderId} · ${order.student} → ${order.teacher} ¥${order.amount}`
          : `提交退款申请 ${orderId}`,
      }),
    };
  });
}

/** 审批退款：→ 已退款。 */
export function approveRefund(orderId: string): void {
  update((s) => {
    const next = syncStatusById(orderId, "已退款")(s);
    const order = s.orders.find((o) => o.id === orderId);
    return {
      ...next,
      auditLog: appendAudit(s, {
        action: "refund.approve",
        targetType: "refund",
        targetId: orderId,
        summary: order
          ? `批准退款 ${orderId} · ¥${order.amount}，款项原路退回`
          : `批准退款 ${orderId}`,
      }),
    };
  });
}

/** 学生端「申请退款」入口（me 页）：与 requestRefund 等价。 */
export function refundBooking(id: string): void {
  requestRefund(id);
}

// ──────────────────────────────────────────────────────────────────────────
// 选择器（纯函数，admin / teacher 复用）
// ──────────────────────────────────────────────────────────────────────────

/** 某老师的订单（按姓名匹配，兼容种子数据）。 */
export function ordersForTeacher(state: AppState, teacherName: string): Order[] {
  return state.orders.filter((o) => o.teacher === teacherName);
}

/** 学员头像（与 platform.students 风格一致，用于合成新学员条目）。 */
const studentAvatar = (seedName: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seedName)}`;

/**
 * 某老师的学员名单：以 platform 静态学员为基础（陈昊视角演示数据），
 * 合并订单 / 预约里出现的新学员（按姓名去重），让学生新下单能实时出现在老师学员列表。
 * 其余老师的学员仅来自订单反推（无静态演示数据）。
 */
export function studentsForTeacher(state: AppState, teacherName: string): Student[] {
  const base = teacherName === "陈昊" ? platformStudents : [];
  const known = new Set(base.map((s) => s.name));
  const fromOrders = [...new Set(ordersForTeacher(state, teacherName).map((o) => o.student))];
  const merged = [...base];
  fromOrders.forEach((name, i) => {
    if (!known.has(name)) {
      merged.push({
        id: `S-${teacherName}-${i}`,
        name,
        avatar: studentAvatar(name),
        rounds: 0,
        lastActive: "刚刚",
        intent: "medium",
        paid: true,
        note: "新预约学员",
      });
    }
  });
  return merged;
}

/** 平台抽佣比例（聚合 fee 与收益页逐行 fee 共用此常量，保证两者一致）。 */
export const COMMISSION_RATE = 0.15;

/** 单笔订单佣金：按金额逐笔取整（Σ逐笔 = 聚合 fee，避免「总额取整」与「逐笔取整」错位）。 */
export function commissionFor(amount: number): number {
  return Math.round(amount * COMMISSION_RATE);
}

/**
 * 某老师收益：计入「已支付 / 已完成」，扣除「退款 / 已退款」；
 * 「待确认」单列为待确认金额（「退款中」属资金流出，不计入待确认/冻结）。
 * 佣金仅对已结算单计取，逐笔取整求和，与收益页 fee 列口径一致。
 */
export function teacherEarnings(state: AppState, teacherName: string) {
  const mine = ordersForTeacher(state, teacherName);
  const settledOrders = mine.filter((o) => o.status === "已支付" || o.status === "已完成");
  const settled = settledOrders.reduce((s, o) => s + o.amount, 0);
  const refunded = mine
    .filter((o) => o.status === "退款" || o.status === "已退款")
    .reduce((s, o) => s + o.amount, 0);
  const pending = mine.filter((o) => o.status === "待确认").reduce((s, o) => s + o.amount, 0);
  const fee = settledOrders.reduce((s, o) => s + commissionFor(o.amount), 0);
  return {
    gross: settled,
    refunded,
    pending,
    net: settled - refunded - fee,
    fee,
    count: mine.length,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 运营待办（统一优先级任务，纯派生）
// ──────────────────────────────────────────────────────────────────────────

const PRIORITY_RANK: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2 };

/**
 * 把分散在各模块的待处理项归一为统一优先级任务列表：
 *   - reviews pending            → P1（入驻审核，阻塞老师上线）
 *   - trainingJobs failed        → P0（训练失败，阻塞「上传即用」体验）
 *   - trainingJobs queued        → P1（队列堆积）
 *   - compliance pending 高/中/低 → P0 / P1 / P2（合规风险随等级递增）
 *   - orders 退款中 / 退款        → P1（资金待处理）
 * bookings 与 orders 同步，无需单独处理。
 */
export function opsTasks(state: AppState): OpsTask[] {
  const tasks: OpsTask[] = [];

  for (const r of state.reviews) {
    if (r.status === "pending") {
      tasks.push({
        id: `task:review:${r.id}`,
        type: "review",
        priority: "P1",
        title: `${r.name} · 入驻审核`,
        subtitle: r.title,
        targetId: r.id,
        meta: { 提交时间: r.submittedAt, 素材数: String(r.materials), 编号: r.id },
      });
    }
  }

  for (const j of state.trainingJobs) {
    if (j.status === "failed") {
      tasks.push({
        id: `task:training:${j.id}`,
        type: "training",
        priority: "P0",
        title: `${j.teacher} · 训练失败待重试`,
        subtitle: j.failReason ?? "训练失败，请重试",
        targetId: j.id,
        meta: { 任务: j.id, 进度: `${j.progress}%`, 耗时: j.duration },
      });
    } else if (j.status === "queued") {
      tasks.push({
        id: `task:training:${j.id}`,
        type: "training",
        priority: "P1",
        title: `${j.teacher} · 训练排队中`,
        subtitle: "等待调度，可取消或等待自动开始",
        targetId: j.id,
        meta: { 任务: j.id },
      });
    }
  }

  for (const c of state.compliance) {
    if (c.status === "pending") {
      const priority: TaskPriority = c.risk === "高" ? "P0" : c.risk === "中" ? "P1" : "P2";
      tasks.push({
        id: `task:compliance:${c.id}`,
        type: "compliance",
        priority,
        title: `${c.teacher} · ${c.type} 合规审核`,
        subtitle: c.reason,
        targetId: c.id,
        meta: { 风险: `${c.risk}风险`, 类型: c.type, 时间: c.time, 编号: c.id },
      });
    }
  }

  for (const o of state.orders) {
    if (o.status === "退款中" || o.status === "退款") {
      tasks.push({
        id: `task:refund:${o.id}`,
        type: "refund",
        priority: "P1",
        title: `${o.student} → ${o.teacher} · 退款待处理`,
        subtitle: `${o.type} · ¥${o.amount.toLocaleString()}`,
        targetId: o.id,
        meta: { 订单: o.id, 金额: `¥${o.amount.toLocaleString()}`, 日期: o.date, 类型: o.type },
      });
    }
  }

  // 按优先级排序（P0 → P2），同级保持来源稳定顺序
  return tasks.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/** 运营待办按优先级聚合计数（首页「今日待办」/ 任务中心头部复用）。 */
export function opsTaskCounts(state: AppState): {
  total: number;
  P0: number;
  P1: number;
  P2: number;
  byType: Record<TaskType, number>;
} {
  const tasks = opsTasks(state);
  const byType: Record<TaskType, number> = { review: 0, training: 0, compliance: 0, refund: 0 };
  let P0 = 0;
  let P1 = 0;
  let P2 = 0;
  for (const t of tasks) {
    byType[t.type] += 1;
    if (t.priority === "P0") P0 += 1;
    else if (t.priority === "P1") P1 += 1;
    else P2 += 1;
  }
  return { total: tasks.length, P0, P1, P2, byType };
}

// ──────────────────────────────────────────────────────────────────────────
// 管理端动作
// ──────────────────────────────────────────────────────────────────────────

export function setReviewStatus(id: string, status: ReviewStatus): void {
  update((s) => {
    const next: AppState = {
      ...s,
      reviews: s.reviews.map((r) => (r.id === id ? { ...r, status } : r)),
    };
    // 通过审核 → 自动排入训练队列（demo 联动）
    const review = s.reviews.find((r) => r.id === id);
    if (
      status === "approved" &&
      review &&
      !next.trainingJobs.some((j) => j.teacher === review.name && j.status === "queued")
    ) {
      next.trainingJobs = [
        {
          id: `TJ-${Date.now().toString().slice(-4)}`,
          teacher: review.name,
          status: "queued",
          progress: 0,
          startedAt: "—",
          duration: "排队中",
        },
        ...next.trainingJobs,
      ];
    }
    next.auditLog = appendAudit(s, {
      action: status === "approved" ? "review.approve" : "review.reject",
      targetType: "review",
      targetId: id,
      summary:
        status === "approved"
          ? `通过「${review?.name ?? id}」入驻申请${review ? "，已排入训练队列" : ""}`
          : `拒绝「${review?.name ?? id}」入驻申请`,
    });
    return next;
  });
}

/** 重试失败训练任务：failed → running，推进进度。 */
export function retryTraining(id: string): void {
  update((s) => {
    const job = s.trainingJobs.find((j) => j.id === id);
    return {
      ...s,
      trainingJobs: s.trainingJobs.map((j) =>
        j.id === id
          ? {
              ...j,
              status: "running",
              progress: 50,
              startedAt: "刚刚",
              duration: "进行中",
              failReason: undefined,
            }
          : j,
      ),
      auditLog: appendAudit(s, {
        action: "training.retry",
        targetType: "training",
        targetId: id,
        summary: `重试「${job?.teacher ?? id}」的训练任务，已重置为进行中（50%）`,
      }),
    };
  });
}

/** 取消排队中的训练任务。 */
export function cancelTraining(id: string): void {
  update((s) => {
    const job = s.trainingJobs.find((j) => j.id === id);
    return {
      ...s,
      trainingJobs: s.trainingJobs.filter((j) => j.id !== id),
      auditLog: appendAudit(s, {
        action: "training.cancel",
        targetType: "training",
        targetId: id,
        summary: `取消「${job?.teacher ?? id}」的排队训练任务`,
      }),
    };
  });
}

export function viewTraining(id: string): TrainingJob | undefined {
  return snapshot.trainingJobs.find((j) => j.id === id);
}

/** 合规处置：放行 / 下线。 */
export function setComplianceStatus(id: string, status: ComplianceStatus): void {
  update((s) => {
    const item = s.compliance.find((c) => c.id === id);
    return {
      ...s,
      compliance: s.compliance.map((c) => (c.id === id ? { ...c, status } : c)),
      auditLog: appendAudit(s, {
        action: status === "allowed" ? "compliance.allow" : "compliance.takedown",
        targetType: "compliance",
        targetId: id,
        summary:
          status === "allowed"
            ? `放行「${item?.type ?? id}」相关内容（${item?.teacher ?? ""}）`
            : `下线「${item?.type ?? id}」相关内容（${item?.teacher ?? ""}）`,
      }),
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 重置
// ──────────────────────────────────────────────────────────────────────────

/**
 * 清空 localStorage 演示数据并回到 SEED（跨端同步生效）。
 * 一并重置老师端独立 store（teacherStudio 草稿 / 已发布老师注册表），
 * 让「重置演示数据」真正覆盖三端所有可变状态（含被预约占用的档期、运行期发布的老师）。
 */
export function resetAppState(): void {
  resetStudio();
  resetPublishedTeachers();
  commit(seed());
}

/** store.ts 别名。 */
export function resetMockStore(): void {
  resetAppState();
}
