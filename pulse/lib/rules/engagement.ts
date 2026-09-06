/**
 * Engagement rules — healthy by design.
 *
 * Pure functions over a member's booking history ("attendance facts"). No
 * I/O, no dates read from the clock (callers pass `now`), so the mock and the
 * Supabase implementations produce identical numbers and the module can move
 * server-side untouched.
 *
 * Principles enforced here, not just in copy:
 * - Progress is measured in CLASSES ATTENDED and MINUTES MOVED — never weight,
 *   calories or body shape. Nothing in this module knows those concepts.
 * - Goals and streaks are WEEK-based. There is no daily target anywhere.
 * - Rest is part of training: one rest week never breaks a streak
 *   (`computeStreak`), and frequent trainers get an EASE-OFF nudge instead of
 *   a push (`planNudges`).
 * - Targets are clamped to 1–5 with a gentle default of 2 and never escalate
 *   on their own (`clampGoal`).
 * - Nudges are opt-in, muteable and at most one at a time. A member who has
 *   already met the week's goal gets none.
 */
import type {
  Achievement,
  AchievementId,
  BookingStatus,
  CategoryId,
  EngagementPrefs,
  HourBand,
  NudgeKind,
  RoutineSignal,
  StreakState,
  StreakStatus,
  WeeklyProgress,
} from "@/lib/types";
import { addDays, monthKey, startOfDay } from "@/lib/utils";

/* ------------------------------- Constants -------------------------------- */

export const GOAL_MIN = 1;
export const GOAL_MAX = 5;
/** "About 2–3 a week" — the gentle default. */
export const GOAL_DEFAULT = 2;

/** Booking statuses that count as "you were there". */
export const ATTENDED_STATUSES: readonly BookingStatus[] = [
  "checked_in",
  "completed",
];

/** Frequent-trainer threshold: this many classes in ≥3 of the last 4 weeks. */
export const EASE_OFF_WEEKLY_CLASSES = 5;
export const EASE_OFF_WEEKS_REQUIRED = 3;
/** Quiet stretch before a kind "been a while" check-in (never earlier). */
export const BEEN_A_WHILE_DAYS = 14;
/** Gap between two attended classes that makes the second a "comeback". */
export const COMEBACK_GAP_DAYS = 21;
/** A class starting before this local hour is an early-bird session. */
export const EARLY_BIRD_HOUR = 8;
export const ROUTINE_LOOKBACK_WEEKS = 8;
export const ROUTINE_MIN_COUNT = 2;
/** One tap on "mute" silences nudges for this long. */
export const NUDGE_MUTE_DAYS = 14;
const DAY_MS = 86_400_000;

/* --------------------------------- Facts ---------------------------------- */

/** The only thing the rules know about a booking. */
export interface AttendanceFact {
  bookingId: string;
  status: BookingStatus;
  startsAt: string;
  durationMin: number;
  studioId: string;
  neighborhoodId: string;
  categoryId: CategoryId;
  classTypeId: string;
  createdAt: string;
}

export function clampGoal(n: number): number {
  if (!Number.isFinite(n)) return GOAL_DEFAULT;
  return Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(n)));
}

export function isAttended(f: Pick<AttendanceFact, "status">): boolean {
  return ATTENDED_STATUSES.includes(f.status);
}

