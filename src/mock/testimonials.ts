// 学员好评 / offer 故事。落地页「学员说」区块使用。
// beforeScore / afterScore 取自模拟面试综合评分（/100），weeks 为使用周数。

export type Testimonial = {
  id: string;
  name: string;
  avatar: string;
  company: string;
  role: string;
  quote: string;
  beforeScore: number;
  afterScore: number;
  weeks: number;
  teacherId: string;
};

const av = (seed: string, bg: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=${bg}&radius=30`;

export const testimonials: Testimonial[] = [
  {
    id: "tm-001",
    name: "林同学",
    avatar: av("lin-offer", "fed7aa,fdba74"),
    company: "字节跳动",
    role: "产品经理 · 校招终面",
    quote:
      "陈昊老师的 AI 分身把我的回答拆得明明白白，第一次知道「业务理解」到底差在哪。练了三周，终面拿到 offer。",
    beforeScore: 58,
    afterScore: 86,
    weeks: 3,
    teacherId: "t-001",
  },
  {
    id: "tm-002",
    name: "Kevin W.",
    avatar: av("kevin-gs", "99f6e4,a7f3d0"),
    company: "高盛",
    role: "IBD Summer Analyst",
    quote:
      "Marcus 的分身 7×24 都在线，凌晨焦虑也能立刻模拟一轮。Fit question 从磕巴到流利，只用了两周。",
    beforeScore: 62,
    afterScore: 88,
    weeks: 2,
    teacherId: "t-003",
  },
  {
    id: "tm-003",
    name: "小米",
    avatar: av("xiaomi-pg", "fbcfe8,f9a8d4"),
    company: "宝洁",
    role: "市场部 · 管培生",
    quote: "结构化追问太上头了，AI 不会让我糊弄过去。每周雷达图能看到自己哪一维在涨，进步看得见。",
    beforeScore: 65,
    afterScore: 90,
    weeks: 4,
    teacherId: "t-005",
  },
  {
    id: "tm-004",
    name: "Daniel",
    avatar: av("daniel-google", "ddd6fe,c4b5fd"),
    company: "Google",
    role: "SWE · 社招",
    quote:
      "转码找工作最缺面试反馈，苏宁的分身像真人面试官一样追问边界条件。系统设计从 70 练到 92。",
    beforeScore: 70,
    afterScore: 92,
    weeks: 5,
    teacherId: "t-004",
  },
  {
    id: "tm-005",
    name: "Yuki",
    avatar: av("yuki-xhs", "fef08a,fde68a"),
    company: "小红书",
    role: "增长运营",
    quote:
      "以酪老师把大厂增长的「黑话」拆成大白话教我讲。AI 先练 80%，临门一脚再转真人 1v1，效率拉满。",
    beforeScore: 60,
    afterScore: 84,
    weeks: 3,
    teacherId: "t-007",
  },
  {
    id: "tm-006",
    name: "陈同学",
    avatar: av("chen-mck", "fbcfe8,f9a8d4"),
    company: "麦肯锡",
    role: "BA · 校招",
    quote:
      "Case interview 的 framework 训练特别扎实。林知夏分身每次都换行业换角度出题，告别刷题库的套路感。",
    beforeScore: 54,
    afterScore: 89,
    weeks: 6,
    teacherId: "t-002",
  },
];

export const getTestimonials = (limit?: number): Testimonial[] =>
  limit ? testimonials.slice(0, limit) : testimonials;
