#!/usr/bin/env bun
/**
 * 面试 Agent 快速测试入口（SPEC_mock_interview_v1.md §7.6）
 *
 * 脱离聊天室 UI，在终端跑通一整场模拟面试，打印每题即时反馈与最终评估报告。
 *
 * 用法：
 *   bun run scripts/interview-repl.ts                 # 默认 --stub，自动作答跑完整场（零成本、可离线）
 *   bun run scripts/interview-repl.ts --live          # 用真实 Qwen（需 .env.local 配 DASHSCOPE_API_KEY）
 *   bun run scripts/interview-repl.ts --interactive   # 终端手动多轮作答
 *   bun run scripts/interview-repl.ts --teacher t-007 # 指定老师（默认 t-001 陈昊）
 */
import {
  MockInterviewAgent,
  MemorySessionStore,
  StubModelClient,
  QwenModelClient,
  type ChatMsg,
  type InterviewReport,
  type InterviewSetup,
} from "@/agent/interview";
import { MockTeacherConfigProvider, buildTeacherConfig } from "@/mock/interview";

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const optVal = (flag: string, fallback: string) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const live = has("--live");
const interactive = has("--interactive");
const teacherId = optVal("--teacher", "t-001");

// 自动作答用的候选答案（够覆盖 6 题 + 收尾）
const AUTO_ANSWERS = [
  "我叫张雨，复旦信管本科，在小红书产品部实习半年，负责创作者激励体系迭代，把激励转化率提升了 18%。",
  "我会拆成激励触达率、转化率和长期留存三层漏斗，不直接看 DAU 是因为它容易被大盘波动干扰。",
  "看的是 D30 留存，用 A/B 实验剥离自然留存，控制组保持原激励规则不变。",
  "如果 ROI 为负，我会先讲清楚长期留存收益和现金成本的权衡，再给出分档投放的折中方案。",
  "我最匹配的是数据驱动和业务理解，最欠缺的是大规模团队协作经验，这正是我想补的。",
  "我会复盘当时没有提前对齐资源方排期，下次会先做依赖梳理和 plan B。",
  "我想问一下团队当前最大的挑战是什么，以及这个岗位半年内最重要的目标。",
];

function sep() {
  console.log("─".repeat(72));
}

function printAi(msg: ChatMsg) {
  if (msg.feedback) {
    const f = msg.feedback;
    console.log(
      `  ↳ 反馈[${f.dimension}] ${f.score} 分 · ${f.oneLineComment}` +
        (f.improvements?.length ? `\n    待改进：${f.improvements.join("；")}` : ""),
    );
  }
  console.log(`\n面试官${msg.meta ? `（${msg.meta}）` : ""}：${msg.content}\n`);
}

function printReport(r: InterviewReport) {
  sep();
  console.log(`📊 评估报告  总分 ${r.overall}`);
  console.log("维度：" + r.dimensions.map((d) => `${d.name} ${d.score}`).join(" · "));
  console.log("亮点：" + r.highlights.join("；"));
  console.log("不足：" + r.weaknesses.join("；"));
  console.log("建议：" + r.suggestions.join("；"));
  if (r.customFocusFeedback) {
    console.log(
      `\n🎯 关注点专项「${r.customFocusFeedback.focus}」：${r.customFocusFeedback.assessment}` +
        `\n   行动项：${r.customFocusFeedback.actionItems.join("；")}`,
    );
  }
  console.log(`\n逐题反馈：${r.perQuestion.length} 条`);
  console.log(`建议转真人 1v1：${r.handoffRecommended ? "是" : "否"}`);
  sep();
}

async function ask(question: string): Promise<string> {
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function main() {
  const cfg = buildTeacherConfig(teacherId);
  console.log(
    `\n🎤 模拟面试 · ${cfg.persona.displayName} · 模型：${live ? "Qwen(live)" : "Stub"}\n`,
  );

  let model;
  if (live) {
    try {
      model = new QwenModelClient();
    } catch (e) {
      console.error(`无法初始化 Qwen：${e instanceof Error ? e.message : e}`);
      console.error("请在 .env.local 配置 DASHSCOPE_API_KEY，或去掉 --live 用 --stub。");
      process.exit(1);
    }
  } else {
    model = new StubModelClient();
  }

  const agent = new MockInterviewAgent({
    configProvider: new MockTeacherConfigProvider(),
    model,
    store: new MemorySessionStore(),
  });

  const setup: InterviewSetup = {
    companyName: "字节跳动",
    roleTitle: "产品经理 · 终面",
    customFocus: "我容易紧张、答非所问",
    difficulty: "standard",
  };

  const s0 = await agent.start(setup, teacherId);
  sep();
  printAi(s0.messages.at(-1)!);

  const sid = s0.id;
  let turn = 0;
  // 最多 maxQuestions + 收尾若干轮，避免死循环
  const safetyMax = cfg.guardrails.maxQuestions + 3;
  while (turn < safetyMax) {
    const answer = interactive
      ? await ask("你的回答 > ")
      : (AUTO_ANSWERS[turn] ?? "我再补充一点，刚才的结论是基于数据和业务判断综合得出的。");
    if (interactive && (answer.trim() === "/quit" || answer.trim() === "/exit")) break;
    if (!interactive) console.log(`你：${answer}`);

    const { session, message } = await agent.reply(sid, answer);
    printAi(message);
    turn++;
    if (session.state === "WRAPUP" || session.state === "REPORT") break;
  }

  const report = await agent.finish(sid);
  printReport(report);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
