"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * The Supabase browser client — one per tab.
 *
 * Only lib/services/supabase touches this. UI components never import it, so
 * the backend stays swappable (see lib/services/index.ts).
 */
export type PulseSupabase = SupabaseClient<Database>;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when both env vars are present, so callers can fail with a clear message. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

let client: PulseSupabase | null = null;

export function getSupabase(): PulseSupabase {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, or set " +
        "NEXT_PUBLIC_USE_MOCK=true to run fully offline on the mock store.",
    );
  }
  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/**
 * Seeded demo accounts, so the app's one-tap role picker keeps working against
 * a real auth provider. These are ordinary email/password users created by the
 * seed — nothing special server-side.
 *
 * Production replaces this with real signup; see the README,
 * "Going to production → real auth".
 */
export const DEMO_ACCOUNTS = {
  member: {
    email: process.env.NEXT_PUBLIC_DEMO_MEMBER_EMAIL ?? "demo.member@pulse.fit",
  },
  studio_owner: {
    email: process.env.NEXT_PUBLIC_DEMO_OWNER_EMAIL ?? "demo.owner@pulse.fit",
  },
} as const;

export const DEMO_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "pulse-demo-2026";