/** Attended facts, oldest first. */
export function attendedFacts(facts: AttendanceFact[]): AttendanceFact[] {
  return facts
    .filter(isAttended)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/* --------------------------------- Weeks ---------------------------------- */

/** Monday 00:00 local of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const dow = (c.getDay() + 6) % 7; // Monday = 0
  c.setDate(c.getDate() - dow);
  return c;
}

/** Stable key for a week: the Monday as YYYY-MM-DD (local). */
export function weekKey(d: Date): string {
  const m = startOfWeek(d);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(
    m.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * counts[i] = attended classes in the week i weeks before the current one
 * (index 0 = the current, in-progress week).
 */
export function weeklyAttendance(
  facts: AttendanceFact[],
  now: Date,
  weeks: number,
): number[] {
  const counts = new Array<number>(weeks).fill(0);
  const w0 = startOfWeek(now).getTime();
  for (const f of facts) {
    if (!isAttended(f)) continue;
    const t = new Date(f.startsAt).getTime();
    if (t > now.getTime()) continue;
    const idx = Math.floor((w0 - startOfWeek(new Date(t)).getTime()) / (7 * DAY_MS));
    if (idx >= 0 && idx < weeks) counts[idx] += 1;
  }
  return counts;
}

export function hourBand(hour: number): HourBand {
  if (hour < 12) return "morning";
  if (hour < 17) return "midday";
  return "evening";
}

/* ---------------------------------- Goal ---------------------------------- */

export function computeWeeklyProgress(
  facts: AttendanceFact[],
  target: number,
  now: Date,
): WeeklyProgress {
  const goal = clampGoal(target);
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const ws = weekStart.getTime();
  const we = weekEnd.getTime();
  let attended = 0;
  let planned = 0;
  for (const f of facts) {
    const t = new Date(f.startsAt).getTime();
    if (t < ws || t >= we) continue;
    if (isAttended(f) && t <= now.getTime()) attended += 1;
    else if (f.status === "reserved" && t > now.getTime()) planned += 1;
  }
  const daysLeft = Math.max(
    1,
    Math.ceil((we - startOfDay(now).getTime()) / DAY_MS),
  );
  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    attended,
    target: goal,
    met: attended >= goal,
    ratio: Math.min(1, attended / goal),
    planned,
    daysLeft,
  };
}

/* --------------------------------- Streak --------------------------------- */

/**
 * Week streak with a rest allowance.
 *
 * A week is ACTIVE when it has at least one attended class. Walking back from
 * the current week, active weeks extend the run; a single quiet week between
 * active weeks is a REST WEEK and is simply skipped. Two quiet weeks in a row
 * end the run. The current, in-progress week is never held against you.
 */
export function computeStreak(facts: AttendanceFact[], now: Date): StreakStatus {
  const counts = weeklyAttendance(facts, now, 104);

  // Current run (backwards).
  let weeks = 0;
  let restAvailable = true;
  if (counts[0] > 0) weeks += 1;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > 0) {
      weeks += 1;
      restAvailable = true;
    } else if (restAvailable) {
      restAvailable = false; // rest week — allowed
    } else {
      break;
    }
  }
  // A run that is nothing but a leading rest week isn't a run.
  if (weeks === 0) restAvailable = true;

  // Longest run ever (forwards, same rule).
  let longest = 0;
  let cur = 0;
  let rest = true;
  for (let i = counts.length - 1; i >= 0; i--) {
    if (counts[i] > 0) {
      cur += 1;
      rest = true;
      longest = Math.max(longest, cur);
    } else if (cur > 0 && rest) {
      rest = false;
    } else {
      cur = 0;
      rest = true;
    }
  }

  let state: StreakState;
  if (counts[0] > 0) state = "on_track";
  else if (weeks === 0) state = "fresh_start";
  else if (counts[1] === 0) state = "rested";
  else state = "building";

  return { weeks, state, longest: Math.max(longest, weeks) };
}

/* ------------------------------ Achievements ------------------------------ */

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_booking", group: "start", order: 1 },
  { id: "first_checkin", group: "start", order: 2 },
  { id: "classes_5", group: "consistency", order: 10, target: 5 },
  { id: "classes_10", group: "consistency", order: 11, target: 10 },
  { id: "classes_25", group: "consistency", order: 12, target: 25 },
  { id: "classes_50", group: "consistency", order: 13, target: 50 },
  { id: "goal_week", group: "consistency", order: 14 },
  { id: "goal_month", group: "consistency", order: 15, target: 4 },
  { id: "three_categories", group: "variety", order: 20, target: 3 },
  { id: "new_neighborhood", group: "variety", order: 21, target: 2 },
  { id: "explorer_5", group: "variety", order: 22, target: 5 },
  { id: "early_bird", group: "moments", order: 30 },
  { id: "comeback", group: "moments", order: 31 },
];

export function achievementById(id: AchievementId): Achievement {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) throw new Error(`unknown achievement ${id}`);
  return a;
}

export interface AchievementEvaluation {
  id: AchievementId;
  achieved: boolean;
  /** When it was earned — the start of the class that earned it. */
  achievedAt?: string;
  /** 0..target for countable ones, 0/1 for moments. */
  progress: number;
  target: number;
}

/** First attended class that made a distinct-count reach `n`. */
function nthDistinct<T>(
  attended: AttendanceFact[],
  key: (f: AttendanceFact) => T,
  n: number,
): { count: number; at?: string } {
  const seen = new Set<T>();
  for (const f of attended) {
    const k = key(f);
    if (seen.has(k)) continue;
    seen.add(k);
    if (seen.size === n) return { count: n, at: f.startsAt };
  }
  return { count: seen.size };
}

