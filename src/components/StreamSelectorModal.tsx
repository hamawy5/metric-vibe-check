import { useEffect } from "react";
import { toast } from "sonner";
import { Atom, Globe2, Sparkles } from "lucide-react";
import { setStream, type Stream } from "@/lib/stream";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function StreamSelectorModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // intentionally block escape
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const pick = (s: Stream) => {
    setStream(s);
    toast.success(
      s === "natural" ? "Natural Science Stream Activated!" : "Social Science Stream Activated!",
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl animate-fade-in px-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-center text-2xl font-black tracking-tight">
          Welcome to MatricPulse!
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Select Your Academic Stream
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => pick("natural")}
            className="group flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-card p-5 text-left transition hover:border-primary/60 active:scale-[0.99]"
          >
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-300 text-background shadow-lg">
              <Atom className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold">Natural Science</p>
              <p className="text-xs text-muted-foreground">
                Math · Physics · Chemistry · Biology
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => pick("social")}
            className="group flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-card p-5 text-left transition hover:border-primary/60 active:scale-[0.99]"
          >
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-300 text-background shadow-lg">
              <Globe2 className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold">Social Science</p>
              <p className="text-xs text-muted-foreground">
                Geography · History · Economics · Civics
              </p>
            </div>
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          You can change your stream later in settings.
        </p>
      </div>
    </div>
  );
}
