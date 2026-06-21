// 服务端 LLM 端点（createServerFn）—— 密钥只在服务端读取，绝不进客户端 bundle
//
// 这里集中三个能力：
//   - llmComplete：通用「system + messages → 文本」补全，供面试编排器经 ServerModelClient 调用
//   - llmStatus：返回是否已配置 + 模型名 + 遮蔽后的密钥（供 UI 标识，关键信息已打码）
//   - analyzeTeacherMaterial：老师素材/履历分析，抽取用于配置分身的结构化信息
//
// 任何日志 / 返回值都用 maskSecret 处理密钥，不外泄完整 key。

import { createServerFn } from "@tanstack/react-start";
import { QwenModelClient, parseModelList } from "@/agent/interview/model";
import type { ChatMsg } from "@/agent/interview/types";
import { maskSecret } from "@/lib/mask";

function readKey(): string {
  return process.env.DASHSCOPE_API_KEY ?? "";
}

// 记住上一次成功的模型，下次优先尝试它，避免每轮都从坏掉的模型开始
let stickyModel: string | undefined;

function orderedModels(): string[] {
  const all = parseModelList(process.env.QWEN_MODELS ?? process.env.QWEN_MODEL);
  return stickyModel && all.includes(stickyModel)
    ? [stickyModel, ...all.filter((m) => m !== stickyModel)]
    : all;
}

function makeClient(extra?: { maxTokens?: number; jsonMode?: boolean }): QwenModelClient {
  const apiKey = readKey();
  if (!apiKey) throw new Error("LLM 未配置：缺少 DASHSCOPE_API_KEY");
  return new QwenModelClient({ apiKey, models: orderedModels(), ...extra });
}

function remember(client: QwenModelClient): void {
  if (client.lastUsedModel) stickyModel = client.lastUsedModel;
}

type CompleteInput = { system: string; messages: ChatMsg[] };

/** 面试编排器的模型调用入口（服务端代理 Qwen）。 */
export const llmComplete = createServerFn({ method: "POST" })
  .inputValidator((d: CompleteInput) => d)
  .handler(async ({ data }): Promise<{ text: string }> => {
    const client = makeClient();
    try {
      const text = await client.complete({
        system: data.system,
        messages: data.messages,
      });
      remember(client);
      return { text };
    } catch (e) {
      console.error(
        `[llm] Qwen 调用失败 (key=${maskSecret(readKey())}):`,
        e instanceof Error ? e.message : e,
      );
      throw e;
    }
  });

export type LlmStatus = {
  enabled: boolean; // 是否真正连得上（实测探活，而非仅有 key）
  model: string;
  maskedKey: string;
  reason?: string; // 不可用原因（已遮蔽，无密钥），用于提示
};

// 探活结果缓存，避免每次进页面都真打一次模型
let probeCache: { at: number; result: LlmStatus } | null = null;
const PROBE_TTL_MS = 60_000;

/**
 * LLM 真实状态：实际向 Qwen 发一个极小请求探活。
 * 连得上 → enabled:true（显示模型名）；无 key / 鉴权失败 / 额度不足 / 网络异常
 * → enabled:false（前端显示「演示模式」）。
 */
export const llmStatus = createServerFn({ method: "GET" }).handler(async (): Promise<LlmStatus> => {
  const key = readKey();
  const maskedKey = maskSecret(key);
  const candidates = orderedModels();
  const firstModel = candidates[0] ?? "qwen-plus";

  if (!key) return { enabled: false, model: firstModel, maskedKey, reason: "未配置密钥" };
  if (probeCache && Date.now() - probeCache.at < PROBE_TTL_MS) {
    return probeCache.result;
  }

  let result: LlmStatus;
  try {
    // 极小探活请求：max_tokens 很小、不强制 JSON，尽量省 token；按候选列表轮换
    const probe = makeClient({ maxTokens: 8, jsonMode: false });
    await probe.complete({ system: "ping", messages: [{ role: "user", content: "ping" }] });
    remember(probe);
    // 显示实际连通的模型
    result = { enabled: true, model: probe.lastUsedModel ?? firstModel, maskedKey };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[llm] 健康探测失败 (key=${maskedKey}):`, msg);
    result = { enabled: false, model: firstModel, maskedKey, reason: msg.slice(0, 140) };
  }
  probeCache = { at: Date.now(), result };
  return result;
});

/** 老师入驻：分析履历/素材，产出用于配置分身的结构化 JSON（前端再解析填充表单）。 */
export const analyzeTeacherMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: { material: string }) => d)
  .handler(async ({ data }): Promise<{ raw: string }> => {
    const client = makeClient();
    const system = `你是面试平台的「老师入驻分析助手」。阅读老师提供的履历 / 素材，抽取并生成用于配置其「AI 面试官分身」的结构化信息。
严格输出 JSON（不要包裹 markdown 代码块）：
{
  "name": "姓名（识别不到则空字符串）",
  "title": "一句话头衔，如『前字节跳动 产品总监』",
  "company": "公司 / 履历，如『字节跳动 / 现某独角兽 CPO』",
  "tags": ["3-5 个能力标签"],
  "domains": ["3-5 个擅长领域"],
  "background": "2-3 句履历浓缩，用于注入面试官系统提示词",
  "suggestedQuestions": ["6 道贴合其方向的面试题，第 1 题为自我介绍类，其余覆盖专业深挖 / 数据 / 压力 / 匹配度"]
}`;
    const text = await client.complete({
      system,
      messages: [{ role: "user", content: data.material }],
    });
    remember(client);
    return { raw: text };
  });
