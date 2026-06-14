import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, Trophy, Timer, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStream } from "@/lib/stream";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "National Leaderboard — MatricPulse AI" },
      { name: "description", content: "See where you stand in the monthly national mock exam ranking." },
    ],
  }),
  component: LeaderboardPage,
});

type Row = {
  rank: number;
  name: string;
  city: string;
  pct: number;
  correct: number;
  total: number;
  time: string;
};

const TOP_ROWS: Row[] = [
  { rank: 1, name: "Yonas M.", city: "Addis Ababa", pct: 96, correct: 48, total: 50, time: "42m 10s" },
  { rank: 2, name: "Helina K.", city: "Hawassa", pct: 94, correct: 47, total: 50, time: "38m 15s" },
  { rank: 3, name: "Bekele Z.", city: "Bahir Dar", pct: 94, correct: 47, total: 50, time: "45m 02s" },
  { rank: 4, name: "Selamawit A.", city: "Mekelle", pct: 92, correct: 46, total: 50, time: "44m 51s" },
  { rank: 5, name: "Dawit T.", city: "Adama", pct: 92, correct: 46, total: 50, time: "47m 30s" },
  { rank: 6, name: "Mahlet G.", city: "Dire Dawa", pct: 90, correct: 45, total: 50, time: "46m 12s" },
  { rank: 7, name: "Abel H.", city: "Gondar", pct: 90, correct: 45, total: 50, time: "49m 04s" },
  { rank: 8, name: "Lidiya N.", city: "Jimma", pct: 88, correct: 44, total: 50, time: "50m 18s" },
];

const NEAR_USER: Row[] = [
  { rank: 140, name: "Eyob B.", city: "Addis Ababa", pct: 78, correct: 39, total: 50, time: "70m 11s" },
  { rank: 141, name: "Sara M.", city: "Hawassa", pct: 77, correct: 39, total: 50, time: "72m 40s" },
];

const USER_ROW: Row = {
  rank: 142,
  name: "YOU",
  city: "Addis Ababa",
  pct: 76,
  correct: 38,
  total: 50,
  time: "75m 22s",
};

const BELOW_USER: Row[] = [
  { rank: 143, name: "Tigist W.", city: "Adama", pct: 75, correct: 38, total: 50, time: "78m 02s" },
  { rank: 144, name: "Nahom F.", city: "Mekelle", pct: 74, correct: 37, total: 50, time: "76m 49s" },
];

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return { d, h, m };
}

function LeaderboardPage() {
  const stream = useStream();
  const [selectedStream, setSelectedStream] = useState<"natural" | "social">(stream ?? "natural");
  const [openSelector, setOpenSelector] = useState(false);

  // Closes ~14d 3h 12m from now (approximate target shown in spec)
  const target = new Date(Date.now() + 14 * 86_400_000 + 3 * 3_600_000 + 12 * 60_000);
  const { d, h, m } = useCountdown(target);

  return (
    <div className="px-5 pt-12 pb-8">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-background shadow-lg">
          <Trophy className="h-5 w-5" />
        </div>
      </div>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-300">National Leaderboard</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">June Mock Exam</h1>
      </header>

      {/* Countdown */}
      <section className="mt-5 overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-300">
          <Timer className="h-4 w-4" /> Closes in
        </div>
        <p className="mt-2 font-mono text-3xl font-black tracking-tight">
          {String(d).padStart(2, "0")}d{" "}
          <span className="text-amber-300">{String(h).padStart(2, "0")}h</span>{" "}
          {String(m).padStart(2, "0")}m
        </p>
      </section>

      {/* Stream selector */}
      <div className="relative mt-4">
        <button
          type="button"
          onClick={() => setOpenSelector((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-card px-4 py-3 text-sm font-semibold"
        >
          <span className="text-muted-foreground">Stream:</span>
          <span className="flex-1 text-left">
            {selectedStream === "natural" ? "Natural Science" : "Social Science"}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition", openSelector && "rotate-180")}
          />
        </button>
        {openSelector ? (
          <div className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-card shadow-xl">
            {(["natural", "social"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSelectedStream(s);
                  setOpenSelector(false);
                }}
                className={cn(
                  "block w-full px-4 py-3 text-left text-sm transition hover:bg-secondary",
                  selectedStream === s && "bg-secondary/60 font-semibold",
                )}
              >
                {s === "natural" ? "Natural Science" : "Social Science"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Top rows */}
      <section className="mt-5 space-y-2">
        {TOP_ROWS.map((r) => (
          <LeaderRow key={r.rank} row={r} />
        ))}
      </section>

      {/* Divider */}
      <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="h-px flex-1 bg-white/10" />
        Your position
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <section className="space-y-2">
        {NEAR_USER.map((r) => (
          <LeaderRow key={r.rank} row={r} />
        ))}
        <LeaderRow row={USER_ROW} isUser />
        {BELOW_USER.map((r) => (
          <LeaderRow key={r.rank} row={r} />
        ))}
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Ranks update hourly during the active mock window.
      </p>
    </div>
  );
}

function rankEmoji(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function LeaderRow({ row, isUser = false }: { row: Row; isUser?: boolean }) {
  const emoji = rankEmoji(row.rank);
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-3 transition",
        isUser
          ? "border-primary/50 bg-[image:var(--gradient-primary)]/10 bg-primary/10 shadow-[var(--shadow-glow)]"
          : "border-white/5 bg-card",
        row.rank <= 3 && "border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-transparent",
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black",
          isUser
            ? "bg-primary text-primary-foreground"
            : row.rank <= 3
              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-background"
              : "bg-secondary text-foreground",
        )}
      >
        {emoji ?? (isUser ? "👤" : row.rank)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-bold">
            {isUser ? "YOU" : row.name}
          </p>
          <span className="text-[10px] font-semibold text-muted-foreground">#{row.rank}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {row.city}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-0.5">
            <Timer className="h-3 w-3" />
            {row.time}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className={cn("text-base font-black", isUser && "text-primary-foreground")}>
          {row.pct}%
        </p>
        <p className="text-[10px] text-muted-foreground">
          {row.correct}/{row.total}
        </p>
      </div>
    </div>
  );
}
