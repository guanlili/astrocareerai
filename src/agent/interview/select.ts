// 选题 / 动态追问策略（SPEC_mock_interview_v1.md §7.4）
//
// 按优先级决定下一题：追问优先 → 押题匹配 → 维度补全 → 题源不足降级。
// 纯函数、无副作用，便于单测断言走了哪条分支。

import type { InterviewSession, QuestionNode, TeacherAvatarConfig } from "./types";

export type SelectionBranch =
  | "follow_up" // 1. 追问优先：顺着上一题深挖
  | "pinpoint" // 2. 押题匹配：命中公司 / 岗位关键词
  | "coverage" // 3. 维度补全：覆盖 rubric 中未考察维度
  | "generated"; // 4. 题源不足降级：在 domains 范围内自由生成

export type QuestionSelection = {
  branch: SelectionBranch;
  questionId: string | null; // 自由生成为 null
  dimension: string;
  seedPrompt: string; // 交给模型改写的题面 / 追问方向种子
  isFollowUp: boolean;
};

/** appliesTo 是否命中本次 setup 的公司 / 岗位关键词。 */
function appliesToHit(node: QuestionNode, session: InterviewSession): boolean {
  const a = node.appliesTo;
  if (!a) return false;
  const company = (session.setup.companyName ?? "").toLowerCase();
  const roleHay =
    `${session.setup.roleTitle ?? ""} ${session.setup.jobDescription ?? ""}`.toLowerCase();
  const companyHit =
    company.length > 0 &&
    (a.companies ?? []).some((c) => {
      const cc = c.toLowerCase();
      return company.includes(cc) || cc.includes(company);
    });
  const roleHit =
    roleHay.trim().length > 0 &&
    (a.roleKeywords ?? []).some((k) => roleHay.includes(k.toLowerCase()));
  return companyHit || roleHit;
}

/**
 * 选下一题。
 * @param preferFollowUp 编排器在「上一答值得深挖」时置 true（§7.4 第 1 条）。
 */
export function selectNextQuestion(
  config: TeacherAvatarConfig,
  session: InterviewSession,
  preferFollowUp: boolean,
): QuestionSelection {
  const bank = config.knowledge.questionBank;
  const asked = new Set(session.askedQuestionIds);
  const askedNodes = session.askedQuestionIds
    .map((id) => bank.find((n) => n.id === id))
    .filter((n): n is QuestionNode => !!n);
  const coveredDims = new Set(askedNodes.map((n) => n.dimension));

  // 1. 追问优先：顺着上一题深挖（是否追问由编排器按上一答分数裁决，§7.4 第 1 条）
  const lastId = session.askedQuestionIds.at(-1);
  const lastNode = lastId ? bank.find((n) => n.id === lastId) : undefined;
  if (preferFollowUp && lastNode?.followUps?.length) {
    // 按追问深度轮换方向：同题被多次追问时逐层取下一个 followUp，避免每次都死取第 1 个
    const depth = Math.max(
      0,
      session.askedQuestionIds.filter((id) => id === lastNode.id).length - 1,
    );
    const idx = Math.min(depth, lastNode.followUps.length - 1);
    return {
      branch: "follow_up",
      questionId: lastNode.id,
      dimension: lastNode.dimension,
      seedPrompt: lastNode.followUps[idx],
      isFollowUp: true,
    };
  }

  const pool = bank.filter((n) => !asked.has(n.id));

  // 维度未覆盖者优先（押题命中与维度补全共用此排序）
  const byUncoveredDim = (arr: QuestionNode[]) =>
    [...arr].sort(
      (a, b) => (coveredDims.has(a.dimension) ? 1 : 0) - (coveredDims.has(b.dimension) ? 1 : 0),
    );

  // 2. 押题匹配
  const matched = pool.filter((n) => appliesToHit(n, session));
  if (matched.length) {
    const pick = byUncoveredDim(matched)[0];
    return {
      branch: "pinpoint",
      questionId: pick.id,
      dimension: pick.dimension,
      seedPrompt: pick.prompt,
      isFollowUp: false,
    };
  }

  // 3. 维度补全
  if (pool.length) {
    const pick = byUncoveredDim(pool)[0];
    return {
      branch: "coverage",
      questionId: pick.id,
      dimension: pick.dimension,
      seedPrompt: pick.prompt,
      isFollowUp: false,
    };
  }

  // 4. 题源不足降级：在 domains 内自由生成，优先补 rubric 未覆盖维度
  const uncovered = config.knowledge.rubric.find((r) => !coveredDims.has(r.id));
  const dim = uncovered?.id ?? config.knowledge.rubric[0]?.id ?? "general";
  return {
    branch: "generated",
    questionId: null,
    dimension: dim,
    seedPrompt: `围绕 ${config.skills.domains.join(" / ")} 自由生成一道考察「${dim}」维度、与岗位强相关的问题。`,
    isFollowUp: false,
  };
}
