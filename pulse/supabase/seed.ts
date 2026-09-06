/**
 * Seed a hosted Supabase project so it matches mock mode exactly.
 *
 *   npm run db:seed
 *
 * Needs, in .env.local (or the environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     ← server-only, never shipped to the browser
 *
 * Idempotent: every row is upserted on its primary key and auth users are
 * created only if missing, so running it twice changes nothing. Sessions are
 * generated relative to "now", so re-run it whenever the demo schedule has
 * drifted into the past.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database } from "@/lib/supabase/database.types";
import {
  buildSeedRows,
  SEED_CONFLICT_TARGET,
  SEED_ORDER,
  type SeedRows,
} from "./seed-data";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "pulse-demo-2026";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.example to .env.local and fill both in (the service-role key\n" +
      "is under Project Settings → API → service_role).",
  );
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthUsers(rows: SeedRows): Promise<void> {
  // One page is plenty for a demo project; bump perPage if the catalog grows.
  const { data: existing, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const byId = new Map(existing.users.map((u) => [u.id, u]));
  const byEmail = new Map(existing.users.map((u) => [u.email?.toLowerCase() ?? "", u]));

  let created = 0;
  for (const user of rows.users) {
    if (byId.has(user.id)) continue;
    const clash = byEmail.get(user.email.toLowerCase());
    if (clash) {
      throw new Error(
        `Auth user ${user.email} already exists with a different id (${clash.id}). ` +
          `Delete it, or seed into a fresh project.`,
      );
    }
    const { error: createError } = await admin.auth.admin.createUser({
      // The id is derived deterministically from the mock id, so profiles and
      // every foreign key line up on a re-run.
      id: user.id,
      email: user.email,
      // Only the two demo accounts are meant to be signed into.
      password: user.isDemo ? demoPassword : crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { display_name: user.displayName, role: user.role },
    });
    if (createError) throw createError;
    created++;
  }
  console.log(`  auth users: ${created} created, ${rows.users.length - created} already present`);
}

async function upsertAll(rows: SeedRows): Promise<void> {
  for (const table of SEED_ORDER) {
    const data = rows[table] as Record<string, unknown>[];
    if (!data || data.length === 0) continue;
    const onConflict = SEED_CONFLICT_TARGET[table];

    // Chunked: PostgREST payload limits bite around a few thousand rows.
    const CHUNK = 500;
    for (let i = 0; i < data.length; i += CHUNK) {
      const slice = data.slice(i, i + CHUNK);
      const query = admin.from(table as never);
      const { error } = await (onConflict
        ? query.upsert(slice as never, { onConflict })
        : query.insert(slice as never));
      if (error) {
        throw new Error(`${table}: ${error.message}${error.hint ? ` (${error.hint})` : ""}`);
      }
    }
    console.log(`  ${table}: ${data.length}`);
  }
}

async function main(): Promise<void> {
  console.log(`Seeding ${url} …`);
  const rows = buildSeedRows(new Date());
  await ensureAuthUsers(rows);
  await upsertAll(rows);
  console.log(
    "\nDone. Sign in with the demo accounts:\n" +
      `  member: ${rows.users.find((u) => u.isDemo && u.role === "member")?.email}\n` +
      `  studio: ${rows.users.find((u) => u.isDemo && u.role === "studio_owner")?.email}\n` +
      `  password: ${demoPassword}\n\n` +
      "Set NEXT_PUBLIC_USE_MOCK=false and restart the dev server to use it.",
  );
}

main().catch((err: unknown) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
