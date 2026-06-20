// 会话持久化（SPEC_mock_interview_v1.md §7.8 / §7.9）
//
// - MemorySessionStore：进程内 Map，用于测试 / CLI / SSR，无浏览器依赖。
// - LocalSessionStore：写 localStorage（key 前缀 mirrorhire:session:），纯前端续连。
//   非浏览器环境（无 localStorage）自动回退为内存实现，便于同构运行。
// 事件日志 append-only，永不修改，按 sessionId 聚合。

import type { SessionStore } from "./contracts";
import type { InterviewEvent, InterviewSession } from "./types";

const clone = <T>(v: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);

// ──────────────────────────────────────────────────────────────────────────
// MemorySessionStore
// ──────────────────────────────────────────────────────────────────────────

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, InterviewSession>();
  private events = new Map<string, InterviewEvent[]>();

  async create(session: InterviewSession): Promise<void> {
    this.sessions.set(session.id, clone(session));
  }

  async load(sessionId: string): Promise<InterviewSession | null> {
    const s = this.sessions.get(sessionId);
    return s ? clone(s) : null;
  }

  async save(session: InterviewSession): Promise<void> {
    this.sessions.set(session.id, clone(session));
  }

  async appendEvent(sessionId: string, event: InterviewEvent): Promise<void> {
    const arr = this.events.get(sessionId) ?? [];
    arr.push(clone(event));
    this.events.set(sessionId, arr);
  }

  async listResumable(userId: string): Promise<InterviewSession[]> {
    return [...this.sessions.values()]
      .filter(
        (s) =>
          s.userId === userId &&
          (s.status === "active" || s.status === "paused"),
      )
      .map((s) => clone(s));
  }

  /** 测试 / 复盘用：读取某场会话的完整事件日志。 */
  getEvents(sessionId: string): InterviewEvent[] {
    return (this.events.get(sessionId) ?? []).map((e) => clone(e));
  }
}

// ──────────────────────────────────────────────────────────────────────────
// LocalSessionStore
// ──────────────────────────────────────────────────────────────────────────

const SESSION_PREFIX = "mirrorhire:session:";
const EVENTS_PREFIX = "mirrorhire:events:";

type StorageLike = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key(i: number): string | null;
  readonly length: number;
};

function getLocalStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage as StorageLike;
  } catch {
    /* 访问受限（如 SSR / 隐私模式）→ 回退内存 */
  }
  return null;
}

export class LocalSessionStore implements SessionStore {
  private fallback: MemorySessionStore | null = null;
  private readonly ls = getLocalStorage();

  constructor() {
    if (!this.ls) this.fallback = new MemorySessionStore();
  }

  async create(session: InterviewSession): Promise<void> {
    if (this.fallback) return this.fallback.create(session);
    this.ls!.setItem(SESSION_PREFIX + session.id, JSON.stringify(session));
  }

  async load(sessionId: string): Promise<InterviewSession | null> {
    if (this.fallback) return this.fallback.load(sessionId);
    const raw = this.ls!.getItem(SESSION_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as InterviewSession) : null;
  }

  async save(session: InterviewSession): Promise<void> {
    if (this.fallback) return this.fallback.save(session);
    this.ls!.setItem(SESSION_PREFIX + session.id, JSON.stringify(session));
  }

  async appendEvent(sessionId: string, event: InterviewEvent): Promise<void> {
    if (this.fallback) return this.fallback.appendEvent(sessionId, event);
    const key = EVENTS_PREFIX + sessionId;
    const arr = JSON.parse(this.ls!.getItem(key) ?? "[]") as InterviewEvent[];
    arr.push(event);
    this.ls!.setItem(key, JSON.stringify(arr));
  }

  async listResumable(userId: string): Promise<InterviewSession[]> {
    if (this.fallback) return this.fallback.listResumable(userId);
    const out: InterviewSession[] = [];
    for (let i = 0; i < this.ls!.length; i++) {
      const k = this.ls!.key(i);
      if (!k || !k.startsWith(SESSION_PREFIX)) continue;
      const raw = this.ls!.getItem(k);
      if (!raw) continue;
      const s = JSON.parse(raw) as InterviewSession;
      if (s.userId === userId && (s.status === "active" || s.status === "paused")) {
        out.push(s);
      }
    }
    return out;
  }
}
