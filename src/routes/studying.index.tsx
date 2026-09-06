import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studying/")({
  head: () => ({
    meta: [
      { title: "Studying — MatricPulse AI" },
      { name: "description", content: "Pick your grade to begin." },
    ],
  }),
  component: GradesPage,
});

const GRADES = [
  { grade: 9, color: "from-sky-400 to-cyan-300", tag: "Foundation" },
  { grade: 10, color: "from-emerald-400 to-teal-300", tag: "Building blocks" },
  { grade: 11, color: "from-amber-400 to-orange-300", tag: "Deep dive" },
  { grade: 12, color: "from-fuchsia-400 to-violet-300", tag: "Matric year" },
];

function GradesPage() {
  return (
    <div className="px-5 pt-12 pb-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Curriculum</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Choose your grade</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap a grade to continue.</p>
      </header>

      <div className="mt-6 space-y-4">
        {GRADES.map(({ grade, color, tag }) => (
          <Link
            key={grade}
            to="/studying/$grade"
            params={{ grade: String(grade) }}
            className="group flex items-center gap-4 rounded-3xl border border-white/5 bg-card p-5 transition active:scale-[0.98]"
          >
            <div
              className={cn(
                "grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-background shadow-lg",
                color,
              )}
            >
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-extrabold tracking-tight">Grade {grade}</p>
              <p className="text-xs text-muted-foreground">{tag}</p>
            </div>
            <ChevronRight className="h-6 w-6 text-muted-foreground transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
