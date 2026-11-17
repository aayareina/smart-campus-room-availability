import { describe, expect, it } from "vitest";
import type { AvailabilityResult } from "@/types";
import {
  buildExplanationInput,
  classifyResult,
  generateExplanation,
} from "@/domain/explanation";

const avail: AvailabilityResult = { available: true, reasons: [] };
const blocked: AvailabilityResult = {
  available: false,
  reasons: ["Scheduled maintenance — unavailable today."],
};
const conflict: AvailabilityResult = {
  available: false,
  reasons: ["Conflicts with existing booking: 10:00–11:00."],
};
const tooLong: AvailabilityResult = {
  available: false,
  reasons: ["Booking duration is 180 min — maximum allowed is 120 minutes."],
};
const pastTime: AvailabilityResult = {
  available: false,
  reasons: ["Start time must be after the current time (09:00)."],
};
const invalid: AvailabilityResult = {
  available: false,
  reasons: ["Start time must be earlier than end time."],
};

describe("classifyResult", () => {
  it("classifies an available result", () => {
    expect(classifyResult(avail)).toBe("available");
  });
  it("classifies a blocked room", () => {
    expect(classifyResult(blocked)).toBe("blocked");
  });
  it("classifies a conflict", () => {
    expect(classifyResult(conflict)).toBe("conflict");
  });
  it("classifies an over-limit booking", () => {
    expect(classifyResult(tooLong)).toBe("too_long");
  });
  it("classifies a past-time start", () => {
    expect(classifyResult(pastTime)).toBe("past_time");
  });
  it("falls back to invalid_interval", () => {
    expect(classifyResult(invalid)).toBe("invalid_interval");
  });
});

describe("buildExplanationInput", () => {
  it("builds a valid structured input from a result", () => {
    expect(buildExplanationInput("Engineering Hall 101", 720, 780, avail)).toEqual({
      roomLabel: "Engineering Hall 101",
      startTime: "12:00",
      endTime: "13:00",
      isAvailable: true,
      reasonCode: "available",
    });
  });
});

describe("generateExplanation", () => {
  it("returns a concise { explanation } for valid input", async () => {
    const out = await generateExplanation(
      buildExplanationInput("Library Study Room 3", 660, 720, conflict)
    );
    expect(Object.keys(out).sort()).toEqual(["explanation"]);
    expect(typeof out.explanation).toBe("string");
    expect(out.explanation.length).toBeGreaterThan(0);
    expect(out.explanation).toContain("Library Study Room 3");
  });

  it("mentions the room and time window for an available slot", async () => {
    const out = await generateExplanation(
      buildExplanationInput("Innovation Lab", 700, 760, avail)
    );
    expect(out.explanation).toContain("Innovation Lab");
    expect(out.explanation).toContain("11:40");
    expect(out.explanation).toContain("12:40");
  });

  it("falls back safely on empty input", async () => {
    const out = await generateExplanation({} as never);
    expect(out.explanation).toContain("rely on the availability status");
  });

  it("falls back safely on an invalid reason code", async () => {
    const out = await generateExplanation({
      roomLabel: "X",
      startTime: "10:00",
      endTime: "11:00",
      isAvailable: false,
      reasonCode: "bogus" as never,
    });
    expect(out.explanation).toContain("rely on the availability status");
  });

  it("falls back safely on malformed times", async () => {
    const out = await generateExplanation({
      roomLabel: "X",
      startTime: "25:00",
      endTime: "11:00",
      isAvailable: false,
      reasonCode: "conflict",
    });
    expect(out.explanation).toContain("rely on the availability status");
  });

  it("never returns an empty explanation", async () => {
    const cases: AvailabilityResult[] = [
      avail,
      blocked,
      conflict,
      tooLong,
      pastTime,
      invalid,
    ];
    for (const r of cases) {
      const out = await generateExplanation(
        buildExplanationInput("Room X", 700, 760, r)
      );
      expect(out.explanation.trim().length).toBeGreaterThan(0);
    }
  });
});
