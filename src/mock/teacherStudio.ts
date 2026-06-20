// 教师端工作区 —— 草稿态唯一真相源（teacher-portal-optimization-plan.md §3.1）
//
// 所有教师端页面读写它；「发布」时把草稿拷贝进 teacherRegistry（复用既有契约，消费侧不变）。
// 本期用 localStorage 落地（前端 Demo），未来替换为后台接口即可。
//
// 注意：localStorage 仅客户端可用，所有读取做 typeof localStorage 兜底（同 teacherRegistry）。

import type { Teacher } from "./teachers";
import type { LanguageMode, QuestionNode, TeacherAvatarConfig } from "@/agent/interview/types";
import { PM_RUBRIC } from "./interview";
import { getPublishedProfile, publishTeacher, unpublishTeacher } from "./teacherRegistry";

export type PublishStatus = "draft" | "published" | "unpublished";

export type HandoffRule = {
  id: string;
  trigger: string;
  action: string;
  enabled: boolean;
};

export type PricingConfig = {
  aiMonthly: number; // AI 月订阅价
  trialRounds: number; // 试聊轮次
  perSession: number; // 按次套餐
  human60: number; // 真人 60min
  human120: number; // 真人 120min
  packagePrice: number; // Package
  rushSurchargePct: number; // 加急加价 %
  handoffRules: HandoffRule[];
};

export type ScheduleConfig = {
  open: string[]; // 老师已开放可预约，如 "周一-10"
  booked: string[]; // 已被学员预约（不可取消）
};

export type StudioMaterial = {
  id: string;
  name: string;
  size: string;
  type: "doc" | "archive" | "json" | "pdf";
  status: string;
  error?: boolean;
};

export type StudioState = {
  profile: Teacher;
  config: TeacherAvatarConfig;
  pricing: PricingConfig;
  schedule: ScheduleConfig;
  materials: StudioMaterial[];
  status: PublishStatus;
  updatedAt: number;
};

const KEY = "mirrorhire:teacherStudio";

// 档期网格常量（schedule.tsx 与 studio 共用）
export const SCHEDULE_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export const SCHEDULE_SLOTS = ["09", "10", "11", "13", "14", "15", "16", "20", "21"];

