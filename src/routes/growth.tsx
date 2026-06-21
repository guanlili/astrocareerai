import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layouts/StudentShell";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { growthTrend, reportData } from "@/mock/sessions";
import { dashboardKpis } from "@/mock/platform";
import { useAppState } from "@/mock/appStore";
import type { InterviewReport } from "@/agent/interview/types";
import { CalendarClock, CheckCircle2, Target } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";

export const Route = createFileRoute("/growth")({
  head: () => ({ meta: [{ title: "成长追踪 · 面镜 MirrorHire" }] }),
  component: GrowthPage,
});

// 静态回退历史（首帧/首次访问且 appStore.sessions 仅为 seed 演示数据时使用，确定性）。
const fallbackHistory = [
  {
    id: "seed-bytedance-pm",
    date: "2026-06-18",
    scene: "字节 PM 终面 · 模拟",
    score: 82,
    delta: "+6",
    rounds: 6,
  },
  {
    id: "seed-tencent-pcg",
    date: "2026-06-15",
    scene: "腾讯 PCG 业务面",
    score: 76,
    delta: "+4",
    rounds: 5,
  },
  {
    id: "seed-resume",
    date: "2026-06-09",
    scene: "简历优化 · 自由问答",
    score: 70,
    delta: "+5",
    rounds: 3,
  },
];

type HistoryRow = {
  id: string;
  date: string;
  scene: string;
  score: number;
  delta: string;
  rounds: number;
};

