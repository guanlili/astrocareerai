import { createFileRoute } from "@tanstack/react-router";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/teacher/pricing")({
  head: () => ({ meta: [{ title: "服务定价 · 面镜 老师" }] }),
  component: PricingPage,
});

const rules = [
  { id: "r1", trigger: "对话中出现「具体案例」「我的情况」连续 ≥ 3 次", action: "提示转人工", enabled: true },
  { id: "r2", trigger: "学员明确表达「想找您本人」", action: "立即转人工", enabled: true },
  { id: "r3", trigger: "对话轮次 ≥ 25 且未付费", action: "推荐 Package", enabled: true },
  { id: "r4", trigger: "薪资谈判 / 职场纠纷类问题", action: "提示老师介入", enabled: false },
];

function PricingPage() {
  return (
    <TeacherShell title="服务与定价">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="AI 分身定价" />
            <Row k="服务模式" v="月订阅 · ¥99 / 月" />
            <Row k="试聊轮次" v="5 轮" />
            <Row k="按次套餐" v="¥29 / 次（不限轮）" />
            <button className="mt-2 text-sm text-primary-glow hover:underline">+ 新增套餐</button>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="真人 1v1 定价" />
            <Row k="单次 60min" v="¥880" />
            <Row k="单次 120min" v="¥1,680" />
            <Row k="Package（4 次 + AI 月卡）" v="¥2,980" highlight />
            <Row k="加急（48h 内）" v="+30%" />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="AI → 真人 转换规则" desc="AI 满足任一条件时，向学员推送预约 1v1 CTA" />
          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center gap-4 rounded-md border border-border bg-surface/40 p-4">
                <div className="flex-1">
                  <div className="text-sm">{r.trigger}</div>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-gold">
                    → {r.action}
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked={r.enabled} className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <button className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:text-foreground">
              <Plus className="h-4 w-4" /> 新增规则
            </button>
          </div>

          <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
            💡 建议：种子期不要完全交给 AI 判断，规则与运营共创准确率更高。
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-4 py-3 ${highlight ? "ring-1 ring-gold/40 bg-gold/10" : "bg-surface/40"} mb-2`}>
      <span className="text-sm">{k}</span>
      <span className={`font-mono ${highlight ? "text-gold" : "text-foreground"}`}>{v}</span>
    </div>
  );
}
