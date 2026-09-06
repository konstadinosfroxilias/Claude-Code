/* The healthy-by-design invariants, tested directly against the pure rules.
   These are the non-negotiables: week-based goals, rest tolerance, no
   escalation, ease-off for frequent trainers, opt-in/muteable nudges. */
import {
  clampGoal,
  computeStreak,
  computeWeeklyProgress,
  evaluateAchievements,
  GOAL_MAX,
  GOAL_MIN,
  planNudges,
  startOfWeek,
  type AttendanceFact,
} from "@/lib/rules/engagement";
import type { EngagementPrefs } from "@/lib/types";
import { addDays } from "@/lib/utils";

let fails = 0;
const check = (name: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) fails++;
};

const NOW = new Date("2026-09-09T14:00:00");
const W0 = startOfWeek(NOW);

/**
 * n attended classes in the week `weeksAgo` weeks back.
 *
 * NOW is Wednesday 14:00, and the rules (rightly) refuse to count a class
 * that hasn't happened yet — so these sit at 08:00 from Monday on, keeping
 * up to three of the CURRENT week safely in the past.
 */
function week(weeksAgo: number, n: number, opts: Partial<AttendanceFact> = {}): AttendanceFact[] {
  const base = addDays(W0, -7 * weeksAgo); // Monday of that week
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(addDays(base, i % 5).setHours(8, 0, 0, 0));
    return {
      bookingId: `b${weeksAgo}_${i}`,
      status: "completed" as const,
      startsAt: day.toISOString(),
      durationMin: 60,
      studioId: `st_${(weeksAgo + i) % 3}`,
      neighborhoodId: `nb_${i % 2}`,
      // Vary across weeks too, so multi-week histories cover >1 category.
      categoryId: (["yoga", "boxing", "pilates"] as const)[(weeksAgo + i) % 3],
      classTypeId: `ct_${(weeksAgo + i) % 3}`,
      createdAt: new Date(day.getTime() - 86_400_000).toISOString(),
      ...opts,
    };
  });
}
const prefs = (over: Partial<EngagementPrefs> = {}): EngagementPrefs => ({
  userId: "u",
  nudgesEnabled: true,
  updatedAt: NOW.toISOString(),
  ...over,
});

console.log("\nGoal bounds — never escalates without limit");
check("clamps below the floor", clampGoal(0) === GOAL_MIN && clampGoal(-3) === GOAL_MIN);
check("clamps at 5, never higher", clampGoal(9) === GOAL_MAX && GOAL_MAX === 5, `max=${GOAL_MAX}`);
check("rejects nonsense to the gentle default", clampGoal(NaN) === 2);

console.log("\nWeek-based progress (never daily)");
{
  const p = computeWeeklyProgress([...week(0, 2)], 3, NOW);
  check("counts only this week's attended classes", p.attended === 2 && p.target === 3, `${p.attended}/${p.target}`);
  check("not met yet, ratio partial", !p.met && Math.abs(p.ratio - 2 / 3) < 1e-9);
  const q = computeWeeklyProgress([...week(0, 3)], 3, NOW);
  check("met at target", q.met && q.ratio === 1);
  const r = computeWeeklyProgress([...week(1, 5)], 3, NOW);
  check("last week's classes don't count toward this week", r.attended === 0);
}

console.log("\nStreak — rest is part of fitness");
{
  const s = computeStreak([...week(0, 1), ...week(1, 2), ...week(2, 2)], NOW);
  check("consecutive active weeks accumulate", s.weeks === 3 && s.state === "on_track", `${s.weeks}/${s.state}`);
  // one quiet week in the middle
  const rest = computeStreak([...week(0, 1), ...week(1, 2), ...week(3, 2), ...week(4, 2)], NOW);
  check("ONE rest week preserves the streak", rest.weeks === 4, `${rest.weeks}`);
  // two quiet weeks in a row end the run
  const broken = computeStreak([...week(0, 1), ...week(1, 1), ...week(4, 3), ...week(5, 3)], NOW);
  check("two quiet weeks end the run (no rest-week stacking)", broken.weeks === 2, `${broken.weeks}`);
  // quiet current week after an active last week is "building", not failure
  const building = computeStreak([...week(1, 2), ...week(2, 2)], NOW);
  check("quiet current week reads as 'building', never a loss", building.state === "building" && building.weeks === 2, building.state);
  // last week off too → "rested", still not a loss
  const rested = computeStreak([...week(2, 2), ...week(3, 2)], NOW);
  check("a taken rest week reads as 'rested'", rested.state === "rested" && rested.weeks === 2, rested.state);
  const fresh = computeStreak([], NOW);
  check("no history is a fresh start, not a zero streak failure", fresh.state === "fresh_start" && fresh.weeks === 0);
  check("longest is remembered", computeStreak([...week(3, 2), ...week(4, 2), ...week(5, 2)], NOW).longest >= 3);
}

