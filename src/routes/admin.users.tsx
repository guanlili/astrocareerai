import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/layouts/AdminShell";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { Search, Star } from "lucide-react";
import { adminUserSummary } from "@/mock/platform";
import { useMockState, type Order } from "@/mock/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "用户管理 · 面镜 管理后台" }] }),
  component: UsersPage,
});

type FilterKey = "全部" | "学员" | "老师" | "高价值" | "流失风险";
const FILTERS: FilterKey[] = ["全部", "学员", "老师", "高价值", "流失风险"];

type RiskKey = "全部" | "高" | "中" | "低";
const RISK_FILTERS: RiskKey[] = ["全部", "高", "中", "低"];
const RISK_TONE = { 高: "danger", 中: "warning", 低: "success" } as const;

type TeacherRow = {
  name: string;
  total: number;
  completed: number;
  refunded: number;
  refundAmount: number;
  completionRate: number;
  refundRate: number;
  rating: number;
  risk: "高" | "中" | "低";
  gmv: number;
};

/** 由真实订单流水聚合某老师的运营质量（完成 / 退款 / 评分 / 风险）。 */
function buildTeacherRows(orders: Order[]): TeacherRow[] {
  const groups = new Map<string, Order[]>();
  for (const o of orders) {
    const arr = groups.get(o.teacher) ?? [];
    arr.push(o);
    groups.set(o.teacher, arr);
  }
  const rows: TeacherRow[] = [];
  for (const [name, list] of groups) {
    const total = list.length;
    const completed = list.filter((o) => o.status === "已完成" || o.status === "已支付").length;
    const refunded = list.filter(
      (o) => o.status === "退款" || o.status === "已退款" || o.status === "退款中",
    ).length;
    const refundAmount = list
      .filter((o) => o.status === "退款" || o.status === "已退款" || o.status === "退款中")
      .reduce((s, o) => s + o.amount, 0);
    const completionRate = total > 0 ? completed / total : 0;
    const refundRate = total > 0 ? refunded / total : 0;
    // 服务评分（0-5）：完成率为主 + 退款惩罚，纯派生、确定性（SSR 安全）
    const rating = Math.max(
      1,
      Math.round((completionRate * 4.2 + (1 - refundRate) * 0.8) * 10) / 10,
    );
    const risk: TeacherRow["risk"] = refundRate >= 0.34 ? "高" : refundRate > 0 ? "中" : "低";
    rows.push({
      name,
      total,
      completed,
      refunded,
      refundAmount,
      completionRate,
      refundRate,
      rating,
      risk,
      gmv: list.reduce((s, o) => s + o.amount, 0),
    });
  }
  return rows.sort((a, b) => b.total - a.total);
}

