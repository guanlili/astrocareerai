import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";
import { adminComplianceItems } from "@/mock/platform";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/compliance")({
  head: () => ({ meta: [{ title: "内容合规审核 · 面镜 管理后台" }] }),
  component: CompliancePage,
});

const toneMap = { 低: "info", 中: "warning", 高: "danger" } as const;

function CompliancePage() {
  return (
    <AdminShell title="内容合规审核" subtitle="《生成式人工智能服务管理暂行办法》合规检查">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">今日待审</div>
          <div className="mt-1 font-mono text-3xl font-semibold text-warning">14</div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">高风险</div>
          <div className="mt-1 font-mono text-3xl font-semibold text-destructive">2</div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">本月合规率</div>
          <div className="mt-1 font-mono text-3xl font-semibold text-success">99.6%</div>
        </div>
      </div>

      <div className="mt-6 glass-panel rounded-xl p-6">
        <SectionTitle title="敏感话题策略" desc="AI 触发以下话题时自动降级回答 + 提示老师介入" />
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { t: "薪资具体数字", level: "高" },
            { t: "歧视性表达", level: "高" },
            { t: "竞品评价", level: "中" },
            { t: "公司机密 / NDA", level: "高" },
            { t: "未成年用户保护", level: "高" },
            { t: "职场维权 / 法律", level: "中" },
          ].map((s) => (
            <div key={s.t} className="flex items-center justify-between rounded-md border border-border bg-surface/40 p-3 text-sm">
              <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-muted-foreground" />{s.t}</span>
              <StatusBadge tone={toneMap[s.level as keyof typeof toneMap]}>{s.level} 风险</StatusBadge>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 glass-panel overflow-hidden rounded-xl">
        <div className="border-b border-border/60 px-6 py-4">
          <SectionTitle title="待审条目" />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3">编号</th>
              <th className="px-6 py-3">类型</th>
              <th className="px-6 py-3">关联老师</th>
              <th className="px-6 py-3">风险等级</th>
              <th className="px-6 py-3">原因</th>
              <th className="px-6 py-3">时间</th>
              <th className="px-6 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {adminComplianceItems.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="px-6 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-6 py-3">{c.type}</td>
                <td className="px-6 py-3">{c.teacher}</td>
                <td className="px-6 py-3">
                  <StatusBadge tone={toneMap[c.risk as keyof typeof toneMap]}>{c.risk}</StatusBadge>
                </td>
                <td className="px-6 py-3 text-muted-foreground">{c.reason}</td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{c.time}</td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button className="rounded-md bg-success/15 px-2 py-1 text-xs text-success ring-1 ring-success/30">放行</button>
                    <button className="rounded-md bg-destructive/15 px-2 py-1 text-xs text-destructive ring-1 ring-destructive/30">下线</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 p-3 text-xs text-gold">
        ⚖ 所有 AI 生成内容均会在用户侧打上「AI 生成」水印，对话日志保留 180 天可追溯。
      </div>
    </AdminShell>
  );
}
