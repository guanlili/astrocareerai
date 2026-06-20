import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { StatCard } from "@/components/common/StatCard";

export const Route = createFileRoute("/teacher/earnings")({
  head: () => ({ meta: [{ title: "收益结算 · 面镜 老师" }] }),
  component: EarningsPage,
});

const txns = [
  {
    id: "T-9012",
    date: "2026-06-18",
    source: "AI 订阅 · 张雨",
    gross: 99,
    fee: 29.7,
    net: 69.3,
    status: "已结算",
  },
  {
    id: "T-9011",
    date: "2026-06-18",
    source: "1v1 · 黄佳",
    gross: 880,
    fee: 264,
    net: 616,
    status: "已结算",
  },
  {
    id: "T-9009",
    date: "2026-06-17",
    source: "Package · Lily",
    gross: 2980,
    fee: 894,
    net: 2086,
    status: "已结算",
  },
  {
    id: "T-9007",
    date: "2026-06-17",
    source: "AI 订阅 · 陈思远",
    gross: 99,
    fee: 29.7,
    net: 69.3,
    status: "已结算",
  },
  {
    id: "T-9005",
    date: "2026-06-16",
    source: "1v1 · Lily",
    gross: 1680,
    fee: 504,
    net: 1176,
    status: "待提现",
  },
  {
    id: "T-9001",
    date: "2026-06-15",
    source: "退款 · 周哲",
    gross: -79,
    fee: 0,
    net: -79,
    status: "退款",
  },
];

function EarningsPage() {
  return (
    <TeacherShell title="收益结算" subtitle="平台分成 30%，每月 5 日自动结算到绑定账户">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="本月可提现" value="¥33,782" tone="gold" />
        <StatCard label="冻结中（7 天）" value="¥4,206" />
        <StatCard label="累计收益" value="¥186,420" />
        <StatCard label="下次结算" value="07-05" tone="info" />
      </div>

      <div className="mt-6 glass-panel overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <SectionTitle title="收益流水" />
          <button
            onClick={() =>
              toast.success("提现申请已提交", { description: "¥33,782 将在 1–3 个工作日到账" })
            }
            className="rounded-md gradient-primary px-4 py-2 text-sm text-primary-foreground shadow-elevate"
          >
            提现到银行卡
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3">流水号</th>
              <th className="px-6 py-3">日期</th>
              <th className="px-6 py-3">来源</th>
              <th className="px-6 py-3 text-right">毛收入</th>
              <th className="px-6 py-3 text-right">平台分成</th>
              <th className="px-6 py-3 text-right">净收入</th>
              <th className="px-6 py-3">状态</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-t border-border/60">
                <td className="px-6 py-3 font-mono text-xs">{t.id}</td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{t.date}</td>
                <td className="px-6 py-3">{t.source}</td>
                <td className="px-6 py-3 text-right font-mono">¥{t.gross.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-mono text-muted-foreground">
                  ¥{t.fee.toLocaleString()}
                </td>
                <td
                  className={`px-6 py-3 text-right font-mono ${t.net < 0 ? "text-destructive" : "text-gold"}`}
                >
                  ¥{t.net.toLocaleString()}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge
                    tone={
                      t.status === "已结算" ? "success" : t.status === "退款" ? "danger" : "warning"
                    }
                  >
                    {t.status}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TeacherShell>
  );
}
