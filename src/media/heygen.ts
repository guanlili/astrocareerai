// HeyGen 服务端端点（SPEC_video_interview_v1.md §6.1）
//
// 密钥（HEYGEN_API_KEY）只在服务端读取，绝不进客户端 bundle。
// 对齐 src/llm/endpoints.ts 的模式：createServerFn + maskSecret。
//
// 导出：
//   heygenToken()   — 取短期 session token（前端用来初始化 SDK）
//   heygenStatus()  — 探活 + 配置状态（密钥已遮蔽，供 UI 标识）

import { createServerFn } from "@tanstack/react-start";
import { maskSecret } from "@/lib/mask";

function readKey(): string {
  return process.env.HEYGEN_API_KEY ?? "";
}

// ──────────────────────────────────────────────────────────────────────────
// heygenToken：服务端用 API Key 换短期 session token
// ──────────────────────────────────────────────────────────────────────────

export type HeygenTokenResult = { token: string };

export const heygenToken = createServerFn({ method: "POST" }).handler(
  async (): Promise<HeygenTokenResult> => {
    const apiKey = readKey();
    if (!apiKey) throw new Error("HeyGen 未配置：缺少 HEYGEN_API_KEY");

    const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HeyGen token 获取失败 (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { data?: { token?: string }; token?: string };
    // HeyGen API v1 返回 { data: { token: "..." } } 或直接 { token: "..." }
    const token = json.data?.token ?? (json as { token?: string }).token;
    if (!token) throw new Error("HeyGen 响应缺少 token 字段");

    return { token };
  },
);

// ──────────────────────────────────────────────────────────────────────────
// heygenStatus：探活 + 密钥状态（关键信息遮蔽）
// ──────────────────────────────────────────────────────────────────────────

export type HeygenStatus = {
  enabled: boolean;
  maskedKey: string;
  reason?: string;
};

let statusCache: { at: number; result: HeygenStatus } | null = null;
const STATUS_TTL_MS = 60_000;

export const heygenStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<HeygenStatus> => {
    const key = readKey();
    const maskedKey = maskSecret(key);

    if (!key) return { enabled: false, maskedKey, reason: "未配置 HEYGEN_API_KEY" };
    if (statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) {
      return statusCache.result;
    }

    let result: HeygenStatus;
    try {
      // 探活：拉取 avatar 列表（轻量请求，不消耗流量额度）
      const res = await fetch("https://api.heygen.com/v2/avatars?limit=1", {
        headers: { "x-api-key": key },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = { enabled: true, maskedKey };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[heygen] 健康探测失败 (key=${maskedKey}):`, msg);
      result = { enabled: false, maskedKey, reason: msg.slice(0, 140) };
    }

    statusCache = { at: Date.now(), result };
    return result;
  },
);
