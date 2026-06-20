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
  type Order as PlatformOrder,
} from "./platform";

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

function bookingToOrder(b: Booking): Order {
  return {
    id: b.id,
    student: b.studentName,
    teacher: b.teacherName,
    teacherId: b.teacherId,
    type: b.duration === 120 ? "1v1辅导" : "1v1辅导",
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
  setOrderStatus(orderId, "退款中");
}

/** 审批退款：→ 已退款。 */
export function approveRefund(orderId: string): void {
  setOrderStatus(orderId, "已退款");
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

/**
 * 某老师收益：计入「已支付 / 已完成」，扣除「退款 / 已退款」；
 * 「待确认 / 退款中」单列为待确认金额。
 */
export function teacherEarnings(state: AppState, teacherName: string) {
  const mine = ordersForTeacher(state, teacherName);
  const settled = mine
    .filter((o) => o.status === "已支付" || o.status === "已完成")
    .reduce((s, o) => s + o.amount, 0);
  const refunded = mine
    .filter((o) => o.status === "退款" || o.status === "已退款")
    .reduce((s, o) => s + o.amount, 0);
  const pending = mine
    .filter((o) => o.status === "待确认" || o.status === "退款中")
    .reduce((s, o) => s + o.amount, 0);
  const fee = Math.round((settled - refunded) * 0.15); // 平台抽佣 15%
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
    return next;
  });
}

/** 重试失败训练任务：failed → running，推进进度。 */
export function retryTraining(id: string): void {
  update((s) => ({
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
  }));
}

/** 取消排队中的训练任务。 */
export function cancelTraining(id: string): void {
  update((s) => ({
    ...s,
    trainingJobs: s.trainingJobs.filter((j) => j.id !== id),
  }));
}

export function viewTraining(id: string): TrainingJob | undefined {
  return snapshot.trainingJobs.find((j) => j.id === id);
}

/** 合规处置：放行 / 下线。 */
export function setComplianceStatus(id: string, status: ComplianceStatus): void {
  update((s) => ({
    ...s,
    compliance: s.compliance.map((c) => (c.id === id ? { ...c, status } : c)),
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// 重置
// ──────────────────────────────────────────────────────────────────────────

/** 清空 localStorage 演示数据并回到 SEED（跨端同步生效）。 */
export function resetAppState(): void {
  commit(seed());
}

/** store.ts 别名。 */
export function resetMockStore(): void {
  resetAppState();
}
