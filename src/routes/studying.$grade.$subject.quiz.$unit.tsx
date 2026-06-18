import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Loader2,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  ChevronUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  externalQuestions,
  parseChoices,
  type ExternalQuestion,
} from "@/integrations/external-questions/client";
import { deepExplain } from "@/lib/api/deep-explain.functions";

export const Route = createFileRoute("/studying/$grade/$subject/quiz/$unit")({
  head: ({ params }) => ({
    meta: [{ title: `Unit ${params.unit} Quiz — MatricPulse AI` }],
  }),
  component: QuizPage,
});

type Question = {
  id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
};

const LETTERS = ["A", "B", "C", "D"] as const;

type DebugInfo = {
  query: { table: string; subject: string; grade: string; unit: string };
  rowCount: number;
  error: string | null;
  ms: number;
};

function QuizPage() {
  const { grade, subject, unit } = Route.useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    setQuestions([]);
    setIndex(0);
    const startedAt = performance.now();
    (async () => {
      const { data, error } = await externalQuestions
        .from("Questions")
        .select("id, question_text, choices, correct_answer, explanation, subject, grade, unit, stream, exam_year")
        .ilike("subject", subjectLabel)
        .eq("grade", String(grade))
        .eq("unit", String(unit));
      if (!active) return;
      const ms = Math.round(performance.now() - startedAt);
      setDebug({
        query: { table: "Questions", subject: subjectLabel, grade: String(grade), unit: String(unit) },
        rowCount: data?.length ?? 0,
        error: error?.message ?? null,
        ms,
      });
      if (error) {
        console.error("[quiz] supabase error:", error);
        setError(error.message);
      } else {
        const rows = (data ?? []) as ExternalQuestion[];
        setQuestions(
          rows.map((r) => ({
            id: r.id,
            question_text: r.question_text,
            options: parseChoices(r.choices),
            correct_answer: r.correct_answer,
            explanation: r.explanation,
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [subjectLabel, grade, unit]);

  const question = useMemo(() => questions[index] ?? null, [questions, index]);

  const options = Array.isArray(question?.options) ? question!.options : [];
  const correct = question?.correct_answer ?? "";
  const answered = selected !== null;

  return (
    <div className="min-h-dvh bg-background px-5 pt-12 pb-12">
      <Link
        to="/studying/$grade/$subject"
        params={{ grade, subject }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Close Quiz
      </Link>

      <header className="mt-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Grade {grade} · {subjectLabel} · Unit {unit}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Unit Mastery Quiz</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowDebug((s) => !s)}
          className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300"
        >
          {showDebug ? "Hide" : "Debug"}
        </button>
      </header>

      {showDebug && debug ? (
        <pre className="mt-4 overflow-auto rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-[10px] leading-relaxed text-amber-200">
{JSON.stringify(debug, null, 2)}
        </pre>
      ) : null}


      {loading ? (
        <div className="mt-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : !question ? (
        <div className="mt-10 rounded-3xl border border-white/10 bg-card p-6 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No questions yet for this unit.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check back soon — content is being added.
          </p>
        </div>
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-white/5 bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Question {index + 1} of {questions.length}
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed">
              {question.question_text}
            </p>
          </section>

          <div className="mt-5 space-y-3">
            {options.map((opt, i) => {
              const isCorrect = opt === correct;
              const isSelected = opt === selected;
              let cls =
                "border-white/10 bg-card hover:border-white/20 hover:bg-card/80";
              let letterCls = "bg-white/10 text-foreground";
              if (answered) {
                if (isCorrect) {
                  cls = "border-emerald-500/60 bg-emerald-500/15 text-emerald-200";
                  letterCls = "bg-emerald-500/30 text-emerald-100";
                } else if (isSelected) {
                  cls = "border-red-500/60 bg-red-500/15 text-red-200";
                  letterCls = "bg-red-500/30 text-red-100";
                } else {
                  cls = "border-white/5 bg-card/50 text-muted-foreground";
                  letterCls = "bg-white/5 text-muted-foreground";
                }
              }
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={answered}
                  onClick={() => setSelected(opt)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition active:scale-[0.99] disabled:cursor-default ${cls}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${letterCls}`}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {answered && isCorrect ? (
                    <Check className="h-5 w-5 text-emerald-400" />
                  ) : answered && isSelected ? (
                    <X className="h-5 w-5 text-red-400" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {answered ? (
            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-wider">
                  Explanation
                </p>
              </div>
              <p
                className={`mt-3 text-sm font-semibold ${
                  selected === correct ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {selected === correct
                  ? "✓ Correct! Nice work."
                  : `✗ Not quite — the correct answer is "${correct}".`}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                {question.explanation ?? "No explanation available for this question."}
              </p>
              {index < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setIndex((i) => i + 1);
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.99]"
                >
                  Next Question
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <p className="mt-5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  🎉 End of unit · {questions.length} question{questions.length === 1 ? "" : "s"}
                </p>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

