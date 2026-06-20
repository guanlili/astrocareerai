// 老师配置平台 —— 已发布老师注册表（SPEC_mock_interview_v1.md §8.1）
//
// 「老师配置平台」发布一位老师后，其档案 + 分身配置写入本注册表；学生端老师库、老师详情、
// 聊天室都从这里解析运行期新增的老师。本期用 localStorage 落地（前端 Demo），未来替换为
// 后台接口即可，消费侧（teachers.index / teachers.$id / chat / 编排器）无需改动。
//
// 注意：localStorage 仅客户端可用。SSR / 直接刷新某个运行期发布老师的 URL 时服务端读不到，
// 由消费侧在客户端兜底解析（见 getTeacher）。内置老师（mock/teachers.ts）不受此限。

import type { TeacherAvatarConfig } from "@/agent/interview/types";
import type { Teacher } from "./teachers";

/** 一位通过平台发布的老师：对外档案 + 分身配置。 */
export type PublishedTeacher = {
  profile: Teacher;
  config: TeacherAvatarConfig;
  publishedAt: number;
};

const KEY = "mirrorhire:publishedTeachers";

function readAll(): PublishedTeacher[] {
  try {
    if (typeof localStorage === "undefined") return [];
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PublishedTeacher[];
  } catch {
    return [];
  }
}

function writeAll(list: PublishedTeacher[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 隐私模式等 → 忽略 */
  }
}

/** 列出所有平台发布的老师（最新在前）。 */
export function getPublishedTeachers(): PublishedTeacher[] {
  return readAll().sort((a, b) => b.publishedAt - a.publishedAt);
}

export function getPublishedProfile(id: string): Teacher | undefined {
  return readAll().find((p) => p.profile.id === id)?.profile;
}

export function getPublishedConfig(id: string): TeacherAvatarConfig | undefined {
  return readAll().find((p) => p.profile.id === id)?.config;
}

/** 发布 / 覆盖一位老师（按 id upsert）。 */
export function publishTeacher(entry: Omit<PublishedTeacher, "publishedAt">): void {
  const list = readAll().filter((p) => p.profile.id !== entry.profile.id);
  list.push({ ...entry, publishedAt: Date.now() });
  writeAll(list);
}

/** 下架一位老师。 */
export function unpublishTeacher(id: string): void {
  writeAll(readAll().filter((p) => p.profile.id !== id));
}

/** 清空所有运行期发布的老师（演示重置用；内置老师不受影响）。 */
export function resetPublishedTeachers(): void {
  writeAll([]);
}