// 默认草稿的档期种子（沿用 schedule 页旧硬编码，保持开课后视觉一致）
const BOOKED_SEED = [
  "周一-10",
  "周一-20",
  "周二-14",
  "周三-21",
  "周四-09",
  "周四-21",
  "周五-13",
  "周五-20",
  "周六-10",
  "周六-20",
  "周日-14",
];
// 旧页里「未开放」的格子：既不在 open 也不在 booked
const BLOCKED_SEED = ["周三-09", "周三-10", "周日-21"];

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(seed || "new")}&backgroundColor=1e3a8a,0c2340,2563eb`;

function defaultPricing(): PricingConfig {
  return {
    aiMonthly: 99,
    trialRounds: 5,
    perSession: 29,
    human60: 880,
    human120: 1680,
    packagePrice: 2980,
    rushSurchargePct: 30,
    handoffRules: [
      {
        id: "r1",
        trigger: "对话中出现「具体案例」「我的情况」连续 ≥ 3 次",
        action: "提示转人工",
        enabled: true,
      },
      { id: "r2", trigger: "学员明确表达「想找您本人」", action: "立即转人工", enabled: true },
      { id: "r3", trigger: "对话轮次 ≥ 25 且未付费", action: "推荐 Package", enabled: true },
      { id: "r4", trigger: "薪资谈判 / 职场纠纷类问题", action: "提示老师介入", enabled: false },
    ],
  };
}

function defaultSchedule(): ScheduleConfig {
  const all = SCHEDULE_DAYS.flatMap((d) => SCHEDULE_SLOTS.map((s) => `${d}-${s}`));
  const exclude = new Set([...BOOKED_SEED, ...BLOCKED_SEED]);
  return {
    open: all.filter((k) => !exclude.has(k)),
    booked: [...BOOKED_SEED],
  };
}

function defaultMaterials(): StudioMaterial[] {
  return [
    {
      id: "m1",
      name: "字节跳动_PM面经合集.docx",
      size: "1.2MB",
      type: "doc",
      status: "已纳入知识库",
    },
    {
      id: "m2",
      name: "知乎专栏_产品方法论.zip",
      size: "8.4MB",
      type: "archive",
      status: "已纳入知识库",
    },
    {
      id: "m3",
      name: "辅导学员_对话精选.json",
      size: "320KB",
      type: "json",
      status: "已纳入知识库",
    },
    {
      id: "m4",
      name: "扫描版_面试笔记.pdf",
      size: "12MB",
      type: "pdf",
      status: "OCR 失败",
      error: true,
    },
  ];
}

/** 把多行题面重建为结构化题库节点（dimension 沿用旧 publish 映射）。 */
export function rebuildQuestionBank(prompts: string[], idPrefix: string): QuestionNode[] {
  return prompts.map((prompt, i) => ({
    id: `${idPrefix}-q${i + 1}`,
    topic: i === 0 ? "自我介绍" : `考察点 ${i + 1}`,
    dimension: PM_RUBRIC[i % PM_RUBRIC.length].id,
    difficulty: i === 0 ? "warmup" : "standard",
    prompt,
  }));
}

// 默认草稿：沿用旧 publish 页 SAMPLE（周衡 UX 设计师）+ pricing/schedule 旧硬编码值作种子
export function defaultStudio(): StudioState {
  const id = "pub-ux01";
  const name = "周衡";
  const title = "前腾讯 高级体验设计师";
  const startingPrice = 99;
  const tags = ["交互设计", "用户体验", "作品集", "B端"];
  const domains = ["交互设计", "用户研究", "设计系统", "B端体验"];
  const questionPrompts = [
    "挑你作品集里你自己最满意的一个项目，讲清楚问题是什么、你的设计决策链路，以及最终怎么验证有效。",
    "你怎么衡量一个设计改版到底有没有让体验变好？除了好看，你盯哪些指标？",
    "如果产品经理和你对一个交互方案争执不下，你会怎么推进？",
    "给你一个 B 端复杂表单，信息密度很高，你会怎么做减法？先讲框架。",
    "讲一次你做得很糟糕的设计，复盘当时如果重来你会改哪三步。",
    "你有什么想问我的？",
  ];
  const language: LanguageMode = { primary: "zh", mixing: "light" };

  const profile: Teacher = {
    id,
    name,
    title,
    company: "腾讯 CDC / 现某大厂设计专家",
    avatar: avatarUrl(id),
    tags,
    industries: ["互联网", "技术"],
    rating: 4.8,
    reviewCount: 0,
    studentsServed: 0,
    startingPrice,
    bio: "10 年体验设计经验，主导过多款亿级用户产品的体验改版。擅长用追问逼出设计决策背后的真实权衡。",
    highlights: tags.slice(0, 3).map((t) => `擅长 ${t}`),
    hourly: startingPrice * 8,
    packagePrice: startingPrice * 28,
  };

  const config: TeacherAvatarConfig = {
    teacherId: id,
    version: "studio-seed",
    persona: {
      displayName: `${name}（AI 分身）`,
      role: title,
      background:
        "前腾讯 CDC 高级体验设计师，带过 6 人设计团队，面过 300+ 设计候选人，关注作品集背后的决策链路而非视觉表层。",
      principles: ["重真实决策链路胜过表层", "用追问逼出思考边界", "反馈犀利但可执行"],
    },
    skills: { domains, interviewStyles: ["结构化追问", "案例推演", "压力测试"] },
    style: { tone: 45, technicality: 60, verbosity: 55, language },
    knowledge: {
      questionBank: rebuildQuestionBank(questionPrompts, id),
      rubric: PM_RUBRIC,
    },
    guardrails: {
      maxQuestions: 6,
      targetDurationMin: 30,
      targetDurationMax: 45,
      stayInScope: true,
    },
  };

  return {
    profile,
    config,
    pricing: defaultPricing(),
    schedule: defaultSchedule(),
    materials: defaultMaterials(),
    status: "draft",
    updatedAt: 0,
  };
}

/** 读草稿（SSR 安全）。并按注册表 reconcile 状态徽章：在架=已发布。 */
export function getStudio(): StudioState {
  let base: StudioState;
  try {
    if (typeof localStorage === "undefined") return defaultStudio();
    const raw = localStorage.getItem(KEY);
    base = raw ? { ...defaultStudio(), ...(JSON.parse(raw) as StudioState) } : defaultStudio();
  } catch {
    return defaultStudio();
  }
  // reconcile：注册表里有该 id 即视为「已发布」；曾发布但已不在则「已下架」
  const inRegistry = typeof localStorage !== "undefined" && !!getPublishedProfile(base.profile.id);
  if (inRegistry) base.status = "published";
  else if (base.status === "published") base.status = "unpublished";
  return base;
}

/** 合并写回草稿并刷新 updatedAt。 */
export function updateStudio(patch: Partial<StudioState>): StudioState {
  const next = { ...getStudio(), ...patch, updatedAt: Date.now() };
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 隐私模式等 → 忽略 */
  }
  return next;
}

/** 把草稿重置回默认（演示重置用：恢复被预约占用的档期、改过的定价等）。 */
export function resetStudio(): StudioState {
  const next = defaultStudio();
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 隐私模式等 → 忽略 */
  }
  return next;
}

/** 发布草稿到学生端（复用既有 publishTeacher 契约，消费侧不变）。 */
export function publishStudio(): StudioState {
  const s = getStudio();
  publishTeacher({ profile: s.profile, config: s.config });
  return updateStudio({ status: "published" });
}

/** 下架草稿。 */
export function unpublishStudio(): StudioState {
  unpublishTeacher(getStudio().profile.id);
  return updateStudio({ status: "unpublished" });
}
