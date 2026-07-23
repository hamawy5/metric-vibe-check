import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookMarked, Rocket, ChevronDown, Circle, Inbox } from "lucide-react";
import { fetchSubUnits, type UnitGroup } from "@/integrations/external-questions/client";

export const Route = createFileRoute("/studying/$grade/$subject/")({
  head: ({ params }) => ({
    meta: [
      { title: `Grade ${params.grade} · ${params.subject} — MatricPulse AI` },
    ],
  }),
  component: UnitsPage,
});

function prettySubject(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function UnitsPage() {
  const { grade, subject } = Route.useParams();
  const [units, setUnits] = useState<UnitGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openUnit, setOpenUnit] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setUnits(null);
    setError(null);
    fetchSubUnits(grade, subject)
      .then((data) => {
        if (cancelled) return;
        setUnits(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load curriculum");
      });
    return () => {
      cancelled = true;
    };
  }, [grade, subject]);

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
          {units ? `${units.length} unit${units.length === 1 ? "" : "s"} · structured for matric mastery` : "Loading curriculum…"}
        </p>
      </header>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {!units && !error ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl border border-white/5 bg-card" />
          ))}
        </div>
      ) : null}

      {units && units.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-card p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-bold">Content coming soon</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We're still preparing {prettySubject(subject)} for Grade {grade}. Check back shortly.
          </p>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {units?.map((unit, i) => {
          const open = openUnit === `unit-${i}`;
          return (
            <section
              key={unit.unit_number}
              className="overflow-hidden rounded-3xl border border-white/5 bg-card px-0 transition data-[state=open]:border-white/10"
              data-state={open ? "open" : "closed"}
            >
              <button
                type="button"
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                onClick={() => setOpenUnit(open ? "" : `unit-${i}`)}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
                    <BookMarked className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      Unit {unit.unit_number} · {unit.unit_title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {unit.subunits.length} subunits
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open ? (
                <div className="border-t border-white/5 pb-3 pt-0">
                  <div className="space-y-2 p-3 pt-2">
                    {unit.subunits.map((sub) => (
                      <Link
                        key={sub.id}
                        to="/studying/$grade/$subject/reading/$unit/$sub"
                        params={{
                          grade,
                          subject,
                          unit: unit.unit_number,
                          sub: sub.subunit_code.split(".").pop() ?? sub.subunit_code,
                        }}
                        className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-3 transition hover:bg-secondary active:scale-[0.99]"
                      >
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{sub.title}</p>
                          <p className="text-[11px] text-muted-foreground">Open reading</p>
                        </div>
                        <span className="rounded-full bg-background/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                          {sub.subunit_code}
                        </span>
                      </Link>
                    ))}
                    <Link
                      to="/studying/$grade/$subject/quiz/$unit"
                      params={{ grade, subject, unit: unit.unit_number }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow px-5 py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.99]"
                    >
                      <Rocket className="h-4 w-4" />
                      🚀 Launch Unit {unit.unit_number} Mastery Quiz
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
