import type { AvailabilityResult, Room } from "@/types";
import { formatDuration, minutesToTime, timeToMinutes } from "@/utils";

export type RequestOutcome =
  | { ok: true; result: AvailabilityResult }
  | { ok: false; error: string };

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

/**
 * Validates raw form input (HH:MM strings) and runs the availability check.
 * Pure function — no React state involved.
 */
export function evaluateRequest(
  room: Room | null,
  startTime: string,
  endTime: string,
  currentTime: string
): RequestOutcome {
  if (!room) {
    return { ok: false, error: "Please select a room first." };
  }

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) {
    return { ok: false, error: "Please enter valid start and end times (HH:MM)." };
  }

  const current = timeToMinutes(currentTime);
  if (current === null) {
    return { ok: false, error: "Please enter a valid current time." };
  }

  return { ok: true, result: checkAvailability(room, start, end, current) };
}
