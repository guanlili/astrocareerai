export type TrainingJob = {
  id: string;
  teacher: string;
  status: "queued" | "running" | "success" | "failed";
  progress: number;
  startedAt: string;
  duration: string;
  failReason?: string;
};

export const trainingJobs: TrainingJob[] = [
  {
    id: "TJ-2041",
    teacher: "陈昊",
    status: "success",
    progress: 100,
    startedAt: "2025-06-17 09:12",
    duration: "23m 12s",
  },
  {
    id: "TJ-2042",
    teacher: "林知夏",
    status: "running",
    progress: 67,
    startedAt: "2025-06-18 08:40",
    duration: "进行中",
  },
  {
    id: "TJ-2043",
    teacher: "Marcus Wong",
    status: "queued",
    progress: 0,
    startedAt: "—",
    duration: "排队中",
  },
  {
    id: "TJ-2044",
    teacher: "苏宁",
    status: "failed",
    progress: 42,
    startedAt: "2025-06-17 22:01",
    duration: "12m 04s",
    failReason: "素材中扫描版 PDF 无法 OCR，请重新上传文本版",
  },
  {
    id: "TJ-2045",
    teacher: "周明远",
    status: "success",
    progress: 100,
    startedAt: "2025-06-16 14:33",
    duration: "18m 47s",
  },
  {
    id: "TJ-2046",
    teacher: "Anna Liu",
    status: "success",
    progress: 100,
    startedAt: "2025-06-15 11:08",
    duration: "15m 22s",
  },
];

export type ReviewItem = {
  id: string;
  name: string;
  title: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  materials: number;
};

export const reviewQueue: ReviewItem[] = [
  {
    id: "R-330",
    name: "王雪",
    title: "腾讯 PCG 高级产品经理",
    submittedAt: "2025-06-18 10:24",
    status: "pending",
    materials: 12,
  },
  {
    id: "R-329",
    name: "李澜",
    title: "瑞银 IBD Associate",
    submittedAt: "2025-06-18 09:11",
    status: "pending",
    materials: 18,
  },
  {
    id: "R-328",
    name: "周天宇",
    title: "Amazon SDE3",
    submittedAt: "2025-06-17 21:40",
    status: "approved",
    materials: 9,
  },
  {
    id: "R-327",
    name: "Mike Chen",
    title: "Bain Consultant",
    submittedAt: "2025-06-17 18:02",
    status: "rejected",
    materials: 4,
  },
];

export type Order = {
  id: string;
  student: string;
  teacher: string;
  type: "试聊" | "订阅" | "1v1辅导" | "Package";
  amount: number;
  status: "已支付" | "待确认" | "已完成" | "退款";
  date: string;
};

export const orders: Order[] = [
  {
    id: "ORD-90211",
    student: "张雨",
    teacher: "陈昊",
    type: "1v1辅导",
    amount: 880,
    status: "已支付",
    date: "2025-06-18",
  },
  {
    id: "ORD-90208",
    student: "黄佳",
    teacher: "林知夏",
    type: "Package",
    amount: 5800,
    status: "已完成",
    date: "2025-06-17",
  },
  {
    id: "ORD-90207",
    student: "陈思远",
    teacher: "苏宁",
    type: "订阅",
    amount: 199,
    status: "已支付",
    date: "2025-06-17",
  },
  {
    id: "ORD-90205",
    student: "Lily",
    teacher: "Marcus Wong",
    type: "1v1辅导",
    amount: 1680,
    status: "待确认",
    date: "2025-06-16",
  },
  {
    id: "ORD-90201",
    student: "周哲",
    teacher: "Anna Liu",
    type: "订阅",
    amount: 79,
    status: "退款",
    date: "2025-06-15",
  },
];

export type Student = {
  id: string;
  name: string;
  avatar: string;
  rounds: number;
  lastActive: string;
  intent: "high" | "medium" | "low";
  paid: boolean;
  note?: string;
};

const avatar = (s: string) => `https://api.dicebear.com/9.x/notionists/svg?seed=${s}`;

