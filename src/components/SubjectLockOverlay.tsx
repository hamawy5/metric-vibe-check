import { Lock, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  subjectName: string;
  requiredStream: "Natural Science" | "Social Science";
  onClose: () => void;
}

export function SubjectLockOverlay({ open, subjectName, requiredStream, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-md animate-fade-in sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="m-4 w-full max-w-sm rounded-3xl border border-white/10 bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-background shadow-lg">
          <Lock className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-center text-lg font-bold">{subjectName} is locked</h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          This subject belongs to the{" "}
          <span className="font-semibold text-foreground">{requiredStream} Stream</span>.
          Subscribe to unlock!
        </p>
        <button
          type="button"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          <Sparkles className="h-4 w-4" />
          Unlock with Premium
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-2xl px-5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
