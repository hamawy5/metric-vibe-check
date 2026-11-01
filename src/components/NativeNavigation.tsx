import { useEffect, useRef, type ReactNode, type TouchEvent } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { getBackDestination, getSwipeDestination, showMainTabs } from "@/lib/navigation";

export function NativeBackHandler() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentPath = useRef(pathname);
  currentPath.current = pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let navigating = false;
    let removeListener: (() => Promise<void>) | undefined;
    void import("@capacitor/app").then(async ({ App }) => {
      if (disposed) return;
      const listener = await App.addListener("backButton", async () => {
        if (navigating || disposed) return;
        navigating = true;
        try {
          const destination = getBackDestination(currentPath.current);
          if (destination) await navigate({ ...destination, replace: true });
          else await App.exitApp();
        } finally {
          navigating = false;
        }
      });
      if (disposed) { await listener.remove(); return; }
      removeListener = () => listener.remove();
    }).catch((error) => console.error("[native-back]", error));
    return () => {
      disposed = true;
      void removeListener?.();
    };
  }, [navigate]);

  return null;
}

export function MainTabSwipe({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    start.current = null;
    if (!touch || event.touches.length !== 1 || !showMainTabs(pathname)) return;
    if (document.querySelector('[role="dialog"], [role="menu"], [data-tab-swipe-block]')) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('button, a, input, textarea, select, svg, canvas, [role="slider"], [data-no-tab-swipe]')) return;
    // Tables, formulas, plots, and horizontal carousels keep their own gestures.
    let element: Element | null = target;
    while (element && element !== event.currentTarget) {
      if (element.scrollWidth > element.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(element).overflowX)) return;
      element = element.parentElement;
    }
    start.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const origin = start.current;
    start.current = null;
    const touch = event.changedTouches[0];
    if (!origin || !touch) return;
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    const destination = getSwipeDestination(pathname, dx, dy);
    if (destination === "/") void navigate({ to: "/" });
    if (destination === "/studying") void navigate({ to: "/studying" });
    if (destination === "/exam") void navigate({ to: "/exam" });
    if (destination === "/lounge") void navigate({ to: "/lounge" });
  };

  return (
    <div className="contents" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { start.current = null; }}>
      {children}
    </div>
  );
}