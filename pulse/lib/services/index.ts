/**
 * Service registry — the ONLY entry point UI code uses for data.
 *
 * Two interchangeable implementations of the same `Services` contract:
 *
 *   NEXT_PUBLIC_USE_MOCK=true  (default) → lib/services/mock
 *       Everything in localStorage. No network, no accounts, works offline,
 *       and "Reset demo data" reseeds it.
 *
 *   NEXT_PUBLIC_USE_MOCK=false           → lib/services/supabase
 *       Real Postgres behind Supabase: RLS, atomic booking/ledger RPCs, auth
 *       and realtime. Needs NEXT_PUBLIC_SUPABASE_URL + _ANON_KEY and a seeded
 *       project (see the README, "Running against Supabase").
 *
 * No UI component imports either implementation, so switching backends is a
 * one-line env change with zero component edits.
 */
import { USE_MOCK } from "@/lib/config";
import type { Services } from "./types";
import { mockServices } from "./mock";
import { supabaseServices } from "./supabase";

export type { Services } from "./types";
export { ServiceError } from "./mock/helpers";

export function getServices(): Services {
  return USE_MOCK ? mockServices : supabaseServices;
}
