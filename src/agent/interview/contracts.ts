// 模拟面试聊天室 —— 行为接口契约（SPEC_mock_interview_v1.md §7.3 / §7.5 / §7.8）
//
// 这些接口把「编排逻辑」与「真假数据 / 传输 / 存储」解耦：
//   - 前端只依赖 InterviewClient，Mock ↔ 真实模型 ↔ 后端 API 三种实现可互换，UI 零改动。
//   - ModelClient 抽象模型调用，真实 Claude 与测试打桩共用此接口。
//   - SessionStore 抽象持久化，LocalSessionStore（localStorage）↔ ApiSessionStore（DB）可互换。
//   - TeacherConfigProvider 抽象配置来源，Mock ↔ 配置后台可互换。

import type {
  ChatMsg,
  InterviewEvent,
  InterviewReport,
  InterviewSession,
  InterviewSetup,
  TeacherAvatarConfig,
} from "./types";

// ──────────────────────────────────────────────────────────────────────────
// §7.3 前端接口（解耦真假数据）
// ──────────────────────────────────────────────────────────────────────────

export interface InterviewClient {
  /** 开场：创建会话，进入 INTRO 并抛出第 1 题。 */
  start(setup: InterviewSetup, teacherId: string): Promise<InterviewSession>;

  /** 单回合：处理候选人输入，给即时反馈 + 下一题（或收尾）。 */
  reply(
    sessionId: string,
    userText: string,
  ): Promise<{
    session: InterviewSession;
    message: ChatMsg; // AI 本轮输出（含 feedback / questionId）
  }>;

  /** 收尾汇总：生成最终评估报告。 */
  finish(sessionId: string): Promise<InterviewReport>;

  /** 断点续连（§7.8）：凭 sessionId 还原到最后一个已保存回合。 */
  resume(sessionId: string): Promise<InterviewSession>;

  // 可选增强：replyStream(sessionId, userText) → SSE 流（§7.7），非破坏式
}

// ──────────────────────────────────────────────────────────────────────────
// §7.5 模型抽象 —— 真实 Claude 调用与测试打桩共用此接口
// ──────────────────────────────────────────────────────────────────────────

export interface ModelClient {
  /** 输入 system + 对话历史，返回模型输出的原始字符串（约定为 JSON，§6.1）。 */
  complete(input: { system: string; messages: ChatMsg[] }): Promise<string>;
}

// ──────────────────────────────────────────────────────────────────────────
// §7.8 持久化抽象（与传输 / 存储解耦）
// ──────────────────────────────────────────────────────────────────────────

export interface SessionStore {
  create(session: InterviewSession): Promise<void>;
  load(sessionId: string): Promise<InterviewSession | null>;
  save(session: InterviewSession): Promise<void>; // 每回合 upsert（含 turn / updatedAt）
  appendEvent(sessionId: string, event: InterviewEvent): Promise<void>; // 追加事件日志（§7.9）
  listResumable(userId: string): Promise<InterviewSession[]>; // status = active | paused
}

// ──────────────────────────────────────────────────────────────────────────
// 配置来源抽象（§7.5 / §8.1）—— 本期 Mock，未来由配置后台拉取
// ──────────────────────────────────────────────────────────────────────────

export interface TeacherConfigProvider {
  getConfig(teacherId: string): Promise<TeacherAvatarConfig>;
}
