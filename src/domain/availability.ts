import type { AvailabilityResult, Booking, Room } from "@/types";
import { MAX_BOOKING_MINUTES, MINUTES_IN_DAY } from "./constants";
import { formatDuration, minutesToTime } from "./time";

/** AC1 (range part): 0 <= start < end <= 1440. */
export function isValidInterval(start: number, end: number): boolean {
  return start >= 0 && end <= MINUTES_IN_DAY && start < end;
}

/** AC2: true when the interval is longer than the allowed maximum. */
export function exceedsMaxDuration(start: number, end: number): boolean {
  return end - start > MAX_BOOKING_MINUTES;
}

/** AC4: overlap with open endpoints — touching intervals do not conflict. */
export function findConflicts(room: Room, start: number, end: number): Booking[] {
  return room.bookings.filter((b) => start < b.end && b.start < end);
}

function boundsReasons(start: number, end: number): string[] {
  const reasons: string[] = [];
  if (start < 0) reasons.push("Start time cannot be before 00:00.");
  if (end > MINUTES_IN_DAY) reasons.push("End time cannot exceed 24:00.");
  if (start >= end) reasons.push("Start time must be earlier than end time.");
  return reasons;
}

function conflictReasons(conflicts: Booking[]): string[] {
  if (conflicts.length === 0) return [];
  const labels = conflicts
    .map((b) => `${minutesToTime(b.start)}–${minutesToTime(b.end)}`)
    .join(", ");
  return [`Conflicts with existing booking${conflicts.length > 1 ? "s" : ""}: ${labels}.`];
}

/**
 * Core availability check implementing AC1–AC5 (and F3: blocked room).
 * Pure function — never mutates room or booking data (AC5).
 * The order and text of `reasons` are unchanged from the original version.
 */
export function checkAvailability(
  room: Room,
  start: number,
  end: number,
  currentTime: number
): AvailabilityResult {
  const valid = isValidInterval(start, end);

  const reasons: string[] = [
    ...boundsReasons(start, end),
    ...(valid && start <= currentTime
      ? [`Start time must be after the current time (${minutesToTime(currentTime)}).`]
      : []),
    ...(valid && exceedsMaxDuration(start, end)
      ? [
          `Booking duration is ${formatDuration(end - start)} — maximum allowed is ${MAX_BOOKING_MINUTES} minutes.`,
        ]
      : []),
    ...(room.blocked ? [room.blockedReason ?? "This room is currently blocked."] : []),
    ...(valid ? conflictReasons(findConflicts(room, start, end)) : []),
  ];

  return { available: reasons.length === 0, reasons };
}
