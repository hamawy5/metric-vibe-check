import { useEffect, useState } from "react";

export type Stream = "natural" | "social";

const KEY = "mp_stream";

export function getStream(): Stream | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(KEY);
  return v === "natural" || v === "social" ? v : null;
}

export function setStream(s: Stream) {
  localStorage.setItem(KEY, s);
  window.dispatchEvent(new Event("mp_stream_change"));
}

export function clearStream() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("mp_stream_change"));
}

export function useStream(): Stream | null {
  const [s, setS] = useState<Stream | null>(null);
  useEffect(() => {
    setS(getStream());
    const onChange = () => setS(getStream());
    window.addEventListener("mp_stream_change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("mp_stream_change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return s;
}

// Subjects belonging to each stream
export const NATURAL_SUBJECTS = new Set([
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "english",
  "aptitude",
]);

export const SOCIAL_SUBJECTS = new Set([
  "mathematics",
  "geography",
  "history",
  "economics",
  "civics",
  "english",
  "aptitude",
]);

export function subjectStream(slug: string): Stream | "both" {
  const inN = NATURAL_SUBJECTS.has(slug);
  const inS = SOCIAL_SUBJECTS.has(slug);
  if (inN && inS) return "both";
  return inN ? "natural" : "social";
}