export function evaluateAchievements(
  facts: AttendanceFact[],
  target: number,
  now: Date,
): AchievementEvaluation[] {
  const goal = clampGoal(target);
  const attended = attendedFacts(facts).filter(
    (f) => new Date(f.startsAt).getTime() <= now.getTime(),
  );
  const out: AchievementEvaluation[] = [];
  const push = (
    id: AchievementId,
    progress: number,
    achievedAt?: string,
    targetOverride?: number,
  ) => {
    const def = achievementById(id);
    const tgt = targetOverride ?? def.target ?? 1;
    const achieved = progress >= tgt;
    out.push({
      id,
      achieved,
      achievedAt: achieved ? achievedAt : undefined,
      progress: Math.min(progress, tgt),
      target: tgt,
    });
  };

  // Start
  const firstBooking = [...facts].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )[0];
  push("first_booking", facts.length > 0 ? 1 : 0, firstBooking?.createdAt);
  push("first_checkin", attended.length > 0 ? 1 : 0, attended[0]?.startsAt);

  // Consistency — counts
  for (const [id, n] of [
    ["classes_5", 5],
    ["classes_10", 10],
    ["classes_25", 25],
    ["classes_50", 50],
  ] as const) {
    push(id, attended.length, attended[n - 1]?.startsAt);
  }

  // Consistency — goal weeks. Group attended classes by week (oldest first).
  const byWeek = new Map<string, AttendanceFact[]>();
  for (const f of attended) {
    const k = weekKey(new Date(f.startsAt));
    byWeek.set(k, [...(byWeek.get(k) ?? []), f]);
  }
  const weekKeys = [...byWeek.keys()].sort();
  let goalWeekAt: string | undefined;
  for (const k of weekKeys) {
    const list = byWeek.get(k)!;
    if (list.length >= goal) {
      goalWeekAt = list[goal - 1].startsAt;
      break;
    }
  }
  const currentWeekAttended = byWeek.get(weekKey(now))?.length ?? 0;
  push(
    "goal_week",
    goalWeekAt ? goal : Math.min(currentWeekAttended, goal - 1),
    goalWeekAt,
    goal,
  );

  // Four consecutive weeks at goal (the current week counts once it's met).
  let run = 0;
  let bestRun = 0;
  let goalMonthAt: string | undefined;
  const w0 = startOfWeek(now).getTime();
  const firstWeek = attended[0]
    ? startOfWeek(new Date(attended[0].startsAt)).getTime()
    : w0;
  for (let t = firstWeek; t <= w0; t += 7 * DAY_MS) {
    const k = weekKey(new Date(t));
    const list = byWeek.get(k) ?? [];
    const isCurrent = t === w0;
    if (list.length >= goal) {
      run += 1;
      if (run >= 4 && !goalMonthAt) goalMonthAt = list[goal - 1].startsAt;
    } else if (!isCurrent) {
      run = 0;
    }
    bestRun = Math.max(bestRun, run);
  }
  push("goal_month", goalMonthAt ? 4 : Math.min(run, 3), goalMonthAt);

  // Variety
  const cats = nthDistinct(attended, (f) => f.categoryId, 3);
  push("three_categories", cats.count, cats.at);
  const hoods = nthDistinct(attended, (f) => f.neighborhoodId, 2);
  push("new_neighborhood", hoods.count, hoods.at);
  const studios = nthDistinct(attended, (f) => f.studioId, 5);
  push("explorer_5", studios.count, studios.at);

  // Moments
  const early = attended.find(
    (f) => new Date(f.startsAt).getHours() < EARLY_BIRD_HOUR,
  );
  push("early_bird", early ? 1 : 0, early?.startsAt);

  let comebackAt: string | undefined;
  for (let i = 1; i < attended.length; i++) {
    const gap =
      new Date(attended[i].startsAt).getTime() -
      new Date(attended[i - 1].startsAt).getTime();
    if (gap >= COMEBACK_GAP_DAYS * DAY_MS) {
      comebackAt = attended[i].startsAt;
      break;
    }
  }
  push("comeback", comebackAt ? 1 : 0, comebackAt);

  return out;
}

/* -------------------------------- Insights -------------------------------- */

export interface InsightsCore {
  classesThisMonth: number;
  classesAllTime: number;
  minutesThisMonth: number;
  minutesAllTime: number;
  categoryMix: { categoryId: CategoryId; count: number }[];
  favoriteStudioId?: string;
  favoriteStudioCount: number;
  mostActiveWeekday?: number;
  mostActiveHourBand?: HourBand;
  weeklyTrend: { weekStart: string; label: string; attended: number; minutes: number }[];
  monthlyTrend: { month: string; label: string; attended: number }[];
  studiosVisited: number;
}

