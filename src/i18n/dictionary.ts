// 产品多语言词典（P2.5 · i18n）
//
// 注意：这里管理的是「产品界面文案」的语言，与 §5.5 的 LanguageMode（面试官说话的
// 语言）相互独立。用户可以用英文界面演练一场全中文面试。
//
// 新增 key 时两份词典都要补齐——TS 会用 TKey 约束 useT 的调用，漏翻会编译报错。

export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const zh = {
  // 头部 / 通用
  "header.back": "返回老师详情",
  "header.online": "在线",
  "header.aiAvatar": "AI 分身",
  "common.cancel": "取消",
  "lang.switch": "语言",
  "llm.mocking": "演示模式（Mock）",
  "llm.checking": "检测中…",

  // 辅导模式
  "mode.free": "自由问答",
  "mode.mock": "模拟面试",
  "mode.resume": "简历优化",

  // 配置抽屉
  "config.title": "面试配置",
  "config.subtitle": "填得越细，押题越准。所有字段都可留空——留空则进行通用模拟。",
  "config.resume": "简历",
  "config.resume.ph": "粘贴你的简历文本（支持要点式）……",
  "config.company": "目标公司",
  "config.company.ph": "如：字节跳动",
  "config.role": "目标岗位",
  "config.role.ph": "如：抖音电商产品经理 · 终面",
  "config.jd": "岗位 JD",
  "config.jd.ph": "粘贴目标岗位的 JD 全文……",
  "config.focus": "自定义关注点",
  "config.focus.ph": "你最想被针对训练的点，如：我容易紧张 / 答非所问，帮我抠数据敏感度",
  "config.difficulty": "难度",
  "difficulty.warmup": "热身",
  "difficulty.standard": "标准",
  "difficulty.stress": "压力",
  "config.language": "面试语言",
  "lang.zh": "中文",
  "lang.en": "全英文",
  "lang.mix": "中英混杂",
  "config.start": "开始面试",
  "config.starting": "正在准备面试……",
  "config.skip": "跳过，用通用模拟开始",

  // 场景卡 / 进度
  "scenario.title": "本次场景",
  "scenario.generic": "通用模拟面试",
  "scenario.company": "目标公司",
  "scenario.role": "目标岗位",
  "scenario.focus": "关注点",
  "progress.questions": "已问 {n}/{m} 题",
  "panel.realtimeDims": "实时考察维度",
  "panel.noData": "答题后这里会实时更新各维度表现。",

  // 对话
  "chat.thinking": "面试官思考中……",
  "chat.typing": "正在输入…",
  "chat.skipTyping": "点击跳过逐字显示",
  "chat.inputPh": "输入你的回答……（Shift+Enter 换行）",
  "chat.micSoon": "语音输入即将上线",
  "chat.attachSoon": "附件上传即将上线",
  "chat.endAndReport": "结束并生成评估报告",
  "chat.generatingReport": "正在生成报告……",
  "feedback.score": "本题得分",

  // 续连
  "resume.title": "检测到未完成的面试",
  "resume.desc": "上次进行到第 {n} 题，是否继续？",
  "resume.continue": "继续上次",
  "resume.restart": "重新开始",

  // 转化
  "handoff.title": "建议转 1v1 真人辅导",
  "handoff.desc": "这类高度个性化的问题，建议直接与 {name} 老师本人深入沟通。",
  "handoff.cta": "查看老师档期 →",

  // 合规
  "compliance.aiNotice":
    "AI 生成内容标识：本对话由 AI 分身生成，依据《生成式人工智能服务管理暂行办法》。",
} as const;

export type TKey = keyof typeof zh;

const en: Record<TKey, string> = {
  "header.back": "Back to mentor",
  "header.online": "Online",
  "header.aiAvatar": "AI Avatar",
  "common.cancel": "Cancel",
  "lang.switch": "Language",
  "llm.mocking": "Mocking",
  "llm.checking": "Checking…",

  "mode.free": "Open Q&A",
  "mode.mock": "Mock Interview",
  "mode.resume": "Resume Review",

  "config.title": "Interview Setup",
  "config.subtitle":
    "The more detail you give, the sharper the questions. Every field is optional — leave them blank for a generic mock.",
  "config.resume": "Resume",
  "config.resume.ph": "Paste your resume text (bullet points are fine)…",
  "config.company": "Target Company",
  "config.company.ph": "e.g. ByteDance",
  "config.role": "Target Role",
  "config.role.ph": "e.g. Douyin E-commerce PM · Final round",
  "config.jd": "Job Description",
  "config.jd.ph": "Paste the full JD of the target role…",
  "config.focus": "What to focus on",
  "config.focus.ph":
    "What you most want drilled, e.g. I get nervous / go off-topic; push me on data sense",
  "config.difficulty": "Difficulty",
  "difficulty.warmup": "Warmup",
  "difficulty.standard": "Standard",
  "difficulty.stress": "Stress",
  "config.language": "Interview language",
  "lang.zh": "Chinese",
  "lang.en": "English",
  "lang.mix": "Mixed",
  "config.start": "Start interview",
  "config.starting": "Preparing your interview…",
  "config.skip": "Skip — start a generic mock",

  "scenario.title": "This session",
  "scenario.generic": "Generic mock interview",
  "scenario.company": "Company",
  "scenario.role": "Role",
  "scenario.focus": "Focus",
  "progress.questions": "{n}/{m} questions asked",
  "panel.realtimeDims": "Live assessment",
  "panel.noData": "Your per-dimension performance will appear here as you answer.",

  "chat.thinking": "Interviewer is thinking…",
  "chat.typing": "is typing…",
  "chat.skipTyping": "Click to skip typing",
  "chat.inputPh": "Type your answer… (Shift+Enter for newline)",
  "chat.micSoon": "Voice input coming soon",
  "chat.attachSoon": "File upload coming soon",
  "chat.endAndReport": "End & generate report",
  "chat.generatingReport": "Generating report…",
  "feedback.score": "Score",

  "resume.title": "Unfinished interview found",
  "resume.desc": "You stopped at question {n}. Continue?",
  "resume.continue": "Continue",
  "resume.restart": "Start over",

  "handoff.title": "Consider a 1:1 with a real mentor",
  "handoff.desc":
    "For highly personalized topics like this, it's worth talking to {name} directly.",
  "handoff.cta": "See availability →",

  "compliance.aiNotice":
    "AI-generated content notice: this conversation is produced by an AI avatar, per applicable generative-AI regulations.",
};

export const dictionaries: Record<Locale, Record<TKey, string>> = { zh, en };

/** 把 {var} 占位符替换为实际值。 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** 从浏览器语言推断默认 locale，识别不到回退中文。 */
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "zh";
  const lang = (navigator.language || "").toLowerCase();
  return lang.startsWith("en") ? "en" : "zh";
}
