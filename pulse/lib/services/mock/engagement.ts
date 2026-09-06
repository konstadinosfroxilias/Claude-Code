/**
 * Mock EngagementService. Persists only goals, achievement unlocks, nudge
 * prefs and nudge deliveries; everything else is derived on read through the
 * pure rules in lib/rules/engagement.ts (shared with the Supabase impl).
 */
import { mockDb } from "@/lib/mock/db";
import { buildAttendanceFacts } from "@/lib/mock/facts";
import {
  ACHIEVEMENTS,
  clampGoal,
  computeInsights,
  computeRecap,
  computeStreak,
  computeWeeklyProgress,
  evaluateAchievements,
  GOAL_DEFAULT,
  hourBand,
  inferRoutine,
  nudgeId,
  planNudges,
  type AttendanceFact,
} from "@/lib/rules/engagement";
import type {
  AchievementView,
  CategoryId,
  DiscoverySuggestion,
  EngagementPrefs,
  MemberGoal,
  RoutineSignal,
  RoutineSuggestion,
  Session,
  SessionView,
} from "@/lib/types";
import type { DBState } from "@/lib/mock/db";
import type { Services } from "../types";
import {
  bookableView,
  isActiveBooking,
  pushNotification,
  READ_MS,
  simulate,
  WRITE_MS,
} from "./helpers";

const db = mockDb;
const DAY_MS = 86_400_000;

function goalFor(state: DBState, userId: string): MemberGoal {
  return (
    state.goals.find((g) => g.userId === userId) ?? {
      userId,
      weeklyTarget: GOAL_DEFAULT,
      updatedAt: new Date(0).toISOString(),
    }
  );
}

function prefsFor(state: DBState, userId: string): EngagementPrefs {
  return (
    state.engagementPrefs.find((p) => p.userId === userId) ?? {
      userId,
      nudgesEnabled: false,
      updatedAt: new Date(0).toISOString(),
    }
  );
}

function factsFor(state: DBState, userId: string): AttendanceFact[] {
  return buildAttendanceFacts(state, userId);
}

function hasUpcomingReservation(state: DBState, userId: string, now: Date) {
  return state.bookings.some((b) => {
    if (b.userId !== userId || b.status !== "reserved") return false;
    const s = state.sessions.find((x) => x.id === b.sessionId);
    return !!s && new Date(s.startsAt).getTime() > now.getTime();
  });
}

function achievementViews(
  state: DBState,
  userId: string,
  now: Date,
): AchievementView[] {
  const evals = evaluateAchievements(
    factsFor(state, userId),
    goalFor(state, userId).weeklyTarget,
    now,
  );
  const unlocked = new Map(
    state.memberAchievements
      .filter((m) => m.userId === userId)
      .map((m) => [m.achievementId, m.unlockedAt] as const),
  );
  return ACHIEVEMENTS.map((achievement) => {
    const ev = evals.find((e) => e.id === achievement.id);
    const unlockedAt = unlocked.get(achievement.id);
    const target = achievement.target ?? ev?.target ?? 1;
    return {
      achievement,
      unlockedAt,
      progress: unlockedAt ? target : Math.min(target, ev?.progress ?? 0),
    };
  }).sort((a, b) => a.achievement.order - b.achievement.order);
}

/** Next session at the routine's studio, same weekday & time band, within 8 days. */
function findRoutineSession(
  state: DBState,
  userId: string,
  signal: RoutineSignal,
  now: Date,
): SessionView | null {
  const from = now.getTime() + 60 * 60_000;
  const until = now.getTime() + 8 * DAY_MS;
  const candidates = state.sessions
    .filter((s) => {
      if (s.studioId !== signal.studioId || s.status !== "scheduled") return false;
      const t = new Date(s.startsAt);
      if (t.getTime() < from || t.getTime() > until) return false;
      return (
        t.getDay() === signal.weekday && hourBand(t.getHours()) === hourBand(signal.hour)
      );
    })
    .sort(
      (a, b) =>
        Math.abs(new Date(a.startsAt).getHours() - signal.hour) -
          Math.abs(new Date(b.startsAt).getHours() - signal.hour) ||
        a.startsAt.localeCompare(b.startsAt),
    );
  for (const s of candidates) {
    const v = bookableView(state, userId, s, now);
    if (v) return v;
  }
  return null;
}

