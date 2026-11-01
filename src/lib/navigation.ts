export const MAIN_TABS = ["/", "/studying", "/exam", "/lounge"] as const;
export const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

export function getBackDestination(path: string) {
  const pathname = normalizePath(path);
  const [, grade, subject] = pathname.split("/").filter(Boolean);
  if (pathname.startsWith("/studying/") && grade && subject) {
    if (/\/(reading|quiz)\//.test(pathname)) {
      return { to: "/studying/$grade/$subject", params: { grade, subject } } as const;
    }
    return { to: "/studying/$grade", params: { grade } } as const;
  }
  if (pathname.startsWith("/studying/") && grade) return { to: "/studying" } as const;
  return pathname === "/" ? null : { to: "/" } as const;
}

export function showMainTabs(path: string) {
  return MAIN_TABS.some((tab) => tab === normalizePath(path));
}

export function getSwipeDestination(path: string, dx: number, dy: number) {
  const index = MAIN_TABS.findIndex((tab) => tab === normalizePath(path));
  if (index < 0 || Math.abs(dx) < 64 || Math.abs(dx) <= Math.abs(dy) * 1.35) return null;
  return MAIN_TABS[index + (dx < 0 ? 1 : -1)] ?? null;
}