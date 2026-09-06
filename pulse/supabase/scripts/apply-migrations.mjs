/**
 * Apply every migration in order, against any Postgres.
 *
 *   npm run db:migrate                       # uses DATABASE_URL
 *   node supabase/scripts/apply-migrations.mjs "postgresql://…"
 *
 * `supabase db push` does the same thing for a linked project; this exists so
 * migrations can also be applied to a plain connection string (CI, a local
 * Postgres, a self-hosted instance) without the CLI or Docker.
 *
 * Every migration is idempotent, so re-running is safe.
 */
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "No connection string. Pass one as an argument or set DATABASE_URL\n" +
      "(Supabase dashboard → Project Settings → Database → Connection string).",
  );
  process.exit(1);
}

const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.error(`No .sql files in ${dir}`);
  process.exit(1);
}

for (const file of files) {
  process.stdout.write(`  ${file} … `);
  try {
    execFileSync("psql", [url, "-q", "-v", "ON_ERROR_STOP=1", "-f", join(dir, file)], {
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
    });
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    console.error(err.stderr ?? err.message);
    process.exit(1);
  }
}
console.log(`\n${files.length} migrations applied. Next: npm run db:seed`);
