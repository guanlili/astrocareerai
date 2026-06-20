// 面试 Mock 配置与题库（SPEC_mock_interview_v1.md §5.1 / §7.4 / P2）
//
// 本期由 Mock 提供「老师分身配置包」，未来由老师配置后台产出，聊天室只依赖其形状。
// 提供：
//   - 共享 rubric（评分六维，驱动报告雷达图）
//   - t-001 陈昊（产品终面官）结构化题库 + 通用降级题库
//   - 各老师语言默认（英文岗老师配 en / heavy，§5.5）
//   - MockTeacherConfigProvider：按 teacherId 组装 TeacherAvatarConfig（覆盖全部 mock 老师）

import type { TeacherConfigProvider } from "@/agent/interview/contracts";
import type {
  LanguageMode,
  QuestionNode,
  RubricDimension,
  TeacherAvatarConfig,
} from "@/agent/interview/types";
import { getTeacher } from "./teachers";

// ──────────────────────────────────────────────────────────────────────────
// 评分维度（rubric）—— 六维，加权得总分，驱动报告雷达图
// ──────────────────────────────────────────────────────────────────────────

export const PM_RUBRIC: RubricDimension[] = [
  { id: "expression", name: "表达逻辑", weight: 2 },
  { id: "business", name: "业务理解", weight: 3 },
  { id: "data", name: "数据严谨", weight: 2 },
  { id: "pressure", name: "抗压应变", weight: 1 },
  { id: "fit", name: "岗位匹配", weight: 2 },
  { id: "overall", name: "整体印象", weight: 1 },
];

// ──────────────────────────────────────────────────────────────────────────
// 题库：t-001 陈昊（产品）—— 含通用题（无 appliesTo）+ 押题（命中字节 / 抖音 / 产品）
// ──────────────────────────────────────────────────────────────────────────

export const PM_QUESTION_BANK: QuestionNode[] = [
  {
    id: "pm-intro",
    topic: "自我介绍",
    dimension: "expression",
    difficulty: "warmup",
    prompt:
      "用 90 秒做个自我介绍，重点讲一段你最有代表性的项目经历，说清楚你的角色与拿到的结果。",
    followUps: [
      "你刚才提到的结果，是怎么量化的？口径是什么？",
      "这段经历里你做过最艰难的一个取舍是什么？",
    ],
  },
  {
    id: "pm-metric",
    topic: "指标拆解",
    dimension: "business",
    difficulty: "standard",
    prompt:
      "如果让你负责一个『提升创作者活跃』的目标，你会怎么定义『激励是否有效』这个指标？为什么不直接用 DAU？",
    followUps: [
      "你这套指标里，最容易被大盘波动干扰的是哪一个？怎么剥离？",
      "如果激励转化率涨了但留存没动，你会怎么判断要不要继续投入？",
    ],
    appliesTo: { companies: ["字节", "字节跳动", "抖音"], roleKeywords: ["产品", "运营", "增长"] },
  },
  {
    id: "pm-data",
    topic: "数据严谨",
    dimension: "data",
    difficulty: "standard",
    prompt:
      "你说看『长期留存』，具体是 D7 还是 D30？你怎么剥离自然留存、确认是你的策略带来的增量？",
    followUps: ["如果不能做 A/B 实验，你会用什么办法逼近因果？"],
  },
  {
    id: "pm-roi",
    topic: "商业决策",
    dimension: "pressure",
    difficulty: "stress",
    prompt:
      "假设实验组留存涨了 2%，但现金激励成本翻倍、ROI 为负。你向 leader 汇报时怎么表达？这个 feature 到底做不做？",
    followUps: ["如果 leader 当场反对你的结论，你怎么继续推进？"],
  },
  {
    id: "pm-fit",
    topic: "岗位匹配",
    dimension: "fit",
    difficulty: "standard",
    prompt:
      "为什么是这个岗位、这家公司？结合你对我们业务的理解，说说你能立刻补上的那块短板。",
    appliesTo: { roleKeywords: ["产品", "经理", "终面", "manager"] },
  },
  {
    id: "pm-resume",
    topic: "简历深挖",
    dimension: "business",
    difficulty: "standard",
    prompt:
      "挑你简历里你自己最不满意的一段经历，复盘一下：当时如果重来，你会改哪三步？",
  },
  {
    id: "pm-close",
    topic: "反问环节",
    dimension: "overall",
    difficulty: "standard",
    prompt: "最后，你有什么想问我的？一个好问题往往比一个好答案更能体现候选人。",
  },
];

