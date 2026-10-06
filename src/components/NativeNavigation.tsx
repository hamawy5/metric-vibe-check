import { useEffect, useRef, type ReactNode, type TouchEvent } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";

const MAIN_TABS = ["/", "/studying", "/exam", "/lounge"] as const;

function studyParent(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "studying") return null;
  if (parts.includes("reading") || parts.includes("quiz")) {
    return parts.length >= 3 ? `/studying/${parts[1]}/${parts[2]}` : "/studying";
  }
  if (parts.length >= 3) return `/studying/${parts[1]}`;
  if (parts.length === 2) return "/studying";
  return "/";
}

export function NativeBackHandler() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener: (() => Promise<void>) | undefined;
    void import("@capacitor/app").then(async ({ App }) => {
      const listener = await App.addListener("backButton", async () => {
        const parent = studyParent(pathname);
        if (parent) {
          await navigate({ to: parent });
          return;
        }
        if (pathname !== "/") {
          await navigate({ to: "/" });
          return;
        }
        await App.exitApp();
      });
      removeListener = () => listener.remove();
    });
    return () => {
      void removeListener?.();
    };
  }, [navigate, pathname]);

  return null;
}

export function MainTabSwipe({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const start = useRef<{ x: number; y: number } | null>(null);
  const currentIndex = MAIN_TABS.indexOf(pathname as (typeof MAIN_TABS)[number]);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch || currentIndex < 0) return;
    start.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const origin = start.current;
    start.current = null;
    const touch = event.changedTouches[0];
    if (!origin || !touch || currentIndex < 0) return;
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) <= Math.abs(dy) * 1.35) return;
    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    const destination = MAIN_TABS[nextIndex];
    if (destination) void navigate({ to: destination });
  };

  return (
    <div className="contents" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  );
}