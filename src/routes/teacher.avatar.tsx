import { createFileRoute, redirect } from "@tanstack/react-router";

// 旧路由「分身管理」已并入「分身工作室」（保外链）。
// beforeLoad 里 throw redirect：SSR 服务端跳转，无客户端白屏闪烁。
export const Route = createFileRoute("/teacher/avatar")({
  head: () => ({ meta: [{ title: "分身管理 · 面镜 老师" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/teacher/studio", replace: true });
  },
});