export const students: Student[] = [
  {
    id: "S-1101",
    name: "张雨",
    avatar: avatar("zhangyu"),
    rounds: 28,
    lastActive: "2 小时前",
    intent: "high",
    paid: false,
    note: "多次提到6月底要 offer",
  },
  {
    id: "S-1102",
    name: "黄佳",
    avatar: avatar("huangjia"),
    rounds: 12,
    lastActive: "昨天",
    intent: "medium",
    paid: true,
    note: "已购买 Package",
  },
  {
    id: "S-1103",
    name: "陈思远",
    avatar: avatar("siyuan"),
    rounds: 6,
    lastActive: "3 天前",
    intent: "low",
    paid: false,
  },
  {
    id: "S-1104",
    name: "Lily",
    avatar: avatar("lily"),
    rounds: 18,
    lastActive: "今天",
    intent: "high",
    paid: true,
    note: "对终面焦虑明显",
  },
  {
    id: "S-1105",
    name: "周哲",
    avatar: avatar("zhouzhe"),
    rounds: 4,
    lastActive: "1 周前",
    intent: "low",
    paid: false,
  },
];

export const dashboardKpis = {
  student: [
    { label: "本周练习", value: "7", unit: "次", delta: "+3" },
    { label: "累计训练", value: "42", unit: "h", delta: "+5.2" },
    { label: "综合评分", value: "82", unit: "/100", delta: "+6" },
    { label: "薄弱项数", value: "2", unit: "", delta: "-1" },
  ],
  teacher: [
    { label: "今日对话", value: "284", unit: "轮", delta: "+12%" },
    { label: "覆盖学员", value: "126", unit: "人", delta: "+8" },
    { label: "高意向学员", value: "9", unit: "人", delta: "+3" },
    { label: "本月收入", value: "¥48,260", unit: "", delta: "+22%" },
  ],
  admin: [
    { label: "平台 DAU", value: "12,408", unit: "", delta: "+4.8%" },
    { label: "在线老师", value: "186", unit: "", delta: "+6" },
    { label: "训练成功率", value: "94.2", unit: "%", delta: "+1.1pp" },
    { label: "GMV (月)", value: "¥1.82M", unit: "", delta: "+18%" },
  ],
};

export const teacherDailyConversations = [
  { day: "周一", count: 180, paid: 22 },
  { day: "周二", count: 210, paid: 28 },
  { day: "周三", count: 240, paid: 31 },
  { day: "周四", count: 198, paid: 24 },
  { day: "周五", count: 284, paid: 38 },
  { day: "周六", count: 320, paid: 42 },
  { day: "周日", count: 268, paid: 35 },
];

// 确定性伪随机（不依赖 Math.random / Date），避免 SSR 与客户端首帧水合不一致。
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const adminDauTrend = Array.from({ length: 14 }, (_, i) => ({
  day: `06-${(i + 5).toString().padStart(2, "0")}`,
  dau: 9000 + Math.round(Math.sin(i / 2) * 1200 + i * 220 + seeded(i + 1) * 300),
  newUsers: 200 + Math.round(Math.cos(i / 3) * 60 + i * 12),
}));

export const adminPaymentBreakdown = [
  { name: "1v1 辅导", value: 820000 },
  { name: "AI 订阅", value: 520000 },
  { name: "Package", value: 380000 },
  { name: "试聊", value: 0 },
];

export const adminComplianceItems = [
  {
    id: "C-771",
    type: "AI 回答",
    teacher: "陈昊",
    risk: "中",
    reason: "涉及薪资具体数字建议",
    time: "2 小时前",
  },
  {
    id: "C-770",
    type: "素材",
    teacher: "Marcus Wong",
    risk: "低",
    reason: "包含公司内部 deck 缩略图",
    time: "5 小时前",
  },
  {
    id: "C-769",
    type: "AI 回答",
    teacher: "林知夏",
    risk: "高",
    reason: "对竞品公司评价不当",
    time: "昨天",
  },
];

export const adminUserSummary = [
  { id: "U-23114", name: "张雨", role: "学员", spent: 880, lastActive: "今天", status: "活跃" },
  { id: "U-23112", name: "陈昊", role: "老师", spent: 0, lastActive: "今天", status: "活跃" },
  { id: "U-23108", name: "Lily", role: "学员", spent: 5800, lastActive: "今天", status: "高价值" },
  { id: "U-23001", name: "周哲", role: "学员", spent: 0, lastActive: "1 周前", status: "流失风险" },
];
