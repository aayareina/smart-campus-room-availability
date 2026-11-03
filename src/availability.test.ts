import { describe, expect, it } from "vitest";
import type { Room } from "@/types";
import { checkAvailability, evaluateRequest } from "@/availability";
import { sampleRooms } from "@/data";

const room: Room = {
  id: "test-room",
  name: "Test Room",
  building: "Building T",
  capacity: 10,
  blocked: false,
  bookings: [{ start: 600, end: 660, purpose: "Lecture" }],
};

describe("checkAvailability", () => {
  it("accepts a free slot after the current time (AC1)", () => {
    expect(checkAvailability(room, 700, 760, 540)).toEqual({
      available: true,
      reasons: [],
    });
  });

  it("rejects a start at or before the current time (AC1)", () => {
    const result = checkAvailability(room, 540, 600, 540);
    expect(result.available).toBe(false);
    expect(result.reasons).toEqual([
      "Start time must be after the current time (09:00).",
    ]);
  });

  it("rejects an end past 24:00 and a start not before end (AC1)", () => {
    const result = checkAvailability(room, 1200, 1500, 0);
    expect(result.reasons).toContain("End time cannot exceed 24:00.");

    const reversed = checkAvailability(room, 800, 800, 0);
    expect(reversed.reasons).toContain("Start time must be earlier than end time.");
  });

  it("rejects a start earlier than the current time (AC1)", () => {
    const result = checkAvailability(room, 480, 540, 540);
    expect(result.available).toBe(false);
    expect(result.reasons).toEqual([
      "Start time must be after the current time (09:00).",
    ]);
  });

  it("rejects a reversed interval where end is before start (AC1)", () => {
    const result = checkAvailability(room, 900, 800, 0);
    expect(result.available).toBe(false);
    expect(result.reasons).toContain("Start time must be earlier than end time.");
  });

  it("rejects bookings longer than 120 minutes (AC2)", () => {
    const result = checkAvailability(room, 700, 821, 0);
    expect(result.available).toBe(false);
    expect(result.reasons[0]).toContain("maximum allowed is 120 minutes");
  });

  it("accepts a booking of exactly 120 minutes (AC2)", () => {
    expect(checkAvailability(room, 700, 820, 0).available).toBe(true);
  });

  it("rejects a blocked room with its reason (AC3)", () => {
    const blocked: Room = {
      ...room,
      blocked: true,
      blockedReason: "Maintenance.",
    };
    expect(checkAvailability(blocked, 700, 760, 0).reasons).toEqual([
      "Maintenance.",
    ]);
  });

  it("rejects overlapping bookings but allows touching endpoints (AC4)", () => {
    const overlap = checkAvailability(room, 630, 690, 0);
    expect(overlap.available).toBe(false);
    expect(overlap.reasons[0]).toContain("Conflicts with existing booking: 10:00–11:00.");

    expect(checkAvailability(room, 660, 720, 0).available).toBe(true);
    expect(checkAvailability(room, 540, 600, 0).available).toBe(true);
  });

  it("does not mutate the room or its bookings (AC5)", () => {
    const snapshot = structuredClone(room);
    checkAvailability(room, 630, 690, 0);
    expect(room).toEqual(snapshot);
  });
});

describe("sample fixtures", () => {
  it("are not mutated by availability checks (AC5)", () => {
    const snapshot = structuredClone(sampleRooms);
    for (const r of sampleRooms) {
      checkAvailability(r, 600, 660, 0);
      evaluateRequest(r, "10:00", "11:00", "08:00");
    }
    expect(sampleRooms).toEqual(snapshot);
  });

  it("blocked fixture room is rejected with its maintenance reason (AC3)", () => {
    const auditorium = sampleRooms.find((r) => r.id === "aud-a");
    expect(auditorium).toBeDefined();
    const result = checkAvailability(auditorium!, 0, 60, 0);
    expect(result.available).toBe(false);
    expect(result.reasons).toContain("Scheduled maintenance — unavailable today.");
  });
});

describe("evaluateRequest", () => {
  it("reports a missing room", () => {
    expect(evaluateRequest(null, "10:00", "11:00", "08:00")).toEqual({
      ok: false,
      error: "Please select a room first.",
    });
  });

  it("reports invalid start or end times", () => {
    expect(evaluateRequest(room, "", "11:00", "08:00")).toEqual({
      ok: false,
      error: "Please enter valid start and end times (HH:MM).",
    });
  });

  it("reports an invalid current time", () => {
    expect(evaluateRequest(room, "10:00", "11:00", "25:00")).toEqual({
      ok: false,
      error: "Please enter a valid current time.",
    });
  });

  it("returns the availability result for valid input", () => {
    const outcome = evaluateRequest(room, "10:30", "11:30", "08:00");
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.result.available).toBe(false);
    }
  });
});
