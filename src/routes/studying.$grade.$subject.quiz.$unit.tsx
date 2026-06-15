import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, X, Sparkles, Loader2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/studying/$grade/$subject/quiz/$unit")({
  head: ({ params }) => ({
    meta: [{ title: `Unit ${params.unit} Quiz — MatricPulse AI` }],
  }),
  component: QuizPage,
});

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
};

const LETTERS = ["A", "B", "C", "D"] as const;

function QuizPage() {
  const { grade, subject, unit } = Route.useParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    setQuestion(null);
    (async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_answer, explanation, subject, grade, unit")
        .ilike("subject", subjectLabel)
        .eq("grade", String(grade))
        .eq("unit", String(unit))
        .limit(1);
      if (!active) return;
      if (error) {
        console.error("[quiz] supabase error:", error);
        setError(error.message);
      } else if (data && data.length > 0) {
        const row = data[0] as { id: string; question_text: string; options: unknown; correct_answer: string; explanation: string | null };
        const opts = Array.isArray(row.options)
          ? (row.options as string[])
          : typeof row.options === "string"
            ? (JSON.parse(row.options) as string[])
            : [];
        setQuestion({
          id: row.id,
          question_text: row.question_text,
          options: opts,
          correct_answer: row.correct_answer,
          explanation: row.explanation,
        });
      } else {
        console.warn("[quiz] no rows for", { subjectLabel, grade, unit });
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [subjectLabel, grade, unit]);

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

      <header className="mt-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Grade {grade} · {subjectLabel} · Unit {unit}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Unit Mastery Quiz</h1>
      </header>

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
              Question 1
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
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
