// 面试编排器（SPEC_mock_interview_v1.md §7.2 / §7.5）
//
// MockInterviewAgent 实现 InterviewClient，是自包含、与前端 / 路由解耦的 AI Agent：
//   - 维护状态机 CONFIG → INTRO → QA_LOOP → WRAPUP → REPORT（§3）
//   - 组装系统提示词（§6）并调用 ModelClient
//   - 裁决控制流：题数 / 时长 guardrails（§3.1）、选题 / 追问（§7.4）——不依赖模型自觉
//   - 每答一题产出 AnswerFeedback（§5.3），收尾汇总 InterviewReport（§6.2）
//   - 每回合「先落盘再返回」+ turn 幂等 + elapsedMs 累计（§7.8），全程事件日志（§7.9）
//
// 注入 configProvider / model / store / clock 便于替换与打桩（§7.5）。

import type {
  InterviewClient,
  ModelClient,
  SessionStore,
  TeacherConfigProvider,
} from "./contracts";
import {
  buildReportPrompt,
  buildSystemPrompt,
  PROMPT_VERSION,
  renderDirective,
  type TurnDirective,
} from "./prompt";
import { safeParseJSON } from "./model";
import { selectNextQuestion } from "./select";
import type {
  AnswerFeedback,
  ChatMsg,
  InterviewEvent,
  InterviewEventType,
  InterviewReport,
  InterviewSession,
  InterviewSetup,
  ModelTurnOutput,
  TeacherAvatarConfig,
} from "./types";

/** 单回合有效用时上限：超过即视为思考 / 挂机，只计上限，避免刷满时长（§7.8.3）。 */
const MAX_TURN_MS = 5 * 60_000;

