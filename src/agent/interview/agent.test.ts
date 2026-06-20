// 面试 Agent 单测（SPEC_mock_interview_v1.md §7.6）
//
// 覆盖：题数上限 / 时长收尾 / 每题必有反馈 / customFocus→专项报告 / 语言模式注入 /
// JSON 解析降级 / 续连还原一致 / turn 幂等不重复调模型 / elapsedMs 暂停不计。
//
// 运行：bun test

import { describe, expect, test } from "bun:test";
import { MockInterviewAgent } from "./agent";
import { MemorySessionStore } from "./store";
import { StubModelClient } from "./model";
import { buildSystemPrompt, resolveLanguage } from "./prompt";
import type { ModelClient } from "./contracts";
import type { InterviewSetup, TeacherAvatarConfig } from "./types";

// —— 测试用最小老师配置（不依赖 mock 数据，自包含）——
const RUBRIC = [
  { id: "expression", name: "表达逻辑", weight: 2 },
  { id: "business", name: "业务理解", weight: 3 },
  { id: "overall", name: "整体印象", weight: 1 },
];

function makeConfig(over?: Partial<TeacherAvatarConfig>): TeacherAvatarConfig {
  return {
    teacherId: "t-test",
    version: "test-1",
    persona: { displayName: "测试官", role: "面试官", background: "履历", principles: ["务实"] },
    skills: { domains: ["产品"], interviewStyles: ["结构化追问"] },
    style: { tone: 50, technicality: 60, verbosity: 50 },
    knowledge: {
      questionBank: [
        { id: "q1", topic: "自我介绍", dimension: "expression", difficulty: "warmup", prompt: "介绍下自己" },
        { id: "q2", topic: "业务", dimension: "business", difficulty: "standard", prompt: "讲个项目" },
      ],
      rubric: RUBRIC,
    },
    guardrails: { maxQuestions: 6, targetDurationMin: 30, targetDurationMax: 45, stayInScope: true },
    ...over,
  };
}

class StaticConfigProvider {
  constructor(private cfg: TeacherAvatarConfig) {}
  async getConfig() {
    return this.cfg;
  }
}

