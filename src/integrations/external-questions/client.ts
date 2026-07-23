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

export type SubUnit = {
  id: number;
  grade: string;
  subject: string;
  unit_number: string;
  unit_title: string;
  subunit_code: string;
  title: string;
  readable_material: string | null;
  corner_summary: string | null;
  quiz_questions: string | null;
};

export type UnitGroup = {
  unit_number: string;
  unit_title: string;
  subunits: SubUnit[];
};

export async function fetchSubUnits(grade: string, subject: string): Promise<UnitGroup[]> {
  const { data, error } = await externalQuestions
    .from("sub_units")
    .select("id,grade,subject,unit_number,unit_title,subunit_code,title,readable_material,corner_summary")
    .eq("grade", String(grade))
    .ilike("subject", subject)
    .order("unit_number", { ascending: true })
    .order("subunit_code", { ascending: true });
  if (error) {
    console.error("[sub_units] fetch error", error);
    throw error;
  }
  const rows = (data ?? []) as SubUnit[];
  const map = new Map<string, UnitGroup>();
  for (const r of rows) {
    const key = String(r.unit_number);
    if (!map.has(key)) {
      map.set(key, { unit_number: key, unit_title: r.unit_title, subunits: [] });
    }
    map.get(key)!.subunits.push(r);
  }
  return Array.from(map.values()).sort(
    (a, b) => Number(a.unit_number) - Number(b.unit_number),
  );
}

export async function fetchSubUnit(
  grade: string,
  subject: string,
  subunitCode: string,
): Promise<SubUnit | null> {
  const { data, error } = await externalQuestions
    .from("sub_units")
    .select("id,grade,subject,unit_number,unit_title,subunit_code,title,readable_material,corner_summary")
    .eq("grade", String(grade))
    .ilike("subject", subject)
    .eq("subunit_code", subunitCode)
    .maybeSingle();
  if (error) {
    console.error("[sub_units] fetch one error", error);
    throw error;
  }
  return (data as SubUnit | null) ?? null;
}
