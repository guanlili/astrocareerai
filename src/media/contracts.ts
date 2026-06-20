// 数字人视听层接口契约（SPEC_video_interview_v1.md §5.4）
//
// AvatarClient / ASRClient 把「视听呈现」与「供应商实现」解耦：
//   - HeyGen ↔ D-ID / 本地：实现 AvatarClient，UI 不改。
//   - HeyGen 内置 STT ↔ 云 ASR：实现 ASRClient，UI 不改。

import type { LanguageMode, TeacherVideoConfig } from "@/agent/interview/types";

// ──────────────────────────────────────────────────────────────────────────
// 数字人渲染接口（AvatarClient）
// ──────────────────────────────────────────────────────────────────────────

export type AvatarEvent = "ready" | "talking_start" | "talking_end" | "error";

export interface AvatarClient {
  /** 初始化并连接数字人（CONNECTING → ready 事件 → LIVE）。 */
  start(opts: {
    container: HTMLElement;
    video: TeacherVideoConfig;
    language: LanguageMode;
  }): Promise<void>;

  /** REPEAT 模式：朗读我们给定的 text，不走 HeyGen 自带 LLM。 */
  speak(text: string): Promise<void>;

  /** 打断当前朗读（barge-in），立即停止语音。 */
  interrupt(): Promise<void>;

  /** 停止数字人会话，释放媒体资源。 */
  stop(): Promise<void>;

  on(event: AvatarEvent, cb: (payload?: unknown) => void): void;
  off(event: AvatarEvent, cb: (payload?: unknown) => void): void;
}

// ──────────────────────────────────────────────────────────────────────────
// 语音识别接口（ASRClient）
// ──────────────────────────────────────────────────────────────────────────

export interface ASRStartOpts {
  language: LanguageMode;
  /** 识别出最终文本（端点判停后触发）。 */
  onFinal: (text: string, confidence?: number) => void;
  /** 实时中间结果（可选，用于 UI 打字显示）。 */
  onPartial?: (text: string) => void;
}

export interface ASRClient {
  /** 开始监听麦克风。 */
  start(opts: ASRStartOpts): Promise<void>;
  /** 停止监听并释放麦克风资源。 */
  stop(): Promise<void>;
  /** 静音 / 恢复，不释放麦克风（barge-in 打断时暂时静音）。 */
  mute(muted: boolean): void;
}

// ──────────────────────────────────────────────────────────────────────────
// 视频间运行时状态（纯前端，不持久化）
// ──────────────────────────────────────────────────────────────────────────

export type VideoMediaState = "idle" | "connecting" | "live" | "reconnecting" | "ended" | "error";

export type VideoRoomState = {
  media: VideoMediaState;
  micEnabled: boolean;
  avatarTalking: boolean;
  userTalking: boolean; // barge-in 检测
  captionsEnabled: boolean;
  lastError?: string;
};

// ──────────────────────────────────────────────────────────────────────────
// 试用额度（Q6 决策：免费用户限制 20 分钟或 HeyGen 额度用完）
// ──────────────────────────────────────────────────────────────────────────

export const FREE_TRIAL_LIMIT_MS = 20 * 60 * 1000; // 20 分钟

export type TrialQuota = {
  limitMs: number; // 总额度（ms）
  usedMs: number; // 已用（ms）
  exhausted: boolean; // true = 超限或外部额度用完
};
