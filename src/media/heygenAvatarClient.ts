// HeyGen 数字人客户端（SPEC_video_interview_v1.md §5.4 / §6）
//
// @heygen/streaming-avatar npm 包 v2.1.1 只有 README 无 JS（HeyGen 已知 issue）。
// 本实现绕过 SDK，直接使用：
//   1. HeyGen REST API 创建流式会话（POST /v1/streaming.new）
//   2. 浏览器原生 RTCPeerConnection 建立 WebRTC 连接
//   3. HeyGen REST API 发送朗读任务（POST /v1/streaming.task）和打断（POST /v1/streaming.interrupt）
//
// SDK 发布修复后可替换为 import StreamingAvatar from '@heygen/streaming-avatar'，
// 对外接口（AvatarClient）不变，videoroom UI 零改动。

import type { LanguageMode, TeacherVideoConfig } from "@/agent/interview/types";
import type { AvatarClient, AvatarEvent } from "./contracts";
import { heygenToken } from "./heygen";

const HEYGEN_API = "https://api.heygen.com";

// ──────────────────────────────────────────────────────────────────────────
// HeyGen REST API 类型（仅用到的字段）
// ──────────────────────────────────────────────────────────────────────────

interface HeygenSessionInfo {
  session_id: string;
  sdp: { type: string; sdp: string };
  ice_servers: RTCIceServer[];
  ice_servers2?: RTCIceServer[];
}

// ──────────────────────────────────────────────────────────────────────────
// HeyGenAvatarClient：REST + WebRTC 实现
// ──────────────────────────────────────────────────────────────────────────

export class HeyGenAvatarClient implements AvatarClient {
  private sessionId: string | null = null;
  private pc: RTCPeerConnection | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private token: string | null = null;
  private listeners = new Map<AvatarEvent, Set<(p?: unknown) => void>>();

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

  // ── 辅助：带 token 的 REST 请求 ──────────────────────────────────────────

  private async api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
    if (!this.token) throw new Error("HeyGen token 未初始化");
    const res = await fetch(`${HEYGEN_API}${path}`, {
      method: opts.method ?? "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HeyGen API ${path} 失败 (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    return (json.data ?? json) as T;
  }

  // ── start：创建会话 + WebRTC 连接 ────────────────────────────────────────

  async start(opts: {
    container: HTMLElement;
    video: TeacherVideoConfig;
    language: LanguageMode;
  }): Promise<void> {
    const { container, video, language } = opts;

    // 1. 服务端换 token
    const { token } = await heygenToken();
    this.token = token;

    // 2. 语言映射（HeyGen 用 BCP-47 locale）
    const langCode = language.primary === "en" ? "en" : "zh";

    // 3. 选声线
    const voiceCfg = video.voiceByLang?.[language.primary] ?? video.voice;

    // 4. 创建 HeyGen 流式会话
    const session = await this.api<HeygenSessionInfo>("/v1/streaming.new", {
      body: {
        quality: video.quality ?? "medium",
        avatar_name: video.avatarId,
        voice: {
          voice_id: voiceCfg.voiceId,
          rate: voiceCfg.rate ?? 1.0,
          ...(voiceCfg.emotion ? { emotion: voiceCfg.emotion } : {}),
        },
        language: langCode,
        version: "v2",
        video_encoding: "H264",
        source: "sdk", // 告知 HeyGen 来源
      },
    });
    this.sessionId = session.session_id;

    // 5. 建立 WebRTC PeerConnection
    const iceServers = session.ice_servers2 ?? session.ice_servers ?? [];
    const pc = new RTCPeerConnection({ iceServers });
    this.pc = pc;

    // 6. 挂载数字人视频流
    pc.ontrack = (e) => {
      if (e.track.kind !== "video") return;
      const videoEl = document.createElement("video");
      videoEl.srcObject = e.streams[0];
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:inherit";
      container.innerHTML = "";
      container.appendChild(videoEl);
      this.videoEl = videoEl;
      this.emit("ready");
    };

    // 7. 监听数据通道（HeyGen 用此通知 avatar 状态）
    pc.ondatachannel = (e) => {
      e.channel.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data as string) as {
            type?: string;
            event_type?: string;
          };
          const t = data.type ?? data.event_type ?? "";
          if (t === "avatar_start_talking") this.emit("talking_start");
          if (t === "avatar_stop_talking") this.emit("talking_end");
        } catch {
          /* 非 JSON 消息忽略 */
        }
      };
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        this.emit("error", { message: `WebRTC 连接状态：${pc.iceConnectionState}` });
      }
    };

    // 8. SDP 协商
    const remoteDesc = new RTCSessionDescription({
      type: session.sdp.type as RTCSdpType,
      sdp: session.sdp.sdp,
    });
    await pc.setRemoteDescription(remoteDesc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // 9. 把 answer SDP 发回 HeyGen
    await this.api("/v1/streaming.start", {
      body: {
        session_id: this.sessionId,
        sdp: { type: answer.type, sdp: answer.sdp },
      },
    });

    // 10. 发送 ICE candidates（等本地 ICE 收集完毕）
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") {
        resolve();
        return;
      }
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") resolve();
      };
      // 最多等 5s
      setTimeout(resolve, 5000);
    });

    if (pc.localDescription?.sdp) {
      // 收集到的 candidates 已包含在 localDescription 中，发送最终 SDP
      await this.api("/v1/streaming.ice", {
        body: {
          session_id: this.sessionId,
          candidate: pc.localDescription.sdp,
        },
      }).catch(() => {
        /* 某些账号不需要此步骤 */
      });
    }
  }

  // ── speak：REPEAT 模式朗读指定文本 ──────────────────────────────────────

  async speak(text: string): Promise<void> {
    if (!this.sessionId) throw new Error("会话未建立");
    await this.api("/v1/streaming.task", {
      body: {
        session_id: this.sessionId,
        text,
        task_type: "repeat", // 严格朗读我们给的文本，不走 HeyGen LLM
        task_mode: "sync",
      },
    });
  }

  // ── interrupt：打断当前朗读（barge-in）──────────────────────────────────

  async interrupt(): Promise<void> {
    if (!this.sessionId) return;
    await this.api("/v1/streaming.interrupt", {
      body: { session_id: this.sessionId },
    }).catch(() => {
      /* 已停止则忽略 */
    });
  }

  // ── stop：关闭会话并释放资源 ──────────────────────────────────────────

  async stop(): Promise<void> {
    if (this.sessionId) {
      await this.api("/v1/streaming.stop", {
        body: { session_id: this.sessionId },
      }).catch(() => {});
      this.sessionId = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.videoEl) {
      const stream = this.videoEl.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      this.videoEl.srcObject = null;
      this.videoEl.remove();
      this.videoEl = null;
    }

    this.token = null;
    this.listeners.clear();
  }
}
