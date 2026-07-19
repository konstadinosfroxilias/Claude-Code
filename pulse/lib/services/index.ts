/**
 * Service registry — the ONLY entry point UI code uses for data.
 *
 * `getServices()` returns the active implementation set. With
 * NEXT_PUBLIC_USE_MOCK=true (the default) that's the localStorage-backed mock;
 * to go live, implement `Services` against your real API and return it from
 * the else-branch below. Nothing else in the app changes.
 */
import { USE_MOCK } from "@/lib/config";
import type { Services } from "./types";
import { mockServices } from "./mock";

export type { Services } from "./types";
export { ServiceError } from "./mock/helpers";

export function getServices(): Services {
  if (USE_MOCK) return mockServices;
  // Real backend goes here, e.g.:
  //   return createApiServices({ baseUrl: API_BASE_URL });
  throw new Error(
    "No real Services implementation wired yet — set NEXT_PUBLIC_USE_MOCK=true or implement lib/services/api.",
  );
}
