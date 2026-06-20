import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layouts/AdminShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMockState, setComplianceStatus } from "@/mock/store";

export const Route = createFileRoute("/admin/compliance")({
  head: () => ({ meta: [{ title: "内容合规审核 · 面镜 管理后台" }] }),
  component: CompliancePage,
});

const toneMap = { 低: "info", 中: "warning", 高: "danger" } as const;
const resolveLabel = { pending: "待处理", allowed: "已放行", takenDown: "已下线" } as const;
const resolveTone = { pending: "warning", allowed: "success", takenDown: "danger" } as const;

function CompliancePage() {
  // 反应式读取统一 Mock store：compliance 项随放行 / 下线操作实时变化
  const st = useMockState();

  // 3 张统计卡由真实 compliance 派生
  const stats = useMemo(() => {
    const pending = st.compliance.filter((c) => c.status === "pending").length;
    const high = st.compliance.filter((c) => c.risk === "高").length;
    const resolved = st.compliance.filter((c) => c.status !== "pending").length;
    return { pending, high, resolved };
  }, [st.compliance]);

  const handleAllow = (id: string, type: string) => {
    setComplianceStatus(id, "allowed");
    toast.success(`已放行「${type}」相关内容`);
  };

  const handleTakedown = (id: string, type: string) => {
    setComplianceStatus(id, "takenDown");
    toast.error(`已下线「${type}」相关内容`);
  };

  return (
    <AdminShell title="内容合规审核" subtitle="《生成式人工智能服务管理暂行办法》合规检查">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            待审条目
          </div>
          <div className="mt-1 font-mono text-3xl font-semibold text-warning">{stats.pending}</div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            高风险
          </div>
          <div className="mt-1 font-mono text-3xl font-semibold text-destructive">{stats.high}</div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            已处置
          </div>
          <div className="mt-1 font-mono text-3xl font-semibold text-success">{stats.resolved}</div>
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
            <div
              key={s.t}
              className="flex items-center justify-between rounded-md border border-border bg-surface/40 p-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                {s.t}
              </span>
              <StatusBadge tone={toneMap[s.level as keyof typeof toneMap]}>
                {s.level} 风险
              </StatusBadge>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 glass-panel overflow-hidden rounded-xl">
        <div className="border-b border-border/60 px-6 py-4">
          <SectionTitle title="审核条目" />
        </div>
        {st.compliance.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="text-sm text-muted-foreground">暂无合规审核条目</div>
            <div className="font-mono text-xs text-muted-foreground">
              AI 生成内容命中敏感策略时将自动出现在此处
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">编号</th>
                  <th className="px-6 py-3">类型</th>
                  <th className="px-6 py-3">关联老师</th>
                  <th className="px-6 py-3">风险等级</th>
                  <th className="px-6 py-3">原因</th>
                  <th className="px-6 py-3">时间</th>
                  <th className="px-6 py-3">状态</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {st.compliance.map((c) => (
                  <tr key={c.id} className="border-t border-border/60">
                    <td className="px-6 py-3 font-mono text-xs">{c.id}</td>
                    <td className="px-6 py-3">{c.type}</td>
                    <td className="px-6 py-3">{c.teacher}</td>
                    <td className="px-6 py-3">
                      <StatusBadge tone={toneMap[c.risk]}>{c.risk}</StatusBadge>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{c.reason}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{c.time}</td>
                    <td className="px-6 py-3">
                      <StatusBadge tone={resolveTone[c.status]}>
                        {resolveLabel[c.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3">
                      {c.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAllow(c.id, c.type)}
                            className="rounded-md bg-success/15 px-2 py-1 text-xs text-success ring-1 ring-success/30 hover:bg-success/25"
                          >
                            放行
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="rounded-md bg-destructive/15 px-2 py-1 text-xs text-destructive ring-1 ring-destructive/30 hover:bg-destructive/25">
                                下线
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>下线「{c.type}」相关内容？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  下线后该内容将不再对外展示，老师需修改后重新提交审核。演示数据可随时重置。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleTakedown(c.id, c.type)}>
                                  确认下线
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">已处置</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 p-3 text-xs text-gold">
        ⚖ 所有 AI 生成内容均会在用户侧打上「AI 生成」水印，对话日志保留 180 天可追溯。
      </div>
    </AdminShell>
  );
}
