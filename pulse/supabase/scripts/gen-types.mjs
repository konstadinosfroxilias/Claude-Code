/**
 * Generate lib/supabase/database.types.ts from a live Postgres schema.
 *
 * `supabase gen types typescript` is the normal path, but it shells out to a
 * Docker container. This produces the SAME shape by introspecting the catalog
 * directly through psql, so types can be regenerated offline or in CI without
 * Docker. Either tool is fine — the output is interchangeable.
 *
 *   node supabase/scripts/gen-types.mjs "postgresql://user:pw@host:5432/db"
 *   node supabase/scripts/gen-types.mjs --psql "-d pulse_test"    # local socket
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const arg = process.argv[2] ?? "";
const usePsqlFlags = arg === "--psql";
const conn = usePsqlFlags ? process.argv.slice(3).join(" ") : arg;
if (!conn) {
  console.error("usage: gen-types.mjs <postgres-url> | --psql <psql flags>");
  process.exit(1);
}

const QUERY = `
with cols as (
  select c.table_name, c.column_name, c.is_nullable, c.data_type, c.udt_name,
         c.column_default is not null as has_default,
         c.is_generated = 'ALWAYS' as generated, t.table_type
    from information_schema.columns c
    join information_schema.tables t
      on t.table_name = c.table_name and t.table_schema = c.table_schema
   where c.table_schema = 'public' and t.table_type in ('BASE TABLE','VIEW')
),
enums as (
  select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public'
   group by t.typname
),
fks as (
  select con.conname as name,
         cl.relname  as table_name,
         (select array_agg(a.attname order by k.ord)
            from unnest(con.conkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as columns,
         rcl.relname as referenced_table,
         (select array_agg(a.attname order by k.ord)
            from unnest(con.confkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) as referenced_columns
    from pg_constraint con
    join pg_class cl  on cl.oid  = con.conrelid
    join pg_class rcl on rcl.oid = con.confrelid
    join pg_namespace n on n.oid = cl.relnamespace
   where con.contype = 'f' and n.nspname = 'public'
),
funcs as (
  select p.proname as name,
         pg_get_function_arguments(p.oid) as args,
         pg_get_function_result(p.oid) as result
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     -- skip functions installed by extensions (pgcrypto etc.): they are not
     -- part of the app's API surface and their args are unnamed
     and not exists (
       select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
     )
)
select json_build_object(
  'tables', (select coalesce(json_object_agg(table_name, c), '{}'::json)
               from (select table_name, json_agg(json_build_object(
                       'name', column_name, 'nullable', is_nullable = 'YES',
                       'type', data_type, 'udt', udt_name,
                       'hasDefault', has_default, 'generated', generated
                     ) order by column_name) as c
                       from cols where table_type = 'BASE TABLE' group by table_name) x),
  'views', (select coalesce(json_object_agg(table_name, c), '{}'::json)
               from (select table_name, json_agg(json_build_object(
                       'name', column_name, 'nullable', is_nullable = 'YES',
                       'type', data_type, 'udt', udt_name,
                       'hasDefault', has_default, 'generated', generated
                     ) order by column_name) as c
                       from cols where table_type = 'VIEW' group by table_name) x),
  'fks', (select coalesce(json_agg(json_build_object(
             'name', name, 'table', table_name, 'columns', columns,
             'referencedTable', referenced_table, 'referencedColumns', referenced_columns)), '[]'::json) from fks),
  'enums', (select coalesce(json_object_agg(name, labels), '{}'::json) from enums),
  'functions', (select coalesce(json_agg(json_build_object(
                  'name', name, 'args', args, 'result', result)), '[]'::json) from funcs)
);
`;

function runPsql(sql) {
  const base = usePsqlFlags ? conn.split(/\s+/) : [conn];
  return execFileSync("psql", [...base, "-tA", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

const meta = JSON.parse(runPsql(QUERY));

/** Postgres type → TypeScript type. */
function tsType(col, enums) {
  if (col.type === "USER-DEFINED" && enums[col.udt]) {
    return `Database["public"]["Enums"]["${col.udt}"]`;
  }
  if (col.type === "ARRAY") {
    const inner = col.udt.replace(/^_/, "");
    if (enums[inner]) return `Database["public"]["Enums"]["${inner}"][]`;
    return ["text", "varchar", "uuid", "name"].includes(inner) ? "string[]" : "number[]";
  }
  switch (col.type) {
    case "boolean": return "boolean";
    case "smallint": case "integer": case "bigint":
    case "numeric": case "real": case "double precision": return "number";
    case "json": case "jsonb": return "Json";
    default: return "string"; // text, uuid, timestamptz, date, …
  }
}

const enums = meta.enums;
const lines = [];

/**
 * Foreign keys, in the shape supabase-js uses to type embedded selects
 * (`select("*, studio_categories(category_id)")`). Without these the client
 * reports "could not find the relation" at compile time.
 */
function emitRelationships(tableName) {
  const rels = (meta.fks ?? []).filter((f) => f.table === tableName);
  if (rels.length === 0) {
    lines.push("        Relationships: [];");
    return;
  }
  lines.push("        Relationships: [");
  for (const r of rels) {
    lines.push("          {");
    lines.push(`            foreignKeyName: "${r.name}";`);
    lines.push(`            columns: [${r.columns.map((c) => `"${c}"`).join(", ")}];`);
    lines.push(`            isOneToOne: false;`);
    lines.push(`            referencedRelation: "${r.referencedTable}";`);
    lines.push(`            referencedColumns: [${r.referencedColumns.map((c) => `"${c}"`).join(", ")}];`);
    lines.push("          },");
  }
  lines.push("        ];");
}
lines.push("/**");
lines.push(" * GENERATED FILE — do not edit by hand.");
lines.push(" *");
lines.push(" * Regenerate after every migration:");
lines.push(" *   supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts");
lines.push(" * or, offline (no Docker needed):");
lines.push(" *   node supabase/scripts/gen-types.mjs <postgres-url> ");
lines.push(" */");
lines.push("");
lines.push("export type Json =");
lines.push("  | string");
lines.push("  | number");
lines.push("  | boolean");
lines.push("  | null");
lines.push("  | { [key: string]: Json | undefined }");
lines.push("  | Json[];");
lines.push("");
lines.push("export interface Database {");
lines.push("  public: {");
lines.push("    Tables: {");

