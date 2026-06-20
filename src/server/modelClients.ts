// 面向前端的 ModelClient 实现：把编排器的模型调用转发到服务端 LLM 端点
//
// - ServerModelClient：调用 llmComplete（服务端代理 Qwen），密钥不出服务端。
// - FallbackModelClient：真实优先、失败回退打桩，保证无 key / 网络异常时仍能演示。
//
// 放在 src/server/ 而非 src/agent/interview/，以保持编排器与宿主（路由 / RPC）解耦。

import type { ModelClient } from "@/agent/interview/contracts";
import type { ChatMsg } from "@/agent/interview/types";
import { StubModelClient } from "@/agent/interview/model";
import { llmComplete } from "./llm";

export class ServerModelClient implements ModelClient {
  // 便于事件日志读取 model 名（仅展示用）
  readonly model = "qwen";

  async complete(input: { system: string; messages: ChatMsg[] }): Promise<string> {
    const { text } = await llmComplete({
      data: { system: input.system, messages: input.messages },
    });
    return text;
  }
}

export class FallbackModelClient implements ModelClient {
  readonly model: string;

  constructor(
    private readonly primary: ModelClient,
    private readonly fallback: ModelClient = new StubModelClient(),
  ) {
    this.model = (primary as { model?: string }).model ?? "fallback";
  }

  async complete(input: { system: string; messages: ChatMsg[] }): Promise<string> {
    try {
      return await this.primary.complete(input);
    } catch (e) {
      console.warn(
        "[llm] 主模型调用失败，回退打桩：",
        e instanceof Error ? e.message : e,
      );
      return this.fallback.complete(input);
    }
  }
}
