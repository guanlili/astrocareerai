// 模拟面试聊天室 —— 数据模型与类型契约（SPEC_mock_interview_v1.md §5）
//
// 本文件是前后端共享的「唯一事实来源」。任何接口实现（Mock / 真实模型 / 后端 API）
// 都必须返回与此处同构的数据。改动类型前请先回改 spec 对应章节。

// ──────────────────────────────────────────────────────────────────────────
// §5.5 语言模式（中英双语 / 中英混杂）
// ──────────────────────────────────────────────────────────────────────────

export type LanguageMode = {
  primary: "zh" | "en"; // 主语言
  mixing: "none" | "light" | "heavy";
  //  none  : 纯 primary 语言
  //  light : 主语言为主，专业术语保留原文（最贴近真实中文职场）
  //  heavy : 中英自由切换，整句可切英（外企 / 英文面试演练）
};

/** 系统默认语言：决策顺序 setup.language > style.language > 此默认（§5.5）。 */
export const DEFAULT_LANGUAGE: LanguageMode = { primary: "zh", mixing: "light" };

export type Difficulty = "warmup" | "standard" | "stress";

// ──────────────────────────────────────────────────────────────────────────
// §5.1 老师分身配置包（消费侧，本期 Mock，未来由配置后台产出）
// ──────────────────────────────────────────────────────────────────────────

export type TeacherAvatarConfig = {
  teacherId: string;
  version: string; // 配置版本，便于灰度 / 回滚

  // —— soul：人设内核 ——
  persona: {
    displayName: string; // "陈昊（AI 分身）"
    role: string; // "互联网产品终面官"
    background: string; // 履历浓缩，注入系统提示词
    principles: string[]; // 价值观 / 评判原则
  };

  // —— skills：能力边界 ——
  skills: {
    domains: string[]; // 擅长领域
    interviewStyles: string[]; // 面试风格
  };

  // —— style：说话风格（映射 teacher.avatar.tsx 的三个 slider）——
  style: {
    tone: number; // 0 严厉 — 100 温和
    technicality: number; // 0 口语 — 100 术语
    verbosity: number; // 0 精炼 — 100 详细
    catchphrases?: string[]; // 口头禅 / 语气样例，少量 few-shot
    language?: LanguageMode; // 该老师默认语言风格，可被本次会话覆盖
  };

  // —— knowledge：Q&A / RAG 知识库（本期 Mock 题库，后续替换为检索接口）——
  knowledge: {
    questionBank: QuestionNode[];
    rubric: RubricDimension[]; // 评分维度定义（驱动报告六维）
    ragEndpoint?: string; // 预留：未来指向真实 RAG 检索服务
  };

  // —— guardrails：边界约束 ——
  guardrails: {
    maxQuestions: number; // 默认 6
    targetDurationMin: number; // 默认 30（分钟）
    targetDurationMax: number; // 默认 45
    stayInScope: boolean; // 是否严格限定在 knowledge 范围内（默认 true）
  };
};

/** 结构化题库节点：支持「按上一题动态选择 / 追问」。 */
export type QuestionNode = {
  id: string;
  topic: string; // 考察主题
  dimension: string; // 关联评分维度 id
  difficulty: Difficulty;
  prompt: string; // 题面（生成追问的种子，非逐字播报）
  followUps?: string[]; // 候选追问方向
  appliesTo?: {
    // 命中条件：用于按公司 / 岗位押题
    companies?: string[];
    roleKeywords?: string[];
  };
};

export type RubricDimension = {
  id: string; // "expression" | "business" | ...
  name: string; // "表达逻辑"
  weight: number; // 权重，加权得总分
};

// ──────────────────────────────────────────────────────────────────────────
// §5.2 本次面试配置（用户侧）
// ──────────────────────────────────────────────────────────────────────────

export type InterviewSetup = {
  resume?: string;
  companyName?: string;
  jobDescription?: string;
  roleTitle?: string;
  customFocus?: string; // 用户自定义关注点（自由文本）
  difficulty?: Difficulty;
  language?: LanguageMode; // 本次面试语言风格，覆盖老师默认
};

// ──────────────────────────────────────────────────────────────────────────
// §5.3 会话与消息
// ──────────────────────────────────────────────────────────────────────────

