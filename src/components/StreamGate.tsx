import { useEffect, useState, type ReactNode } from "react";
import { StreamSelectorModal } from "@/components/StreamSelectorModal";
import { useStream } from "@/lib/stream";

/**
 * Gates content behind stream selection. Until the user picks a stream,
 * the unclosable StreamSelectorModal is shown and children are hidden.
 */
export function StreamGate({ children }: { children: ReactNode }) {
  const stream = useStream();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoid SSR/CSR mismatch & flash: render nothing until we've read localStorage
  if (!mounted) return null;

  if (!stream) {
    return (
      <div className="min-h-screen">
        <StreamSelectorModal open onClose={() => {}} />
      </div>
    );
  }

  return <>{children}</>;
}
