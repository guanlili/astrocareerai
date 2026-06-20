// 模型客户端实现（SPEC_mock_interview_v1.md §7.5 / §10）
//
// - StubModelClient：返回固定 / 规则化 JSON，无网络、无密钥，用于纯逻辑单测与 --stub。
// - ClaudeModelClient：调用真实 Claude API（默认 claude-opus-4-8），用于 --live 与生产。
// - safeParseJSON：解析失败降级，绝不抛出导致编排器崩溃（§10「解析失败降级为纯文本气泡」）。

import type { ModelClient } from "./contracts";
import type { ChatMsg } from "./types";

// ──────────────────────────────────────────────────────────────────────────
// JSON 解析（容错）
// ──────────────────────────────────────────────────────────────────────────

/**
 * 尽力从模型输出中解析 JSON：剥离 ```json 代码块围栏、截取首个 { 到末个 }。
 * 失败返回 null，由调用方降级为纯文本气泡。
 */
export function safeParseJSON<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.trim();
  // 去掉 markdown 代码块围栏
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // 截取最外层 { ... }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// StubModelClient —— 纯逻辑打桩
// ──────────────────────────────────────────────────────────────────────────

/**
 * 规则化打桩：根据 system / messages 判断当前是开场、答题回合还是报告生成，
 * 返回结构合法的固定 JSON。便于在无网络下断言状态机 / 选题 / guardrail / 报告聚合。
 */
export class StubModelClient implements ModelClient {
  async complete(input: { system: string; messages: ChatMsg[] }): Promise<string> {
    // 报告生成
    if (input.system.includes("OUTPUT_KIND: REPORT")) {
      // 报告提示词在 customFocus 为空时会写出字面量 "customFocusFeedback": null
      const hasFocus = !input.system.includes('"customFocusFeedback": null');
      return JSON.stringify({
        overall: 80,
        dimensions: [], // 由编排器按 rubric 补全 / 校验
        highlights: ["结构表达清晰", "能主动给出量化口径"],
        weaknesses: ["压力题下略发散"],
        suggestions: ["用结论先行框架收束回答"],
        customFocusFeedback: hasFocus
          ? {
              focus: "（见 setup.customFocus）",
              assessment: "针对你的关注点，整体可控但仍有提升空间。",
              actionItems: ["固定开场结构", "准备数据类追问万能框架"],
            }
          : null,
        handoffRecommended: false,
      });
    }

    const isIntro = input.system.includes("这是开场");
    if (isIntro) {
      return JSON.stringify({
        phase: "INTRO",
        say: "你好，欢迎参加今天的模拟面试。我们大约进行 30–45 分钟，先做个简短的自我介绍吧。",
        questionId: null,
        dimension: "expression",
        feedback: null,
      });
    }

    const wrapUp = input.system.includes("现在进入收尾");
    if (wrapUp) {
      return JSON.stringify({
        phase: "WRAPUP",
        say: "好，今天的模拟就到这里，感谢你的投入。我马上为你生成一份完整的评估报告。",
        questionId: null,
        dimension: null,
        feedback: {
          score: 78,
          strengths: ["回答完整"],
          improvements: ["可更聚焦"],
          oneLineComment: "收尾回答稳定，整体表现可圈可点。",
        },
      });
    }

    // 普通答题回合：反馈 + 下一题
    return JSON.stringify({
      phase: "FEEDBACK_THEN_QUESTION",
      say: "我先简单点评一下你刚才的回答，然后我们继续下一个问题。",
      questionId: null,
      dimension: "business",
      feedback: {
        score: 75,
        strengths: ["有结构", "举了具体例子"],
        improvements: ["数据口径可更清晰"],
        oneLineComment: "整体思路清晰，建议补充量化口径。",
      },
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// ClaudeModelClient —— 真实 Claude API（§10）
// ──────────────────────────────────────────────────────────────────────────

export type ClaudeModelClientOptions = {
  apiKey?: string; // 默认读 ANTHROPIC_API_KEY
  model?: string; // 默认 claude-opus-4-8（主持 / 报告）
  maxTokens?: number;
  baseUrl?: string; // 默认 https://api.anthropic.com
};

/**
 * 直接走 Anthropic Messages API（fetch，无需额外依赖）。
 * system 作为 system 参数，ChatMsg 映射为 user / assistant（system 角色并入 user 上下文）。
 */
export class ClaudeModelClient implements ModelClient {
  readonly model: string;
  private readonly apiKey: string;
  private readonly maxTokens: number;
  private readonly baseUrl: string;

  constructor(opts: ClaudeModelClientOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = opts.model ?? "claude-opus-4-8";
    this.maxTokens = opts.maxTokens ?? 1024;
    this.baseUrl = opts.baseUrl ?? "https://api.anthropic.com";
    if (!this.apiKey) {
      throw new Error(
        "ClaudeModelClient 需要 API key（构造参数 apiKey 或环境变量 ANTHROPIC_API_KEY）。",
      );
    }
  }

  async complete(input: { system: string; messages: ChatMsg[] }): Promise<string> {
    const messages = input.messages
      .filter((m) => m.content?.trim())
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.role === "system" ? `[系统提示] ${m.content}` : m.content,
      }));
    // Anthropic 要求 messages 以 user 开头且至少一条
    if (messages.length === 0 || messages[0].role !== "user") {
      messages.unshift({ role: "user", content: "（开始面试）" });
    }

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system: input.system,
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Claude API ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    return (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  }
}
