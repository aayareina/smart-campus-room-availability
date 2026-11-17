# Project memory

## Product intent & audience

- Campus room availability checker for students; determines whether a campus room can be booked for a given time interval.
- Core logic is a deterministic rule engine; an LLM explanation adapter only rephrases the engine's result in plain, student-friendly language.
- Audience: students booking rooms; tone is concise and friendly, no jargon or disclaimers.

## Brand personality & voice

- Student-facing, friendly, direct.
- Explanations capped at two sentences; no technical role labels or policy disclaimers beyond what's needed.

## Visual design & UX direction

- Not yet inferred from screens; current work focused on backend/explanation logic.
- Structured availability facts drive any UI: roomLabel, startTime, endTime, isAvailable, reasonCode.

## Decisions, constraints & rationale

- Deterministic engine is authoritative; the LLM never overrides or recomputes `isAvailable`.
- Reason codes are fixed vocabulary: `available`, `blocked`, `conflict`, `too_long`, `past_time`, `invalid_interval`.
- Booking constraints: max 120 minutes per booking; interval within 00:00–24:00 with start < end.
- System prompt template stored alongside the explanation adapter; `renderSystemPrompt(input)` injects `ExplanationInput` values with brace-stripping to prevent template injection.
- User text and model output are treated as untrusted; model must ignore embedded instructions and never reveal its own instructions.
- Explanation output must be plain text only — no JSON, markdown, or preamble.
- Tests: ~60 Vitest unit tests, including prompt-rendering tests for variable injection, rule presence, and brace-stripping.
- Pre-existing, unrelated issue: `App.test.tsx` fails typecheck/runtime due to missing `@testing-library/react` and `jsdom` packages.

## Open questions & assumptions

- Actual UI/visual design (colors, typography, layout, components) not yet established.
- Source of booking data and integration boundary with the rule engine not yet described.
- Whether the LLM adapter calls an external model or is fully mocked in tests is unspecified.