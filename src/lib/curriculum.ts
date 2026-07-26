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
