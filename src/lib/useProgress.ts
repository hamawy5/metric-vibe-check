import { useEffect, useState } from "react";
import { useStream } from "@/lib/stream";
import { getProgress, PROGRESS_EVENT, type StudyProgress } from "@/lib/progress";

/** Reactive read of the localStorage progress for the active stream. */
export function useProgress(): { stream: string; progress: StudyProgress | null } {
  const stream = useStream() ?? "";
  const [progress, setProgress] = useState<StudyProgress | null>(null);

  useEffect(() => {
    const read = () => setProgress(getProgress(stream));
    read();
    window.addEventListener(PROGRESS_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, [stream]);

  return { stream, progress };
}
