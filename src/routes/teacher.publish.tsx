import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// 旧路由「分身上架」已并入「分身工作室」（保外链）。挂载即跳转。
export const Route = createFileRoute("/teacher/publish")({
  head: () => ({ meta: [{ title: "分身上架 · 老师配置平台 · 面镜" }] }),
  component: PublishRedirect,
});

function PublishRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/teacher/studio" });
  }, [navigate]);
  return null;
}
