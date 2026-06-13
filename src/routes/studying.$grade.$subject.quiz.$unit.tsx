import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, X, Sparkles, Loader2 } from "lucide-react";
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

const FALLBACK_OPTIONS = ["Newton", "Jule", "Ampir", "Columb"];
const CORRECT = "Newton";

function QuizPage() {
  const { grade, subject, unit } = Route.useParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("questions" as never)
        .select("id, question_text, options, correct_answer, explanation")
        .eq("subject", subject.charAt(0).toUpperCase() + subject.slice(1))
        .eq("grade", grade)
        .eq("unit", unit)
        .limit(1)
        .maybeSingle();
      if (!active) return;
      if (error) setError(error.message);
      else if (data) setQuestion(data as unknown as Question);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [subject, grade, unit]);

  const options =
    question?.options && Array.isArray(question.options) && question.options.length === 4
      ? question.options
      : FALLBACK_OPTIONS;
  const correct = question?.correct_answer ?? CORRECT;
  const answered = selected !== null;

  return (
    <div className="min-h-dvh bg-background px-5 pt-12 pb-12">
      <Link
        to="/studying/$grade/$subject"
        params={{ grade, subject }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ← Close Quiz
      </Link>

      <header className="mt-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Grade {grade} · {subject.charAt(0).toUpperCase() + subject.slice(1)} · Unit {unit}
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
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-white/5 bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Question 1
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed">
              {question?.question_text ??
                "Who is credited with formulating the three laws of motion?"}
            </p>
          </section>

          <div className="mt-5 space-y-3">
            {options.map((opt) => {
              const isCorrect = opt === correct;
              const isSelected = opt === selected;
              let cls =
                "border-white/10 bg-card hover:border-white/20 hover:bg-card/80";
              if (answered) {
                if (isCorrect) {
                  cls =
                    "border-emerald-500/50 bg-emerald-500/15 text-emerald-300";
                } else if (isSelected) {
                  cls = "border-red-500/50 bg-red-500/15 text-red-300";
                } else {
                  cls = "border-white/5 bg-card/50 text-muted-foreground";
                }
              }
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={answered}
                  onClick={() => setSelected(opt)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition active:scale-[0.99] disabled:cursor-default ${cls}`}
                >
                  <span>{opt}</span>
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
            <section className="mt-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-wider">
                  Explanation
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                {question?.explanation ?? "No explanation available."}
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
