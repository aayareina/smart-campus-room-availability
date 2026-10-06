import type { AvailabilityResult, Room } from "@/types";

export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(1440, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/**
 * Core availability check implementing AC1–AC5.
 * Pure function — never mutates room or booking data (AC5).
 */
export function checkAvailability(
  room: Room,
  start: number,
  end: number,
  currentTime: number
): AvailabilityResult {
  const reasons: string[] = [];
  const validInterval = start >= 0 && end <= 1440 && start < end;

  // AC1: 0 <= start < end <= 1440 and start must be after current time
  if (start < 0) {
    reasons.push("Start time cannot be before 00:00.");
  }
  if (end > 1440) {
    reasons.push("End time cannot exceed 24:00.");
  }
  if (start >= end) {
    reasons.push("Start time must be earlier than end time.");
  }
  if (validInterval && start <= currentTime) {
    reasons.push(
      `Start time must be after the current time (${minutesToTime(currentTime)}).`
    );
  }

  // AC2: reject bookings longer than 120 minutes
  if (validInterval && end - start > 120) {
    reasons.push(
      `Booking duration is ${formatDuration(end - start)} — maximum allowed is 120 minutes.`
    );
  }

  // AC3: reject when room is blocked
  if (room.blocked) {
    reasons.push(room.blockedReason ?? "This room is currently blocked.");
  }

  // AC4: reject overlapping intervals (touching endpoints are allowed)
  if (validInterval) {
    const conflicts = room.bookings.filter(
      (b) => start < b.end && b.start < end
    );
    if (conflicts.length > 0) {
      const labels = conflicts
        .map((b) => `${minutesToTime(b.start)}–${minutesToTime(b.end)}`)
        .join(", ");
      reasons.push(
        `Conflicts with existing booking${conflicts.length > 1 ? "s" : ""}: ${labels}.`
      );
    }
  }

  return { available: reasons.length === 0, reasons };
}
