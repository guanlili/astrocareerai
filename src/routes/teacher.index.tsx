import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { KvRow } from "@/components/common/KvRow";
import { dashboardKpis, students, teacherDailyConversations } from "@/mock/platform";
import { getPublishedTeachers } from "@/mock/teacherRegistry";
import { getStudio, type StudioState } from "@/mock/teacherStudio";
import { useMockState, teacherEarnings } from "@/mock/store";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/teacher/")({
  head: () => ({ meta: [{ title: "工作台 · 面镜 老师" }] }),
  component: TeacherHome,
});

const STATUS_LABEL: Record<StudioState["status"], string> = {
  draft: "草稿中",
  published: "已发布",
  unpublished: "已下架",
};

function TeacherHome() {
  // studio / published 仅客户端读取，避免 hydration 不一致
  const [studio, setStudio] = useState<StudioState | null>(null);
  const [publishedCount, setPublishedCount] = useState(0);
  useEffect(() => {
    setStudio(getStudio());
    setPublishedCount(getPublishedTeachers().length);
  }, []);

  // 本月成交(净)：来自统一 Mock store 的真实订单（陈昊）派生，SSR 安全
  const netEarnings = teacherEarnings(useMockState(), "陈昊").net;

  const highIntent = students.filter((s) => s.intent === "high").length;
  const scheduleBooked = studio?.schedule.booked.length ?? null;
  const enabledRules = studio?.pricing.handoffRules.filter((r) => r.enabled).length ?? null;

  // KPI 第 3 项「高意向学员」由真实 students 派生
  const kpis = dashboardKpis.teacher.map((k, i) =>
    i === 2 ? { ...k, value: String(highIntent) } : k,
  );

  return (
    <TeacherShell title="工作台" subtitle="Welcome back, 陈昊 · 字节跳动 PM">
      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle
            title="本周对话量 & 付费转化"
            desc="蓝色为总对话轮次，金色为转化为付费 / 预约的学员数"
          />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teacherDailyConversations}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" name="对话轮次" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="付费转化" fill="var(--gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="高意向学员" desc="对话频次或付费意向高的学员" />
          <div className="space-y-3">
            {students
              .filter((s) => s.intent === "high")
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface/40 p-3"
                >
                  <img src={s.avatar} alt="" className="h-9 w-9 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {s.name} <StatusBadge tone="gold">高意向</StatusBadge>
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {s.rounds} 轮 · {s.lastActive}
                      {s.note && ` · ${s.note}`}
                    </div>
                  </div>
                  <button
                    onClick={() => toast(`已加入联系队列，将通过站内信通知 ${s.name}`)}
                    className="rounded-md gradient-primary px-3 py-1.5 text-xs text-primary-foreground"
                  >
                    主动联系
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="分身状态" />
          <div className="space-y-2">
            <KvRow k="发布状态" variant="plain" v={studio ? STATUS_LABEL[studio.status] : "—"} />
            <KvRow k="已发布老师" variant="plain" v={`${publishedCount} 位`} />
            <KvRow k="风格调优" variant="plain" v={studio ? styleSummary(studio) : "—"} />
            <KvRow
              k="转人工触发"
              variant="plain"
              v={enabledRules != null ? `${enabledRules} 条规则启用` : "—"}
            />
          </div>
          <Link
            to="/teacher/studio"
            className="mt-4 block w-full rounded-md border border-primary/40 bg-primary/10 py-2 text-center text-sm"
          >
            进入分身工作室
          </Link>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="本月成交(净)" desc="扣除平台佣金与退款 · 来自实时订单" />
          <div className="font-mono text-4xl font-semibold text-gold">
            ¥{netEarnings.toLocaleString()}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            平台分成 15% · 实时派生自订单
          </div>
          <div className="mt-4 space-y-2">
            <Bar2 label="AI 订阅" value={26800} max={50000} />
            <Bar2 label="1v1 辅导" value={15400} max={50000} />
            <Bar2 label="Package" value={6060} max={50000} />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="待办" />
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <StatusBadge tone="warning">紧急</StatusBadge>
              <span>{scheduleBooked != null ? `${scheduleBooked} 个` : "—"} 1v1 待确认时段</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge tone="info">本周</StatusBadge>
              <span>更新简历优化案例</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge tone="gold">机会</StatusBadge>
              <span>{highIntent} 位高意向学员未跟进</span>
            </li>
          </ul>
        </div>
      </div>
    </TeacherShell>
  );
}

function styleSummary(s: StudioState): string {
  const { tone, technicality, verbosity } = s.config.style;
  const t = tone >= 50 ? "温和" : "严厉";
  const tech = technicality >= 50 ? "术语化" : "口语化";
  const d = verbosity >= 50 ? "详细" : "精炼";
  return `${t}·${tech}·${d}`;
}

function Bar2({ label, value, max }: { label: string; value: number; max: number }) {
  const w = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">¥{value.toLocaleString()}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full gradient-primary" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}