function mode<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const v of values) {
    const n = (counts.get(v) ?? 0) + 1;
    counts.set(v, n);
    // ties go to the most recently seen value
    if (n >= bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

export function computeInsights(facts: AttendanceFact[], now: Date): InsightsCore {
  const attended = attendedFacts(facts).filter(
    (f) => new Date(f.startsAt).getTime() <= now.getTime(),
  );
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonth = attended.filter(
    (f) => new Date(f.startsAt).getTime() >= monthStart,
  );
  const sumMin = (list: AttendanceFact[]) =>
    list.reduce((a, f) => a + f.durationMin, 0);

  const catCounts = new Map<CategoryId, number>();
  const studioCounts = new Map<string, number>();
  for (const f of attended) {
    catCounts.set(f.categoryId, (catCounts.get(f.categoryId) ?? 0) + 1);
    studioCounts.set(f.studioId, (studioCounts.get(f.studioId) ?? 0) + 1);
  }
  const categoryMix = [...catCounts.entries()]
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort((a, b) => b.count - a.count);
  const fav = [...studioCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const weeklyTrend: InsightsCore["weeklyTrend"] = [];
  const w0 = startOfWeek(now);
  for (let i = 7; i >= 0; i--) {
    const ws = addDays(w0, -7 * i);
    const we = addDays(ws, 7);
    const inWeek = attended.filter((f) => {
      const t = new Date(f.startsAt).getTime();
      return t >= ws.getTime() && t < we.getTime();
    });
    weeklyTrend.push({
      weekStart: ws.toISOString(),
      label: `${ws.getDate()}/${ws.getMonth() + 1}`,
      attended: inWeek.length,
      minutes: sumMin(inWeek),
    });
  }

  const monthlyTrend: InsightsCore["monthlyTrend"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d.toISOString());
    monthlyTrend.push({
      month: key,
      label: key,
      attended: attended.filter((f) => monthKey(f.startsAt) === key).length,
    });
  }

  return {
    classesThisMonth: thisMonth.length,
    classesAllTime: attended.length,
    minutesThisMonth: sumMin(thisMonth),
    minutesAllTime: sumMin(attended),
    categoryMix,
    favoriteStudioId: fav?.[0],
    favoriteStudioCount: fav?.[1] ?? 0,
    mostActiveWeekday: mode(attended.map((f) => new Date(f.startsAt).getDay())),
    mostActiveHourBand: mode(
      attended.map((f) => hourBand(new Date(f.startsAt).getHours())),
    ),
    weeklyTrend,
    monthlyTrend,
    studiosVisited: studioCounts.size,
  };
}

/* --------------------------------- Recap ---------------------------------- */

export interface RecapCore {
  scope: "current" | "last";
  weekStart: string;
  weekEnd: string;
  attended: number;
  target: number;
  met: boolean;
  minutes: number;
  categoryIds: CategoryId[];
  studioIds: string[];
  firstTimeStudioId?: string;
  streakWeeks: number;
}

/**
 * The week to recap: the current one once it has a class in it, otherwise
 * last week (so Monday morning still has something warm to show).
 */
export function computeRecap(
  facts: AttendanceFact[],
  target: number,
  now: Date,
): RecapCore {
  const goal = clampGoal(target);
  const attended = attendedFacts(facts).filter(
    (f) => new Date(f.startsAt).getTime() <= now.getTime(),
  );
  const w0 = startOfWeek(now);
  const inRange = (f: AttendanceFact, ws: Date) => {
    const t = new Date(f.startsAt).getTime();
    return t >= ws.getTime() && t < addDays(ws, 7).getTime();
  };
  const currentList = attended.filter((f) => inRange(f, w0));
  const scope: RecapCore["scope"] = currentList.length > 0 ? "current" : "last";
  const ws = scope === "current" ? w0 : addDays(w0, -7);
  const list = scope === "current" ? currentList : attended.filter((f) => inRange(f, ws));

  // First-ever visit to a studio inside this week.
  const firstVisit = new Map<string, string>();
  for (const f of attended) {
    if (!firstVisit.has(f.studioId)) firstVisit.set(f.studioId, f.startsAt);
  }
  const firstTimeStudioId = list.find(
    (f) => firstVisit.get(f.studioId) === f.startsAt,
  )?.studioId;

  return {
    scope,
    weekStart: ws.toISOString(),
    weekEnd: addDays(ws, 7).toISOString(),
    attended: list.length,
    target: goal,
    met: list.length >= goal,
    minutes: list.reduce((a, f) => a + f.durationMin, 0),
    categoryIds: [...new Set(list.map((f) => f.categoryId))],
    studioIds: [...new Set(list.map((f) => f.studioId))],
    firstTimeStudioId,
    streakWeeks: computeStreak(facts, now).weeks,
  };
}

/* -------------------------------- Routine --------------------------------- */

/**
 * "Your usual slot": the (weekday, time-of-day band, studio) combination
 * attended most often in the lookback window, when it happened at least
 * ROUTINE_MIN_COUNT times. Ties go to the most recent pattern.
 */
export function inferRoutine(facts: AttendanceFact[], now: Date): RoutineSignal | null {
  const since = now.getTime() - ROUTINE_LOOKBACK_WEEKS * 7 * DAY_MS;
  const recent = attendedFacts(facts).filter((f) => {
    const t = new Date(f.startsAt).getTime();
    return t >= since && t <= now.getTime();
  });
  const groups = new Map<
    string,
    { weekday: number; band: HourBand; studioId: string; hours: number[]; classTypeId: string; last: string }
  >();
  for (const f of recent) {
    const d = new Date(f.startsAt);
    const band = hourBand(d.getHours());
    const key = `${d.getDay()}:${band}:${f.studioId}`;
    const g = groups.get(key);
    if (g) {
      g.hours.push(d.getHours());
      g.classTypeId = f.classTypeId; // most recent wins (list is oldest-first)
      g.last = f.startsAt;
    } else {
      groups.set(key, {
        weekday: d.getDay(),
        band,
        studioId: f.studioId,
        hours: [d.getHours()],
        classTypeId: f.classTypeId,
        last: f.startsAt,
      });
    }
  }
  const best = [...groups.values()]
    .filter((g) => g.hours.length >= ROUTINE_MIN_COUNT)
    .sort((a, b) => b.hours.length - a.hours.length || b.last.localeCompare(a.last))[0];
  if (!best) return null;
  const hour = Math.round(best.hours.reduce((a, h) => a + h, 0) / best.hours.length);
  return {
    weekday: best.weekday,
    hour,
    studioId: best.studioId,
    classTypeId: best.classTypeId,
    count: best.hours.length,
  };
}

/* --------------------------------- Nudges --------------------------------- */

export function isMuted(prefs: EngagementPrefs, now: Date): boolean {
  if (!prefs.nudgesEnabled) return true;
  if (!prefs.nudgesMutedUntil) return false;
  return new Date(prefs.nudgesMutedUntil).getTime() > now.getTime();
}

/** Stable id: one nudge of a kind per week, at most. */
export function nudgeId(kind: NudgeKind, now: Date): string {
  return `${kind}:${weekKey(now)}`;
}

export interface NudgePlanInput {
  facts: AttendanceFact[];
  target: number;
  now: Date;
  prefs: EngagementPrefs;
  /** The member already has a future reservation. */
  hasUpcomingReservation: boolean;
  hasRoutine: boolean;
}

/**
 * Which nudge kinds apply right now, most relevant first. The service picks
 * the first one it can materialize (e.g. an actually bookable session).
 *
 * Nothing here escalates: once the week's goal is met there is no booking
 * nudge at all, and heavy weeks produce an EASE-OFF message, not a push.
 */
export function planNudges(input: NudgePlanInput): NudgeKind[] {
  const { facts, target, now, prefs, hasUpcomingReservation, hasRoutine } = input;
  if (isMuted(prefs, now)) return [];

  const kinds: NudgeKind[] = [];
  const counts = weeklyAttendance(facts, now, 4);
  const heavyWeeks = counts.filter((c) => c >= EASE_OFF_WEEKLY_CLASSES).length;
  if (heavyWeeks >= EASE_OFF_WEEKS_REQUIRED) {
    // Frequent trainer: the only message is "a lighter week is a good idea".
    return ["ease_off"];
  }

  const progress = computeWeeklyProgress(facts, target, now);
  if (progress.met) return [];

  const attended = attendedFacts(facts).filter(
    (f) => new Date(f.startsAt).getTime() <= now.getTime(),
  );
  const last = attended[attended.length - 1];
  const quietDays = last
    ? (now.getTime() - new Date(last.startsAt).getTime()) / DAY_MS
    : Infinity;

  if (last && quietDays >= BEEN_A_WHILE_DAYS && !hasUpcomingReservation) {
    kinds.push("been_a_while");
  }
  if (hasRoutine) kinds.push("usual_slot");
  else if (last && !hasUpcomingReservation) kinds.push("rebook_last");
  return kinds;
}
