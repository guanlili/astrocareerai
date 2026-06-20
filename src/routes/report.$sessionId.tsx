import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { StudentShell } from "@/components/layouts/StudentShell";
import { reportData, growthTrend } from "@/mock/sessions";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { getTeacher } from "@/mock/teachers";
import { useAppState, ensureSession, type SessionRecord } from "@/mock/appStore";
import type { InterviewReport } from "@/agent/interview";
import { Check, AlertTriangle, Lightbulb, Download, Share2, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/report/$sessionId")({
  head: () => ({ meta: [{ title: "评估报告 · 面镜 MirrorHire" }] }),
  component: ReportPage,
});

// seed-* 报告没有持久化内容，回退到内置 reportData（确定性，SSR 一致）
const FALLBACK_SCENE = "字节 PM 终面";

// reportData 缺 sessionId / handoffRecommended，补齐为完整 InterviewReport 形状
function fallbackReport(): InterviewReport {
  return { ...reportData, sessionId: "", handoffRecommended: false } as InterviewReport;
}

type Loaded = {
  report: InterviewReport;
  teacherId: string | null;
  scene: string;
  fromStore: boolean;
};

function ReportPage() {
  const { sessionId } = useParams({ from: "/report/$sessionId" });
  const { sessions } = useAppState();

  // 首帧用确定性回退（SSR 一致），挂载后读 localStorage 真实报告
  const [loaded, setLoaded] = useState<Loaded>(() => ({
    report: fallbackReport(),
    teacherId: seedTeacherFor(sessionId),
    scene: seedSceneFor(sessionId) ?? FALLBACK_SCENE,
    fromStore: false,
  }));

  useEffect(() => {
    let report: InterviewReport | null = null;
    let teacherId: string | null = seedTeacherFor(sessionId);
    let scene = seedSceneFor(sessionId) ?? FALLBACK_SCENE;
    try {
      const r = localStorage.getItem(`mirrorhire:report:${sessionId}`);
      if (r) report = JSON.parse(r) as InterviewReport;
      const s = localStorage.getItem(`mirrorhire:session:${sessionId}`);
      if (s) {
        const parsed = JSON.parse(s) as {
          teacherId?: string;
          setup?: { companyName?: string; roleTitle?: string };
        };
        if (parsed.teacherId) teacherId = parsed.teacherId;
        if (parsed.setup)
          scene =
            [parsed.setup.companyName, parsed.setup.roleTitle].filter(Boolean).join(" · ") || scene;
      }
    } catch {
      /* ignore */
    }
    if (report) {
      setLoaded({ report, teacherId, scene, fromStore: true });
    } else {
      setLoaded({ report: fallbackReport(), teacherId, scene, fromStore: false });
    }
  }, [sessionId]);

  // 幂等登记本次会话到成长追踪（仅当是真实报告且有老师归属）
  useEffect(() => {
    if (!loaded.fromStore || !loaded.teacherId) return;
    const t = getTeacher(loaded.teacherId);
    const record: SessionRecord = {
      sessionId,
      teacherId: loaded.teacherId,
      teacherName: t?.name ?? "老师",
      scene: loaded.scene || "模拟面试",
      overall: loaded.report.overall,
      date: today(),
    };
    ensureSession(record);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded.fromStore, loaded.teacherId]);

  const report = loaded.report;
  const teacher = loaded.teacherId ? getTeacher(loaded.teacherId) : undefined;
  const idx = sessions.findIndex((s) => s.sessionId === sessionId);
  const prevOverall = idx >= 0 && idx < sessions.length - 1 ? sessions[idx + 1].overall : null;
  const delta = prevOverall != null ? report.overall - prevOverall : null;
  const sessionNo = Math.max(1, sessions.length - Math.max(0, idx));

  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <StatusBadge tone="gold">
            第 {sessionNo} 次模拟面试 · {loaded.scene}
          </StatusBadge>
          <h1 className="mt-3 font-display text-3xl font-semibold">
            综合评分 <span className="font-mono text-5xl text-gold">{report.overall}</span>
            <span className="text-lg text-muted-foreground">/100</span>
            {delta != null && (
              <span className={`ml-3 text-sm ${delta >= 0 ? "text-success" : "text-destructive"}`}>
                较上次 {delta >= 0 ? "+" : ""}
                {delta}
              </span>
            )}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            本次报告基于本场对话内容综合生成，六维评分均可下钻到对话片段，确保可追溯。
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() =>
                toast.info("已生成 PDF（演示）", { description: "实际接入后会下载完整报告" })
              }
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface/60 px-3 text-sm hover:bg-surface"
            >
              <Download className="h-3.5 w-3.5" /> 导出 PDF
            </button>
            <button
              onClick={() =>
                toast.success("已分享给老师", {
                  description: teacher
                    ? `${teacher.name} 将在 1v1 前预习你的报告`
                    : "老师已收到报告",
                })
              }
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface/60 px-3 text-sm hover:bg-surface"
            >
              <Share2 className="h-3.5 w-3.5" /> 分享给老师
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="六维能力雷达" desc="维度由老师在工作台自定义，本次场景的评分模板" />
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={report.dimensions}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 12 }}
                />
                <PolarRadiusAxis
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 10 }}
                  angle={30}
                />
                <Radar
                  name="本次"
                  dataKey="score"
                  stroke="var(--primary-glow)"
                  fill="var(--primary)"
                  fillOpacity={0.45}
                />
                <Radar
                  name="上次"
                  dataKey="prev"
                  stroke="var(--gold)"
                  fill="var(--gold)"
                  fillOpacity={0.15}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="能力成长曲线" desc="近 7 周综合评分趋势" />
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary-glow)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--gold)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-3">
        <DimCard
          title="本次亮点"
          icon={<Check className="h-4 w-4 text-success" />}
          tone="success"
          items={report.highlights}
        />
        <DimCard
          title="待改进"
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          tone="warning"
          items={report.weaknesses}
        />
        <DimCard
          title="老师建议"
          icon={<Lightbulb className="h-4 w-4 text-gold" />}
          tone="gold"
          items={report.suggestions}
        />
      </section>

      {report.handoffRecommended && teacher && (
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="glass-panel flex flex-col items-center gap-4 rounded-2xl p-8 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <div className="font-mono text-[11px] uppercase tracking-widest text-gold">
                老师建议直接预约 1v1
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold">
                针对本次暴露的薄弱项，建议预约 {teacher.name} 老师深度演练
              </h3>
            </div>
            <Link
              to="/booking/$teacherId"
              params={{ teacherId: teacher.id }}
              className="inline-flex h-11 items-center rounded-md gradient-primary px-6 font-medium text-primary-foreground shadow-elevate"
            >
              <MessageSquare className="mr-1.5 h-4 w-4" /> 查看 {teacher.name} 档期 →
            </Link>
          </div>
        </section>
      )}
    </StudentShell>
  );
}

function DimCard({
  title,
  icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "success" | "warning" | "gold";
  items: string[];
}) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <StatusBadge tone={tone}>{items.length}</StatusBadge>
      </div>
      <ul className="mt-4 space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">暂无</li>
        ) : (
          items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
              <span className="font-mono text-xs text-muted-foreground">
                {(i + 1).toString().padStart(2, "0")}
              </span>
              <span>{it}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

// seed-* 报告的回退归属（确定性）
function seedTeacherFor(sessionId: string): string | null {
  if (sessionId.startsWith("seed-tencent") || sessionId.startsWith("seed-bytedance"))
    return "t-001";
  if (sessionId.startsWith("seed-resume")) return "t-006";
  return null;
}
function seedSceneFor(sessionId: string): string | null {
  if (sessionId.startsWith("seed-bytedance")) return "字节 PM 终面 · 模拟";
  if (sessionId.startsWith("seed-tencent")) return "腾讯 PCG 业务面";
  if (sessionId.startsWith("seed-resume")) return "简历优化 · 自由问答";
  return null;
}

function today(): string {
  try {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  } catch {
    return "2026-06-18";
  }
}
