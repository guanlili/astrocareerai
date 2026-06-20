import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { Slider3 } from "@/components/common/Slider3";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  defaultStudio,
  getStudio,
  updateStudio,
  publishStudio,
  unpublishStudio,
  rebuildQuestionBank,
  type StudioMaterial,
  type StudioState,
} from "@/mock/teacherStudio";
import {
  getPublishedTeachers,
  unpublishTeacher,
  type PublishedTeacher,
} from "@/mock/teacherRegistry";
import type { Teacher } from "@/mock/teachers";
import type { LanguageMode, TeacherAvatarConfig } from "@/agent/interview";
import {
  Upload,
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Rocket,
  ExternalLink,
  Eye,
  Power,
} from "lucide-react";

const TABS = ["materials", "style", "questions", "publish"] as const;
type TabKey = (typeof TABS)[number];

export const Route = createFileRoute("/teacher/studio")({
  head: () => ({ meta: [{ title: "分身工作室 · 老师配置平台 · 面镜" }] }),
  component: StudioPage,
});

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(seed || "new")}&backgroundColor=1e3a8a,0c2340,2563eb`;

// 训练进度为展示态（不持久化）
const TRAINING_STAGES = [
  { name: "素材解析", status: "done" as const, time: "5m 12s" },
  { name: "向量化", status: "done" as const, time: "3m 04s" },
  { name: "风格学习", status: "running" as const, time: "进行中" },
  { name: "回归测试", status: "pending" as const, time: "排队中" },
];

function StudioPage() {
  // Tab 用本地 state（纯前端展示态，无需 URL 持久化）。
  // 注：早期曾担心给本路由加 search schema 会扰动 useLoaderData 推断；后经核实该推断退化是
  // teachers/$id、chat/$teacherId 路由自身问题（origin/main 即复现，与 search schema 无关），
  // 已改用 useParams + getTeacher 修复。此处保留本地 state 仅为产品取向，非类型/性能规避。
  const [tab, setTab] = useState<TabKey>("materials");
  // 初始化用 defaultStudio() 让 SSR 与客户端首帧一致，useEffect 再填充 localStorage 真实值，避免 hydration 不一致。
  const [studio, setStudio] = useState<StudioState>(() => defaultStudio());
  const [published, setPublished] = useState<PublishedTeacher[]>([]);

  useEffect(() => {
    setStudio(getStudio());
    setPublished(getPublishedTeachers());
  }, []);

  function patch(p: Partial<StudioState>) {
    setStudio(updateStudio(p));
  }
  function patchConfig(c: Partial<TeacherAvatarConfig>) {
    patch({ config: { ...studio.config, ...c } });
  }
  function refresh() {
    setStudio(getStudio());
    setPublished(getPublishedTeachers());
  }

  function onPublish() {
    publishStudio();
    refresh();
    toast.success("已发布到学生端", {
      description: `${studio.profile.name} 现在学生在「找老师」可见可选`,
    });
  }
  function onUnpublish() {
    unpublishStudio();
    refresh();
    toast.success("已下架", { description: `${studio.profile.name} 已从学生端移除` });
  }

  return (
    <TeacherShell
      title="分身工作室"
      subtitle="配置 → 上架 一站式：素材 / 人设 / 题库 / 发布，草稿自动保存"
      actions={
        <Link
          to="/teachers"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-3.5 w-3.5" /> 学生端预览
        </Link>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
        <TabsList>
          <TabsTrigger value="materials">① 素材与训练</TabsTrigger>
          <TabsTrigger value="style">② 人设与风格</TabsTrigger>
          <TabsTrigger value="questions">③ 题库</TabsTrigger>
          <TabsTrigger value="publish">④ 上架与预览</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <MaterialsTab studio={studio} patch={patch} onGotoStyle={() => setTab("style")} />
        </TabsContent>
        <TabsContent value="style">
          <StyleTab studio={studio} patchConfig={patchConfig} />
        </TabsContent>
        <TabsContent value="questions">
          <QuestionsTab studio={studio} patchConfig={patchConfig} />
        </TabsContent>
        <TabsContent value="publish">
          <PublishTab
            studio={studio}
            patch={patch}
            published={published}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            onUnpublishId={(id) => {
              unpublishTeacher(id);
              refresh();
              toast.success("已下架", { description: `${id} 已从学生端移除` });
            }}
          />
        </TabsContent>
      </Tabs>
    </TeacherShell>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tab ① 素材与训练
// ──────────────────────────────────────────────────────────────────────────

function MaterialsTab({
  studio,
  patch,
  onGotoStyle,
}: {
  studio: StudioState;
  patch: (p: Partial<StudioState>) => void;
  onGotoStyle: () => void;
}) {
  const [draftName, setDraftName] = useState("");

  function addMaterial() {
    const name = draftName.trim();
    if (!name) return;
    const m: StudioMaterial = {
      id: `m${Date.now()}`,
      name,
      size: "—",
      type: "doc",
      status: "待解析",
    };
    patch({ materials: [...studio.materials, m] });
    setDraftName("");
    toast.success("素材已加入训练队列", { description: name });
  }
  function removeMaterial(id: string) {
    patch({ materials: studio.materials.filter((m) => m.id !== id) });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle
            title="素材库"
            desc={`已上传 ${studio.materials.length} 项 · 支持 PDF/Word/聊天记录/视频链接`}
          />
          <div className="rounded-lg border-2 border-dashed border-border bg-surface/30 p-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-3 text-sm font-medium">拖拽文件到此处，或点击上传</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              单文件 ≤ 50MB · 一次最多 10 个
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMaterial()}
              placeholder="新增一个素材名（演示）"
            />
            <Button variant="outline" onClick={addMaterial} className="shrink-0">
              <Plus className="mr-1 h-4 w-4" /> 加入
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {studio.materials.length === 0 ? (
              <EmptyHint text="还没有素材。加入的素材将进入训练队列。" />
            ) : (
              studio.materials.map((m) => {
                const Icon = iconForMaterial(m);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-surface/40 p-3"
                  >
                    <Icon
                      className={`h-4 w-4 ${m.error ? "text-destructive" : "text-muted-foreground"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{m.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{m.size}</div>
                    </div>
                    <StatusBadge tone={m.error ? "danger" : "success"}>{m.status}</StatusBadge>
                    <button
                      onClick={() => removeMaterial(m.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="移除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="本次训练进度" desc="任务 ID · TJ-2042" />
          <div className="space-y-3">
            {TRAINING_STAGES.map((s) => (
              <div key={s.name} className="flex items-center gap-4">
                <div className="w-8">
                  {s.status === "done" && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {s.status === "running" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary-glow" />
                  )}
                  {s.status === "pending" && (
                    <div className="h-5 w-5 rounded-full border-2 border-border" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm">{s.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{s.time}</div>
                </div>
                <StatusBadge
                  tone={
                    s.status === "done" ? "success" : s.status === "running" ? "info" : "neutral"
                  }
                >
                  {s.status === "done" ? "完成" : s.status === "running" ? "进行中" : "等待"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="风格调优预览" desc="完整调优在「② 人设与风格」" />
          <div className="rounded-2xl rounded-tl-sm bg-surface-2 p-3 text-sm">
            你简历里提到「主导一款月活破亿产品」，能具体说一下你的边界在哪里？哪些是你做的，哪些不是？
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-gold">
              考察：诚实度 · 自我边界
            </div>
          </div>
          <button
            onClick={onGotoStyle}
            className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/10 py-2 text-sm"
          >
            <Sparkles className="h-3.5 w-3.5" /> 去调人设与风格
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tab ② 人设与风格（语气 / 专业度 / 详细度 + 语言 + 人设字段，唯一来源）
// ──────────────────────────────────────────────────────────────────────────

function StyleTab({
  studio,
  patchConfig,
}: {
  studio: StudioState;
  patchConfig: (c: Partial<TeacherAvatarConfig>) => void;
}) {
  const { config } = studio;
  const style = config.style;
  const language = style.language ?? { primary: "zh", mixing: "light" };
  const setLanguage = (l: Partial<LanguageMode>) =>
    patchConfig({ style: { ...style, language: { ...language, ...l } } });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="分身人设" desc="注入系统提示词，决定 AI 面试官的扮演" />
          <Field label="展示名（AI 分身）">
            <Input
              value={config.persona.displayName}
              onChange={(e) =>
                patchConfig({ persona: { ...config.persona, displayName: e.target.value } })
              }
            />
          </Field>
          <Field label="角色 / 头衔">
            <Input
              value={config.persona.role}
              onChange={(e) =>
                patchConfig({ persona: { ...config.persona, role: e.target.value } })
              }
            />
          </Field>
          <Field label="背景（履历浓缩，注入提示词）">
            <Textarea
              rows={3}
              value={config.persona.background}
              onChange={(e) =>
                patchConfig({ persona: { ...config.persona, background: e.target.value } })
              }
            />
          </Field>
          <Field label="擅长领域（逗号分隔）">
            <Input
              value={config.skills.domains.join("，")}
              onChange={(e) =>
                patchConfig({
                  skills: {
                    ...config.skills,
                    domains: splitList(e.target.value),
                  },
                })
              }
            />
          </Field>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="评判原则" desc="价值观 / 评判原则（每行一条）" />
          <Textarea
            rows={3}
            value={config.persona.principles.join("\n")}
            onChange={(e) =>
              patchConfig({
                persona: {
                  ...config.persona,
                  principles: e.target.value.split("\n").filter(Boolean),
                },
              })
            }
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="说话风格" desc="映射分身的语气 / 专业度 / 详细度" />
          <Slider3
            label="语气"
            left="严厉"
            right="温和"
            value={style.tone}
            onChange={(v) => patchConfig({ style: { ...style, tone: v } })}
          />
          <Slider3
            label="专业度"
            left="口语化"
            right="术语化"
            value={style.technicality}
            onChange={(v) => patchConfig({ style: { ...style, technicality: v } })}
          />
          <Slider3
            label="回答详细度"
            left="精炼"
            right="详细"
            value={style.verbosity}
            onChange={(v) => patchConfig({ style: { ...style, verbosity: v } })}
          />

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field label="主语言">
              <RadioGroup
                value={language.primary}
                onValueChange={(v) => setLanguage({ primary: v as "zh" | "en" })}
                className="flex gap-2"
              >
                {(["zh", "en"] as const).map((v) => (
                  <Choice key={v} value={v} label={v === "zh" ? "中文" : "English"} />
                ))}
              </RadioGroup>
            </Field>
            <Field label="中英混杂">
              <RadioGroup
                value={language.mixing}
                onValueChange={(v) => setLanguage({ mixing: v as "none" | "light" | "heavy" })}
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
          <SectionTitle title="护栏" desc="面试边界约束" />
          <Field label="最大提问轮数">
            <Input
              type="number"
              value={config.guardrails.maxQuestions}
              onChange={(e) =>
                patchConfig({
                  guardrails: { ...config.guardrails, maxQuestions: Number(e.target.value) || 0 },
                })
              }
            />
          </Field>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.guardrails.stayInScope}
              onChange={(e) =>
                patchConfig({ guardrails: { ...config.guardrails, stayInScope: e.target.checked } })
              }
              className="accent-primary"
            />
            严格限定在题库范围内作答（stayInScope）
          </label>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tab ③ 题库（每行一题；首题为开场自我介绍；空行 / 重复校验）
// ──────────────────────────────────────────────────────────────────────────

function QuestionsTab({
  studio,
  patchConfig,
}: {
  studio: StudioState;
  patchConfig: (c: Partial<TeacherAvatarConfig>) => void;
}) {
  const { config } = studio;
  const bank = config.knowledge.questionBank;
  const text = bank.map((q) => q.prompt).join("\n");

  const stats = useMemo(() => {
    const prompts = bank.map((q) => q.prompt);
    const nonEmpty = prompts.filter((p) => p.trim());
    const dup = nonEmpty.length - new Set(nonEmpty).size;
    const empty = prompts.length - nonEmpty.length;
    return { total: prompts.length, nonEmpty: nonEmpty.length, dup, empty };
  }, [bank]);

  function onChange(value: string) {
    const lines = value.split("\n");
    patchConfig({
      knowledge: {
        ...config.knowledge,
        questionBank: rebuildQuestionBank(lines, config.teacherId),
      },
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="glass-panel rounded-xl p-6">
        <SectionTitle title="题库" desc="每行一题；第一题作为开场自我介绍。留空将回退到通用题库" />
        <Textarea
          rows={10}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge tone="info">共 {stats.total} 题</StatusBadge>
          <StatusBadge tone="gold">首题 · 开场自我介绍</StatusBadge>
          {stats.empty > 0 && <StatusBadge tone="warning">{stats.empty} 处空行</StatusBadge>}
          {stats.dup > 0 && <StatusBadge tone="danger">{stats.dup} 处疑似重复</StatusBadge>}
          {stats.nonEmpty === 0 && (
            <StatusBadge tone="warning">题库为空，将回退通用题库</StatusBadge>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6">
        <SectionTitle title="题目预览" desc="发布后学生进聊天室即按此推进" />
        <div className="space-y-2">
          {bank.filter((q) => q.prompt.trim()).length === 0 ? (
            <EmptyHint text="题库为空。在左侧填入题目，或保留默认通用题库。" />
          ) : (
            bank
              .filter((q) => q.prompt.trim())
              .map((q, i) => (
                <div
                  key={q.id}
                  className="rounded-md border border-border bg-surface/40 p-3 text-sm"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">Q{i + 1}</span>
                    {i === 0 && <StatusBadge tone="gold">自我介绍</StatusBadge>}
                    <StatusBadge tone="neutral">{q.difficulty}</StatusBadge>
                  </div>
                  {q.prompt}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tab ④ 上架与预览（档案表单 + 内联校验 + 发布/下架 + 状态徽章 + 列表 + 预览卡）
// ──────────────────────────────────────────────────────────────────────────

function PublishTab({
  studio,
  patch,
  published,
  onPublish,
  onUnpublish,
  onUnpublishId,
}: {
  studio: StudioState;
  patch: (p: Partial<StudioState>) => void;
  published: PublishedTeacher[];
  onPublish: () => void;
  onUnpublish: () => void;
  onUnpublishId: (id: string) => void;
}) {
  const { profile, status } = studio;

  function setProfile<K extends keyof Teacher>(k: K, v: Teacher[K]) {
    patch({ profile: { ...profile, [k]: v } });
  }
  function setId(id: string) {
    patch({
      profile: { ...profile, id, avatar: avatarUrl(id) },
      config: { ...studio.config, teacherId: id },
    });
  }

  const errors = {
    id: !profile.id.trim()
      ? "ID 必填"
      : !/^pub-.+/.test(profile.id)
        ? "需以 pub- 开头，如 pub-ux01"
        : null,
    name: !profile.name.trim() ? "姓名必填" : null,
    price: !(profile.startingPrice > 0) ? "起步价需大于 0" : null,
  };
  const valid = !errors.id && !errors.name && !errors.price;
  const isPublished = status === "published";

  const statusMeta = {
    draft: { tone: "neutral" as const, label: "草稿" },
    published: { tone: "success" as const, label: "已发布" },
    unpublished: { tone: "warning" as const, label: "已下架" },
  }[status];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle
            title="对外档案"
            desc="展示在学生端老师库与详情页"
            action={<StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge>}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="老师 ID（唯一）" error={errors.id}>
              <Input
                value={profile.id}
                onChange={(e) => setId(e.target.value)}
                placeholder="pub-xxx"
                className={errors.id ? "border-destructive" : ""}
              />
            </Field>
            <Field label="姓名" error={errors.name}>
              <Input
                value={profile.name}
                onChange={(e) => setProfile("name", e.target.value)}
                className={errors.name ? "border-destructive" : ""}
              />
            </Field>
            <Field label="头衔">
              <Input value={profile.title} onChange={(e) => setProfile("title", e.target.value)} />
            </Field>
            <Field label="公司 / 履历">
              <Input
                value={profile.company}
                onChange={(e) => setProfile("company", e.target.value)}
              />
            </Field>
            <Field label="标签（逗号分隔）">
              <Input
                value={profile.tags.join("，")}
                onChange={(e) => setProfile("tags", splitList(e.target.value))}
              />
            </Field>
            <Field label="行业（逗号分隔）">
              <Input
                value={profile.industries.join("，")}
                onChange={(e) => setProfile("industries", splitList(e.target.value))}
              />
            </Field>
            <Field label="起步价 / 月（¥）" error={errors.price}>
              <Input
                type="number"
                value={profile.startingPrice}
                onChange={(e) => setProfile("startingPrice", Number(e.target.value))}
                className={errors.price ? "border-destructive" : ""}
              />
            </Field>
          </div>
          <Field label="简介">
            <Textarea
              rows={2}
              value={profile.bio}
              onChange={(e) => setProfile("bio", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onPublish} disabled={!valid}>
            <Rocket className="mr-1.5 h-4 w-4" />{" "}
            {isPublished ? "再次发布（覆盖）" : "发布到学生端"}
          </Button>
          {isPublished && (
            <Button variant="outline" onClick={onUnpublish}>
              <Power className="mr-1.5 h-4 w-4" /> 下架
            </Button>
          )}
          {!valid && <span className="text-sm text-destructive">请先修正上方标红字段</span>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="学生端预览卡" desc="复用学生端详情卡样式" />
          <TeacherPreviewCard profile={profile} published={isPublished} />
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="已发布到学生端" desc={`${published.length} 位 · 通过本平台上架`} />
          {published.length === 0 ? (
            <EmptyHint text="还没有通过平台发布的老师。左侧填写后点「发布到学生端」即可上架。" />
          ) : (
            <div className="space-y-2">
              {published.map((p) => (
                <div
                  key={p.profile.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface/40 p-3"
                >
                  <img
                    src={p.profile.avatar}
                    alt=""
                    className="h-10 w-10 rounded-lg ring-2 ring-primary/30"
                  />
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
                    onClick={() => onUnpublishId(p.profile.id)}
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
      </div>
    </div>
  );
}

function TeacherPreviewCard({ profile, published }: { profile: Teacher; published: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface/30 p-5">
      <div className="flex gap-4">
        <img
          src={profile.avatar}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl ring-2 ring-primary/40"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-display text-lg font-semibold">{profile.name || "（未命名）"}</div>
            <StatusBadge tone="info">AI 分身</StatusBadge>
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {profile.title} · {profile.company}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-accent/60 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-md border border-gold/30 bg-gold/10 px-4 py-3">
        <div className="text-sm text-muted-foreground">AI 分身 · 月订阅</div>
        <div className="font-mono text-xl font-semibold text-gold">
          ¥{profile.startingPrice}
          <span className="text-xs text-muted-foreground">/月</span>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{profile.bio}</p>
      {published ? (
        <Link
          to="/teachers/$id"
          params={{ id: profile.id }}
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary-glow underline"
        >
          查看学生端详情 <ExternalLink className="h-3 w-3" />
        </Link>
      ) : (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" /> 发布后可在学生端查看
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 通用小组件 / 工具
// ──────────────────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <div className="font-mono text-[11px] text-destructive">{error}</div>}
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

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-surface/20 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function splitList(s: string): string[] {
  return s
    .split(/[,，\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function iconForMaterial(m: StudioMaterial) {
  if (m.type === "json") return MessageSquare;
  return m.error ? AlertCircle : FileText;
}
