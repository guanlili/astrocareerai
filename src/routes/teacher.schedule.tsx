import { createFileRoute } from "@tanstack/react-router";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";

export const Route = createFileRoute("/teacher/schedule")({
  head: () => ({ meta: [{ title: "档期管理 · 面镜 老师" }] }),
  component: SchedulePage,
});

const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const slots = ["09", "10", "11", "13", "14", "15", "16", "20", "21"];

const occupied = new Set([
  "周一-10", "周一-20", "周二-14", "周三-21", "周四-09", "周四-21",
  "周五-13", "周五-20", "周六-10", "周六-20", "周日-14",
]);

const blocked = new Set(["周三-09", "周三-10", "周日-21"]);

function SchedulePage() {
  return (
    <TeacherShell title="档期管理" subtitle="标记可预约时段。已被预约的时段不可取消。">
      <div className="mb-4 flex items-center gap-3 text-xs">
        <Legend color="bg-success/30 ring-success/40" label="可预约" />
        <Legend color="bg-primary/40 ring-primary/60" label="已预约" />
        <Legend color="bg-muted ring-border" label="未开放" />
      </div>

      <div className="glass-panel rounded-xl p-6">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5">
          <div />
          {days.map((d) => (
            <div key={d} className="pb-2 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
          {slots.map((s) => (
            <FragmentRow key={s} slot={s} />
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">本周已预约</div>
          <div className="mt-1 font-mono text-3xl font-semibold">11<span className="text-sm text-muted-foreground"> 时段</span></div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">候补队列</div>
          <div className="mt-1 font-mono text-3xl font-semibold text-gold">4<span className="text-sm text-muted-foreground"> 人</span></div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">下周待开放</div>
          <div className="mt-1 font-mono text-3xl font-semibold">21<span className="text-sm text-muted-foreground"> 时段</span></div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
        💡 当某时段被预约时，AI 分身会自动建议候补队列；学员可选其他风格相近老师。
      </div>
    </TeacherShell>
  );
}

function FragmentRow({ slot }: { slot: string }) {
  return (
    <>
      <div className="flex items-center justify-end pr-2 font-mono text-xs text-muted-foreground">{slot}:00</div>
      {days.map((d) => {
        const key = `${d}-${slot}`;
        const isOcc = occupied.has(key);
        const isBlock = blocked.has(key);
        return (
          <button
            key={key}
            disabled={isOcc}
            className={`h-10 rounded-md ring-1 transition-all ${
              isOcc
                ? "bg-primary/40 ring-primary/60 cursor-default"
                : isBlock
                ? "bg-muted ring-border"
                : "bg-success/15 ring-success/30 hover:bg-success/25"
            }`}
          />
        );
      })}
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-6 rounded ring-1 ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
