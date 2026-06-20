import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StudentShell } from "@/components/layouts/StudentShell";
import { teachers, type Teacher } from "@/mock/teachers";
import { getPublishedTeachers } from "@/mock/teacherRegistry";
import { StatusBadge } from "@/components/common/PanelKit";
import { EmptyState } from "@/components/common/EmptyState";
import { useAppState, toggleFavorite } from "@/mock/appStore";
import { Search, SlidersHorizontal, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/teachers/")({
  head: () => ({
    meta: [
      { title: "找老师 · 面镜 MirrorHire" },
      {
        name: "description",
        content: "按行业、岗位、价格筛选认证面试官导师，找到最匹配你目标岗位的 AI 分身。",
      },
    ],
  }),
  component: TeachersList,
});

const industries = ["全部", "互联网", "咨询", "金融", "快消", "技术", "HR"];
type SortKey = "综合" | "评分" | "价格升序" | "学员";

function TeachersList() {
  const [industry, setIndustry] = useState("全部");
  const [maxPrice, setMaxPrice] = useState(300);
  const [keyword, setKeyword] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState<SortKey>("综合");
  const { favorites } = useAppState();
  const favIds = useMemo(() => new Set(favorites), [favorites]);

  // 合并「老师配置平台」运行期发布的老师（仅客户端可读 localStorage，挂载后补入）
  const [published, setPublished] = useState<Teacher[]>([]);
  useEffect(() => {
    const builtinIds = new Set(teachers.map((t) => t.id));
    setPublished(
      getPublishedTeachers()
        .map((p) => p.profile)
        .filter((p) => !builtinIds.has(p.id)),
    );
  }, []);

  const allTeachers = [...published, ...teachers];

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let list = allTeachers.filter((t) => {
      if (industry !== "全部" && !t.industries.includes(industry)) return false;
      if (t.startingPrice > maxPrice) return false;
      if (t.rating < minRating) return false;
      if (onlyFav && !favIds.has(t.id)) return false;
      if (q) {
        const hay = `${t.name} ${t.title} ${t.company} ${t.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list];
    if (sort === "评分") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "价格升序") list.sort((a, b) => a.startingPrice - b.startingPrice);
    else if (sort === "学员") list.sort((a, b) => b.studentsServed - a.studentsServed);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [published, industry, maxPrice, keyword, minRating, onlyFav, favIds, sort]);

  function onFav(t: Teacher, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = toggleFavorite(t.id);
    toast[nowFav ? "success" : "info"](nowFav ? "已收藏老师" : "已取消收藏", {
      description: `${t.name}${nowFav ? " 已加入「我的」收藏" : ""}`,
    });
  }

  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="font-display text-3xl font-semibold">找老师</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            共 {allTeachers.length} 位认证老师，全部来自一线企业面试官 / 业务负责人。
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
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索老师 / 公司 / 岗位"
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

          <div className="mb-5">
            <div className="mb-2 text-sm font-medium">评分</div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {[
                { label: "★ 4.9 以上", v: 4.9 },
                { label: "★ 4.7 以上", v: 4.7 },
                { label: "★ 4.5 以上", v: 4.5 },
              ].map((r) => (
                <label key={r.label} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === r.v}
                    onChange={() => setMinRating(r.v)}
                    className="accent-primary"
                  />{" "}
                  {r.label}
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="rating"
                  checked={minRating === 0}
                  onChange={() => setMinRating(0)}
                  className="accent-primary"
                />{" "}
                不限
              </label>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyFav}
              onChange={(e) => setOnlyFav(e.target.checked)}
              className="accent-primary"
            />
            <Heart
              className={`h-3.5 w-3.5 ${onlyFav ? "fill-destructive text-destructive" : ""}`}
            />
            只看收藏（{favIds.size}）
          </label>
        </aside>

        {/* 列表 */}
        <div>
          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              找到 <span className="font-mono text-foreground">{filtered.length}</span> 位老师
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-border bg-surface/60 px-2 py-1 text-sm outline-none"
            >
              <option value="综合">综合排序</option>
              <option value="评分">评分最高</option>
              <option value="价格升序">价格升序</option>
              <option value="学员">学员最多</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="没有匹配的老师"
              desc="试试放宽价格上限、切换行业，或清空关键词与收藏筛选。"
              action={
                <button
                  onClick={() => {
                    setKeyword("");
                    setIndustry("全部");
                    setMaxPrice(300);
                    setMinRating(0);
                    setOnlyFav(false);
                  }}
                  className="rounded-md gradient-primary px-4 py-2 text-sm text-primary-foreground"
                >
                  重置筛选
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((t) => (
                <Link
                  to="/teachers/$id"
                  params={{ id: t.id }}
                  key={t.id}
                  className="glass-panel group relative rounded-xl p-5 transition-all hover:ring-1 hover:ring-primary/40"
                >
                  <button
                    onClick={(e) => onFav(t, e)}
                    title={favIds.has(t.id) ? "取消收藏" : "收藏老师"}
                    className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favIds.has(t.id) ? "fill-destructive text-destructive" : ""
                      }`}
                    />
                  </button>
                  <div className="flex gap-4">
                    <img
                      src={t.avatar}
                      alt=""
                      className="h-16 w-16 rounded-lg ring-2 ring-primary/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 pr-8">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{t.name}</div>
                          <div className="truncate font-mono text-[11px] text-muted-foreground">
                            {t.title}
                          </div>
                        </div>
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
          )}
        </div>
      </section>
    </StudentShell>
  );
}