function GrowthPage() {
  const st = useAppState();
  // CTA 跟随该学生最近一次练习的老师（首帧用 seed，稳定）
  const focusTeacherId = st.sessions[0]?.teacherId ?? "t-001";
  // SSR/首帧渲染静态回退（确定性）；挂载后从 appStore.sessions + 报告 localStorage 推导真实数据。
  const [derived, setDerived] = useState<{
    history: HistoryRow[];
    trend: { week: string; score: number }[];
    dimensions: { name: string; score: number; prev?: number }[];
    kpis: { week: number; total: number; avg: number; weak: number };
  } | null>(null);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      const now = Date.now();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      // sessions 在 appStore 中按「新到旧」登记（ensureSession 头插），这里按时间老到新排
      const ordered = [...st.sessions].sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
      );

      // 拉取每场对应报告（若存在则用真实 overall/dimensions），seed-* 无报告则用 SessionRecord.overall
      const withScore = ordered.map((s, i) => {
        let score = s.overall;
        let dimensions: { name: string; score: number; prev?: number }[] | null = null;
        let rounds = 0;
        const raw = localStorage.getItem(`mirrorhire:report:${s.sessionId}`);
        if (raw) {
          try {
            const r = JSON.parse(raw) as InterviewReport;
            score = r.overall;
            dimensions = r.dimensions;
            rounds = r.perQuestion?.length ?? 0;
          } catch {
            /* 解析失败 → 用 SessionRecord.overall */
          }
        }
        // 无逐题报告时给确定性兜底（seed 场景），避免显示 0 轮
        if (!rounds) rounds = 4 + (i % 3);
        return { rec: s, score, dimensions, rounds };
      });

      // 历史行（delta = 与上一场差值；rounds 取报告逐题反馈条数，无报告则兜底）
      const history: HistoryRow[] = withScore
        .map((h, i) => {
          const prev = i > 0 ? withScore[i - 1].score : null;
          const delta = prev === null ? "—" : (h.score - prev >= 0 ? "+" : "") + (h.score - prev);
          return {
            id: h.rec.sessionId,
            date: h.rec.date,
            scene: h.rec.scene,
            score: h.score,
            delta,
            rounds: h.rounds,
          };
        })
        .reverse(); // 最新优先展示

      // 趋势：老到新
      const trend = withScore.map((h, i) => ({ week: `S${i + 1}`, score: h.score }));

      // 维度：最近一场有报告的报告维度，否则 reportData.dimensions
      const latestDims =
        [...withScore].reverse().find((h) => h.dimensions)?.dimensions ?? reportData.dimensions;

      // KPI
      const weekCount = withScore.filter((h) => {
        // SessionRecord.date 是 "YYYY-MM-DD"；转时间戳比较
        const ts = Date.parse(h.rec.date);
        return !Number.isNaN(ts) && now - ts <= weekMs;
      }).length;
      const avg = Math.round(
        withScore.reduce((sum, h) => sum + h.score, 0) / Math.max(1, withScore.length),
      );
      const weak = latestDims.filter((d) => d.score < 75).length;

      setDerived({
        history,
        trend,
        dimensions: latestDims,
        kpis: { week: weekCount, total: withScore.length, avg, weak },
      });
    } catch {
      /* 解析失败 → 保持静态回退 */
    }
  }, [st.sessions]);

  const usingReal = derived !== null;
  const history = derived?.history ?? fallbackHistory;
  const trend = derived?.trend ?? growthTrend;
  const dimensions = derived?.dimensions ?? reportData.dimensions;
  const k = derived?.kpis;

  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="font-display text-3xl font-semibold">成长追踪</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {usingReal
              ? `累计 ${k!.total} 次模拟面试 · 综合评分 ${k!.avg} · 本周练习 ${k!.week} 次`
              : "42 小时累计训练 · 7 次模拟面试 · 综合评分提升 20 分"}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 overflow-hidden rounded-2xl bg-foreground p-6 text-background shadow-elevate sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-background/65">
                <Target className="h-4 w-4" /> OFFER 作战室
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                冲刺字节跳动产品经理 Offer
              </h2>
              <p className="mt-2 text-sm text-background/65">
                距离目标面试还有 18 天。今天先完成一次“指标拆解”专项训练。
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm">
              <CalendarClock className="h-4 w-4 text-primary-glow" /> 截止日期 · 07 月 08 日
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "岗位画像", note: "已完成", done: true },
              { label: "专项补弱", note: "进行中 · 指标拆解", done: false },
              { label: "真人终面", note: "建议在 7 天内预约", done: false },
            ].map((step, index) => (
              <div key={step.label} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <div className="flex items-center justify-between text-xs text-background/60">
                  <span>0{index + 1}</span>
                  {step.done && <CheckCircle2 className="h-4 w-4 text-success" />}
                </div>
                <div className="mt-2 font-medium">{step.label}</div>
                <div className="mt-1 text-xs text-background/60">{step.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/chat/$teacherId"
              params={{ teacherId: focusTeacherId }}
              className="rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground transition-transform hover:-translate-y-0.5"
            >
              开始 10 分钟专项训练
            </Link>
            <Link
              to="/teachers/$id"
              params={{ id: focusTeacherId }}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-white/10"
            >
              预约真人终面
            </Link>
          </div>
        </div>
        {usingReal ? (
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard
              label="本周练习"
              value={String(k!.week)}
              unit="次"
              delta={`累计 ${k!.total} 次`}
            />
            <KpiCard label="累计训练" value={String(k!.total)} unit="次" />
            <KpiCard label="综合评分" value={String(k!.avg)} unit="/100" />
            <KpiCard label="薄弱项数" value={String(k!.weak)} unit="项" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {dashboardKpis.student.map((kp) => (
              <KpiCard key={kp.label} {...kp} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="评分趋势" />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 11 }}
                  domain={[50, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 0,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary-glow)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--gold)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="当前能力分布" />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={dimensions}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 11 }}
                />
                <Radar
                  dataKey="score"
                  stroke="var(--primary-glow)"
                  fill="var(--primary)"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="glass-panel rounded-xl">
          <div className="border-b border-border/60 px-6 py-4">
            <SectionTitle title="历史练习记录" desc="点击任意一条进入对应报告" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">日期</th>
                <th className="px-6 py-3">场景</th>
                <th className="px-6 py-3">评分</th>
                <th className="px-6 py-3">较上次</th>
                <th className="px-6 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const isSeed = h.id.startsWith("seed-");
                return (
                  <tr key={h.id} className="border-t border-border/60 hover:bg-accent/30">
                    <td className="px-6 py-3 font-mono">{h.date}</td>
                    <td className="px-6 py-3">{h.scene}</td>
                    <td className="px-6 py-3 font-mono text-gold">{h.score}</td>
                    <td className="px-6 py-3">
                      <StatusBadge tone={h.delta.startsWith("+") ? "success" : "neutral"}>
                        {h.delta}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3">
                      {isSeed ? (
                        <span className="text-muted-foreground/60">查看报告 →</span>
                      ) : (
                        <Link
                          to="/report/$sessionId"
                          params={{ sessionId: h.id }}
                          className="text-primary-glow hover:underline"
                        >
                          查看报告 →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </StudentShell>
  );
}
