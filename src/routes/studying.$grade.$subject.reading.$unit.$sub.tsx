import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, StickyNote, X, BookOpen, Sparkles, CheckCircle2, XCircle, RotateCcw, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { fetchSubUnit, type SubUnit } from "@/integrations/external-questions/client";

export const Route = createFileRoute("/studying/$grade/$subject/reading/$unit/$sub")({
  head: ({ params }) => ({
    meta: [
      { title: `Unit ${params.unit}.${params.sub} Reading — MatricPulse AI` },
    ],
  }),
  component: ReadingPage,
});

type ParsedQ = {
  question: string;
  options: { letter: string; text: string }[];
  answer: string;
  explanation: string;
};

function parseQuizQuestions(raw: string | null | undefined): ParsedQ[] {
  if (!raw) return [];
  const blocks = raw.split(/\n\s*(?=Q\d+\s*:)/g).map((b) => b.trim()).filter(Boolean);
  const out: ParsedQ[] = [];
  for (const b of blocks) {
    const qMatch = b.match(/^Q\d+\s*:\s*([\s\S]*?)(?=\n[A-D]\))/);
    const question = qMatch?.[1]?.trim() ?? "";
    const options: { letter: string; text: string }[] = [];
    const optRe = /\n([A-D])\)\s*([\s\S]*?)(?=\n[A-D]\)|\nAnswer\s*:|$)/g;
    let m;
    while ((m = optRe.exec("\n" + b)) !== null) {
      options.push({ letter: m[1], text: m[2].trim() });
    }
    const ans = b.match(/Answer\s*:\s*([A-D])/i)?.[1]?.toUpperCase() ?? "";
    const exp = b.match(/Explanation\s*:\s*([\s\S]*)$/i)?.[1]?.trim() ?? "";
    if (question && options.length >= 2 && ans) {
      out.push({ question, options, answer: ans, explanation: exp });
    }
  }
  return out;
}

