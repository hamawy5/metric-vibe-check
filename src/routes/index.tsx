import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Flame,
  CalendarClock,
  Sparkles,
  TrendingUp,
  BookOpen,
  Trophy,
  LogIn,
} from "lucide-react";
import { StreamSelectorModal } from "@/components/StreamSelectorModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { clearStream, useStream } from "@/lib/stream";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — MatricPulse AI" },
      { name: "description", content: "Your daily study pulse, streak, and exam countdown." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const examDate = new Date(new Date().getFullYear(), 10, 1);
  if (examDate < new Date()) examDate.setFullYear(examDate.getFullYear() + 1);
  const daysLeft = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const stream = useStream();
  const [showStreamModal, setShowStreamModal] = useState(false);

  const simulateFreshLogin = () => {
    clearStream();
    setShowStreamModal(true);
  };

  return (
    <div className="px-5 pt-12">
      <ThemeToggle />

      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Hey,{" "}
            <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
              Scholar
            </span>
          </h1>
          {stream ? (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-primary">
              {stream === "natural" ? "Natural Science" : "Social Science"} Stream
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/leaderboard"
            aria-label="National Leaderboard"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200/80 bg-card text-amber-500 shadow-sm transition hover:border-amber-400/60 dark:border-white/10 dark:text-amber-300"
          >
            <Trophy className="h-5 w-5" />
          </Link>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </header>

      {/* Dev: simulate fresh login */}
      <button
        type="button"
        onClick={simulateFreshLogin}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-white/20 bg-card/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        <LogIn className="h-3.5 w-3.5" />
        [Simulate Fresh Login]
      </button>

      {/* Streak */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-white/5 bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Study streak
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight">7</span>
              <span className="text-base font-semibold text-muted-foreground">Days</span>
              <Flame className="h-6 w-6 text-orange-400" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Keep the fire burning — 30 min today.
            </p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-2 rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]"
                style={{ opacity: 0.4 + i * 0.085 }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Countdown */}
      <section className="mt-4 rounded-3xl border border-white/5 bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              National Exam Countdown
            </p>
            <p className="mt-1 text-2xl font-bold">
              {daysLeft}{" "}
              <span className="text-base font-medium text-muted-foreground">days left</span>
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-[image:var(--gradient-primary)]"
            style={{ width: `${Math.max(5, 100 - (daysLeft / 365) * 100)}%` }}
          />
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Continue</h2>
        <div className="grid grid-cols-2 gap-3">
          <ActionCard icon={BookOpen} label="Resume Grade 12" sub="Functions · Unit 3" />
          <ActionCard icon={TrendingUp} label="Weak topics" sub="3 to review" />
        </div>
      </section>

      <StreamSelectorModal open={showStreamModal} onClose={() => setShowStreamModal(false)} />
    </div>
  );
}

function ActionCard({
  icon: Icon,
  label,
  sub,
}: {
  icon: typeof Flame;
  label: string;
  sub: string;
}) {
  return (
    <button className="group rounded-2xl border border-white/5 bg-card p-4 text-left transition hover:border-primary/40">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </button>
  );
}