// 固定时钟，便于推进时间
function makeClock(start = 1_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

function makeAgent(opts?: {
  config?: TeacherAvatarConfig;
  model?: ModelClient;
  clock?: () => number;
}) {
  const store = new MemorySessionStore();
  const config = opts?.config ?? makeConfig();
  const agent = new MockInterviewAgent({
    configProvider: new StaticConfigProvider(config),
    model: opts?.model ?? new StubModelClient(),
    store,
    clock: opts?.clock,
  });
  return { agent, store, config };
}

const SETUP: InterviewSetup = { companyName: "字节", roleTitle: "产品经理" };

describe("guardrails", () => {
  test("题数达到 maxQuestions 后进入 WRAPUP", async () => {
    const { agent, config } = makeAgent();
    const s0 = await agent.start(SETUP, "t-test");
    let session = s0;
    for (let i = 0; i < config.guardrails.maxQuestions + 1; i++) {
      const r = await agent.reply(s0.id, `答案 ${i}`);
      session = r.session;
      if (session.state === "WRAPUP") break;
    }
    expect(session.state).toBe("WRAPUP");
    // 主问题数不超过上限
    expect(session.askedQuestionIds.length).toBeLessThanOrEqual(config.guardrails.maxQuestions);
  });

  test("超过 targetDurationMax 即收尾（注入 clock）", async () => {
    const clock = makeClock();
    // 把题数上限调高，确保只有「时长」能触发收尾（与题数上限隔离）
    const config = makeConfig({
      guardrails: { maxQuestions: 50, targetDurationMin: 30, targetDurationMax: 45, stayInScope: true },
    });
    const { agent } = makeAgent({ clock: clock.now, config });
    const s0 = await agent.start(SETUP, "t-test");
    let session = s0;
    for (let i = 0; i < 12; i++) {
      clock.advance(5 * 60_000); // 每回合 5 分钟（MAX_TURN_MS 上限），累计 elapsedMs
      const r = await agent.reply(s0.id, `答案 ${i}`);
      session = r.session;
      if (session.state === "WRAPUP") break;
    }
    expect(session.state).toBe("WRAPUP");
    expect(session.elapsedMs).toBeGreaterThanOrEqual(45 * 60_000);
  });
});

describe("即时反馈", () => {
  test("每答一题都产出 AnswerFeedback（含分数）", async () => {
    const { agent } = makeAgent();
    const s0 = await agent.start(SETUP, "t-test");
    for (let i = 0; i < 3; i++) {
      const { message, session } = await agent.reply(s0.id, `答案 ${i}`);
      if (session.state === "WRAPUP") break;
      expect(message.feedback).toBeDefined();
      expect(typeof message.feedback!.score).toBe("number");
      expect(message.feedback!.score).toBeGreaterThanOrEqual(0);
      expect(message.feedback!.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("报告", () => {
  test("customFocus 非空 → 报告含 customFocusFeedback", async () => {
    const { agent } = makeAgent();
    const s0 = await agent.start({ ...SETUP, customFocus: "我容易紧张" }, "t-test");
    for (let i = 0; i < 8; i++) {
      const { session } = await agent.reply(s0.id, `答案 ${i}`);
      if (session.state === "WRAPUP") break;
    }
    const report = await agent.finish(s0.id);
    expect(report.customFocusFeedback).toBeTruthy();
    expect(report.dimensions.length).toBe(RUBRIC.length); // 覆盖 rubric 全维度
  });

  test("customFocus 为空 → 报告无 customFocusFeedback", async () => {
    const { agent } = makeAgent();
    const s0 = await agent.start(SETUP, "t-test");
    for (let i = 0; i < 8; i++) {
      const { session } = await agent.reply(s0.id, `答案 ${i}`);
      if (session.state === "WRAPUP") break;
    }
    const report = await agent.finish(s0.id);
    expect(report.customFocusFeedback ?? null).toBeNull();
  });
});

describe("语言模式注入（§5.5 / §6.1）", () => {
  test("mixing=heavy 注入到系统提示词", () => {
    const cfg = makeConfig();
    const setup: InterviewSetup = { language: { primary: "zh", mixing: "heavy" } };
    expect(resolveLanguage(cfg, setup).mixing).toBe("heavy");
    const prompt = buildSystemPrompt(cfg, setup);
    expect(prompt).toContain("heavy");
    expect(prompt).toContain("中英混杂程度");
  });

  test("英文岗 primary=en 注入英文", () => {
    const cfg = makeConfig();
    const prompt = buildSystemPrompt(cfg, { language: { primary: "en", mixing: "none" } });
    expect(prompt).toContain("主语言：英文");
  });
});

describe("健壮性", () => {
  test("模型返回非 JSON → 降级为纯文本气泡，不崩溃", async () => {
    const garbageModel: ModelClient = { async complete() {
      return "这不是 JSON，只是一段普通文本。";
    } };
    const { agent } = makeAgent({ model: garbageModel });
    const s0 = await agent.start(SETUP, "t-test");
    const { message } = await agent.reply(s0.id, "我的回答");
    expect(message.role).toBe("ai");
    expect(message.content.length).toBeGreaterThan(0);
  });
});

describe("持久化与续连（§7.8）", () => {
  test("resume 还原到最后一个已保存回合", async () => {
    const store = new MemorySessionStore();
    const config = makeConfig();
    const agent1 = new MockInterviewAgent({
      configProvider: new StaticConfigProvider(config),
      model: new StubModelClient(),
      store,
    });
    const s0 = await agent1.start(SETUP, "t-test");
    await agent1.reply(s0.id, "答案 1");
    const { session: saved } = await agent1.reply(s0.id, "答案 2");

    // 新 agent 复用同一 store
    const agent2 = new MockInterviewAgent({
      configProvider: new StaticConfigProvider(config),
      model: new StubModelClient(),
      store,
    });
    const resumed = await agent2.resume(s0.id);
    expect(resumed.id).toBe(s0.id);
    expect(resumed.turn).toBe(saved.turn);
    expect(resumed.messages.length).toBe(saved.messages.length);
  });

  test("turn 幂等：clientTurn 落后则不重复调模型", async () => {
    let calls = 0;
    const countingModel: ModelClient = {
      async complete(input) {
        calls++;
        return new StubModelClient().complete(input);
      },
    };
    const { agent } = makeAgent({ model: countingModel });
    const s0 = await agent.start(SETUP, "t-test");
    const callsAfterStart = calls;
    const { session } = await agent.reply(s0.id, "答案 1");
    const callsAfterReply = calls;
    expect(callsAfterReply).toBeGreaterThan(callsAfterStart);

    // 用落后的 clientTurn 重发 → 返回已存结果，不再调模型
    await agent.reply(s0.id, "重复（断网重试）", { clientTurn: session.turn - 1 });
    expect(calls).toBe(callsAfterReply);
  });

  test("elapsedMs 单回合封顶（挂机不刷满）", async () => {
    const clock = makeClock();
    const { agent } = makeAgent({ clock: clock.now });
    const s0 = await agent.start(SETUP, "t-test");
    // 一次性挂机 10 小时，再作答
    clock.advance(10 * 60 * 60_000);
    const { session } = await agent.reply(s0.id, "答案");
    // 单回合计入的有效用时被封顶（远小于 10 小时）
    expect(session.elapsedMs).toBeLessThanOrEqual(5 * 60_000);
  });
});
