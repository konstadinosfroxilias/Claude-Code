/**
 * Turns raw bookings into the flat "attendance facts" the engagement rules
 * consume. Shared by the seed (to pre-unlock achievements consistently) and
 * the mock engagement service.
 */
import type { AttendanceFact } from "@/lib/rules/engagement";
import type { Booking, ClassType, Session, Studio } from "@/lib/types";

export function buildAttendanceFacts(
  state: {
    bookings: Booking[];
    sessions: Session[];
    classTypes: ClassType[];
    studios: Studio[];
  },
  userId: string,
): AttendanceFact[] {
  const sessions = new Map(state.sessions.map((s) => [s.id, s]));
  const classTypes = new Map(state.classTypes.map((c) => [c.id, c]));
  const studios = new Map(state.studios.map((s) => [s.id, s]));
  const facts: AttendanceFact[] = [];
  for (const b of state.bookings) {
    if (b.userId !== userId) continue;
    const s = sessions.get(b.sessionId);
    const ct = s ? classTypes.get(s.classTypeId) : undefined;
    const st = studios.get(b.studioId);
    if (!s || !ct || !st) continue;
    facts.push({
      bookingId: b.id,
      status: b.status,
      startsAt: s.startsAt,
      durationMin: s.durationMin,
      studioId: st.id,
      neighborhoodId: st.neighborhoodId,
      categoryId: ct.categoryId,
      classTypeId: ct.id,
      createdAt: b.createdAt,
    });
  }
  return facts;
}
