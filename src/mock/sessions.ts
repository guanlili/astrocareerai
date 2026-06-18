export type ChatMsg = {
  role: "ai" | "user" | "system";
  content: string;
  meta?: string;
};

// 模拟面试对话示例（产品经理岗）
export const mockInterviewScript: ChatMsg[] = [
  {
    role: "system",
    content: "模拟面试 · 互联网产品经理 · 终面",
    meta: "面试官：陈昊（AI 分身）",
  },
  {
    role: "ai",
    content:
      "你好，欢迎来到今天的终面环节。先做个简短的自我介绍吧，重点说说你最近一段项目经历，控制在 90 秒以内。",
  },
  {
    role: "user",
    content:
      "好的。我叫张雨，本科就读于复旦大学信息管理与信息系统专业。去年在小红书产品部实习半年，主要负责创作者激励体系的迭代……",
  },
  {
    role: "ai",
    content:
      "好。你提到了创作者激励体系，我想追问一下：当时你是怎么定义"激励是否有效"这个指标的？为什么不直接用 DAU 或者发布量？",
    meta: "考察：指标拆解 · 业务理解",
  },
  {
    role: "user",
    content:
      "我们当时拆成三层：激励触达率、激励转化率、长期留存。直接看 DAU 容易被大盘波动干扰……",
  },
  {
    role: "ai",
    content:
      "嗯，三层漏斗的思路是对的。但我注意到你说"长期留存"——具体是 D7 还是 D30？以及你怎么剥离自然留存的影响？",
    meta: "考察：数据严谨度 · 因果归因",
  },
  {
    role: "user",
    content:
      "我们看的是 D30。剥离自然留存我们做了 A/B 实验，控制组保持原激励规则……",
  },
  {
    role: "ai",
    content:
      "好，A/B 实验设计是规范的。换个角度，假设这次实验的实验组留存涨了 2%，但 ROI 算下来现金激励成本翻倍。你向 leader 汇报时会怎么表达？做不做这个 feature？",
    meta: "考察：商业 sense · 决策表达",
  },
];

export const reportData = {
  overall: 82,
  dimensions: [
    { name: "表达逻辑", score: 88, prev: 76 },
    { name: "专业知识", score: 85, prev: 80 },
    { name: "抗压应变", score: 74, prev: 65 },
    { name: "岗位匹配", score: 90, prev: 78 },
    { name: "简历亮点", score: 78, prev: 72 },
    { name: "整体印象", score: 81, prev: 70 },
  ],
  highlights: [
    "STAR 结构清晰，能在 90 秒内交代完背景和成果。",
    "面对数据追问能主动给出归因方法（A/B 实验）。",
    "对岗位 JD 中的"创作者生态"理解到位。",
  ],
  weaknesses: [
    "回答 ROI 相关问题时反应较慢（停顿 8 秒）。",
    "缺少对失败项目的复盘叙述，建议补充。",
    "英文自我介绍时长不足，需练习。",
  ],
  suggestions: [
    "复习"商业化产品决策框架"，重点是成本 / 收益 / 战略取舍三角。",
    "准备 2 个失败项目复盘案例，按"事实 - 反思 - 改进"三段表达。",
    "建议预约陈昊老师的 1v1，针对终面进行 2 小时深度演练。",
  ],
};

export const growthTrend = [
  { week: "W1", score: 62 },
  { week: "W2", score: 65 },
  { week: "W3", score: 70 },
  { week: "W4", score: 72 },
  { week: "W5", score: 78 },
  { week: "W6", score: 80 },
  { week: "W7", score: 82 },
];
