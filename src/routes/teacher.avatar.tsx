import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { Upload, FileText, MessageSquare, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/teacher/avatar")({
  head: () => ({ meta: [{ title: "分身管理 · 面镜 老师" }] }),
  component: AvatarPage,
});

const materials = [
  { name: "字节跳动_PM面经合集.docx", size: "1.2MB", type: "doc", status: "已纳入知识库", icon: FileText },
  { name: "知乎专栏_产品方法论.zip", size: "8.4MB", type: "archive", status: "已纳入知识库", icon: FileText },
  { name: "辅导学员_对话精选.json", size: "320KB", type: "json", status: "已纳入知识库", icon: MessageSquare },
  { name: "扫描版_面试笔记.pdf", size: "12MB", type: "pdf", status: "OCR 失败", icon: AlertCircle, error: true },
];

const stages = [
  { name: "素材解析", status: "done" as const, time: "5m 12s" },
  { name: "向量化", status: "done" as const, time: "3m 04s" },
  { name: "风格学习", status: "running" as const, time: "进行中" },
  { name: "回归测试", status: "pending" as const, time: "排队中" },
];

function AvatarPage() {
  const [tone, setTone] = useState(50);
  const [technical, setTechnical] = useState(70);
  const [detail, setDetail] = useState(60);

  return (
    <TeacherShell
      title="分身管理"
      subtitle="所有训练任务异步处理，失败原因会以可读文案提示"
      actions={
        <button className="inline-flex h-9 items-center gap-2 rounded-md gradient-primary px-3 text-sm text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" /> 提交新一轮训练
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="素材库" desc={`已上传 ${materials.length} 项 · 支持 PDF/Word/聊天记录/视频链接`} />
            <div className="rounded-lg border-2 border-dashed border-border bg-surface/30 p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-3 text-sm font-medium">拖拽文件到此处，或点击上传</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                单文件 ≤ 50MB · 一次最多 10 个
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {materials.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-surface/40 p-3">
                    <Icon className={`h-4 w-4 ${m.error ? "text-destructive" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{m.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{m.size}</div>
                    </div>
                    <StatusBadge tone={m.error ? "danger" : "success"}>{m.status}</StatusBadge>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="本次训练进度" desc="任务 ID · TJ-2042" />
            <div className="space-y-3">
              {stages.map((s) => (
                <div key={s.name} className="flex items-center gap-4">
                  <div className="w-8">
                    {s.status === "done" && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {s.status === "running" && <Loader2 className="h-5 w-5 animate-spin text-primary-glow" />}
                    {s.status === "pending" && <div className="h-5 w-5 rounded-full border-2 border-border" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{s.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{s.time}</div>
                  </div>
                  <StatusBadge
                    tone={s.status === "done" ? "success" : s.status === "running" ? "info" : "neutral"}
                  >
                    {s.status === "done" ? "完成" : s.status === "running" ? "进行中" : "等待"}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="风格调优" desc="保存后立即在右下预览生效" />
            <Slider3 label="语气" left="严厉" right="温和" value={tone} setValue={setTone} />
            <Slider3 label="专业度" left="口语化" right="术语化" value={technical} setValue={setTechnical} />
            <Slider3 label="回答详细度" left="精炼" right="详细" value={detail} setValue={setDetail} />
          </div>

          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="预览对话" desc="使用当前参数即时验证" />
            <div className="space-y-3">
              <div className="rounded-2xl rounded-tl-sm bg-surface-2 p-3 text-sm">
                你简历里提到「主导一款月活破亿产品」，能具体说一下你的边界在哪里？哪些是你做的，哪些不是？
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-gold">
                  考察：诚实度 · 自我边界
                </div>
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/20 p-3 text-sm">
                这个项目我负责的是商业化模块……
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-surface-2 p-3 text-sm">
                好。那商业化模块里，最关键的一个决策是哪一个？你是怎么权衡的？
              </div>
            </div>
            <button className="mt-4 w-full rounded-md border border-primary/40 bg-primary/10 py-2 text-sm">
              在新窗口打开完整测试
            </button>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}

function Slider3({ label, left, right, value, setValue }: { label: string; left: string; right: string; value: number; setValue: (v: number) => void }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-gold">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