function UsersPage() {
  // 本地搜索 / 筛选状态（事件中更新，不影响 SSR 首帧）
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("全部");

  // 老师服务质量看板：聚合真实订单流水（orders 联动 admin 退款 / 学生下单）
  const st = useMockState();
  const [riskFilter, setRiskFilter] = useState<RiskKey>("全部");
  const teachers = useMemo(() => buildTeacherRows(st.orders), [st.orders]);
  const visibleTeachers = useMemo(
    () => (riskFilter === "全部" ? teachers : teachers.filter((t) => t.risk === riskFilter)),
    [teachers, riskFilter],
  );
  const teacherKpi = useMemo(() => {
    const avg =
      teachers.length > 0 ? teachers.reduce((s, t) => s + t.rating, 0) / teachers.length : 0;
    const refundTotal = teachers.reduce((s, t) => s + t.refundAmount, 0);
    const highRisk = teachers.filter((t) => t.risk === "高").length;
    return { count: teachers.length, avg, refundTotal, highRisk };
  }, [teachers]);

  // 详情抽屉：点用户 / 老师的「详情」打开，展示该对象的真实订单流水
  const [detail, setDetail] = useState<{ kind: "user" | "teacher"; name: string } | null>(null);
  const detailOrders = useMemo(() => {
    if (!detail) return [] as Order[];
    return st.orders.filter((o) =>
      detail.kind === "user" ? o.student === detail.name : o.teacher === detail.name,
    );
  }, [detail, st.orders]);

  // 按搜索关键字 + 筛选芯片派生
  const rows = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return adminUserSummary.filter((u) => {
      const matchKw = !kw || u.name.toLowerCase().includes(kw) || u.id.toLowerCase().includes(kw);
      const matchFilter =
        filter === "全部" ||
        (filter === "学员" && u.role === "学员") ||
        (filter === "老师" && u.role === "老师") ||
        (filter === "高价值" && u.status === "高价值") ||
        (filter === "流失风险" && u.status === "流失风险");
      return matchKw && matchFilter;
    });
  }, [search, filter]);

  const handleDetail = (name: string) => setDetail({ kind: "user", name });

  return (
    <AdminShell title="用户管理" subtitle="学员 / 老师 / 管理员统一视图">
      {/* 老师服务质量看板（来自真实订单流水） */}
      <div className="mb-8">
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="在册老师" value={String(teacherKpi.count)} unit="人" />
          <KpiCard
            label="平均服务评分"
            value={teacherKpi.avg.toFixed(1)}
            unit="/5"
            delta={teacherKpi.avg >= 4.5 ? "+优秀" : "-待提升"}
          />
          <KpiCard
            label="累计退款金额"
            value={`¥${teacherKpi.refundTotal.toLocaleString()}`}
            delta={teacherKpi.refundTotal > 0 ? "+关注" : "-健康"}
          />
          <KpiCard
            label="高风险老师"
            value={String(teacherKpi.highRisk)}
            unit="人"
            delta={teacherKpi.highRisk > 0 ? "+需介入" : "-平稳"}
          />
        </div>

        <div className="mt-6 glass-panel overflow-hidden rounded-xl">
          <div className="flex flex-col gap-3 border-b border-border/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle title="老师服务质量" desc="订单 / 完成 / 退款 / 评分 / 风险" />
            <div className="flex flex-wrap gap-2">
              {RISK_FILTERS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    riskFilter === r
                      ? "border-primary bg-primary/15"
                      : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "全部" ? "全部风险" : `${r}风险`}
                </button>
              ))}
            </div>
          </div>

          {visibleTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="text-sm text-muted-foreground">没有匹配的老师</div>
              <div className="font-mono text-xs text-muted-foreground">
                切换风险筛选或在支付与结算中产生订单后再看
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">老师</th>
                    <th className="px-6 py-3 text-right">订单数</th>
                    <th className="px-6 py-3 text-right">完成</th>
                    <th className="px-6 py-3 text-right">退款</th>
                    <th className="px-6 py-3 text-right">GMV</th>
                    <th className="px-6 py-3">服务评分</th>
                    <th className="px-6 py-3">风险</th>
                    <th className="px-6 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTeachers.map((t) => (
                    <tr key={t.name} className="border-t border-border/60">
                      <td className="px-6 py-3 font-medium">{t.name}</td>
                      <td className="px-6 py-3 text-right font-mono">{t.total}</td>
                      <td className="px-6 py-3 text-right font-mono text-success">
                        {t.completed}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({Math.round(t.completionRate * 100)}%)
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-destructive">
                        {t.refunded}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({Math.round(t.refundRate * 100)}%)
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gold">
                        ¥{t.gmv.toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Star className="h-3 w-3 text-gold" />
                          {t.rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge tone={RISK_TONE[t.risk]}>{t.risk}风险</StatusBadge>
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setDetail({ kind: "teacher", name: t.name })}
                          className="text-xs text-primary-glow hover:underline"
                        >
                          详情 →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 用户管理（学员 / 老师 / 管理员） */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户 ID / 姓名"
            className="w-64 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
              aria-label="清除搜索"
            >
              ✕
            </button>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                filter === t
                  ? "border-primary bg-primary/15"
                  : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="text-sm text-muted-foreground">未找到匹配的用户</div>
            <div className="font-mono text-xs text-muted-foreground">
              试试更换关键词或切换筛选条件
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">用户 ID</th>
                  <th className="px-6 py-3">姓名</th>
                  <th className="px-6 py-3">角色</th>
                  <th className="px-6 py-3 text-right">累计消费</th>
                  <th className="px-6 py-3">最近活跃</th>
                  <th className="px-6 py-3">状态</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t border-border/60">
                    <td className="px-6 py-3 font-mono text-xs">{u.id}</td>
                    <td className="px-6 py-3 font-medium">{u.name}</td>
                    <td className="px-6 py-3">
                      <StatusBadge tone={u.role === "老师" ? "info" : "neutral"}>
                        {u.role}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gold">
                      ¥{u.spent.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {u.lastActive}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge
                        tone={
                          u.status === "高价值"
                            ? "gold"
                            : u.status === "流失风险"
                              ? "danger"
                              : "success"
                        }
                      >
                        {u.status}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDetail(u.name)}
                        className="text-xs text-primary-glow hover:underline"
                      >
                        详情 →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{detail?.name} · 订单记录</SheetTitle>
            <SheetDescription>
              {detail?.kind === "user" ? "该学员的历史订单" : "该老师的全部订单流水"} · 来自实时订单
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-2 px-4 pb-6">
            {detailOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无订单记录</p>
            ) : (
              detailOrders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-md border border-border bg-surface/40 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{o.type}</span>
                    <span className="font-mono text-gold">¥{o.amount.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {detail?.kind === "user" ? o.teacher : o.student}
                    </span>
                    <StatusBadge
                      tone={
                        o.status === "已完成"
                          ? "success"
                          : o.status === "退款" || o.status === "已退款"
                            ? "danger"
                            : o.status === "退款中"
                              ? "warning"
                              : "info"
                      }
                    >
                      {o.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {o.id} · {o.date}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}
