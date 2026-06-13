import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, GraduationCap, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studying")({
  head: () => ({
    meta: [
      { title: "Studying — MatricPulse AI" },
      { name: "description", content: "Curriculum by grade with expandable units." },
    ],
  }),
  component: StudyingPage,
});

const GRADES = [
  {
    grade: 9,
    color: "from-sky-400 to-cyan-300",
    units: ["Numbers & Patterns", "Algebra Basics", "Geometry I", "Statistics"],
  },
  {
    grade: 10,
    color: "from-emerald-400 to-teal-300",
    units: ["Functions", "Trigonometry I", "Analytical Geometry", "Probability"],
  },
  {
    grade: 11,
    color: "from-amber-400 to-orange-300",
    units: ["Quadratics", "Sequences & Series", "Trigonometry II", "Financial Math"],
  },
  {
    grade: 12,
    color: "from-fuchsia-400 to-violet-300",
    units: ["Calculus", "Functions & Inverses", "Statistics II", "Exam Prep"],
  },
];

function StudyingPage() {
  const [open, setOpen] = useState<number | null>(12);

  return (
    <div className="px-5 pt-12">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Curriculum</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Studying</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a grade to explore its units.</p>
      </header>

      <div className="mt-6 space-y-3">
        {GRADES.map(({ grade, color, units }) => {
          const isOpen = open === grade;
          return (
            <div
              key={grade}
              className="overflow-hidden rounded-3xl border border-white/5 bg-card transition"
            >
              <button
                onClick={() => setOpen(isOpen ? null : grade)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <div
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-background shadow-lg",
                    color,
                  )}
                >
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold">Grade {grade}</p>
                  <p className="text-xs text-muted-foreground">{units.length} units</p>
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
                  {units.map((unit, i) => (
                    <div
                      key={unit}
                      className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-3"
                    >
                      {i === 0 ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{unit}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {i === 0 ? "Completed" : "Not started"}
                        </p>
                      </div>
                      <span className="rounded-full bg-background/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        Unit {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
