// 关键信息遮蔽工具
//
// 用于在日志 / 状态展示中安全显示密钥等敏感串：只保留头尾少量字符，中间打码，
// 任何场景都不要打印 / 返回完整密钥。

export function maskSecret(
  secret: string | undefined | null,
  opts?: { head?: number; tail?: number },
): string {
  if (!secret) return "(未配置)";
  const head = opts?.head ?? 6;
  const tail = opts?.tail ?? 4;
  if (secret.length <= head + tail) return "*".repeat(Math.max(secret.length, 4));
  return `${secret.slice(0, head)}…****…${secret.slice(-tail)}`;
}
