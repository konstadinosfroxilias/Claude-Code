/**
 * End-to-end smoke test against a REAL Supabase project, through the very same
 * service layer the UI uses. Run it right after seeding to prove the wiring:
 *
 *   npm run db:smoke
 *
 * It signs in as the demo member with the ANON key (so RLS is fully in force),
 * then books, checks the ledger, and cancels — leaving the data as it found it.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

// The service layer picks its backend from this flag, so force Supabase even
// if .env.local is currently set to mock.
process.env.NEXT_PUBLIC_USE_MOCK = "false";

async function main(): Promise<void> {
  const { supabaseServices: svc } = await import("@/lib/services/supabase");

  let fails = 0;
  const check = (name: string, ok: boolean, extra = "") => {
    console.log(`${ok ? "  ✓" : "  ✗"} ${name}${extra ? " — " + extra : ""}`);
    if (!ok) fails++;
  };

  console.log("\nSigning in as the demo member …");
  const user = await svc.auth.signInAsDemo("member");
  check("demo sign-in works under RLS", !!user.id, user.name);

  const studios = await svc.catalog.listStudios();
  check("catalog loads", studios.length > 0, `${studios.length} studios`);

  const wallet = await svc.wallet.getSummary(user.id);
  check("wallet balance derives from the ledger", wallet.balance > 0, `${wallet.balance} credits`);

  const summary = await svc.engagement.getSummary(user.id);
  check(
    "engagement summary",
    summary.goal.weeklyTarget >= 1,
    `goal ${summary.progress.attended}/${summary.progress.target}, streak ${summary.streak.weeks} (${summary.streak.state})`,
  );

  const achievements = await svc.engagement.listAchievements(user.id);
  check(
    "achievements",
    achievements.some((a) => a.unlockedAt),
    `${achievements.filter((a) => a.unlockedAt).length}/${achievements.length} unlocked`,
  );

  const insights = await svc.engagement.getProgressInsights(user.id);
  check("progress insights", insights.classesAllTime > 0,
    `${insights.classesAllTime} classes, ${insights.minutesAllTime} min moved`);

  // Find something bookable and run the full money path.
  const soon = await svc.catalog.listOpenSessions({
    dayISO: new Date(Date.now() + 86_400_000).toISOString(),
    limit: 25,
  });
  const candidate = soon.find((s) => s.spotsLeft > 0);
  check("found a bookable session", !!candidate, candidate?.classType.name);

  if (candidate) {
    const before = (await svc.wallet.getSummary(user.id)).balance;
    const booked = await svc.booking.reserve(user.id, candidate.session.id);
    check("booking created", booked.booking.status === "reserved");

    const after = (await svc.wallet.getSummary(user.id)).balance;
    check("credits deducted as a pending spend", after === before - booked.booking.creditCost,
      `${before} → ${after}`);

    const txs = await svc.wallet.listTransactions(user.id);
    check("pending ledger row written",
      txs.some((t) => t.bookingId === booked.booking.id && t.status === "pending"));

    const cap = await svc.booking.visitCapStatus(user.id, booked.studio.id);
    check("visit cap reported", cap.cap === 4, `${cap.used}/${cap.cap}`);

    await svc.booking.cancel(booked.booking.id);
    const restored = (await svc.wallet.getSummary(user.id)).balance;
    check("cancellation refunded the hold", restored === before, `${after} → ${restored}`);
  }

  await svc.auth.signOut();
  console.log(fails === 0 ? "\nSMOKE TEST: ALL GOOD ✔\n" : `\nSMOKE TEST: ${fails} FAILURE(S) ✗\n`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error("\nSmoke test failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
