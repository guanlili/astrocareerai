import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { StatCard } from "@/components/common/StatCard";
import {
  SCHEDULE_DAYS,
  SCHEDULE_SLOTS,
  defaultStudio,
  getStudio,
  updateStudio,
  type ScheduleConfig,
} from "@/mock/teacherStudio";

export const Route = createFileRoute("/teacher/schedule")({
  head: () => ({ meta: [{ title: "档期管理 · 面镜 老师" }] }),
  component: SchedulePage,
});

const TOTAL = SCHEDULE_DAYS.length * SCHEDULE_SLOTS.length;

function SchedulePage() {
  // 初始化用 defaultStudio()（SSR/首帧一致），useEffect 再填充 localStorage 真实值，避免 hydration 不一致。
  const [sched, setSched] = useState<ScheduleConfig>(() => defaultStudio().schedule);
  useEffect(() => setSched(getStudio().schedule), []);

  const openSet = new Set(sched.open);
  const bookedSet = new Set(sched.booked);
  const unopened = TOTAL - openSet.size - bookedSet.size;

  function toggle(key: string) {
    if (bookedSet.has(key)) return; // 已预约不可取消
    const nextOpen = openSet.has(key) ? sched.open.filter((k) => k !== key) : [...sched.open, key];
    const next = { ...sched, open: nextOpen };
    setSched(next);
    updateStudio({ schedule: next });
  }

  return (
    <TeacherShell title="档期管理" subtitle="点格子开放 / 关闭时段。已被预约的时段不可取消。">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <Legend color="bg-success/30 ring-success/40" label="可预约" />
        <Legend color="bg-primary/40 ring-primary/60" label="已预约" />
        <Legend color="bg-muted ring-border" label="未开放" />
      </div>

      <div className="glass-panel rounded-xl p-6">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5">
          <div />
          {SCHEDULE_DAYS.map((d) => (
            <div
              key={d}
              className="pb-2 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {SCHEDULE_SLOTS.map((s) => (
            <FragmentRow
              key={s}
              slot={s}
              openSet={openSet}
              bookedSet={bookedSet}
              onToggle={toggle}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="本周已预约" value={`${bookedSet.size}`} />
        <StatCard label="可预约时段" value={`${openSet.size}`} tone="gold" />
        <StatCard label="未开放" value={`${unopened}`} />
      </div>

      <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
        💡 当某时段被预约时，AI 分身会自动建议候补队列；学员可选其他风格相近老师。
      </div>
    </TeacherShell>
  );
}

function FragmentRow({
  slot,
  openSet,
  bookedSet,
  onToggle,
}: {
  slot: string;
  openSet: Set<string>;
  bookedSet: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-2 font-mono text-xs text-muted-foreground">
        {slot}:00
      </div>
      {SCHEDULE_DAYS.map((d) => {
        const key = `${d}-${slot}`;
        const isOcc = bookedSet.has(key);
        const isOpen = openSet.has(key);
        return (
          <button
            key={key}
            disabled={isOcc}
            onClick={() => onToggle(key)}
            title={isOcc ? "已预约（不可取消）" : isOpen ? "点击关闭" : "点击开放"}
            className={`h-10 rounded-md ring-1 transition-all ${
              isOcc
                ? "cursor-default bg-primary/40 ring-primary/60"
                : isOpen
                  ? "bg-success/30 ring-success/50 hover:bg-success/40"
                  : "bg-muted ring-border hover:bg-success/15"
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
