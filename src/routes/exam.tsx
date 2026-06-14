import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Clock, Target, Trophy, Play } from "lucide-react";
import { StreamGate } from "@/components/StreamGate";

export const Route = createFileRoute("/exam")({
  head: () => ({
    meta: [
      { title: "Exam Simulator — MatricPulse AI" },
      { name: "description", content: "Take full-length mock national exams under timed conditions." },
    ],
  }),
  component: ExamPage,
});

function ExamPage() {
  return (
    <div className="px-5 pt-12">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mock test</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Exam Simulator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real exam format. Real timing. No surprises on the day.
        </p>
      </header>

      {/* Hero CTA */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-card p-6 shadow-[var(--shadow-glow)]">
        <div
          className="absolute inset-0 -z-10 opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Next session</p>
              <p className="text-lg font-bold">National Mock · Paper 1</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat icon={Clock} label="Duration" value="3h" />
            <Stat icon={Target} label="Questions" value="40" />
            <Stat icon={Trophy} label="Marks" value="150" />
          </div>

          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[image:var(--gradient-primary)] py-4 text-base font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.98]">
            <Play className="h-5 w-5 fill-current" />
            Start Mock Exam
          </button>
        </div>
      </section>

      {/* Past attempts */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent attempts</h2>
        <div className="space-y-2">
          {[
            { name: "Paper 2 — Mock 4", score: "78%", date: "Yesterday" },
            { name: "Paper 1 — Mock 3", score: "65%", date: "3 days ago" },
            { name: "Paper 2 — Mock 2", score: "71%", date: "1 week ago" },
          ].map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-card p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.date}</p>
              </div>
              <span className="rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-bold text-primary-foreground">
                {a.score}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/60 p-3 backdrop-blur">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
