// HeyGen 数字人客户端（SPEC_video_interview_v1.md §5.4 / §6）
//
// 实现 AvatarClient 接口，封装 @heygen/streaming-avatar SDK。
// SDK 以动态 import 加载（仅客户端运行，避免 SSR 异常）。
// 仅使用 REPEAT 模式（avatar.speak({ text, task_type: REPEAT })），
// 禁用 HeyGen 自带 LLM — 内容由 InterviewClient（Qwen）产出。
//
// 注意：@heygen/streaming-avatar v2.1.1 npm 包暂时只有 README，
// 无 JS 文件。实际接入时用 HeyGen GitHub release 或等待 npm 修复。
// 接口与事件名均依据官方 README 文档编写。

import type { LanguageMode, TeacherVideoConfig } from "@/agent/interview/types";
import type { AvatarClient, AvatarEvent } from "./contracts";

// ──────────────────────────────────────────────────────────────────────────
// SDK 类型声明（依据 README 与官方 NextJS Demo，运行时动态加载）
// ──────────────────────────────────────────────────────────────────────────

interface HeyGenSDK {
  default: new (opts: { token: string }) => HeyGenAvatar;
  AvatarQuality: { Low: string; Medium: string; High: string };
  StreamingEvents: Record<string, string>;
  TaskType: { REPEAT: string; TALK: string };
  TaskMode: { SYNC: string; ASYNC: string };
}

interface HeyGenAvatar {
  on(event: string, cb: (e?: unknown) => void): void;
  off(event: string, cb: (e?: unknown) => void): void;
  createStartAvatar(opts: {
    quality: string;
    avatarName: string;
    voice: { voiceId: string; rate?: number; emotion?: string };
    language?: string;
    activityIdleTimeout?: number;
  }): Promise<{ session_id?: string; mediaStream?: MediaStream }>;
  speak(opts: { text: string; task_type: string; taskMode?: string }): Promise<void>;
  interrupt(): Promise<void>;
  stopAvatar(): Promise<void>;
  startListening(): void;
  stopListening(): void;
}

async function loadSDK(): Promise<HeyGenSDK> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("@heygen/streaming-avatar" as any);
    if (!mod.default) throw new Error("HeyGen SDK 缺少 default export");
    return mod as HeyGenSDK;
  } catch (e) {
    throw new Error(
      `无法加载 @heygen/streaming-avatar SDK：${e instanceof Error ? e.message : e}。` +
        "请确认已安装正确版本（npm 包暂有 bug，请从 HeyGen GitHub 获取）。",
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────
// HeyGenAvatarClient 实现
// ──────────────────────────────────────────────────────────────────────────

export class HeyGenAvatarClient implements AvatarClient {
  private avatar: HeyGenAvatar | null = null;
  private sdk: HeyGenSDK | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private listeners: Map<AvatarEvent, Set<(p?: unknown) => void>> = new Map();

  on(event: AvatarEvent, cb: (p?: unknown) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  off(event: AvatarEvent, cb: (p?: unknown) => void): void {
    this.listeners.get(event)?.delete(cb);
  }

  private emit(event: AvatarEvent, payload?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }

  async start(opts: {
    container: HTMLElement;
    video: TeacherVideoConfig;
    language: LanguageMode;
  }): Promise<void> {
    const { container, video, language } = opts;

    this.sdk = await loadSDK();
    const { StreamingEvents, AvatarQuality, TaskType: _TaskType, TaskMode: _TaskMode } = this.sdk;

    // 取服务端签发的短期 token（密钥不在客户端）
    const { heygenToken } = await import("./heygen");
    const { token } = await heygenToken();

    const StreamingAvatar = this.sdk.default;
    this.avatar = new StreamingAvatar({ token });

    // 数字人就绪：把 MediaStream 挂到 <video>
    this.avatar.on(StreamingEvents.STREAM_READY, (e: unknown) => {
      const event = e as { detail?: MediaStream };
      const stream = event?.detail;
      if (stream && container) {
        const videoEl = document.createElement("video");
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:inherit";
        container.innerHTML = "";
        container.appendChild(videoEl);
        this.videoEl = videoEl;
      }
      this.emit("ready");
    });

    this.avatar.on(StreamingEvents.AVATAR_START_TALKING, () => this.emit("talking_start"));
    this.avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => this.emit("talking_end"));

    this.avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      this.emit("error", { message: "HeyGen 连接断开" });
    });

    // 语言映射（HeyGen 用 BCP-47 形式）
    const langCode = language.primary === "en" ? "en" : "zh";

    const qualityMap: Record<string, string> = {
      low: AvatarQuality.Low,
      medium: AvatarQuality.Medium,
      high: AvatarQuality.High,
    };

    await this.avatar.createStartAvatar({
      quality: qualityMap[video.quality ?? "medium"] ?? AvatarQuality.Medium,
      avatarName: video.avatarId,
      voice: this.resolveVoice(video, language),
      language: langCode,
      activityIdleTimeout: 300, // 5 分钟无活动关闭，防止账单泄漏
    });

    // 进入「监听」态，让 avatar 展示等候表情而非空白
    this.avatar.startListening();
  }

  private resolveVoice(
    video: TeacherVideoConfig,
    language: LanguageMode,
  ): { voiceId: string; rate?: number; emotion?: string } {
    const byLang = video.voiceByLang?.[language.primary];
    if (byLang) return byLang;
    return video.voice;
  }

  async speak(text: string): Promise<void> {
    if (!this.avatar || !this.sdk) throw new Error("Avatar 尚未初始化");
    const { TaskType, TaskMode } = this.sdk;
    this.avatar.stopListening();
    await this.avatar.speak({
      text,
      task_type: TaskType.REPEAT, // 严格 REPEAT：只念我们给的文本，不走 HeyGen LLM
      taskMode: TaskMode.SYNC,
    });
  }

  async interrupt(): Promise<void> {
    if (!this.avatar) return;
    await this.avatar.interrupt().catch(() => {});
    this.avatar.startListening();
  }

  async stop(): Promise<void> {
    if (this.avatar) {
      await this.avatar.stopAvatar().catch(() => {});
      this.avatar = null;
    }
    if (this.videoEl) {
      const stream = this.videoEl.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      this.videoEl.srcObject = null;
      this.videoEl.remove();
      this.videoEl = null;
    }
    this.listeners.clear();
  }
}
