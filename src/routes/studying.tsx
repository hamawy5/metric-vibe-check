import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studying")({
  head: () => ({
    meta: [
      { title: "Studying — MatricPulse AI" },
      { name: "description", content: "Pick your grade to begin." },
    ],
  }),
  component: StudyingPage,
});

const GRADES = [
  { grade: 9, color: "from-sky-400 to-cyan-300", tag: "Foundation" },
  { grade: 10, color: "from-emerald-400 to-teal-300", tag: "Building blocks" },
  { grade: 11, color: "from-amber-400 to-orange-300", tag: "Deep dive" },
  { grade: 12, color: "from-fuchsia-400 to-violet-300", tag: "Matric year" },
];

function StudyingPage() {
  return (
    <div className="px-5 pt-12">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Curriculum</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Choose your grade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a grade to see its subjects.
        </p>
      </header>

      <div className="mt-6 space-y-3">
        {GRADES.map(({ grade, color, tag }) => (
          <Link
            key={grade}
            to="/studying/$grade"
            params={{ grade: String(grade) }}
            className="flex items-center gap-4 rounded-3xl border border-white/5 bg-card p-4 transition active:scale-[0.99]"
          >
            <div
              className={cn(
                "grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-background shadow-lg",
                color,
              )}
            >
              <GraduationCap className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold">Grade {grade}</p>
              <p className="text-xs text-muted-foreground">{tag}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