for (const [table, cols] of Object.entries(meta.tables).sort()) {
  lines.push(`      ${table}: {`);
  lines.push("        Row: {");
  for (const c of cols) {
    lines.push(`          ${c.name}: ${tsType(c, enums)}${c.nullable ? " | null" : ""};`);
  }
  lines.push("        };");
  lines.push("        Insert: {");
  for (const c of cols) {
    const optional = c.nullable || c.hasDefault || c.generated;
    lines.push(`          ${c.name}${optional ? "?" : ""}: ${tsType(c, enums)}${c.nullable ? " | null" : ""};`);
  }
  lines.push("        };");
  lines.push("        Update: {");
  for (const c of cols) {
    lines.push(`          ${c.name}?: ${tsType(c, enums)}${c.nullable ? " | null" : ""};`);
  }
  lines.push("        };");
  emitRelationships(table);
  lines.push("      };");
}
lines.push("    };");
lines.push("    Views: {");
for (const [view, cols] of Object.entries(meta.views).sort()) {
  lines.push(`      ${view}: {`);
  lines.push("        Row: {");
  for (const c of cols) {
    lines.push(`          ${c.name}: ${tsType(c, enums)}${c.nullable ? " | null" : ""};`);
  }
  lines.push("        };");
  lines.push("        Relationships: [];");
  lines.push("      };");
}
lines.push("    };");

/** "p_at timestamp with time zone DEFAULT now()" → {name, type, optional}. */
function parseArgs(argString) {
  if (!argString || !argString.trim()) return [];
  return argString
    .split(/,(?![^(]*\))/)
    .map((raw) => raw.trim())
    .filter((raw) => raw && !raw.startsWith("OUT ") && !raw.startsWith("TABLE"))
    .map((raw) => {
      const cleaned = raw.replace(/^(IN|INOUT|VARIADIC)\s+/, "");
      const optional = /\sDEFAULT\s/i.test(cleaned);
      const withoutDefault = cleaned.split(/\sDEFAULT\s/i)[0].trim();
      const parts = withoutDefault.split(/\s+/);
      // An unnamed argument is just a type ("integer"); give it a position name.
      if (parts.length < 2) return { name: null, pgType: withoutDefault, optional };
      const [name, ...typeParts] = parts;
      return { name, pgType: typeParts.join(" "), optional };
    })
    .map((a, i) => (a.name ? a : { ...a, name: `arg${i + 1}` }));
}

function argTsType(pgType, enums) {
  const t = pgType.toLowerCase().replace(/\[\]$/, "");
  const isArray = pgType.endsWith("[]");
  let base;
  if (enums[t]) base = `Database["public"]["Enums"]["${t}"]`;
  else if (["boolean"].includes(t)) base = "boolean";
  else if (["smallint","integer","bigint","numeric","real","double precision"].includes(t)) base = "number";
  else if (["json","jsonb"].includes(t)) base = "Json";
  else base = "string";
  return isArray ? `${base}[]` : base;
}

lines.push("    Functions: {");
const seen = new Set();
for (const f of meta.functions.sort((a, b) => a.name.localeCompare(b.name))) {
  if (seen.has(f.name)) continue;   // overloads: first signature wins
  seen.add(f.name);
  const args = parseArgs(f.args);
  lines.push(`      ${f.name}: {`);
  if (args.length === 0) {
    lines.push("        Args: Record<PropertyKey, never>;");
  } else {
    lines.push("        Args: {");
    for (const a of args) {
      lines.push(`          ${a.name}${a.optional ? "?" : ""}: ${argTsType(a.pgType, enums)};`);
    }
    lines.push("        };");
  }
  // Returns is deliberately loose: the service layer narrows each rpc() result
  // where it is used, and SETOF/TABLE returns vary per function.
  lines.push("        Returns: unknown;");
  lines.push("      };");
}
lines.push("    };");

lines.push("    Enums: {");
for (const [name, labels] of Object.entries(enums).sort()) {
  lines.push(`      ${name}: ${labels.map((l) => `"${l}"`).join(" | ")};`);
}
lines.push("    };");
lines.push("    CompositeTypes: { [_ in never]: never };");
lines.push("  };");
lines.push("}");
lines.push("");
lines.push("export type Tables<T extends keyof Database[\"public\"][\"Tables\"]> =");
lines.push("  Database[\"public\"][\"Tables\"][T][\"Row\"];");
lines.push("export type ViewRow<T extends keyof Database[\"public\"][\"Views\"]> =");
lines.push("  Database[\"public\"][\"Views\"][T][\"Row\"];");
lines.push("export type Enums<T extends keyof Database[\"public\"][\"Enums\"]> =");
lines.push("  Database[\"public\"][\"Enums\"][T];");
lines.push("");

writeFileSync("lib/supabase/database.types.ts", lines.join("\n"));
console.log(
  `wrote lib/supabase/database.types.ts — ${Object.keys(meta.tables).length} tables, ` +
    `${Object.keys(meta.views).length} views, ${Object.keys(enums).length} enums, ${seen.size} functions`,
);
