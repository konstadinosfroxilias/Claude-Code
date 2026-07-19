/**
 * In-memory mock database, persisted to localStorage so the demo feels alive
 * across reloads (credits deduct, bookings persist, payouts accrue).
 *
 * Only the mock service implementations in lib/services/mock touch this —
 * UI components never import it.
 */
import { SEED_MAX_AGE_MS, STORAGE_KEYS } from "@/lib/config";
import { buildSeed, type DBState } from "./seed";

type Listener = () => void;

class MockDb {
  private state: DBState | null = null;
  private listeners = new Set<Listener>();

  get(): DBState {
    if (!this.state) this.state = this.loadOrSeed();
    return this.state;
  }

  /** All writes go through here: mutate, persist, notify. */
  mutate(fn: (s: DBState) => void): void {
    const s = this.get();
    fn(s);
    this.persist();
    this.emit();
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Wipe persisted state and reseed (Settings → "Reset demo data"). */
  reset(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.db);
    }
    this.state = buildSeed();
    this.persist();
    this.emit();
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }

  private persist(): void {
    if (typeof window === "undefined" || !this.state) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(this.state));
    } catch {
      // Storage full/blocked — demo continues in-memory only.
    }
  }

  private loadOrSeed(): DBState {
    if (typeof window === "undefined") return buildSeed();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.db);
      if (raw) {
        const parsed = JSON.parse(raw) as DBState;
        const age = Date.now() - new Date(parsed.seededAt).getTime();
        // Sessions are seeded relative to "now" — refresh stale demos daily.
        if (age < SEED_MAX_AGE_MS && Array.isArray(parsed.sessions)) {
          return parsed;
        }
      }
    } catch {
      // Corrupt storage — fall through to a fresh seed.
    }
    const fresh = buildSeed();
    try {
      window.localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(fresh));
    } catch {
      /* ignore */
    }
    return fresh;
  }
}

export const mockDb = new MockDb();
export type { DBState };
