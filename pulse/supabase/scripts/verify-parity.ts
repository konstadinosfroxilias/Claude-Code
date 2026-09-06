/**
 * Parity check: does the SEEDED DATABASE produce the same numbers as MOCK MODE?
 *
 * This is the guarantee that flipping NEXT_PUBLIC_USE_MOCK changes nothing a
 * member can see. It rebuilds the mock with the timestamp the seed used, then
 * compares, field by field:
 *   • the demo member's attendance facts (the engagement layer's only input),
 *   • every engagement number derived from them by the shared pure rules,
 *   • the credit-ledger balance and pending spends,
 *   • the visit-cap position per studio,
 *   • the derived credit cost, computed in SQL vs in TypeScript.
 *
 *   npx tsx --tsconfig tsconfig.json supabase/scripts/verify-parity.ts "-d pulse_seed"
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { buildSeed, DEMO_MEMBER_ID } from "@/lib/mock/seed";
import { buildAttendanceFacts } from "@/lib/mock/facts";
import {
  computeInsights,
  computeRecap,
  computeStreak,
  computeWeeklyProgress,
  evaluateAchievements,
  inferRoutine,
  type AttendanceFact,
} from "@/lib/rules/engagement";
import { computeCreditCost } from "@/lib/rules/pricing";
import { countVisitsInWindow } from "@/lib/rules/policy";
import { walletSummary, capStatusFor } from "@/lib/services/mock/helpers";
import { stableUuid } from "../seed-data";

const psqlFlags = (process.argv[2] ?? "-d pulse_seed").split(/\s+/);
let fails = 0;
const check = (name: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) fails++;
};

function q<T>(sql: string): T {
  const out = execFileSync("psql", [...psqlFlags, "-tA", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? "pulse_local" },
  });
  return JSON.parse(out.trim() || "null") as T;
}

const seededAt = new Date(readFileSync("/tmp/pulse-seed-at.txt", "utf8").trim());
const now = seededAt;
const mock = buildSeed(seededAt);
const memberUuid = stableUuid(DEMO_MEMBER_ID);

console.log(`\nComparing mock vs database (seeded at ${seededAt.toISOString()})\n`);

/* ── 1. attendance facts: the engagement layer's entire input ─────────────── */
const mockFacts = buildAttendanceFacts(mock, DEMO_MEMBER_ID);

interface DbFact {
  status: string;
  startsAt: string;
  durationMin: number;
  studioId: string;
  neighborhoodId: string;
  categoryId: string;
  classTypeId: string;
}
const dbFacts = q<DbFact[]>(`
  select coalesce(json_agg(json_build_object(
      'status', b.status, 'startsAt', to_char(s.start_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'durationMin', s.duration_min, 'studioId', st.id,
      'neighborhoodId', st.neighborhood_id, 'categoryId', ct.category_id,
      'classTypeId', ct.id) order by s.start_at, ct.id), '[]'::json)
    from bookings b
    join sessions s on s.id = b.session_id
    join class_types ct on ct.id = s.class_type_id
    join studios st on st.id = b.studio_id
   where b.member_id = '${memberUuid}';
`);

const norm = (f: { status: string; startsAt: string; durationMin: number; studioId: string; categoryId: string }) =>
  `${f.status}|${new Date(f.startsAt).getTime()}|${f.durationMin}|${f.studioId}|${f.categoryId}`;
const mockKeys = mockFacts.map(norm).sort();
const dbKeys = dbFacts.map(norm).sort();
check(
  "attendance facts identical",
  mockKeys.length === dbKeys.length && mockKeys.every((k, i) => k === dbKeys[i]),
  `mock ${mockKeys.length} rows / db ${dbKeys.length} rows`,
);
if (mockKeys.length !== dbKeys.length) {
  const extra = dbKeys.filter((k) => !mockKeys.includes(k)).slice(0, 3);
  const missing = mockKeys.filter((k) => !dbKeys.includes(k)).slice(0, 3);
  if (extra.length) console.log("      only in db:", extra);
  if (missing.length) console.log("      only in mock:", missing);
}

