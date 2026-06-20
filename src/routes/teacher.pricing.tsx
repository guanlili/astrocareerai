import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { SectionTitle } from "@/components/common/PanelKit";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { defaultStudio, getStudio, updateStudio, type PricingConfig } from "@/mock/teacherStudio";

export const Route = createFileRoute("/teacher/pricing")({
  head: () => ({ meta: [{ title: "服务定价 · 面镜 老师" }] }),
  component: PricingPage,
});

function PricingPage() {
  // 初始化用 defaultStudio()（SSR/首帧一致），useEffect 再填充 localStorage 真实值，避免 hydration 不一致。
  const [p, setP] = useState<PricingConfig>(() => defaultStudio().pricing);
  useEffect(() => setP(getStudio().pricing), []);

  function update(patch: Partial<PricingConfig>) {
    const next = { ...p, ...patch };
    setP(next);
    updateStudio({ pricing: next });
  }

  return (
    <TeacherShell title="服务与定价" subtitle="改价 / 规则实时保存到草稿，刷新后保留">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="AI 分身定价" />
            <PriceField
              label="AI 月订阅"
              value={p.aiMonthly}
              onChange={(v) => update({ aiMonthly: v })}
              suffix="/月"
            />
            <PriceField
              label="试聊轮次"
              value={p.trialRounds}
              onChange={(v) => update({ trialRounds: v })}
              suffix="轮"
              plain
            />
            <PriceField
              label="按次套餐"
              value={p.perSession}
              onChange={(v) => update({ perSession: v })}
              suffix="/次"
            />
          </div>

          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="真人 1v1 定价" />
            <PriceField
              label="单次 60min"
              value={p.human60}
              onChange={(v) => update({ human60: v })}
            />
            <PriceField
              label="单次 120min"
              value={p.human120}
              onChange={(v) => update({ human120: v })}
            />
            <PriceField
              label="Package（4 次 + AI 月卡）"
              value={p.packagePrice}
              onChange={(v) => update({ packagePrice: v })}
              highlight
            />
            <PriceField
              label="加急（48h 内）"
              value={p.rushSurchargePct}
              onChange={(v) => update({ rushSurchargePct: v })}
              suffix="%"
              plain
            />
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle
            title="AI → 真人 转换规则"
            desc="AI 满足任一条件时，向学员推送预约 1v1 CTA"
          />
          <div className="space-y-3">
            {p.handoffRules.map((r) => (
              <div key={r.id} className="rounded-md border border-border bg-surface/40 p-4">
                <div className="flex items-center gap-3">
                  <input
                    value={r.trigger}
                    onChange={(e) =>
                      update({
                        handoffRules: p.handoffRules.map((x) =>
                          x.id === r.id ? { ...x, trigger: e.target.value } : x,
                        ),
                      })
                    }
                    className="flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none focus:border-primary"
                  />
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) =>
                      update({
                        handoffRules: p.handoffRules.map((x) =>
                          x.id === r.id ? { ...x, enabled: v } : x,
                        ),
                      })
                    }
                  />
                  <button
                    onClick={() =>
                      update({ handoffRules: p.handoffRules.filter((x) => x.id !== r.id) })
                    }
                    className="text-muted-foreground hover:text-destructive"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  value={r.action}
                  onChange={(e) =>
                    update({
                      handoffRules: p.handoffRules.map((x) =>
                        x.id === r.id ? { ...x, action: e.target.value } : x,
                      ),
                    })
                  }
                  className="mt-2 w-full rounded-md border border-transparent bg-gold/5 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-gold outline-none focus:border-gold/40"
                />
              </div>
            ))}
            <button
              onClick={() =>
                update({
                  handoffRules: [
                    ...p.handoffRules,
                    {
                      id: `r${Date.now()}`,
                      trigger: "新触发条件",
                      action: "提示转人工",
                      enabled: true,
                    },
                  ],
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:text-foreground"
            >
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

function PriceField({
  label,
  value,
  onChange,
  suffix,
  highlight,
  plain,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  highlight?: boolean;
  plain?: boolean;
}) {
  return (
    <div
      className={`mb-2 flex items-center justify-between rounded-md px-4 py-2.5 ${
        highlight ? "ring-1 ring-gold/40 bg-gold/10" : "bg-surface/40"
      }`}
    >
      <span className="text-sm">{label}</span>
      <span className="flex items-baseline gap-0.5">
        {!plain && <span className="font-mono text-sm text-muted-foreground">¥</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-24 bg-transparent text-right font-mono outline-none ${
            highlight ? "text-gold" : "text-foreground"
          }`}
        />
        {suffix && <span className="font-mono text-xs text-muted-foreground">{suffix}</span>}
      </span>
    </div>
  );
}
