/**
 * localStorage-only study progress + weekly streak engine.
 * Pure logic: no React, no network, no database.
 */

export type StudyProgress = {
  stream: string;
  weekStart: string; // ISO date (YYYY-MM-DD), Monday of the current week
  studiedDays: string[]; // ISO dates studied this week
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  completedReadings: string[]; // e.g. "12:chemistry:1.2"
  completedQuizzes: string[]; // e.g. "12:chemistry:1.2" or "12:chemistry:1"
  quizResults: { id: string; score: number; attemptedAt: string }[];
  lastPosition: { grade: string; subject: string; unit: string } | null;
  recentEvents: { type: "reading" | "quiz"; id: string; timestamp: string; score?: number }[];
};

export type DayStatus = "studied" | "missed" | "future" | "today-not-studied";

export const MAX_RECENT_EVENTS = 60;
export const WEAK_TOPIC_THRESHOLD = 60;

const KEY_PREFIX = "mp_progress:";
const key = (stream: string) => `${KEY_PREFIX}${stream || "default"}`;

/* ------------------------------------------------------------------ *
 * Local date helpers (device-local, never UTC-shifted, never network) *
 * ------------------------------------------------------------------ */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function addDays(iso: string, n: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function daysBetween(aISO: string, bISO: string): number {
  const a = fromISODate(aISO).getTime();
  const b = fromISODate(bISO).getTime();
  return Math.round((b - a) / 86400000);
}

/** Monday (ISO week start) of the week containing `date`, in device-local time. */
export function mondayOf(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0 = Sunday
  const backToMonday = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - backToMonday);
  return toISODate(d);
}

/* ------------------------------------------------- *
 * Swappable schedule: which days must be studied to *
 * keep a streak alive. Today it's every calendar     *
 * day; later a custom student schedule can replace   *
 * this single predicate.                             *
 * ------------------------------------------------- */

export type StreakSchedule = {
  /** true when a missed `isoDate` should break the streak */
  isRequiredDay: (isoDate: string) => boolean;
};

export const everyDaySchedule: StreakSchedule = {
  isRequiredDay: () => true,
};

let activeSchedule: StreakSchedule = everyDaySchedule;
export function setStreakSchedule(schedule: StreakSchedule) {
  activeSchedule = schedule;
}

/* ---------------- *
 * Storage plumbing *
 * ---------------- */

export const PROGRESS_EVENT = "mp_progress_change";

function emptyProgress(stream: string): StudyProgress {
  return {
    stream,
    weekStart: mondayOf(),
    studiedDays: [],
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: "",
    completedReadings: [],
    completedQuizzes: [],
    quizResults: [],
    lastPosition: null,
    recentEvents: [],
  };
}

function normalize(raw: unknown, stream: string): StudyProgress {
  const base = emptyProgress(stream);
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<StudyProgress>;
  return {
    stream,
    weekStart: typeof p.weekStart === "string" ? p.weekStart : base.weekStart,
    studiedDays: Array.isArray(p.studiedDays) ? p.studiedDays.filter((x) => typeof x === "string") : [],
    currentStreak: Number.isFinite(p.currentStreak) ? Number(p.currentStreak) : 0,
    longestStreak: Number.isFinite(p.longestStreak) ? Number(p.longestStreak) : 0,
    lastActiveDate: typeof p.lastActiveDate === "string" ? p.lastActiveDate : "",
    completedReadings: Array.isArray(p.completedReadings) ? p.completedReadings : [],
    completedQuizzes: Array.isArray(p.completedQuizzes) ? p.completedQuizzes : [],
    quizResults: Array.isArray(p.quizResults) ? p.quizResults : [],
    lastPosition: p.lastPosition && typeof p.lastPosition === "object" ? p.lastPosition : null,
    recentEvents: Array.isArray(p.recentEvents) ? p.recentEvents.slice(-MAX_RECENT_EVENTS) : [],
  };
}

/**
 * WEEKLY RESET
 * Never trust the stored weekStart. On every read we recompute the Monday of
 * the current week from the device clock. If it differs from the stored value,
 * the stored week is stale (app was closed/offline across a week boundary), so
 * we roll weekStart forward and wipe studiedDays — the 7 bars always describe
 * Monday..Sunday of the week the device is in right now.
 *
 * STREAK RESET (strict)
 * The running counter is independent of the weekly bars. If any *required*
 * calendar day between lastActiveDate and today had no completion, the streak
 * is 0. Concretely: gap of 0 days = same day (unchanged), 1 day = yesterday
 * (still alive), >1 day = at least one required day was missed -> reset.
 */
function reconcile(p: StudyProgress): StudyProgress {
  const today = todayISO();
  const currentWeek = mondayOf();
  let next = p;

  if (p.weekStart !== currentWeek) {
    next = { ...next, weekStart: currentWeek, studiedDays: [] };
  }

  if (next.lastActiveDate && next.currentStreak > 0) {
    const gap = daysBetween(next.lastActiveDate, today);
    if (gap > 1) {
      // Check whether any skipped day was actually required by the schedule.
      let missedRequired = false;
      for (let i = 1; i < gap; i++) {
        if (activeSchedule.isRequiredDay(addDays(next.lastActiveDate, i))) {
          missedRequired = true;
          break;
        }
      }
      if (missedRequired) next = { ...next, currentStreak: 0 };
    }
  }

  return next;
}