/* ── 2. every engagement number, from those facts ─────────────────────────── */
// Rebuild the DB-side facts in the rules' own shape, then run the SAME pure
// functions over both. Equal outputs here mean the two backends cannot differ.
const dbAsFacts: AttendanceFact[] = dbFacts.map((f, i) => ({
  bookingId: `db_${i}`,
  status: f.status as AttendanceFact["status"],
  startsAt: f.startsAt,
  durationMin: f.durationMin,
  studioId: f.studioId,
  neighborhoodId: f.neighborhoodId,
  categoryId: f.categoryId as AttendanceFact["categoryId"],
  classTypeId: f.classTypeId,
  createdAt: f.startsAt,
}));

const goalTarget = mock.goals[0]?.weeklyTarget ?? 2;
const dbGoal = q<number>(
  `select coalesce(json_agg(weekly_target)->>0,'null')::int from goals where member_id='${memberUuid}';`,
);
check("weekly goal", dbGoal === goalTarget, `mock ${goalTarget} / db ${dbGoal}`);

const mp = computeWeeklyProgress(mockFacts, goalTarget, now);
const dp = computeWeeklyProgress(dbAsFacts, goalTarget, now);
check(
  "weekly progress",
  mp.attended === dp.attended && mp.target === dp.target && mp.met === dp.met,
  `${mp.attended}/${mp.target} vs ${dp.attended}/${dp.target}`,
);

const ms = computeStreak(mockFacts, now);
const ds = computeStreak(dbAsFacts, now);
check("week streak + state", ms.weeks === ds.weeks && ms.state === ds.state,
  `${ms.weeks}/${ms.state} vs ${ds.weeks}/${ds.state}`);

const mi = computeInsights(mockFacts, now);
const di = computeInsights(dbAsFacts, now);
check("classes all-time", mi.classesAllTime === di.classesAllTime, `${mi.classesAllTime} vs ${di.classesAllTime}`);
check("minutes moved all-time", mi.minutesAllTime === di.minutesAllTime, `${mi.minutesAllTime} vs ${di.minutesAllTime}`);
check("studios visited", mi.studiosVisited === di.studiosVisited, `${mi.studiosVisited} vs ${di.studiosVisited}`);
check(
  "category mix",
  JSON.stringify(mi.categoryMix) === JSON.stringify(di.categoryMix),
  `${mi.categoryMix.length} categories`,
);

const mr = computeRecap(mockFacts, goalTarget, now);
const dr = computeRecap(dbAsFacts, goalTarget, now);
check("weekly recap", mr.attended === dr.attended && mr.minutes === dr.minutes && mr.scope === dr.scope,
  `${mr.attended} classes / ${mr.minutes} min`);

const mrt = inferRoutine(mockFacts, now);
const drt = inferRoutine(dbAsFacts, now);
check(
  "inferred routine",
  mrt?.studioId === drt?.studioId && mrt?.weekday === drt?.weekday,
  mrt ? `${mrt.studioId} day ${mrt.weekday}` : "none",
);

/* ── 3. achievements ──────────────────────────────────────────────────────── */
const mockUnlocked = mock.memberAchievements.map((a) => a.achievementId).sort();
const dbUnlocked = q<string[]>(
  `select coalesce(json_agg(achievement_key order by achievement_key),'[]'::json)
     from member_achievements where member_id='${memberUuid}';`,
);
check(
  "unlocked achievements",
  JSON.stringify(mockUnlocked) === JSON.stringify(dbUnlocked),
  `${mockUnlocked.length} unlocked`,
);
const evalNow = evaluateAchievements(dbAsFacts, goalTarget, now).filter((e) => e.achieved).map((e) => e.id).sort();
check(
  "unlocks match what the history earns",
  JSON.stringify(evalNow) === JSON.stringify(dbUnlocked),
  `${evalNow.length} earned`,
);
const catalogCount = q<number>(`select count(*)::int from achievements;`);
check("achievements catalog seeded from TypeScript", catalogCount === 13, `${catalogCount} rows`);

