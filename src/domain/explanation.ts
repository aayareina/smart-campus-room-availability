import type { AvailabilityResult } from "@/types";
import { minutesToTime } from "./time";

/**
 * Reason codes derived from the deterministic availability engine's output.
 * The engine stays authoritative — these codes only describe its result so
 * the explanation adapter can phrase it in plain, student-friendly language.
 */
export type ReasonCode =
  | "available"
  | "blocked"
  | "conflict"
  | "too_long"
  | "past_time"
  | "invalid_interval";

export interface ExplanationInput {
  roomLabel: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

export interface ExplanationOutput {
  explanation: string;
}

const VALID_CODES: ReadonlyArray<ReasonCode> = [
  "available",
  "blocked",
  "conflict",
  "too_long",
  "past_time",
  "invalid_interval",
];

const TIME_RE = /^(\d{2}):(\d{2})$/;

function isValidTimeString(s: string): boolean {
  const m = TIME_RE.exec(s);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59;
}

const FALLBACK: ExplanationOutput = {
  explanation:
    "We couldn't generate a detailed explanation right now. Please rely on the availability status shown above.",
};

/**
 * Maps the deterministic result's reason strings to a single primary code.
 * The most decisive blocker is explained first.
 */
export function classifyResult(result: AvailabilityResult): ReasonCode {
  if (result.available) return "available";
  const text = result.reasons.join(" ");
  if (result.reasons.some((r) => /blocked|maintenance/i.test(r))) return "blocked";
  if (/conflict/i.test(text)) return "conflict";
  if (/120 minutes|maximum allowed/i.test(text)) return "too_long";
  if (/current time|after the current time/i.test(text)) return "past_time";
  return "invalid_interval";
}

export function buildExplanationInput(
  roomLabel: string,
  start: number,
  end: number,
  result: AvailabilityResult
): ExplanationInput {
  return {
    roomLabel,
    startTime: minutesToTime(start),
    endTime: minutesToTime(end),
    isAvailable: result.available,
    reasonCode: classifyResult(result),
  };
}

function isValidInput(input: unknown): input is ExplanationInput {
  if (typeof input !== "object" || input === null) return false;
  const i = input as Record<string, unknown>;
  return (
    typeof i.roomLabel === "string" &&
    i.roomLabel.trim().length > 0 &&
    typeof i.startTime === "string" &&
    isValidTimeString(i.startTime) &&
    typeof i.endTime === "string" &&
    isValidTimeString(i.endTime) &&
    typeof i.isAvailable === "boolean" &&
    typeof i.reasonCode === "string" &&
    VALID_CODES.includes(i.reasonCode as ReasonCode)
  );
}

function composeExplanation(input: ExplanationInput): string {
  const { roomLabel, startTime, endTime, isAvailable, reasonCode } = input;
  if (isAvailable || reasonCode === "available") {
    return `Good news — ${roomLabel} looks free from ${startTime} to ${endTime}. That fits within the 2-hour booking limit and doesn't overlap with any existing class or booking.`;
  }
  switch (reasonCode) {
    case "blocked":
      return `${roomLabel} can't be booked for ${startTime}–${endTime} because the room is currently marked as unavailable (for example, maintenance). Try a different room or check back later.`;
    case "conflict":
      return `Your request for ${startTime}–${endTime} in ${roomLabel} overlaps with something already scheduled there. Pick a slot that ends before the existing booking starts, or starts after it ends.`;
    case "too_long":
      return `Bookings are capped at 120 minutes, but ${startTime}–${endTime} is longer than that. Shorten your request to 2 hours or less and try again.`;
    case "past_time":
      return `The start time ${startTime} is at or before the current time, so that slot has already passed. Choose a start time later than now.`;
    case "invalid_interval":
    default:
      return `The times you entered (${startTime}–${endTime}) don't form a valid interval. The start must be earlier than the end, and both must fall within 00:00–24:00. Double-check and try again.`;
  }
}

/**
 * Mock explanation adapter. Takes structured inputs only — it never reads
 * or decides availability. Returns a concise, student-friendly explanation.
 * Any validation or runtime failure yields a safe fallback so the UI never
 * breaks and the deterministic status above stays the source of truth.
 */
export async function generateExplanation(
  input: ExplanationInput
): Promise<ExplanationOutput> {
  if (!isValidInput(input)) {
    return FALLBACK;
  }
  // Simulate async adapter latency so the UI can show a loading state.
  await new Promise((resolve) => setTimeout(resolve, 250));
  const text = composeExplanation(input);
  if (typeof text !== "string" || text.trim().length === 0) {
    return FALLBACK;
  }
  return { explanation: text };
}