export function getProgress(stream: string): StudyProgress {
  if (typeof window === "undefined") return emptyProgress(stream);
  let parsed: unknown = null;
  try {
    const raw = localStorage.getItem(key(stream));
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const reconciled = reconcile(normalize(parsed, stream));
  return reconciled;
}

export function saveProgress(progress: StudyProgress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(progress.stream), JSON.stringify(progress));
  } catch {
    /* storage full / disabled — silently ignore */
  }
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

/* ------------- *
 * Mutations     *
 * ------------- */

function pushEvent(
  p: StudyProgress,
  event: StudyProgress["recentEvents"][number],
): StudyProgress["recentEvents"] {
  const events = [...p.recentEvents, event];
  // FIFO cap: oldest dropped once we exceed the cap.
  return events.length > MAX_RECENT_EVENTS ? events.slice(events.length - MAX_RECENT_EVENTS) : events;
}

/** Mark today as studied and advance the consecutive-day streak. */
function registerStudyDay(p: StudyProgress): StudyProgress {
  const today = todayISO();
  const studiedDays = p.studiedDays.includes(today) ? p.studiedDays : [...p.studiedDays, today].sort();

  let currentStreak = p.currentStreak;
  if (p.lastActiveDate !== today) {
    // A brand-new active day: continue the run if yesterday counted, else start at 1.
    const gap = p.lastActiveDate ? daysBetween(p.lastActiveDate, today) : Infinity;
    currentStreak = gap === 1 && p.currentStreak > 0 ? p.currentStreak + 1 : 1;
  } else if (currentStreak === 0) {
    currentStreak = 1;
  }

  return {
    ...p,
    studiedDays,
    currentStreak,
    longestStreak: Math.max(p.longestStreak, currentStreak),
    lastActiveDate: today,
  };
}

export function markReadingComplete(stream: string, subunitId: string): StudyProgress {
  const p = getProgress(stream);
  const completedReadings = p.completedReadings.includes(subunitId)
    ? p.completedReadings
    : [...p.completedReadings, subunitId];
  const next = registerStudyDay({
    ...p,
    completedReadings,
    recentEvents: pushEvent(p, {
      type: "reading",
      id: subunitId,
      timestamp: new Date().toISOString(),
    }),
  });
  saveProgress(next);
  return next;
}

export function markQuizComplete(stream: string, subunitId: string, score: number): StudyProgress {
  const p = getProgress(stream);
  const completedQuizzes = p.completedQuizzes.includes(subunitId)
    ? p.completedQuizzes
    : [...p.completedQuizzes, subunitId];
  const attemptedAt = new Date().toISOString();
  const rounded = Math.max(0, Math.min(100, Math.round(score)));
  const next = registerStudyDay({
    ...p,
    completedQuizzes,
    quizResults: [...p.quizResults, { id: subunitId, score: rounded, attemptedAt }],
    recentEvents: pushEvent(p, { type: "quiz", id: subunitId, timestamp: attemptedAt, score: rounded }),
  });
  saveProgress(next);
  return next;
}

export function updateLastPosition(
  stream: string,
  position: { grade: string; subject: string; unit: string },
): StudyProgress {
  const p = getProgress(stream);
  if (
    p.lastPosition &&
    p.lastPosition.grade === position.grade &&
    p.lastPosition.subject === position.subject &&
    p.lastPosition.unit === position.unit
  ) {
    return p;
  }
  const next = { ...p, lastPosition: position };
  saveProgress(next);
  return next;
}

/* ------------- *
 * Selectors     *
 * ------------- */

export const WEEK_DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Monday..Sunday of the CURRENT week (not a rolling window). */
export function getWeekBarStatus(progress: StudyProgress): { date: string; status: DayStatus }[] {
  const weekStart = mondayOf(); // recompute, never trust storage
  const today = todayISO();
  const studied = new Set(progress.studiedDays ?? []);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    let status: DayStatus;
    if (studied.has(date)) status = "studied";
    else if (date === today) status = "today-not-studied";
    else if (date < today) status = "missed";
    else status = "future";
    return { date, status };
  });
}

export function getSubunitStatus(
  progress: StudyProgress,
  subunitId: string,
): "none" | "partial" | "complete" {
  const read = progress.completedReadings.includes(subunitId);
  const quizzed = progress.completedQuizzes.includes(subunitId);
  if (read && quizzed) return "complete";
  if (read || quizzed) return "partial";
  return "none";
}

export function getWeakTopics(progress: StudyProgress): { id: string; score: number; attemptedAt: string }[] {
  const latest = new Map<string, { id: string; score: number; attemptedAt: string }>();
  for (const r of progress.quizResults ?? []) {
    const prev = latest.get(r.id);
    if (!prev || r.attemptedAt >= prev.attemptedAt) latest.set(r.id, r);
  }
  return [...latest.values()].filter((r) => r.score < WEAK_TOPIC_THRESHOLD);
}