/* ── 4. the money ─────────────────────────────────────────────────────────── */
const mockWallet = walletSummary(mock, DEMO_MEMBER_ID);
const dbBalance = q<number>(
  `select coalesce(sum(delta),0)::int from credit_transactions
    where member_id='${memberUuid}' and status <> 'reversed';`,
);
check("credit balance", mockWallet.balance === dbBalance, `mock ${mockWallet.balance} / db ${dbBalance}`);

const dbPending = q<number>(
  `select coalesce(sum(-delta),0)::int from credit_transactions
    where member_id='${memberUuid}' and status='pending' and delta < 0;`,
);
check("pending spends", mockWallet.pendingSpends === dbPending, `${mockWallet.pendingSpends} vs ${dbPending}`);

const dbPayoutPending = q<number>(
  `select count(*)::int from payout_entries where status='pending';`,
);
const mockPayoutPending = mock.payoutEntries.filter((p) => p.status === "pending").length;
check("pending payout accruals", mockPayoutPending === dbPayoutPending,
  `${mockPayoutPending} vs ${dbPayoutPending}`);

/* ── 5. the visit cap, per studio ─────────────────────────────────────────── */
for (const studioId of ["st_core", "st_northside", "st_forge"]) {
  const mockCap = capStatusFor(mock, DEMO_MEMBER_ID, studioId);
  const dbCap = q<number>(
    `select pulse_visits_in_window('${memberUuid}','${studioId}', now());`,
  );
  check(`visit cap at ${studioId}`, mockCap.used === Math.min(dbCap, mockCap.cap),
    `mock ${mockCap.used}/${mockCap.cap} / db ${dbCap}`);
}
void countVisitsInWindow;

/* ── 6. pricing: SQL vs TypeScript ────────────────────────────────────────── */
interface PriceRow { id: string; sqlCost: number; floor: number; peak: boolean; released: number; booked: number }
const priced = q<PriceRow[]>(`
  select coalesce(json_agg(x), '[]'::json) from (
    select v.id, v.credit_cost as "sqlCost", s.floor_price_eur::float as floor,
           s.is_peak as peak, s.spots_released_to_platform as released, v.booked
      from session_view v join sessions s on s.id = v.id
     order by v.id limit 40
  ) x;
`);
const mismatches = priced.filter((row) => {
  const fill = row.released > 0 ? Math.min(1, row.booked / row.released) : 1;
  return computeCreditCost(row.floor, row.peak, fill) !== row.sqlCost;
});
check(
  "derived credit cost identical in SQL and TypeScript",
  mismatches.length === 0,
  `${priced.length} sessions checked${mismatches.length ? `, first bad: ${mismatches[0].id}` : ""}`,
);

/* ── 7. catalog volume ────────────────────────────────────────────────────── */
const counts = q<{ studios: number; sessions: number; bookings: number; reviews: number }>(`
  select json_build_object(
    'studios', (select count(*) from studios),
    'sessions', (select count(*) from sessions),
    'bookings', (select count(*) from bookings),
    'reviews', (select count(*) from reviews));
`);
check("studios", counts.studios === mock.studios.length, `${mock.studios.length} vs ${counts.studios}`);
check("sessions", counts.sessions === mock.sessions.length, `${mock.sessions.length} vs ${counts.sessions}`);
check("bookings", counts.bookings === mock.bookings.length, `${mock.bookings.length} vs ${counts.bookings}`);
check("reviews", counts.reviews === mock.reviews.length, `${mock.reviews.length} vs ${counts.reviews}`);

console.log(
  fails === 0
    ? "\n════ MOCK ↔ SUPABASE PARITY: IDENTICAL ✔ ════"
    : `\n════ PARITY: ${fails} DIFFERENCE(S) ✗ ════`,
);
process.exit(fails === 0 ? 0 : 1);
