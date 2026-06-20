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

// renderDirective 会把当前考察维度写进 system（「考察维度：「<id>」」），
// Stub 据此确定性抖动分数，让六维雷达 / 动态追问 / 转人工在无真实模型时也可演示。
// 真实模型接入后本表失效（由模型按回答内容评分），此处仅占位。
const DIM_SCORE: Record<string, number> = {
  expression: 84,
  business: 76,
  data: 66,
  pressure: 62,
  fit: 80,
  overall: 79,
  growth: 68,
  creativity: 77,
  execution: 64,
};

const DIM_FEEDBACK: Record<
  string,
  { strengths: string[]; improvements: string[]; comment: string }
> = {
  data: {
    strengths: ["给出了量化口径"],
    improvements: ["归因方法可以更严谨", "需剥离自然增长的影响"],
    comment: "数据意识不错，但口径与归因需更严谨。",
  },
  pressure: {
    strengths: ["没有回避问题"],
    improvements: ["结论不够果断", "压力下表达发散"],
    comment: "压力题下略显发散，建议先给结论再展开。",
  },
  expression: {
    strengths: ["结构清晰", "表达流畅"],
    improvements: ["可更精炼"],
    comment: "表达有条理，继续保持结论先行。",
  },
  business: {
    strengths: ["有结构", "举了具体例子"],
    improvements: ["数据口径可更清晰"],
    comment: "整体思路清晰，建议补充量化口径。",
  },
};

function dimFromSystem(system: string): string {
  const m = system.match(/考察维度：「([a-z_]+)」/);
  return m ? m[1] : "business";
}

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

    // 普通答题回合：反馈 + 下一题（按考察维度确定性抖动分数，让六维 / 追问 / 转人工可演示）
    const dim = dimFromSystem(input.system);
    const fb = DIM_FEEDBACK[dim];
    // 从本回合指令里取「下一题种子」，让 say 像真人那样自然提问；
    // 反馈只进 feedback 字段，say 不复述分数 / 点评（§6.4）。
    const seed = input.system.match(/下一题种子[^：:]*[：:]\s*(.+)/)?.[1]?.trim();
    const say = seed ? `嗯，我了解了。${seed}` : "嗯，我了解了。我们继续下一个问题吧。";
    return JSON.stringify({
      phase: "FEEDBACK_THEN_QUESTION",
      say,
      questionId: null,
      dimension: dim,
      feedback: {
        score: DIM_SCORE[dim] ?? 75,
        strengths: fb?.strengths ?? ["有结构", "举了具体例子"],
        improvements: fb?.improvements ?? ["数据口径可更清晰"],
        oneLineComment: fb?.comment ?? "整体思路清晰，建议补充量化口径。",
      },
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// QwenModelClient —— Qwen ModelStudio / 阿里云 DashScope（OpenAI 兼容接口）
// ──────────────────────────────────────────────────────────────────────────

export type QwenModelClientOptions = {
  apiKey?: string; // 默认读 DASHSCOPE_API_KEY（仅服务端）
  model?: string; // 单模型（向后兼容；未设 models 时用它）
  models?: string | string[]; // 候选模型列表（逗号分隔或数组），按序尝试、失败切换
  baseUrl?: string; // 默认 DashScope compatible-mode
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean; // 强制 JSON 输出（提示词需含 "json"），默认 true
};

/** 把模型配置规整成有序去重的候选列表。 */
export function parseModelList(
  input: string | string[] | undefined,
  fallback = "qwen-plus",
): string[] {
  const raw = Array.isArray(input) ? input : (input ?? fallback).split(/[,，]/);
  const list = raw.map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out = list.filter((m) => (seen.has(m) ? false : (seen.add(m), true)));
  return out.length ? out : [fallback];
}

/**
 * 通过 DashScope 的 OpenAI 兼容端点调用 Qwen（fetch，无额外依赖）。
 * 仅应在服务端构造（密钥不可进客户端）。
 *
 * 支持多模型轮换：按 `models` 顺序尝试，某个模型不可用（4xx/5xx/网络/不支持等）
 * 自动切到下一个；鉴权失败（401，对所有模型一致）则立即终止，不浪费调用。
 * `lastUsedModel` 记录实际成功的模型，供 UI 展示。
 */
export class QwenModelClient implements ModelClient {
  readonly models: string[];
  lastUsedModel?: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly jsonMode: boolean;

  constructor(opts: QwenModelClientOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.DASHSCOPE_API_KEY ?? "";
    this.models = parseModelList(
      opts.models ?? opts.model ?? process.env.QWEN_MODELS ?? process.env.QWEN_MODEL,
    );
    this.baseUrl =
      opts.baseUrl ??
      process.env.QWEN_BASE_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.maxTokens = opts.maxTokens ?? 1200;
    this.temperature = opts.temperature ?? 0.7;
    this.jsonMode = opts.jsonMode ?? true;
    if (!this.apiKey) {
      throw new Error(
        "QwenModelClient 需要 API key（构造参数 apiKey 或环境变量 DASHSCOPE_API_KEY）。",
      );
    }
  }

  /** 当前展示用的模型名：优先用上次成功的，否则候选首位。 */
  get model(): string {
    return this.lastUsedModel ?? this.models[0];
  }

  async complete(input: { system: string; messages: ChatMsg[] }): Promise<string> {
    const errors: string[] = [];
    for (const model of this.models) {
      try {
        const text = await this.callOnce(model, input);
        this.lastUsedModel = model;
        return text;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // 鉴权错误对所有模型一致，换模型也没用 → 立即终止
        if (/\b401\b/.test(msg)) throw e;
        errors.push(`${model} → ${msg}`);
      }
    }
    throw new Error(
      `所有候选模型均不可用（${this.models.join(", ")}）：${errors.join(" | ")}`,
    );
  }

  private async callOnce(
    model: string,
    input: { system: string; messages: ChatMsg[] },
  ): Promise<string> {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: input.system },
      ...input.messages
        .filter((m) => m.content?.trim())
        .map((m) => ({
          role:
            m.role === "user"
              ? ("user" as const)
              : m.role === "system"
                ? ("system" as const)
                : ("assistant" as const),
          content: m.content,
        })),
    ];
    // 兼容接口要求至少一条 user 消息
    if (!messages.some((m) => m.role === "user")) {
      messages.push({ role: "user", content: "（面试开始）" });
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        ...(this.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      // 注意：不要把密钥写进错误信息
      const text = await res.text().catch(() => "");
      throw new Error(`Qwen API ${res.status}: ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
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
