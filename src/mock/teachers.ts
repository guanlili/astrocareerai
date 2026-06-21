// 老师 mock 数据
import { getPublishedProfile } from "./teacherRegistry";

export type Teacher = {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  tags: string[];
  industries: string[];
  rating: number;
  reviewCount: number;
  studentsServed: number;
  startingPrice: number;
  bio: string;
  highlights: string[];
  hourly: number;
  packagePrice: number;
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${seed}&backgroundColor=1e3a8a,0c2340,2563eb`;

export const teachers: Teacher[] = [
  {
    id: "t-001",
    name: "陈昊",
    title: "前字节跳动 产品总监",
    company: "字节跳动 / 现某独角兽 CPO",
    avatar: avatar("chenhao"),
    tags: ["产品经理", "互联网大厂", "0-1业务", "数据驱动"],
    industries: ["互联网", "AI"],
    rating: 4.9,
    reviewCount: 268,
    studentsServed: 1240,
    startingPrice: 99,
    bio: "10 年互联网产品经验，主导过 3 款月活破亿产品。累计面试超 800 人，现为多家头部公司产品岗终面官。",
    highlights: [
      "曾任字节跳动抖音商业化产品负责人",
      "为 200+ 学员拿到 BAT/TMD offer",
      "擅长结构化追问 + 业务推演式面试",
    ],
    hourly: 880,
    packagePrice: 2980,
  },
  {
    id: "t-002",
    name: "林知夏",
    title: "前麦肯锡 项目经理",
    company: "麦肯锡 / 现独立咨询顾问",
    avatar: avatar("linzhixia"),
    tags: ["咨询", "案例面试", "结构化思维", "MBB"],
    industries: ["咨询", "金融"],
    rating: 4.95,
    reviewCount: 412,
    studentsServed: 980,
    startingPrice: 149,
    bio: "麦肯锡 5 年经验，主带 Case Interview 训练。学员 MBB offer 通过率行业领先。",
    highlights: ["MBB offer 学员 47 人", "案例库覆盖 12 个行业", "全英文 Case 训练"],
    hourly: 1280,
    packagePrice: 5800,
  },
  {
    id: "t-003",
    name: "Marcus Wong",
    title: "前高盛 VP",
    company: "Goldman Sachs HK",
    avatar: avatar("marcus"),
    tags: ["投行", "FICC", "Superday", "英文面试"],
    industries: ["金融", "投行"],
    rating: 4.88,
    reviewCount: 156,
    studentsServed: 520,
    startingPrice: 199,
    bio: "投行 8 年，前高盛固收 VP。专注 IBD / Markets 岗位 Superday 与技术面辅导。",
    highlights: ["学员入职 GS/MS/JPM 23 人", "Behavioral + Technical 双线训练"],
    hourly: 1680,
    packagePrice: 7800,
  },
  {
    id: "t-004",
    name: "苏宁",
    title: "Google 高级软件工程师",
    company: "Google Mountain View",
    avatar: avatar("suning"),
    tags: ["算法", "系统设计", "FAANG", "Coding"],
    industries: ["互联网", "技术"],
    rating: 4.92,
    reviewCount: 334,
    studentsServed: 1580,
    startingPrice: 129,
    bio: "Google L6 工程师，前 Facebook。Leetcode 累计 1800+，主带算法与系统设计。",
    highlights: ["Google/Meta onsite 通过率 68%", "系统设计专项 12 课"],
    hourly: 1080,
    packagePrice: 4200,
  },
  {
    id: "t-005",
    name: "周明远",
    title: "前宝洁市场部 总监",
    company: "P&G / Unilever",
    avatar: avatar("zhouming"),
    tags: ["快消", "管培生", "市场营销", "群面"],
    industries: ["快消", "市场"],
    rating: 4.85,
    reviewCount: 198,
    studentsServed: 760,
    startingPrice: 89,
    bio: "快消 12 年，主带管培生群面与终面。",
    highlights: ["宝洁/联合利华/玛氏 offer 学员 60+"],
    hourly: 780,
    packagePrice: 2680,
  },
  {
    id: "t-006",
    name: "Anna Liu",
    title: "字节跳动 HRBP",
    company: "ByteDance",
    avatar: avatar("annaliu"),
    tags: ["HR面", "薪资谈判", "职业规划"],
    industries: ["互联网", "HR"],
    rating: 4.9,
    reviewCount: 245,
    studentsServed: 890,
    startingPrice: 79,
    bio: "字节 HRBP 6 年，洞察 HR 面真实关注点。",
    highlights: ["薪资谈判平均涨幅 18%", "HR 面话术专题"],
    hourly: 680,
    packagePrice: 1980,
  },
  {
    // t-007：以酪 —— 通过「老师配置平台」上架的用户增长运营面试官（见 teacher.publish.tsx）
    // 档案基于真实简历载入（去哪儿网 国际机票 用户增长运营）。
    id: "t-007",
    name: "以酪",
    title: "去哪儿网 用户增长运营 · 国际机票",
    company: "去哪儿网 / 前网易有道",
    avatar: "/teachers/yilao.jpg",
    tags: ["用户增长", "短视频获客", "裂变活动", "数据驱动"],
    industries: ["互联网", "市场"],
    rating: 4.87,
    reviewCount: 176,
    studentsServed: 690,
    startingPrice: 109,
    bio: "去哪儿网国际机票用户增长运营，主导短视频获客与裂变增长：3 个月把短视频渠道从 0 做到日均 600 单、贡献大盘 3% 新客；「MBTI 专属目的地」裂变活动新客 UV 占大盘 1.5%、传播超竞品 10+ 倍。雅典经济大学市场营销硕士，TikTok 创作者（爆款 15w+）。擅长把模糊的增长目标拆成可落地的指标与动作。",
    highlights: [
      "短视频渠道 3 个月 0 → 日均 600 单，贡献大盘 3% 新客",
      "「MBTI 专属目的地」裂变活动传播超竞品 10+ 倍",
      "0-1 搭建 5 人短视频内容团队，2 周产出 8 个百万爆款",
    ],
    hourly: 920,
    packagePrice: 3180,
  },
];

// 先查内置老师，再回退到「老师配置平台」运行期发布的老师（仅客户端可解析，§8.1）。
export const getTeacher = (id: string): Teacher | undefined =>
  teachers.find((t) => t.id === id) ?? getPublishedProfile(id);