/** Next bookable occurrence of the same class type within 14 days. */
function findRebookSession(
  state: DBState,
  userId: string,
  last: AttendanceFact,
  now: Date,
): SessionView | null {
  const from = now.getTime() + 60 * 60_000;
  const until = now.getTime() + 14 * DAY_MS;
  const candidates = state.sessions
    .filter((s) => {
      if (s.classTypeId !== last.classTypeId || s.status !== "scheduled") return false;
      const t = new Date(s.startsAt).getTime();
      return t >= from && t <= until;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const s of candidates) {
    const v = bookableView(state, userId, s, now);
    if (v) return v;
  }
  return null;
}

function routineFor(state: DBState, userId: string, now: Date): RoutineSuggestion | null {
  const facts = factsFor(state, userId);
  const signal = inferRoutine(facts, now);
  if (signal) {
    const session = findRoutineSession(state, userId, signal, now);
    if (session) return { basis: "usual_slot", signal, session };
  }
  const attended = facts
    .filter((f) => f.status === "completed" || f.status === "checked_in")
    .filter((f) => new Date(f.startsAt).getTime() <= now.getTime())
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const last = attended[0];
  if (!last) return null;
  const session = findRebookSession(state, userId, last, now);
  return session ? { basis: "last_class", session } : null;
}

export const engagement: Services["engagement"] = {
  async getGoal(userId) {
    await simulate(READ_MS);
    return goalFor(db.get(), userId);
  },

  async setGoal(userId, weeklyTarget) {
    await simulate(WRITE_MS);
    const target = clampGoal(weeklyTarget);
    db.mutate((state) => {
      const now = new Date().toISOString();
      const g = state.goals.find((x) => x.userId === userId);
      if (g) {
        g.weeklyTarget = target;
        g.updatedAt = now;
      } else {
        state.goals.push({ userId, weeklyTarget: target, updatedAt: now });
      }
    });
    return goalFor(db.get(), userId);
  },

  async getSummary(userId) {
    await simulate(READ_MS);
    const state = db.get();
    const now = new Date();
    const goal = goalFor(state, userId);
    const facts = factsFor(state, userId);
    return {
      goal,
      progress: computeWeeklyProgress(facts, goal.weeklyTarget, now),
      streak: computeStreak(facts, now),
    };
  },

  async listAchievements(userId) {
    await simulate(READ_MS);
    return achievementViews(db.get(), userId, new Date());
  },

  async syncAchievements(userId) {
    const now = new Date();
    const state = db.get();
    const evals = evaluateAchievements(
      factsFor(state, userId),
      goalFor(state, userId).weeklyTarget,
      now,
    );
    const have = new Set(
      state.memberAchievements
        .filter((m) => m.userId === userId)
        .map((m) => m.achievementId),
    );
    const fresh = evals.filter((e) => e.achieved && !have.has(e.id));
    if (fresh.length === 0) return [];
    // Only write when something actually changed — a no-op write would emit
    // on the change feed and trigger a refetch loop.
    db.mutate((s) => {
      for (const e of fresh) {
        s.memberAchievements.push({
          userId,
          achievementId: e.id,
          unlockedAt: e.achievedAt ?? now.toISOString(),
        });
      }
    });
    const views = achievementViews(db.get(), userId, now);
    return fresh
      .map((e) => views.find((v) => v.achievement.id === e.id))
      .filter((v): v is AchievementView => !!v);
  },

  async getProgressInsights(userId) {
    await simulate(READ_MS);
    const state = db.get();
    const core = computeInsights(factsFor(state, userId), new Date());
    const fav = core.favoriteStudioId
      ? state.studios.find((s) => s.id === core.favoriteStudioId)
      : undefined;
    const { favoriteStudioId, favoriteStudioCount, ...rest } = core;
    void favoriteStudioId;
    return {
      ...rest,
      favoriteStudio: fav
        ? { studioId: fav.id, name: fav.name, count: favoriteStudioCount }
        : undefined,
    };
  },

  async getWeeklyRecap(userId) {
    await simulate(READ_MS);
    const state = db.get();
    const core = computeRecap(
      factsFor(state, userId),
      goalFor(state, userId).weeklyTarget,
      new Date(),
    );
    const name = (id: string) => state.studios.find((s) => s.id === id)?.name;
    const { studioIds, firstTimeStudioId, ...rest } = core;
    return {
      ...rest,
      studioNames: studioIds.map(name).filter((n): n is string => !!n),
      firstTimeStudio: firstTimeStudioId ? name(firstTimeStudioId) : undefined,
    };
  },

  async getPrefs(userId) {
    return prefsFor(db.get(), userId);
  },

  async setPrefs(userId, patch) {
    await simulate(WRITE_MS);
    db.mutate((state) => {
      const now = new Date().toISOString();
      const p = state.engagementPrefs.find((x) => x.userId === userId);
      if (p) {
        Object.assign(p, patch, { updatedAt: now });
        if (patch.nudgesMutedUntil === undefined && "nudgesMutedUntil" in patch)
          delete p.nudgesMutedUntil;
      } else {
        state.engagementPrefs.push({
          userId,
          nudgesEnabled: patch.nudgesEnabled ?? false,
          nudgesMutedUntil: patch.nudgesMutedUntil,
          updatedAt: now,
        });
      }
    });
    return prefsFor(db.get(), userId);
  },

  async getNudges(userId) {
    await simulate(80);
    const state = db.get();
    const now = new Date();
    const facts = factsFor(state, userId);
    const routine = inferRoutine(facts, now);
    const kinds = planNudges({
      facts,
      target: goalFor(state, userId).weeklyTarget,
      now,
      prefs: prefsFor(state, userId),
      hasUpcomingReservation: hasUpcomingReservation(state, userId, now),
      hasRoutine: !!routine,
    });
    for (const kind of kinds) {
      const id = nudgeId(kind, now);
      if (kind === "ease_off" || kind === "been_a_while") {
        return [{ id, kind }];
      }
      const suggestion = routineFor(state, userId, now);
      if (!suggestion) continue;
      if (kind === "usual_slot" && suggestion.basis !== "usual_slot") continue;
      return [{ id, kind, session: suggestion.session }];
    }
    return [];
  },

  async markNudgeDelivered(userId, id, notification) {
    const state = db.get();
    if (state.nudgeDeliveries.some((d) => d.userId === userId && d.nudgeId === id))
      return false;
    db.mutate((s) => {
      s.nudgeDeliveries.push({
        userId,
        nudgeId: id,
        deliveredAt: new Date().toISOString(),
      });
      if (notification) {
        pushNotification(s, { userId, kind: "habit", ...notification });
      }
    });
    return true;
  },

  async getRoutine(userId) {
    await simulate(READ_MS);
    return routineFor(db.get(), userId, new Date());
  },

  async listDiscoveries(userId, opts) {
    await simulate(READ_MS);
    const state = db.get();
    const now = new Date();
    const limit = opts?.limit ?? 6;

    const mine = state.bookings.filter(
      (b) => b.userId === userId && isActiveBooking(b),
    );
    const triedStudios = new Set(mine.map((b) => b.studioId));
    const triedCategories = new Set<CategoryId>();
    const triedHoods = new Set<string>();
    for (const b of mine) {
      const s = state.sessions.find((x) => x.id === b.sessionId);
      const ct = state.classTypes.find((c) => c.id === s?.classTypeId);
      const st = state.studios.find((x) => x.id === b.studioId);
      if (ct) triedCategories.add(ct.categoryId);
      if (st) triedHoods.add(st.neighborhoodId);
    }

    const untilMs = now.getTime() + 7 * DAY_MS;
    const beginnerSession = (studioId: string): SessionView | undefined => {
      const list = state.sessions
        .filter((s) => {
          if (s.studioId !== studioId || s.status !== "scheduled") return false;
          const t = new Date(s.startsAt).getTime();
          if (t > untilMs) return false;
          const ct = state.classTypes.find((c) => c.id === s.classTypeId);
          return !!ct && (ct.level === "beginner" || ct.level === "all");
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      for (const s of list) {
        const v = bookableView(state, userId, s as Session, now);
        if (v) return v;
      }
      return undefined;
    };

    const rank = (r: DiscoverySuggestion["reason"]) =>
      r === "untried_category" ? 0 : r === "new_neighborhood" ? 1 : 2;

    return state.studios
      .filter((s) => !triedStudios.has(s.id))
      .filter((s) => !opts?.cityId || s.cityId === opts.cityId)
      .map((studio): DiscoverySuggestion => {
        const newCat = studio.categoryIds.find((c) => !triedCategories.has(c));
        const reason: DiscoverySuggestion["reason"] = newCat
          ? "untried_category"
          : !triedHoods.has(studio.neighborhoodId)
            ? "new_neighborhood"
            : "untried_studio";
        return {
          reason,
          studio,
          categoryId: newCat ?? studio.categoryIds[0],
          session: beginnerSession(studio.id),
        };
      })
      .sort(
        (a, b) =>
          rank(a.reason) - rank(b.reason) ||
          Number(!!b.session) - Number(!!a.session) ||
          b.studio.rating - a.studio.rating,
      )
      .slice(0, limit);
  },
};
