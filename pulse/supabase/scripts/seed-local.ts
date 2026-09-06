/**
 * Seed a LOCAL Postgres (no Supabase platform) from the same row builder the
 * hosted seed uses — the offline half of the parity guarantee.
 *
 *   npx tsx --tsconfig tsconfig.json supabase/scripts/seed-local.ts "psql flags"
 *   e.g. … supabase/scripts/seed-local.ts "-d pulse_test"
 *
 * Writes auth.users directly (the local shim has no GoTrue) and then upserts
 * every table in FK order. Used by the verification pass; a hosted project
 * should use `npm run db:seed`.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  buildSeedRows,
  SEED_CONFLICT_TARGET,
  SEED_ORDER,
  type SeedRows,
} from "../seed-data";

const psqlFlags = (process.argv[2] ?? "-d pulse_test").split(/\s+/);

function lit(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    // text[] for amenities/photos, jsonb for config payloads
    if (value.every((v) => typeof v === "string")) {
      return `ARRAY[${value.map((v) => lit(v)).join(",")}]::text[]`;
    }
    return `${lit(JSON.stringify(value))}::jsonb`;
  }
  if (typeof value === "object") return `${lit(JSON.stringify(value))}::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertSql(table: string, rows: Record<string, unknown>[], conflict?: string): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const values = rows
    .map((r) => `(${cols.map((c) => lit(r[c])).join(",")})`)
    .join(",\n  ");
  const updates = cols
    .filter((c) => !(conflict ?? "").split(",").includes(c))
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  const onConflict = conflict
    ? updates
      ? `on conflict (${conflict}) do update set ${updates}`
      : `on conflict (${conflict}) do nothing`
    : "";
  return `insert into ${table} (${cols.join(",")}) values\n  ${values}\n${onConflict};\n`;
}

function main(): void {
  // Record the exact instant the seed was built. buildSeed() generates the
  // schedule relative to "now", so the parity checker must rebuild the mock
  // with the SAME timestamp to compare like with like.
  const seededAt = new Date();
  writeFileSync("/tmp/pulse-seed-at.txt", seededAt.toISOString());
  const rows: SeedRows = buildSeedRows(seededAt);
  const parts: string[] = ["begin;"];

  // auth.users first — profiles reference them.
  parts.push(
    insertSql(
      "auth.users",
      rows.users.map((u) => ({ id: u.id, email: u.email })),
      "id",
    ),
  );

  for (const table of SEED_ORDER) {
    const data = rows[table] as Record<string, unknown>[];
    if (!data || data.length === 0) continue;
    parts.push(insertSql(table, data, SEED_CONFLICT_TARGET[table]));
  }
  parts.push("commit;");

  const sql = parts.join("\n");
  const file = "/tmp/pulse-seed-local.sql";
  writeFileSync(file, sql);
  execFileSync("psql", [...psqlFlags, "-q", "-v", "ON_ERROR_STOP=1", "-f", file], {
    stdio: "inherit",
  });

  const counts = SEED_ORDER.map((t) => `${t}=${(rows[t] as unknown[])?.length ?? 0}`).join(" ");
  console.log(`seeded: users=${rows.users.length} ${counts}`);
}

main();
