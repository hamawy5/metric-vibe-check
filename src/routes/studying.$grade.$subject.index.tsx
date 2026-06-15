import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Circle, BookMarked, Rocket, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/studying/$grade/$subject/")({
  head: ({ params }) => ({
    meta: [
      { title: `Grade ${params.grade} · ${params.subject} — MatricPulse AI` },
    ],
  }),
  component: UnitsPage,
});

const PHYSICS_UNITS = [
  {
    title: "Thermodynamics",
    subunits: [
      { label: "Thermal Equilibrium and Temperature", status: "completed" as const },
      { label: "Heat, Work, and the First Law of Thermodynamics", status: "not-started" as const },
    ],
  },
  {
    title: "Oscillations and Waves",
    subunits: [
      { label: "Simple Harmonic Motion", status: "not-started" as const },
      { label: "Wave Motion and Sound", status: "not-started" as const },
    ],
  },
];

const GENERIC_UNITS = [
  {
    title: "Foundations & Core Concepts",
    subunits: [
      { label: "Key definitions", status: "completed" as const },
      { label: "Worked examples", status: "not-started" as const },
      { label: "Practice set A", status: "not-started" as const },
    ],
  },
  {
    title: "Applied Problem Solving",
    subunits: [
      { label: "Multi-step problems", status: "not-started" as const },
      { label: "Real-world contexts", status: "not-started" as const },
      { label: "Practice set B", status: "not-started" as const },
    ],
  },
  {
    title: "Advanced Techniques",
    subunits: [
      { label: "Edge cases", status: "not-started" as const },
      { label: "Proofs & reasoning", status: "not-started" as const },
      { label: "Practice set C", status: "not-started" as const },
    ],
  },
  {
    title: "Exam Preparation",
    subunits: [
      { label: "Past paper walkthrough", status: "not-started" as const },
      { label: "Timed drills", status: "not-started" as const },
      { label: "Mistake review", status: "not-started" as const },
    ],
  },
];

function getUnits(subject: string) {
  return subject === "physics" ? PHYSICS_UNITS : GENERIC_UNITS;
}

function prettySubject(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function UnitsPage() {
  const { grade, subject } = Route.useParams();
  const units = getUnits(subject);
  const [openUnit, setOpenUnit] = useState("unit-0");

  return (
    <div className="px-5 pt-12 pb-8">
      <Link
        to="/studying/$grade"
        params={{ grade }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ← Back to Subjects
      </Link>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Grade {grade} · Curriculum
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{prettySubject(subject)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {units.length} units · structured for matric mastery
        </p>
      </header>

      <div className="mt-6 space-y-3">
        {units.map((unit, i) => (
          <section
            key={unit.title}
            className="overflow-hidden rounded-3xl border border-white/5 bg-card px-0 transition data-[state=open]:border-white/10"
            data-state={openUnit === `unit-${i}` ? "open" : "closed"}
          >
            <button
              type="button"
              aria-expanded={openUnit === `unit-${i}`}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              onClick={() => setOpenUnit(openUnit === `unit-${i}` ? "" : `unit-${i}`)}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
                  <BookMarked className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    Unit {i + 1} · {unit.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {unit.subunits.length} subunits
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  openUnit === `unit-${i}` ? "rotate-180" : ""
                }`}
              />
            </button>

            {openUnit === `unit-${i}` ? (
              <div className="border-t border-white/5 pb-3 pt-0">
                <div className="space-y-2 p-3 pt-2">
                {unit.subunits.map((sub, j) => (
                  <div
                    key={sub.label}
                    className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-3"
                  >
                    {sub.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{sub.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {sub.status === "completed" ? "Completed" : "Not started"}
                      </p>
                    </div>
                    <span className="rounded-full bg-background/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {i + 1}.{j + 1}
                    </span>
                  </div>
                ))}
                <Link
                  to="/studying/$grade/$subject/quiz/$unit"
                  params={{ grade, subject, unit: String(i + 1) }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow px-5 py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.99]"
                >
                  <Rocket className="h-4 w-4" />
                  🚀 Launch Unit {i + 1} Mastery Quiz
                </Link>
                </div>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
