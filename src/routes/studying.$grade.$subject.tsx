import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronDown, CheckCircle2, Circle, Sparkles, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studying/$grade/$subject")({
  head: ({ params }) => ({
    meta: [
      { title: `Grade ${params.grade} · ${params.subject} — MatricPulse AI` },
    ],
  }),
  component: UnitsPage,
});

const UNITS = [
  {
    title: "Foundations & Core Concepts",
    subunits: ["Key definitions", "Worked examples", "Practice set A"],
  },
  {
    title: "Applied Problem Solving",
    subunits: ["Multi-step problems", "Real-world contexts", "Practice set B"],
  },
  {
    title: "Advanced Techniques",
    subunits: ["Edge cases", "Proofs & reasoning", "Practice set C"],
  },
  {
    title: "Exam Preparation",
    subunits: ["Past paper walkthrough", "Timed drills", "Mistake review"],
  },
];

function prettySubject(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function UnitsPage() {
  const { grade, subject } = Route.useParams();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="px-5 pt-12 pb-8">
      <Link
        to="/studying/$grade"
        params={{ grade }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to subjects
      </Link>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Grade {grade} · Curriculum
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{prettySubject(subject)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {UNITS.length} units · structured for matric mastery
        </p>
      </header>

      <div className="mt-6 space-y-3">
        {UNITS.map((unit, i) => {
          const isOpen = open === i;
          return (
            <div
              key={unit.title}
              className="overflow-hidden rounded-3xl border border-white/5 bg-card"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
                  <BookMarked className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    Unit {i + 1} · {unit.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {unit.subunits.length} subunits
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180 text-foreground",
                  )}
                />
              </button>

              {isOpen && (
                <div className="space-y-2 border-t border-white/5 p-3">
                  {unit.subunits.map((sub, j) => (
                    <div
                      key={sub}
                      className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-3"
                    >
                      {j === 0 ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{sub}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {j === 0 ? "Completed" : "Not started"}
                        </p>
                      </div>
                      <span className="rounded-full bg-background/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        {i + 1}.{j + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow px-5 py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.99]">
        <Sparkles className="h-4 w-4" />
        Start Unit Mastery Quiz
      </button>
    </div>
  );
}
