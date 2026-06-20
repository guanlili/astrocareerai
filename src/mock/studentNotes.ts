// 学员可写 overlay —— 在静态 students（mock/platform.ts）之上叠加运行期编辑
// （teacher-portal-optimization-plan.md §3.2）。静态 students 不动，本文件仅存 overlay。

export type StudentOverlay = { note?: string; contacted?: boolean };

const key = (id: string) => `mirrorhire:studentNote:${id}`;

export function getOverlay(id: string): StudentOverlay {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as StudentOverlay) : {};
  } catch {
    return {};
  }
}

export function setOverlay(id: string, patch: StudentOverlay): StudentOverlay {
  const next = { ...getOverlay(id), ...patch };
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key(id), JSON.stringify(next));
  } catch {
    /* 隐私模式等 → 忽略 */
  }
  return next;
}
