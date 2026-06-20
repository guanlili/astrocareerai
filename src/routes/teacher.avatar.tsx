import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// 旧路由「分身管理」已并入「分身工作室」（保外链）。挂载即跳转。
export const Route = createFileRoute("/teacher/avatar")({
  head: () => ({ meta: [{ title: "分身管理 · 面镜 老师" }] }),
  component: AvatarRedirect,
});

function AvatarRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/teacher/studio" });
  }, [navigate]);
  return null;
}