// 通用降级题库：简历 / JD 全空时仍可开场，覆盖六维、不绑定任何公司或岗位。
export const GENERIC_QUESTION_BANK: QuestionNode[] = [
  {
    id: "g-intro",
    topic: "自我介绍",
    dimension: "expression",
    difficulty: "warmup",
    prompt: "先做个简短的自我介绍，讲讲你的背景和你想冲刺的方向。",
    followUps: ["你刚才提到的那段经历，能再展开讲讲你具体做了什么吗？"],
  },
  {
    id: "g-project",
    topic: "项目深挖",
    dimension: "business",
    difficulty: "standard",
    prompt: "讲一个你最有成就感的项目：背景是什么、你做了什么、最后拿到了什么结果。",
    followUps: ["这个结果里，哪一部分是你个人的贡献？"],
  },
  {
    id: "g-data",
    topic: "量化能力",
    dimension: "data",
    difficulty: "standard",
    prompt: "你刚才说的成果，能用数据量化吗？你是怎么衡量它的？",
  },
  {
    id: "g-stress",
    topic: "压力应变",
    dimension: "pressure",
    difficulty: "stress",
    prompt: "讲一次你和同事 / leader 意见严重冲突的经历，你最后是怎么处理的？",
  },
  {
    id: "g-fit",
    topic: "动机匹配",
    dimension: "fit",
    difficulty: "standard",
    prompt: "为什么想做这个方向？你觉得自己最匹配和最欠缺的分别是什么？",
  },
  {
    id: "g-close",
    topic: "反问环节",
    dimension: "overall",
    difficulty: "standard",
    prompt: "你有什么想问我的吗？",
  },
];

// ──────────────────────────────────────────────────────────────────────────
// 各老师语言默认（§5.5）——英文岗老师配英文 / 中英混杂
// ──────────────────────────────────────────────────────────────────────────

export const TEACHER_LANGUAGE_DEFAULTS: Record<string, LanguageMode> = {
  "t-001": { primary: "zh", mixing: "light" }, // 互联网产品，中文为主、术语英文
  "t-002": { primary: "en", mixing: "none" }, // 麦肯锡全英文 Case
  "t-003": { primary: "en", mixing: "none" }, // 高盛 Superday 英文面试
  "t-004": { primary: "zh", mixing: "heavy" }, // FAANG 系统设计，中英自由切换
  "t-005": { primary: "zh", mixing: "light" }, // 快消管培生，中文
  "t-006": { primary: "zh", mixing: "light" }, // HR 面，中文
};

const DEFAULT_TEACHER_LANGUAGE: LanguageMode = { primary: "zh", mixing: "light" };

// ──────────────────────────────────────────────────────────────────────────
// 配置组装：按 teacherId 产出 TeacherAvatarConfig（覆盖全部 mock 老师）
// ──────────────────────────────────────────────────────────────────────────

export function buildTeacherConfig(teacherId: string): TeacherAvatarConfig {
  const t = getTeacher(teacherId);
  const language = TEACHER_LANGUAGE_DEFAULTS[teacherId] ?? DEFAULT_TEACHER_LANGUAGE;
  // t-001 用产品专属题库，其余老师用通用题库（后续各自接入专属题库 / RAG）
  const questionBank = teacherId === "t-001" ? PM_QUESTION_BANK : GENERIC_QUESTION_BANK;

  return {
    teacherId,
    version: "mock-2026-06",
    persona: {
      displayName: t ? `${t.name}（AI 分身）` : "面试官（AI 分身）",
      role: t?.title ?? "资深面试官",
      background: t
        ? `${t.bio} 代表性成就：${t.highlights.join("；")}。`
        : "多年一线面试官经验，擅长结构化追问。",
      principles: [
        "重真实业务 sense，胜过背诵八股",
        "用追问逼出候选人思考的边界",
        "反馈要犀利但可执行，不打无意义的高分",
      ],
    },
    skills: {
      domains: t?.tags ?? ["通用面试"],
      interviewStyles: ["结构化追问", "业务推演", "压力测试"],
    },
    style: {
      tone: 45, // 略偏严厉
      technicality: 60,
      verbosity: 50,
      catchphrases: ["嗯，这个点我想再追一下", "别急着给结论，先把口径说清楚"],
      language,
    },
    knowledge: {
      questionBank,
      rubric: PM_RUBRIC,
    },
    guardrails: {
      maxQuestions: 6,
      targetDurationMin: 30,
      targetDurationMax: 45,
      stayInScope: true,
    },
  };
}

/** 本期 Mock 配置来源；未来替换为后台拉取，聊天室与编排器无需改动（§8.1）。 */
export class MockTeacherConfigProvider implements TeacherConfigProvider {
  async getConfig(teacherId: string): Promise<TeacherAvatarConfig> {
    return buildTeacherConfig(teacherId);
  }
}
