import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StudentShell } from "@/components/layouts/StudentShell";
import { teachers } from "@/mock/teachers";
import { StatusBadge } from "@/components/common/PanelKit";
import { Search, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/teachers/")({
  head: () => ({
    meta: [
      { title: "找老师 · 面镜 MirrorHire" },
      { name: "description", content: "按行业、岗位、价格筛选认证面试官导师，找到最匹配你目标岗位的 AI 分身。" },
    ],
  }),
  component: TeachersList,
});

const industries = ["全部", "互联网", "咨询", "金融", "快消", "技术", "HR"];

function TeachersList() {
  const [industry, setIndustry] = useState("全部");
  const [maxPrice, setMaxPrice] = useState(300);

  const filtered = teachers.filter(
    (t) =>
      (industry === "全部" || t.industries.includes(industry)) && t.startingPrice <= maxPrice
  );

  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="font-display text-3xl font-semibold">找老师</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            共 {teachers.length} 位认证老师，全部来自一线企业面试官 / 业务负责人。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-[260px_1fr]">
        {/* 筛选 */}
        <aside className="glass-panel sticky top-20 h-fit rounded-xl p-5">
          <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" /> 筛选
          </div>

          <div className="mb-5">
            <div className="mb-2 text-sm font-medium">关键词</div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-input/40 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="搜索老师 / 公司"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 text-sm font-medium">行业</div>
            <div className="flex flex-wrap gap-1.5">
              {industries.map((i) => (
                <button
                  key={i}
                  onClick={() => setIndustry(i)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    industry === i
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">价格上限</span>
              <span className="font-mono text-gold">¥{maxPrice}</span>
            </div>
            <input
              type="range"
              min={50}
              max={300}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">评分</div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {["★ 4.9 以上", "★ 4.7 以上", "★ 4.5 以上"].map((r) => (
                <label key={r} className="flex items-center gap-2">
                  <input type="checkbox" className="accent-primary" /> {r}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* 列表 */}
        <div>
          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              找到 <span className="font-mono text-foreground">{filtered.length}</span> 位老师
            </span>
            <select className="rounded-md border border-border bg-surface/60 px-2 py-1 text-sm">
              <option>综合排序</option>
              <option>评分最高</option>
              <option>价格升序</option>
              <option>学员最多</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((t) => (
              <Link
                to="/teachers/$id"
                params={{ id: t.id }}
                key={t.id}
                className="glass-panel group rounded-xl p-5 transition-all hover:ring-1 hover:ring-primary/40"
              >
                <div className="flex gap-4">
                  <img src={t.avatar} alt="" className="h-16 w-16 rounded-lg ring-2 ring-primary/30" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{t.name}</div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {t.title}
                        </div>
                      </div>
                      <StatusBadge tone="gold">★ {t.rating}</StatusBadge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{t.bio}</p>
                <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
                  <div className="font-mono text-xs text-muted-foreground">
                    {t.studentsServed.toLocaleString()} 学员 · {t.reviewCount} 评价
                  </div>
                  <div className="font-mono text-lg font-semibold text-gold">
                    ¥{t.startingPrice}
                    <span className="text-xs text-muted-foreground">/月起</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </StudentShell>
  );
}