export type ChatRole = "ai" | "user" | "system";

/**
 * 扩展现有 ChatMsg（src/mock/sessions.ts 由此处再导出），保持向后兼容。
 * 旧字段 role / content / meta 不变，新增 questionId / feedback 为可选。
 */
export type ChatMsg = {
  role: ChatRole;
  content: string;
  meta?: string; // 现有：考察维度标签
  questionId?: string; // 本消息对应的题目（AI 提问时）
  feedback?: AnswerFeedback; // 即时反馈（AI 对上一答的点评）
};

export type AnswerFeedback = {
  questionId: string;
  score: number; // 0–100，本题得分
  dimension: string; // 主考察维度
  strengths: string[]; // 亮点
  improvements: string[]; // 待改进
  oneLineComment: string; // 一句话点评（即时展示）
};

export type InterviewState = "CONFIG" | "INTRO" | "QA_LOOP" | "WRAPUP" | "REPORT";

export type SessionStatus = "active" | "paused" | "completed" | "abandoned";

export type InterviewSession = {
  id: string;
  teacherId: string;
  userId?: string; // 归属用户，用于 listResumable（§7.8）
  configVersion: string; // 本场使用的 TeacherAvatarConfig.version（可复现 / 可追溯）
  setup: InterviewSetup;
  state: InterviewState;
  status: SessionStatus; // 生命周期，支持续连（§7.8）
  askedQuestionIds: string[];
  startedAt: number; // 用于时长控制
  updatedAt: number; // 每回合落盘时间戳，用于续连提示与超时判定
  elapsedMs: number; // 累计有效用时（暂停期间不计，避免挂机刷满）
  turn: number; // 单调递增回合号，用于幂等与断点定位
  messages: ChatMsg[];
};

// ──────────────────────────────────────────────────────────────────────────
// §5.4 报告（对齐现有 report 页面，新增 customFocusFeedback / perQuestion）
// ──────────────────────────────────────────────────────────────────────────

export type InterviewReport = {
  sessionId: string;
  overall: number; // 加权总分（按 rubric.weight）
  dimensions: { name: string; score: number; prev?: number }[];
  highlights: string[];
  weaknesses: string[];
  suggestions: string[];
  perQuestion: AnswerFeedback[]; // 每题反馈汇总（可下钻）
  customFocusFeedback?: {
    // 针对用户自定义关注点的专项点评
    focus: string;
    assessment: string;
    actionItems: string[];
  };
  handoffRecommended: boolean; // 是否建议转真人 1v1
};

// ──────────────────────────────────────────────────────────────────────────
// §7.9 对话数据沉淀（append-only 事件日志）
// ──────────────────────────────────────────────────────────────────────────

export type InterviewEventType =
  | "session_start"
  | "user_message"
  | "ai_message"
  | "feedback"
  | "question_selected"
  | "report_generated"
  | "handoff_suggested"
  | "resume"
  | "pause"
  | "abandon";

export type InterviewEvent = {
  sessionId: string;
  turn: number;
  ts: number;
  type: InterviewEventType;
  payload: unknown; // 对应类型的结构化数据
  // —— 可复现性：能据此离线重放 / 对比不同模型与提示词 ——
  model?: string; // 实际调用的模型 id（§10）
  promptVersion?: string; // 系统提示词骨架版本（§6）
  configVersion?: string; // TeacherAvatarConfig 版本
  latencyMs?: number; // 该回合耗时
};

// ──────────────────────────────────────────────────────────────────────────
// §6.1 模型结构化输出契约（每回合）
// ──────────────────────────────────────────────────────────────────────────

export type ModelTurnPhase = "INTRO" | "QUESTION" | "FEEDBACK_THEN_QUESTION" | "WRAPUP";

/** 主持模型每回合返回的 JSON（§6.1 输出格式）。 */
export type ModelTurnOutput = {
  phase: ModelTurnPhase;
  say: string; // 要对候选人说的话
  questionId: string | null; // 本轮提问对应的题库节点 id，自由生成则为 null
  dimension: string | null; // 本轮主要考察维度
  feedback: Omit<AnswerFeedback, "questionId" | "dimension"> | null;
};
