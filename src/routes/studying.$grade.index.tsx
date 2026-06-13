import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Calculator, Atom, FlaskConical, Leaf, BookOpen, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studying/$grade/")({
  component: SubjectsPage,
});

const SUBJECTS = [
  { slug: "mathematics", name: "Mathematics", Icon: Calculator, color: "from-violet-400 to-fuchsia-300" },
  { slug: "physics", name: "Physics", Icon: Atom, color: "from-sky-400 to-cyan-300" },
  { slug: "chemistry", name: "Chemistry", Icon: FlaskConical, color: "from-emerald-400 to-teal-300" },
  { slug: "biology", name: "Biology", Icon: Leaf, color: "from-lime-400 to-emerald-300" },
  { slug: "english", name: "English", Icon: BookOpen, color: "from-amber-400 to-orange-300" },
  { slug: "aptitude", name: "Aptitude", Icon: Brain, color: "from-rose-400 to-pink-300" },
];

function SubjectsPage() {
  const { grade } = Route.useParams();

  return (
    <div className="px-5 pt-12">
      <Link
        to="/studying"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Grades
      </Link>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Grade {grade}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Select Subject</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap a subject to view its units.</p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {SUBJECTS.map(({ slug, name, Icon, color }) => (
          <Link
            key={slug}
            to="/studying/$grade/$subject"
            params={{ grade, subject: slug }}
            className="group flex flex-col gap-3 rounded-3xl border border-white/5 bg-card p-4 transition active:scale-[0.98]"
          >
            <div
              className={cn(
                "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-background shadow-lg",
                color,
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">{name}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                Explore <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}