console.log("\nNudges — opt-in, muteable, and they ease off");
{
  const heavy = [...week(0, 1), ...week(1, 5), ...week(2, 6), ...week(3, 5)];
  const easeOff = planNudges({
    facts: heavy, target: 3, now: NOW, prefs: prefs(),
    hasUpcomingReservation: false, hasRoutine: true,
  });
  check("frequent trainer gets EASE-OFF and nothing else", easeOff.length === 1 && easeOff[0] === "ease_off", easeOff.join(","));

  const metWeek = planNudges({
    facts: [...week(0, 3)], target: 3, now: NOW, prefs: prefs(),
    hasUpcomingReservation: false, hasRoutine: true,
  });
  check("goal already met → no booking nudge at all", metWeek.length === 0);

  const offByDefault = planNudges({
    facts: [...week(1, 2)], target: 3, now: NOW, prefs: prefs({ nudgesEnabled: false }),
    hasUpcomingReservation: false, hasRoutine: true,
  });
  check("not opted in → silent", offByDefault.length === 0);

  const muted = planNudges({
    facts: [...week(1, 2)], target: 3, now: NOW,
    prefs: prefs({ nudgesMutedUntil: addDays(NOW, 5).toISOString() }),
    hasUpcomingReservation: false, hasRoutine: true,
  });
  check("muted → silent", muted.length === 0);

  const unmuted = planNudges({
    facts: [...week(1, 2)], target: 3, now: NOW,
    prefs: prefs({ nudgesMutedUntil: addDays(NOW, -1).toISOString() }),
    hasUpcomingReservation: false, hasRoutine: true,
  });
  check("mute expires on its own", unmuted.length > 0, unmuted.join(","));

  const quiet = planNudges({
    facts: [...week(3, 2)], target: 3, now: NOW, prefs: prefs(),
    hasUpcomingReservation: false, hasRoutine: false,
  });
  check("after a long quiet stretch → kind 'been a while' first", quiet[0] === "been_a_while", quiet.join(","));

  const recentGap = planNudges({
    facts: [...week(1, 2)], target: 3, now: NOW, prefs: prefs(),
    hasUpcomingReservation: false, hasRoutine: false,
  });
  check("a normal week's gap does NOT trigger 'been a while'", !recentGap.includes("been_a_while"), recentGap.join(","));

  const booked = planNudges({
    facts: [...week(3, 2)], target: 3, now: NOW, prefs: prefs(),
    hasUpcomingReservation: true, hasRoutine: false,
  });
  check("already has something booked → no chasing", !booked.includes("been_a_while"), booked.join(","));
}

console.log("\nAchievements — earned from healthy behaviour only");
{
  const facts = [...week(1, 2), ...week(2, 2), ...week(3, 2)];
  const evals = evaluateAchievements(facts, 2, NOW);
  const by = (id: string) => evals.find((e) => e.id === id)!;
  check("first booking + first check-in unlock", by("first_booking").achieved && by("first_checkin").achieved);
  check("5-class badge tracks real attendance", by("classes_5").achieved && by("classes_5").progress === 5, `${by("classes_5").progress}/5`);
  check("25-class badge still locked with honest progress", !by("classes_25").achieved && by("classes_25").progress === 6);
  check("variety badge counts distinct categories", by("three_categories").achieved,
    `${by("three_categories").progress}/3`);
  check("variety badge stays locked on a single-category history",
    !evaluateAchievements(week(1, 4, { categoryId: "yoga" }), 2, NOW).find((e) => e.id === "three_categories")!.achieved);
  check("goal_week uses the member's OWN target", by("goal_week").achieved);
  const none = evaluateAchievements([], 2, NOW);
  check("no history unlocks nothing", none.every((e) => !e.achieved));
  check("catalog has no volume-extreme or appearance badge",
    evals.every((e) => !/weight|calorie|body|shred|daily/i.test(e.id)));
}

console.log(fails === 0 ? "\nRULES: ALL GOOD ✔" : `\nRULES: ${fails} FAILURE(S) ✗`);
process.exit(fails === 0 ? 0 : 1);