export type MockInterviewAgentDeps = {
  configProvider: TeacherConfigProvider;
  model: ModelClient;
  store: SessionStore;
  clock?: () => number; // 可注入时钟，便于测试时长 guardrail
  idGen?: () => string;
  /** 报告生成可用不同（更强）模型，默认复用 model（§10）。 */
  reportModel?: ModelClient;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

export class MockInterviewAgent implements InterviewClient {
  private readonly configProvider: TeacherConfigProvider;
  private readonly model: ModelClient;
  private readonly reportModel: ModelClient;
  private readonly store: SessionStore;
  private readonly clock: () => number;
  private readonly idGen: () => string;
  /** 配置缓存：同一场会话用同一份配置（含 version，保证可复现）。 */
  private configCache = new Map<string, TeacherAvatarConfig>();

  constructor(deps: MockInterviewAgentDeps) {
    this.configProvider = deps.configProvider;
    this.model = deps.model;
    this.reportModel = deps.reportModel ?? deps.model;
    this.store = deps.store;
    this.clock = deps.clock ?? Date.now;
    this.idGen =
      deps.idGen ?? (() => `s_${this.clock()}_${Math.random().toString(36).slice(2, 8)}`);
  }

  // ────────────────────────────────────────────────────────────────────────
  // start：CONFIG → INTRO，抛出第 1 题
  // ────────────────────────────────────────────────────────────────────────

  async start(setup: InterviewSetup, teacherId: string): Promise<InterviewSession> {
    const config = await this.getConfig(teacherId);
    const now = this.clock();
    const session: InterviewSession = {
      id: this.idGen(),
      teacherId,
      configVersion: config.version,
      setup,
      state: "CONFIG",
      status: "active",
      askedQuestionIds: [],
      startedAt: now,
      updatedAt: now,
      elapsedMs: 0,
      turn: 0,
      messages: [],
    };
    await this.store.create(session);
    await this.event(session, "session_start", { setup, teacherId }, config);

    // 选第 1 题（通常为自我介绍 / warmup 类），开场不需要反馈。
    // 开场优先 warmup 难度，避免一上来就抛尖锐押题；无 warmup 时回退常规选题。
    const warmup = config.knowledge.questionBank.find((n) => n.difficulty === "warmup");
    const selection = warmup
      ? {
          branch: "coverage" as const,
          questionId: warmup.id,
          dimension: warmup.dimension,
          seedPrompt: warmup.prompt,
          isFollowUp: false,
        }
      : selectNextQuestion(config, session, false);
    const directive: TurnDirective = {
      phase: "INTRO",
      dimension: selection.dimension,
      questionId: selection.questionId,
      seedPrompt: selection.seedPrompt,
      isFollowUp: false,
      wrapUp: false,
      needFeedback: false,
    };

    const { output, raw, latencyMs } = await this.callModel(config, session, directive);
    await this.event(session, "question_selected", selection, config);

    const askedId = this.recordAsked(session, selection.questionId, directive.dimension);
    const aiMsg: ChatMsg = {
      role: "ai",
      content: output.say || raw,
      questionId: askedId,
      meta: this.rubricName(config, directive.dimension),
    };
    session.messages.push(aiMsg);
    session.state = "INTRO";
    session.turn += 1;
    session.updatedAt = this.clock();
    await this.event(session, "ai_message", aiMsg, config, latencyMs);

    await this.store.save(session);
    return session;
  }

  // ────────────────────────────────────────────────────────────────────────
  // reply：一回合（即时反馈 + 下一题 / 收尾），先落盘再返回
  // ────────────────────────────────────────────────────────────────────────

  async reply(
    sessionId: string,
    userText: string,
    opts?: { clientTurn?: number },
  ): Promise<{ session: InterviewSession; message: ChatMsg }> {
    const session = await this.requireSession(sessionId);
    const config = await this.getConfig(session.teacherId);

    // 幂等（§7.8.4）：重发的旧 turn → 返回已存结果，不重复调模型
    if (opts?.clientTurn !== undefined && opts.clientTurn < session.turn) {
      return { session, message: this.lastAiMessage(session) };
    }

    if (session.state === "WRAPUP" || session.state === "REPORT") {
      // 已收尾：不再处理新输入，引导走 finish()
      return { session, message: this.lastAiMessage(session) };
    }

    const now = this.clock();
    // 本回合有效用时 = 距上次落盘的间隔，封顶 MAX_TURN_MS（挂机不刷满）
    const elapsedAdd = Math.max(0, Math.min(now - session.updatedAt, MAX_TURN_MS));

    const userMsg: ChatMsg = { role: "user", content: userText };
    session.messages.push(userMsg);
    await this.event(session, "user_message", userMsg, config);

    // 刚回答的题（用于即时反馈归属）
    const answeredId = session.askedQuestionIds.at(-1) ?? null;
    const answeredDim = this.dimensionOfAsked(config, answeredId);

    // guardrails（§3.1）：题数 / 时长到点强制收尾
    const askedCount = session.askedQuestionIds.length;
    const maxQ = config.guardrails.maxQuestions;
    const maxMs = config.guardrails.targetDurationMax * 60_000;
    const wrapUp = askedCount >= maxQ || session.elapsedMs + elapsedAdd >= maxMs;

    // 选下一题（非收尾时）。第 1 次作答后倾向追问，保证「动态追问」体感（§7.4）。
    const selection = wrapUp ? null : selectNextQuestion(config, session, askedCount === 1);

    const directive: TurnDirective = {
      phase: wrapUp ? "WRAPUP" : "FEEDBACK_THEN_QUESTION",
      dimension: selection?.dimension ?? answeredDim,
      questionId: selection?.questionId ?? null,
      seedPrompt: selection?.seedPrompt,
      isFollowUp: selection?.isFollowUp ?? false,
      wrapUp,
      needFeedback: true,
    };

    const { output, raw, parseOk, latencyMs } = await this.callModel(config, session, directive);

    // 即时反馈（每答一题必出，§5.3）；解析失败降级为占位反馈，保证不崩溃（§10）
    const feedback: AnswerFeedback = answeredId
      ? this.buildFeedback(output, answeredId, answeredDim, parseOk)
      : this.buildFeedback(output, "intro", answeredDim, parseOk);
    await this.event(session, "feedback", feedback, config, latencyMs);

    let nextAskedId: string | undefined;
    if (!wrapUp && selection) {
      await this.event(session, "question_selected", selection, config);
      nextAskedId = this.recordAsked(session, selection.questionId, selection.dimension);
    }

    const aiMsg: ChatMsg = {
      role: "ai",
      content: output.say || raw,
      questionId: nextAskedId,
      meta: wrapUp ? "收尾" : this.rubricName(config, directive.dimension),
      feedback,
    };
    session.messages.push(aiMsg);

    session.elapsedMs += elapsedAdd;
    session.turn += 1;
    session.updatedAt = this.clock();
    session.state = wrapUp ? "WRAPUP" : "QA_LOOP";
    await this.event(session, "ai_message", aiMsg, config, latencyMs);

    // 先落盘再返回：用户看到的 = 已持久化的（§7.8）
    await this.store.save(session);
    return { session, message: aiMsg };
  }

  // ────────────────────────────────────────────────────────────────────────
  // finish：WRAPUP → REPORT，汇总评估报告
  // ────────────────────────────────────────────────────────────────────────

  async finish(sessionId: string): Promise<InterviewReport> {
    const session = await this.requireSession(sessionId);
    const config = await this.getConfig(session.teacherId);

    const system = buildReportPrompt(config, session.setup);
    const t0 = this.clock();
    let raw = "";
    try {
      raw = await this.reportModel.complete({ system, messages: session.messages });
    } catch {
      raw = "";
    }
    const latencyMs = this.clock() - t0;
    const parsed = safeParseJSON<Partial<InterviewReport>>(raw);

    const report = this.aggregateReport(config, session, parsed);

    session.state = "REPORT";
    session.status = "completed";
    session.updatedAt = this.clock();
    await this.store.save(session);
    await this.event(session, "report_generated", report, config, latencyMs);
    if (report.handoffRecommended) {
      await this.event(session, "handoff_suggested", { sessionId }, config);
    }
    return report;
  }

  // ────────────────────────────────────────────────────────────────────────
  // resume：断点续连（§7.8）
  // ────────────────────────────────────────────────────────────────────────

  async resume(sessionId: string): Promise<InterviewSession> {
    const session = await this.requireSession(sessionId);
    const config = await this.getConfig(session.teacherId);
    // 不累计暂停时长：下次 reply 的 elapsedAdd 仍以 updatedAt 为基准并封顶，
    // 这里仅刷新活跃时间戳，使长时间挂机的间隔不被计入有效用时。
    session.updatedAt = this.clock();
    if (session.status === "paused") session.status = "active";
    await this.store.save(session);
    await this.event(session, "resume", { state: session.state, turn: session.turn }, config);
    return session;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 内部辅助
  // ────────────────────────────────────────────────────────────────────────

  private async getConfig(teacherId: string): Promise<TeacherAvatarConfig> {
    const cached = this.configCache.get(teacherId);
    if (cached) return cached;
    const cfg = await this.configProvider.getConfig(teacherId);
    this.configCache.set(teacherId, cfg);
    return cfg;
  }

  private async requireSession(sessionId: string): Promise<InterviewSession> {
    const s = await this.store.load(sessionId);
    if (!s) throw new Error(`会话不存在：${sessionId}`);
    return s;
  }

  /** 调用模型并解析；解析失败时返回纯文本降级输出（不抛出）。 */
  private async callModel(
    config: TeacherAvatarConfig,
    session: InterviewSession,
    directive: TurnDirective,
  ): Promise<{
    output: ModelTurnOutput;
    raw: string;
    parseOk: boolean;
    latencyMs: number;
  }> {
    const system = buildSystemPrompt(config, session.setup) + renderDirective(directive);
    const t0 = this.clock();
    let raw = "";
    try {
      raw = await this.model.complete({ system, messages: session.messages });
    } catch (e) {
      raw = `（模型调用失败，已降级）${e instanceof Error ? e.message : ""}`;
    }
    const latencyMs = this.clock() - t0;
    const parsed = safeParseJSON<Partial<ModelTurnOutput>>(raw);
    if (parsed && typeof parsed.say === "string") {
      return {
        output: {
          phase: directive.phase,
          say: parsed.say,
          questionId: directive.questionId,
          dimension: directive.dimension,
          feedback: parsed.feedback ?? null,
        },
        raw,
        parseOk: true,
        latencyMs,
      };
    }
    // 降级：把原始文本当作要说的话，无结构化反馈
    return {
      output: {
        phase: directive.phase,
        say: raw,
        questionId: directive.questionId,
        dimension: directive.dimension,
        feedback: null,
      },
      raw,
      parseOk: false,
      latencyMs,
    };
  }

  private buildFeedback(
    output: ModelTurnOutput,
    questionId: string,
    dimension: string,
    parseOk: boolean,
  ): AnswerFeedback {
    const f = output.feedback;
    if (f && parseOk) {
      return {
        questionId,
        dimension,
        score: clamp(f.score ?? 70),
        strengths: f.strengths ?? [],
        improvements: f.improvements ?? [],
        oneLineComment: f.oneLineComment ?? "",
      };
    }
    // 解析失败降级：保留占位反馈，保证「每答一题都有反馈」不被破坏
    return {
      questionId,
      dimension,
      score: 60,
      strengths: [],
      improvements: [],
      oneLineComment: "（本轮反馈未能结构化解析，已记录原始回复）",
    };
  }

  /** 记录已问题目；自由生成题用合成 id 保留维度与题数计数。 */
  private recordAsked(
    session: InterviewSession,
    questionId: string | null,
    dimension: string,
  ): string {
    const id = questionId ?? `gen:${dimension}:${session.turn}`;
    session.askedQuestionIds.push(id);
    return id;
  }

  private dimensionOfAsked(config: TeacherAvatarConfig, id: string | null): string {
    if (!id) return config.knowledge.rubric[0]?.id ?? "general";
    const node = config.knowledge.questionBank.find((n) => n.id === id);
    if (node) return node.dimension;
    if (id.startsWith("gen:")) return id.split(":")[1] ?? "general";
    return config.knowledge.rubric[0]?.id ?? "general";
  }

  private rubricName(config: TeacherAvatarConfig, dimId: string): string {
    return config.knowledge.rubric.find((r) => r.id === dimId)?.name ?? dimId;
  }

  private lastAiMessage(session: InterviewSession): ChatMsg {
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === "ai") return session.messages[i];
    }
    return { role: "ai", content: "" };
  }

  private collectFeedback(session: InterviewSession): AnswerFeedback[] {
    return session.messages.map((m) => m.feedback).filter((f): f is AnswerFeedback => !!f);
  }

  private aggregateReport(
    config: TeacherAvatarConfig,
    session: InterviewSession,
    parsed: Partial<InterviewReport> | null,
  ): InterviewReport {
    const rubric = config.knowledge.rubric;
    const perQuestion = this.collectFeedback(session);

    const modelDimByName = new Map<string, number>();
    if (parsed && Array.isArray(parsed.dimensions)) {
      for (const d of parsed.dimensions) {
        if (d && typeof d.name === "string" && typeof d.score === "number") {
          modelDimByName.set(d.name, clamp(d.score));
        }
      }
    }
    const fallbackAll = avg(perQuestion.map((f) => f.score)) ?? 70;

    const dimensions = rubric.map((r) => {
      let score = modelDimByName.get(r.name);
      if (score == null) {
        const dimScores = perQuestion.filter((f) => f.dimension === r.id).map((f) => f.score);
        score = clamp(avg(dimScores) ?? fallbackAll);
      }
      return { name: r.name, score };
    });

    // overall = 各维度按 rubric.weight 加权（§6.2）
    const totalW = rubric.reduce((s, r) => s + r.weight, 0) || rubric.length;
    const overall = clamp(
      dimensions.reduce((s, d, i) => s + d.score * (rubric[i]?.weight ?? 1), 0) / totalW,
    );

    const arr = (v: unknown, fb: string[]) =>
      Array.isArray(v) && v.every((x) => typeof x === "string") && v.length ? (v as string[]) : fb;

    const highlights = arr(parsed?.highlights, perQuestion.flatMap((f) => f.strengths).slice(0, 3));
    const weaknesses = arr(
      parsed?.weaknesses,
      perQuestion.flatMap((f) => f.improvements).slice(0, 3),
    );
    const suggestions = arr(parsed?.suggestions, ["针对本场暴露的薄弱维度做专项练习。"]);

    const hasFocus = !!session.setup.customFocus?.trim();
    const customFocusFeedback = hasFocus
      ? (parsed?.customFocusFeedback ?? {
          focus: session.setup.customFocus!.trim(),
          assessment: "已针对你的关注点进行观察，建议结合下方行动项持续打磨。",
          actionItems: ["把关注点拆成可练习的具体动作", "下次模拟前自评一次"],
        })
      : undefined;

    // §9 转化触发：模型建议 或 关键维度持续偏低
    const lowDim = dimensions.some((d) => d.score < 55);
    const handoffRecommended = parsed?.handoffRecommended === true || lowDim;

    return {
      sessionId: session.id,
      overall,
      dimensions,
      highlights,
      weaknesses,
      suggestions,
      perQuestion,
      customFocusFeedback,
      handoffRecommended,
    };
  }

  private async event(
    session: InterviewSession,
    type: InterviewEventType,
    payload: unknown,
    config: TeacherAvatarConfig,
    latencyMs?: number,
  ): Promise<void> {
    const event: InterviewEvent = {
      sessionId: session.id,
      turn: session.turn,
      ts: this.clock(),
      type,
      payload,
      model: (this.model as { model?: string }).model,
      promptVersion: PROMPT_VERSION,
      configVersion: config.version,
      latencyMs,
    };
    await this.store.appendEvent(session.id, event);
  }
}
