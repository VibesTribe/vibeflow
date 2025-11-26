export function resolveDashboardPath(targetPath: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalized = targetPath.startsWith("/") ? targetPath.slice(1) : targetPath;
  if (base === "/") {
    return `/${normalized}`;
  }
  return `${base.replace(/\/$/, "")}/${normalized}`;
}
