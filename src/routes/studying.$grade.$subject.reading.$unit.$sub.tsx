import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Rocket, StickyNote, X, BookOpen } from "lucide-react";

export const Route = createFileRoute("/studying/$grade/$subject/reading/$unit/$sub")({
  head: ({ params }) => ({
    meta: [
      { title: `Unit ${params.unit}.${params.sub} Reading — MatricPulse AI` },
    ],
  }),
  component: ReadingPage,
});

function ReadingPage() {
  const { grade, subject, unit, sub } = Route.useParams();
  const [summaryOpen, setSummaryOpen] = useState(false);

  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);

  return (
    <div className="relative min-h-dvh bg-background">
      {/* Floating Summary tab */}
      <button
        type="button"
        onClick={() => setSummaryOpen(true)}
        className="fixed right-4 top-12 z-30 flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary shadow-lg backdrop-blur transition active:scale-95"
      >
        <StickyNote className="h-3.5 w-3.5" />
        Summary
      </button>

      <div className="px-5 pt-12 pb-32">
        <Link
          to="/studying/$grade/$subject"
          params={{ grade, subject }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Units
        </Link>

        <header className="mt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Grade {grade} · {subjectLabel} · Unit {unit}.{sub}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Reading Material</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Work through the textbook section below, then launch the quiz.
          </p>
        </header>

        <article className="prose prose-invert mt-6 max-w-none space-y-5 text-[15px] leading-relaxed text-foreground/90">
          <section className="rounded-3xl border border-white/5 bg-card p-5">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              <p className="text-[11px] font-bold uppercase tracking-wider">
                Introduction
              </p>
            </div>
            <p className="mt-3">
              This section introduces the core ideas of Subunit {unit}.{sub}. Read
              carefully — the worked examples build directly on these foundations
              and will appear in your Unit Mastery Quiz.
            </p>
          </section>

          <section className="rounded-3xl border border-white/5 bg-card p-5">
            <h2 className="text-base font-bold">Key Concepts</h2>
            <p className="mt-2">
              The textbook content for this subunit will appear here. Expect
              definitions, derivations, and worked examples laid out in a clean,
              readable format optimized for matric study sessions.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-foreground/85">
              <li>Definitions and terminology</li>
              <li>Step-by-step derivations</li>
              <li>Worked examples with explanations</li>
              <li>Common pitfalls and exam tips</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-white/5 bg-card p-5">
            <h2 className="text-base font-bold">Practice Application</h2>
            <p className="mt-2">
              Once you've absorbed the material above, tap the button at the
              bottom of this screen to test yourself on the unit's questions
              pulled from past EUEE exams.
            </p>
          </section>
        </article>
      </div>

      {/* Sticky Launch Quiz button */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-background/95 px-5 py-4 backdrop-blur">
        <Link
          to="/studying/$grade/$subject/quiz/$unit"
          params={{ grade, subject, unit }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow px-5 py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.99]"
        >
          <Rocket className="h-4 w-4" />
          🚀 Launch Unit Mastery Quiz
        </Link>
      </div>

      {/* Summary slide-over */}
      {summaryOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSummaryOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 flex h-dvh w-[88%] max-w-sm flex-col border-l border-white/10 bg-zinc-950 shadow-2xl animate-in slide-in-from-right duration-200">
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-primary">
                <StickyNote className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-wider">
                  Cheat Sheet · {unit}.{sub}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSummaryOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-muted-foreground transition hover:text-foreground"
                aria-label="Close summary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-foreground/90">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Key Points
              </h3>
              <ul className="mt-3 space-y-2.5 list-disc pl-5">
                <li>Quick bullet recaps of the section's main ideas.</li>
                <li>Use these as a final-minute review before the quiz.</li>
                <li>Definitions are kept short and exam-focused.</li>
              </ul>

              <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Key Formulas
              </h3>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[13px]">
                  formula = placeholder · value
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[13px]">
                  Δx = x₂ − x₁
                </div>
              </div>

              <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Exam Tips
              </h3>
              <ul className="mt-3 space-y-2.5 list-disc pl-5">
                <li>Read every option before selecting an answer.</li>
                <li>Watch units — most distractors hinge on them.</li>
              </ul>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
