import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PM_RUBRIC, GENERIC_QUESTION_BANK } from "@/mock/interview";
import {
  getPublishedTeachers,
  publishTeacher,
  unpublishTeacher,
  type PublishedTeacher,
} from "@/mock/teacherRegistry";
import type { Teacher } from "@/mock/teachers";
import {
  safeParseJSON,
  type LanguageMode,
  type QuestionNode,
  type TeacherAvatarConfig,
} from "@/agent/interview";
import { analyzeTeacherMaterial, llmStatus } from "@/llm/endpoints";
import {
  Rocket,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Eye,
  Wand2,
  Loader2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/teacher/publish")({
  head: () => ({ meta: [{ title: "分身上架 · 老师配置平台 · 面镜" }] }),
  component: PublishPage,
});

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(seed || "new")}&backgroundColor=1e3a8a,0c2340,2563eb`;

// 预填一个示例（设计方向），点「发布」即可一键演示上架 → 学生端可见
const SAMPLE = {
  id: "pub-ux01",
  name: "周衡",
  title: "前腾讯 高级体验设计师",
  company: "腾讯 CDC / 现某大厂设计专家",
  tags: "交互设计, 用户体验, 作品集, B端",
  industries: "互联网, 技术",
  startingPrice: 99,
  bio: "10 年体验设计经验，主导过多款亿级用户产品的体验改版。擅长用追问逼出设计决策背后的真实权衡。",
  background:
    "前腾讯 CDC 高级体验设计师，带过 6 人设计团队，面过 300+ 设计候选人，关注作品集背后的决策链路而非视觉表层。",
  domains: "交互设计, 用户研究, 设计系统, B端体验",
  questions: [
    "挑你作品集里你自己最满意的一个项目，讲清楚问题是什么、你的设计决策链路，以及最终怎么验证有效。",
    "你怎么衡量一个设计改版到底有没有让体验变好？除了好看，你盯哪些指标？",
    "如果产品经理和你对一个交互方案争执不下，你会怎么推进？",
    "给你一个 B 端复杂表单，信息密度很高，你会怎么做减法？先讲框架。",
    "讲一次你做得很糟糕的设计，复盘当时如果重来你会改哪三步。",
    "你有什么想问我的？",
  ].join("\n"),
};

function PublishPage() {
  const [form, setForm] = useState(SAMPLE);
  const [tone, setTone] = useState(45);
  const [technical, setTechnical] = useState(60);
  const [detail, setDetail] = useState(55);
  const [primary, setPrimary] = useState<"zh" | "en">("zh");
  const [mixing, setMixing] = useState<"none" | "light" | "heavy">("light");

  const [published, setPublished] = useState<PublishedTeacher[]>([]);
  const [justPublished, setJustPublished] = useState<string | null>(null);

  // AI 素材分析
  const [material, setMaterial] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState<string | null>(null);
  const [llm, setLlm] = useState<{ enabled: boolean; model: string; maskedKey: string } | null>(
    null,
  );

  useEffect(() => setPublished(getPublishedTeachers()), []);
  useEffect(() => {
    llmStatus().then(setLlm).catch(() => setLlm({ enabled: false, model: "", maskedKey: "" }));
  }, []);

  async function onAnalyze() {
    if (!material.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalyzeMsg(null);
    try {
      const { raw } = await analyzeTeacherMaterial({ data: { material } });
      const j = safeParseJSON<{
        name?: string;
        title?: string;
        company?: string;
        tags?: string[];
        domains?: string[];
        background?: string;
        suggestedQuestions?: string[];
      }>(raw);
      if (!j) {
        setAnalyzeMsg("分析结果解析失败，请重试或手动填写。");
        return;
      }
      setForm((f) => ({
        ...f,
        name: j.name || f.name,
        title: j.title || f.title,
        company: j.company || f.company,
        tags: j.tags?.length ? j.tags.join(", ") : f.tags,
        domains: j.domains?.length ? j.domains.join(", ") : f.domains,
        background: j.background || f.background,
        bio: j.background || f.bio,
        questions: j.suggestedQuestions?.length
          ? j.suggestedQuestions.join("\n")
          : f.questions,
      }));
      setAnalyzeMsg("已根据素材自动填充，可继续微调后发布。");
    } catch (e) {
      setAnalyzeMsg(
        `分析失败：${e instanceof Error ? e.message : String(e)}（可手动填写后发布）`,
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const set = (k: keyof typeof SAMPLE, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  function buildEntry(): { profile: Teacher; config: TeacherAvatarConfig } {
    const split = (s: string) =>
      s.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
    const tags = split(form.tags);
    const industries = split(form.industries);
    const domains = split(form.domains);
    const language: LanguageMode = { primary, mixing };

    const lines = form.questions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const questionBank: QuestionNode[] = lines.length
      ? lines.map((prompt, i) => ({
          id: `${form.id}-q${i + 1}`,
          topic: i === 0 ? "自我介绍" : `考察点 ${i + 1}`,
          dimension: PM_RUBRIC[i % PM_RUBRIC.length].id,
          difficulty: i === 0 ? "warmup" : "standard",
          prompt,
        }))
      : GENERIC_QUESTION_BANK;

    const profile: Teacher = {
      id: form.id,
      name: form.name,
      title: form.title,
      company: form.company,
      avatar: avatarUrl(form.id),
      tags,
      industries,
      rating: 4.8,
      reviewCount: 0,
      studentsServed: 0,
      startingPrice: Number(form.startingPrice) || 99,
      bio: form.bio,
      highlights: tags.slice(0, 3).map((t) => `擅长 ${t}`),
      hourly: (Number(form.startingPrice) || 99) * 8,
      packagePrice: (Number(form.startingPrice) || 99) * 28,
    };

    const config: TeacherAvatarConfig = {
      teacherId: form.id,
      version: `platform-${new Date().toISOString().slice(0, 10)}`,
      persona: {
        displayName: `${form.name}（AI 分身）`,
        role: form.title,
        background: form.background || form.bio,
        principles: ["重真实决策链路胜过表层", "用追问逼出思考边界", "反馈犀利但可执行"],
      },
      skills: {
        domains: domains.length ? domains : tags,
        interviewStyles: ["结构化追问", "案例推演", "压力测试"],
      },
      style: {
        tone,
        technicality: technical,
        verbosity: detail,
        language,
      },
      knowledge: { questionBank, rubric: PM_RUBRIC },
      guardrails: {
        maxQuestions: 6,
        targetDurationMin: 30,
        targetDurationMax: 45,
        stayInScope: true,
      },
    };
    return { profile, config };
  }

  function onPublish() {
    if (!form.id.trim() || !form.name.trim()) return;
    const entry = buildEntry();
    publishTeacher(entry);
    setPublished(getPublishedTeachers());
    setJustPublished(entry.profile.id);
  }

  function onUnpublish(id: string) {
    unpublishTeacher(id);
    setPublished(getPublishedTeachers());
    if (justPublished === id) setJustPublished(null);
  }

  return (
    <TeacherShell
      title="分身上架 · 老师配置平台"
      subtitle="填写人设 / 风格 / 题库并发布；发布后学生即可在「找老师」中看到并选择"
      actions={
        <Link
          to="/teachers"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-3.5 w-3.5" /> 学生端预览
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* 配置表单 */}
        <div className="space-y-6">
          {/* AI 素材分析：粘贴履历 → LLM 抽取并填充 */}
          <div className="glass-panel rounded-xl border border-primary/30 p-6">
            <div className="flex items-center justify-between">
              <SectionTitle title="AI 素材导入分析" desc="粘贴老师履历 / 简介，自动抽取人设与题库" />
              {llm && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] ${
                    llm.enabled
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-surface/60 text-muted-foreground"
                  }`}
                  title={llm.enabled ? `${llm.model} · ${llm.maskedKey}` : "未配置密钥"}
                >
                  <Sparkles className="h-3 w-3" />
                  {llm.enabled ? `Qwen · ${llm.model} · ${llm.maskedKey}` : "演示模式"}
                </span>
              )}
            </div>
            <Textarea
              rows={4}
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="粘贴老师的履历 / 简历 / 个人简介 / 面经合集……AI 会据此抽取头衔、擅长领域、背景与一套面试题。"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={onAnalyze} disabled={analyzing || !material.trim()}>
                {analyzing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> 分析中……
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-1.5 h-4 w-4" /> AI 分析并填充
                  </>
                )}
              </Button>
              {analyzeMsg && <span className="text-xs text-muted-foreground">{analyzeMsg}</span>}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="对外档案" desc="展示在学生端老师库与详情页" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="老师 ID（唯一）">
                <Input value={form.id} onChange={(e) => set("id", e.target.value)} placeholder="pub-xxx" />
              </Field>
              <Field label="姓名">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="头衔">
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="公司 / 履历">
                <Input value={form.company} onChange={(e) => set("company", e.target.value)} />
              </Field>
              <Field label="标签（逗号分隔）">
                <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
              </Field>
              <Field label="行业（逗号分隔）">
                <Input value={form.industries} onChange={(e) => set("industries", e.target.value)} />
              </Field>
              <Field label="起步价 / 月（¥）">
                <Input
                  type="number"
                  value={form.startingPrice}
                  onChange={(e) => set("startingPrice", Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="简介">
              <Textarea rows={2} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
            </Field>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="分身人设与能力" desc="注入系统提示词，决定 AI 面试官的扮演" />
            <Field label="背景（履历浓缩，注入提示词）">
              <Textarea
                rows={2}
                value={form.background}
                onChange={(e) => set("background", e.target.value)}
              />
            </Field>
            <Field label="擅长领域（逗号分隔）">
              <Input value={form.domains} onChange={(e) => set("domains", e.target.value)} />
            </Field>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="说话风格" desc="映射分身的语气 / 专业度 / 详细度" />
            <Slider3 label="语气" left="严厉" right="温和" value={tone} setValue={setTone} />
            <Slider3 label="专业度" left="口语化" right="术语化" value={technical} setValue={setTechnical} />
            <Slider3 label="回答详细度" left="精炼" right="详细" value={detail} setValue={setDetail} />

            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <Field label="主语言">
                <RadioGroup value={primary} onValueChange={(v) => setPrimary(v as "zh" | "en")} className="flex gap-2">
                  {(["zh", "en"] as const).map((v) => (
                    <Choice key={v} value={v} label={v === "zh" ? "中文" : "English"} />
                  ))}
                </RadioGroup>
              </Field>
              <Field label="中英混杂">
                <RadioGroup
                  value={mixing}
                  onValueChange={(v) => setMixing(v as "none" | "light" | "heavy")}
                  className="flex gap-2"
                >
                  {(["none", "light", "heavy"] as const).map((v) => (
                    <Choice key={v} value={v} label={v} />
                  ))}
                </RadioGroup>
              </Field>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="题库" desc="每行一题；第一题作为开场自我介绍。留空则用通用题库" />
            <Textarea
              rows={7}
              value={form.questions}
              onChange={(e) => set("questions", e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onPublish} disabled={!form.id.trim() || !form.name.trim()}>
              <Rocket className="mr-1.5 h-4 w-4" /> 发布到学生端
            </Button>
            {justPublished && (
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> 已发布，学生端即可看到
                <Link
                  to="/teachers/$id"
                  params={{ id: justPublished }}
                  className="inline-flex items-center gap-1 text-primary-glow underline"
                >
                  去看看 <ExternalLink className="h-3 w-3" />
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* 已发布列表 */}
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-6">
            <SectionTitle title="已发布到学生端" desc={`${published.length} 位 · 通过本平台上架`} />
            {published.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                还没有通过平台发布的老师。左侧填写后点「发布到学生端」即可上架。
              </p>
            ) : (
              <div className="space-y-2">
                {published.map((p) => (
                  <div
                    key={p.profile.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-surface/40 p-3"
                  >
                    <img src={p.profile.avatar} alt="" className="h-10 w-10 rounded-lg ring-2 ring-primary/30" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.profile.name}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {p.profile.title}
                      </div>
                    </div>
                    <Link
                      to="/teachers/$id"
                      params={{ id: p.profile.id }}
                      className="text-muted-foreground hover:text-foreground"
                      title="学生端详情"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => onUnpublish(p.profile.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="下架"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-xl border border-gold/30 bg-gold/5 p-4 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center gap-1.5 font-mono uppercase tracking-widest text-gold">
              <StatusBadge tone="gold">流程</StatusBadge>
            </div>
            配置平台发布 → 写入老师注册表 → 学生在「找老师」看到并选择 → 进入聊天室，
            编排器自动加载该老师的分身配置开始模拟面试。本期注册表用 localStorage 落地，
            未来替换为后台接口，消费侧无需改动。
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Choice({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
      <RadioGroupItem value={value} /> {label}
    </label>
  );
}

function Slider3({
  label,
  left,
  right,
  value,
  setValue,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
  setValue: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex justify-between text-sm">
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
