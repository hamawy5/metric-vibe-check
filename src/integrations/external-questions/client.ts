// External Supabase project that hosts the user's "Questions" table (capital Q).
// Publishable (anon) key — safe to include in client code.
import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://xskunuxjjiuzgcnuafzo.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza3VudXhqaml1emdjbnVhZnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDE3MTUsImV4cCI6MjA5NjkxNzcxNX0.v2P63WwO5cm0LvhnsTTI9HJD9U46HaJfxpzEirvyaAQ";

export const externalQuestions = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export type ExternalQuestion = {
  id: number;
  stream: string | null;
  subject: string;
  grade: string;
  unit: string;
  exam_year: string | null;
  question_text: string;
  choices: string;
  correct_answer: string;
  explanation: string | null;
};

/** Parse "A) foo, B) bar, C) baz, D) qux" into an array of 4 options. */
export function parseChoices(raw: string): string[] {
  if (!raw) return [];
  // Split on ", " before each letter prefix to avoid splitting inside option text.
  return raw
    .split(/,\s*(?=[A-D]\))/)
    .map((s) => s.trim())
    .filter(Boolean);
}
