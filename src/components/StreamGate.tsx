import { useEffect, useState, type ReactNode } from "react";
import { useStream } from "@/lib/stream";
import { StreamSelectorModal } from "@/components/StreamSelectorModal";
import { Lock } from "lucide-react";

export function StreamGate({ children }: { children: ReactNode }) {
  const stream = useStream();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !stream) setOpen(true);
    else setOpen(false);
  }, [mounted, stream]);

  if (!mounted) return null;

  if (!stream) {
    return (
      <>
        <div className="px-5 pt-24 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-card text-primary">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Choose your stream to continue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick Natural or Social Science to unlock your content.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 inline-flex rounded-2xl bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            Select Stream
          </button>
        </div>
        <StreamSelectorModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return <>{children}</>;
}
