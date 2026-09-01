import { queryOptions } from "@tanstack/react-query";
import { fetchSubUnits } from "@/integrations/external-questions/client";

export const CURRICULUM_STALE_TIME = 1000 * 60 * 60; // 1 hour
export const CURRICULUM_GC_TIME = 1000 * 60 * 60 * 24; // 24 hours

/**
 * All units + subunits (including readable_material, corner_summary and
 * quiz_questions) for a grade/subject. One cached query powers the unit list,
 * the reader and next/previous navigation, so repeat views are instant.
 */
export const subUnitsQuery = (grade: string, subject: string) =>
  queryOptions({
    queryKey: ["sub_units", String(grade), subject.toLowerCase()],
    queryFn: () => fetchSubUnits(grade, subject),
    staleTime: CURRICULUM_STALE_TIME,
    gcTime: CURRICULUM_GC_TIME,
  });

/** Remembers which accordion unit the user last expanded, per grade+subject. */
const openUnitStore = new Map<string, string>();

export const openUnitKey = (grade: string, subject: string) =>
  `${grade}:${subject.toLowerCase()}`;

export function getOpenUnit(grade: string, subject: string) {
  return openUnitStore.get(openUnitKey(grade, subject)) ?? "";
}

export function setOpenUnit(grade: string, subject: string, unit: string) {
  openUnitStore.set(openUnitKey(grade, subject), unit);
}

/* ---------- Sub-subunit grouping (client-side, no schema changes) ---------- */

import type { SubUnit } from "@/integrations/external-questions/client";

export type SubUnitNode =
  | { kind: "leaf"; code: string; row: SubUnit }
  | { kind: "group"; code: string; title: string; children: { code: string; row: SubUnit }[] };

/**
 * Groups a unit's subunits by their `subunit_code` prefix.
 * "3.3.1"/"3.3.2" become children of a synthetic "3.3" folder when no exact
 * "3.3" reading row exists; otherwise every row stays a flat leaf.
 */
export function groupSubUnits(subunits: SubUnit[]): SubUnitNode[] {
  const existing = new Set(subunits.map((s) => s.subunit_code));
  const order: string[] = [];
  const groups = new Map<string, { code: string; row: SubUnit }[]>();
  const nodes = new Map<string, SubUnitNode>();

  for (const row of subunits) {
    const code = row.subunit_code;
    const parts = code.split(".");
    const parent = parts.length > 2 ? parts.slice(0, -1).join(".") : null;

    if (parent && !existing.has(parent)) {
      if (!groups.has(parent)) {
        groups.set(parent, []);
        order.push(parent);
        nodes.set(parent, { kind: "group", code: parent, title: "", children: groups.get(parent)! });
      }
      groups.get(parent)!.push({ code, row });
    } else {
      order.push(code);
      nodes.set(code, { kind: "leaf", code, row });
    }
  }

  return order.map((code) => {
    const node = nodes.get(code)!;
    if (node.kind === "group") {
      node.children.sort((a, b) => compareCodes(a.code, b.code));
      node.title = `Section ${node.code}`;
    }
    return node;
  });
}

/** Numeric-aware comparison of dotted codes ("3.10" after "3.2"). */
export function compareCodes(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

/** Router `sub` param for a subunit code, relative to its unit number. */
export function subParam(unitNumber: string, code: string) {
  const prefix = `${unitNumber}.`;
  return code.startsWith(prefix) ? code.slice(prefix.length) : code;
}