function ReadingPage() {
  const { grade, subject, unit, sub } = Route.useParams();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [data, setData] = useState<SubUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);
  const subunitCode = `${unit}.${sub}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setQuizOpen(false);
    fetchSubUnit(grade, subject, subunitCode)
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load reading");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [grade, subject, subunitCode]);

  const summaryBullets = (data?.corner_summary ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);

  const questions = useMemo(() => parseQuizQuestions(data?.quiz_questions), [data?.quiz_questions]);

  return (
    <div className="relative min-h-dvh bg-background">
      <button
        type="button"
        onClick={() => setSummaryOpen(true)}
        className="fixed right-4 top-12 z-30 flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary shadow-lg backdrop-blur transition active:scale-95"
      >
        <StickyNote className="h-3.5 w-3.5" />
        Summary
      </button>

      <div className="px-5 pt-12 pb-10">
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
            Grade {grade} · {subjectLabel} · Unit {subunitCode}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {data?.title ?? (loading ? "Loading…" : "Reading Material")}
          </h1>
          {data?.unit_title ? (
            <p className="mt-1 text-sm text-muted-foreground">Unit {data.unit_number}: {data.unit_title}</p>
          ) : null}
        </header>

        {loading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl border border-white/5 bg-card" />
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        {!loading && !error && !data ? (
          <div className="mt-8 rounded-3xl border border-white/5 bg-card p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="mt-3 text-base font-bold">Content coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reading for {subunitCode} isn't published yet.
            </p>
          </div>
        ) : null}

        {data?.readable_material ? (
          <article className="mt-6 max-w-none rounded-3xl border border-slate-200/70 bg-card p-6 dark:border-white/5">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mt-6 mb-3 border-l-4 border-indigo-500 pl-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-6 mb-2 border-l-4 border-indigo-500 pl-3 text-lg font-bold text-slate-900 dark:text-white">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-6 mb-2 border-l-4 border-indigo-500 pl-3 text-lg font-bold text-slate-900 dark:text-white">{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 className="mt-5 mb-2 border-l-4 border-indigo-400 pl-3 text-base font-bold text-slate-900 dark:text-white">{children}</h4>
                ),
                p: ({ children }) => {
                  const arr = Array.isArray(children) ? children : [children];
                  const first = arr[0] as unknown;
                  const isDefCard =
                    !!first &&
                    typeof first === "object" &&
                    (first as { type?: unknown }).type === "strong";
                  if (isDefCard) {
                    return (
                      <div className="my-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                        {children}
                      </div>
                    );
                  }
                  return (
                    <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">{children}</p>
                  );
                },
                ul: ({ children }) => (
                  <ul className="my-4 list-disc space-y-2 pl-6 text-slate-700 dark:text-slate-300">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-4 list-decimal space-y-2 pl-6 text-slate-700 dark:text-slate-300">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-4 rounded-xl border border-indigo-200/60 bg-indigo-50/70 p-4 text-slate-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-slate-200">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900 dark:bg-secondary dark:text-foreground">
                    {children}
                  </code>
                ),
                a: ({ children, href }) => (
                  <a href={href} className="text-primary underline underline-offset-2">{children}</a>
                ),
                hr: () => <hr className="my-6 border-slate-200 dark:border-white/10" />,
              }}
            >
              {data.readable_material}
            </ReactMarkdown>
          </article>
        ) : null}

        {/* Inline Quick Quiz launcher / player */}
        {data && !loading ? (
          <div className="mt-8">
            {!quizOpen ? (
              <button
                type="button"
                onClick={() => setQuizOpen(true)}
                disabled={questions.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow px-5 py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {questions.length === 0 ? "Quick Quiz coming soon" : `Quick Quiz (${Math.min(5, questions.length)} Questions)`}
              </button>
            ) : (
              <QuickQuiz questions={questions.slice(0, 5)} onClose={() => setQuizOpen(false)} />
            )}
          </div>
        ) : null}
      </div>

      {summaryOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSummaryOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 flex h-dvh w-[88%] max-w-sm flex-col border-l border-white/10 bg-card shadow-2xl animate-in slide-in-from-right duration-200">
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-primary">
                <StickyNote className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-wider">
                  Cheat Sheet · {subunitCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSummaryOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
                aria-label="Close summary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-foreground/90">
              {summaryBullets.length === 0 ? (
                <p className="text-muted-foreground">No summary available yet.</p>
              ) : (
                <ul className="space-y-3">
                  {summaryBullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/25 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <MarkdownInline text={b} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

function QuickQuiz({ questions, onClose }: { questions: ParsedQ[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [expOpen, setExpOpen] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);

  const total = questions.length;
  const q = questions[idx];
  const chosen = answers[idx];
  const isCorrect = chosen && q && chosen === q.answer;

  const reset = () => {
    setIdx(0);
    setAnswers({});
    setExpOpen({});
    setDone(false);
  };

  if (done) {
    const score = Object.entries(answers).reduce((acc, [i, a]) => acc + (questions[Number(i)]?.answer === a ? 1 : 0), 0);
    return (
      <div className="rounded-3xl border border-white/10 bg-card p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="mt-3 text-lg font-bold">Sub-Unit Quiz Complete!</h3>
        <p className="mt-1 text-sm text-muted-foreground">You scored</p>
        <p className="mt-1 text-3xl font-extrabold text-primary">{score}/{total} Correct</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow px-5 py-3.5 text-sm font-bold text-primary-foreground transition active:scale-[0.99]"
          >
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-secondary px-5 py-3.5 text-sm font-bold text-foreground transition active:scale-[0.99]"
          >
            Back to Reader
          </button>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Question {idx + 1} of {total}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
          aria-label="Close quiz"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
          style={{ width: `${((idx + (chosen ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <p className="mb-4 text-[15px] font-semibold leading-relaxed text-foreground">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((o) => {
          const picked = chosen === o.letter;
          const isAns = q.answer === o.letter;
          let cls = "border-white/10 bg-secondary/50 text-foreground hover:bg-secondary";
          if (chosen) {
            if (isAns) cls = "border-emerald-500/50 bg-emerald-500/15 text-emerald-300";
            else if (picked) cls = "border-red-500/50 bg-red-500/15 text-red-300";
            else cls = "border-white/5 bg-secondary/30 text-muted-foreground";
          }
          return (
            <button
              key={o.letter}
              type="button"
              disabled={!!chosen}
              onClick={() => setAnswers((prev) => ({ ...prev, [idx]: o.letter }))}
              className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${cls}`}
            >
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background/60 text-[11px] font-bold">
                {o.letter}
              </span>
              <span className="flex-1">{o.text}</span>
              {chosen && isAns ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : null}
              {chosen && picked && !isAns ? <XCircle className="h-4 w-4 shrink-0 text-red-400" /> : null}
            </button>
          );
        })}
      </div>

      {chosen ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-background/40 p-4">
          <button
            type="button"
            onClick={() => setExpOpen((p) => ({ ...p, [idx]: !p[idx] }))}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className={`text-sm font-bold ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
              {isCorrect ? "Correct!" : `Correct answer: ${q.answer}`} · Explanation
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expOpen[idx] ? "rotate-180" : ""}`} />
          </button>
          {expOpen[idx] ? (
            <div className="mt-3 text-sm leading-relaxed text-foreground/85">
              <MarkdownInline text={q.explanation || "No explanation provided."} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="flex-1 rounded-2xl border border-white/10 bg-secondary px-4 py-3 text-sm font-bold text-foreground transition active:scale-[0.99] disabled:opacity-40"
        >
          Previous
        </button>
        {idx < total - 1 ? (
          <button
            type="button"
            disabled={!chosen}
            onClick={() => setIdx((i) => i + 1)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm font-bold text-primary-foreground transition active:scale-[0.99] disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={!chosen}
            onClick={() => setDone(true)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3 text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-40"
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}

function MarkdownInline({ text }: { text: string }) {
  return (
    <div className="[&>p]:m-0 [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
