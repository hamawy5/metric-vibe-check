import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Home, BookOpen, ClipboardCheck, Sparkles } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a1530" },
      { title: "MatricPulse AI — Ace Your National Exam" },
      {
        name: "description",
        content:
          "MatricPulse AI: study smarter for Grades 9–12 with mock national exams, an AI tutor, and daily streaks.",
      },
      { property: "og:title", content: "MatricPulse AI" },
      { property: "og:description", content: "Your AI-powered companion for national exams." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t?t==='dark':true){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}`,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">

        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/studying", label: "Study", icon: BookOpen },
  { to: "/exam", label: "Exam", icon: ClipboardCheck },
  { to: "/lounge", label: "AI", icon: Sparkles },
] as const;

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const focusMode =
    pathname.startsWith("/lounge") ||
    pathname.includes("/quiz/") ||
    pathname.includes("/reading/");
  if (focusMode) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/85 backdrop-blur-md pb-[env(safe-area-inset-bottom)] dark:border-white/5 dark:bg-background/80">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "text-slate-500 group-hover:text-slate-900 dark:text-muted-foreground dark:group-hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide transition-colors",
                  active ? "text-foreground" : "text-slate-500 dark:text-muted-foreground",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const focusMode =
    pathname.startsWith("/lounge") ||
    pathname.includes("/quiz/") ||
    pathname.includes("/reading/");
  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative mx-auto min-h-screen max-w-md bg-background">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-72 opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(60% 60% at 30% 0%, oklch(0.72 0.18 295 / 0.35), transparent 70%), radial-gradient(60% 60% at 80% 10%, oklch(0.78 0.15 200 / 0.25), transparent 70%)",
          }}
        />
        <main className={cn("relative z-10", focusMode ? "pb-0" : "pb-28")}>
          <Outlet />
        </main>
        <BottomNav />
        <ThemeToggle />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
