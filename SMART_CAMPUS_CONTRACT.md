# SMART-CAMPUS Room Availability Checker — Shared Contract

Practice work #12 (No-Code and Low-Code Software Engineering).

This document is the **single source of truth** shared by the code-based
implementation (this repository) and the low-code implementation. Both must
satisfy the same user story, acceptance criteria, inputs/outputs, and test
table. Neither implementation may invent test results or modify the existing
booking rules described here.

Scope: one fictional campus room, a fixed set of fictional bookings, and a
single availability check. No real personal data, no login, no payment, and no
production database are involved.

---

## 1. User story

**As a** student who wants to book a campus room,
**I want** to check whether a specific room is available for a requested time
interval,
**so that** I can avoid requesting a slot that is already taken, blocked, or
against the booking rules.

The system checks **one room at a time** against a **fixed, fictional booking
list**. It returns a clear yes/no decision and a short reason. It never books,
modifies, or deletes anything — it only answers "can I book this?".

### Fictional room under test

| Field | Value |
| --- | --- |
| Room label | `Library Study Room 3` |
| Building | `Building C` |
| Capacity | 8 seats |
| Blocked flag | `false` (except in T3, where a separate blocked copy is used) |
| Blocked reason | (none for the default room; `"Scheduled maintenance."` for the blocked copy) |

### Fixed fictional bookings for the room under test

These are the **only** bookings used by every test case. They are fictional and
contain no personal data.

| # | Start | End | Purpose (fictional) |
| --- | --- | --- | --- |
| B1 | 10:00 | 11:00 | "Book Club" |
| B2 | 13:00 | 14:30 | "Study Group" |

All times are local campus time on the same day, expressed as `HH:MM` and stored
internally as minutes from midnight (00:00 = 0, 24:00 = 1440).

### Fixed "current time" used by every test case

`09:00` (540 minutes from midnight). This is the reference for AC1 ("start time
must be in the future"). Both implementations must use this same value so the
past-time test case is deterministic.

---

## 2. Acceptance criteria (AC1–AC6)

These are shared. Each criterion lists its ID, the rule, and the observable
consequence.

### AC1 — Start time must be in the future

The requested start time must be **strictly after** the current time (09:00).
A start at or before 09:00 is rejected with a validation message. Range bounds
also apply: `00:00 <= start < end <= 24:00`.

### AC2 — Duration must be greater than zero and at most 120 minutes

The interval must satisfy `0 < (end - start) <= 120` minutes.
- Duration of 0 (start equals end) is invalid.
- Duration greater than 120 minutes is invalid.
Both produce validation feedback, not an availability decision.

### AC3 — Overlapping bookings are unavailable

The requested interval is unavailable when it **strictly overlaps** any
existing booking: `start < booking.end && booking.start < end`.
Touching endpoints are **not** an overlap: a request that ends exactly when a
booking starts, or starts exactly when a booking ends, is available.

### AC4 — Blocked room is unavailable

When the room's blocked flag is `true`, every request is unavailable regardless
of the time interval. The blocked reason text is shown.

### AC5 — Display a clear decision without changing existing bookings

The implementation returns a clear available/unavailable decision and a
human-readable reason. It **never mutates** the room, its bookings, or any
shared state — checking availability is a pure read.

### AC6 — Invalid input receives understandable feedback

When the input is invalid (missing room, non-parseable time, zero or negative
duration, out-of-range time, start not before end), the system returns
understandable feedback instead of a silent failure or a fabricated
availability decision.

---

## 3. Inputs and outputs

### 3.1 Inputs

| Input | Type | Format | Notes |
| --- | --- | --- | --- |
| `roomLabel` | string | free text | Fixed to `Library Study Room 3` for this contract. |
| `blocked` | boolean | `true` / `false` | T3 uses `true`; all other cases use `false`. |
| `bookings` | list | `[{ start, end, purpose }]` | The two fixed fictional bookings B1 and B2. Times as `HH:MM`. |
| `startTime` | string | `HH:MM` | Requested start. |
| `durationMinutes` | integer | `0–1440` | Requested duration. End is derived: `endTime = startTime + durationMinutes`. |
| `currentTime` | string | `HH:MM` | Fixed to `09:00` for every test case. |

The code-based implementation accepts `start` and `end` as minutes from
midnight; the low-code implementation may accept `startTime` + `durationMinutes`
and derive `endTime` internally. The contract is defined on `startTime` +
`durationMinutes` so both sides speak the same language.

### 3.2 Outputs

| Output | Type | Notes |
| --- | --- | --- |
| `available` | boolean | `true` only when every rule passes. Authoritative. |
| `reasonCode` | enum | One of: `available`, `blocked`, `conflict`, `too_long`, `past_time`, `invalid_interval`. |
| `message` | string | Short, student-friendly, human-readable reason. Shown in the UI. |

`reasonCode` vocabulary (shared, fixed):

| Code | Meaning |
| --- | --- |
| `available` | The slot is open and meets every rule. |
| `blocked` | The room is blocked (AC4). |
| `conflict` | The interval overlaps an existing booking (AC3). |
| `too_long` | Duration exceeds 120 minutes (AC2). |
| `past_time` | Start is at or before the current time (AC1). |
| `invalid_interval` | Start/end do not form a valid interval (AC2 zero duration, or range/ordering issues). |

The AI explanation adapter (when enabled) rephrases `message` in plain language
but **never** changes `available` or `reasonCode`.

---

## 4. Shared test table (T1–T8)

`currentTime` is `09:00` for every case. `bookings` are B1 (10:00–11:00) and
B2 (13:00–14:30) unless the case substitutes the blocked room. Expected outcomes
are specified **before** implementation and must not be invented during
implementation.

| ID | Room | Start | Duration | Blocked | Scenario | Expected `available` | Expected `reasonCode` | Expected `message` (contains) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | Library Study Room 3 | 11:00 | 60 min | false | Free interval after the only morning booking ends | `true` | `available` | "available" / "free" |
| T2 | Library Study Room 3 | 10:30 | 30 min | false | Overlaps B1 (10:00–11:00) | `false` | `conflict` | "conflict" / "overlap" |
| T3 | Library Study Room 3 (blocked copy) | 11:00 | 60 min | true | Room is blocked regardless of time | `false` | `blocked` | "blocked" / "maintenance" |
| T4 | Library Study Room 3 | 11:00 | 0 min | false | Zero duration (start equals end) | `false` | `invalid_interval` | "earlier than end" / "greater than zero" |
| T5 | Library Study Room 3 | 11:00 | 121 min | false | Exceeds the 120-minute cap | `false` | `too_long` | "120 minutes" / "maximum" |
| T6 | Library Study Room 3 | 08:30 | 30 min | false | Start is before the current time 09:00 | `false` | `past_time` | "current time" / "after" |
| T7 | Library Study Room 3 | 11:00 | 120 min | false | Adjacent: ends exactly when B2 starts (13:00) — no overlap | `true` | `available` | "available" / "free" |
| T8 | Library Study Room 3 | 10:30 | 30 min | false | Run T2, then verify bookings are byte-for-byte unchanged | `false` | `conflict` | bookings list equals the original B1, B2 |

### Notes on the table

- **T7** demonstrates the touching-endpoints rule from AC3: an interval ending
  exactly when an existing booking starts is **not** an overlap. 11:00 + 120 min
  = 13:00, which equals B2's start, so it is available.
- **T8** is a post-condition test, not a separate input. It runs T2's check and
  then asserts the room's bookings list is unchanged (AC5). Both implementations
  must prove they did not mutate the booking data.
- **T3** uses a separate copy of the room with `blocked = true` and a blocked
  reason, so the default room's blocked flag stays `false` for the other cases.
- **T4 and T5** are validation errors (AC6), not availability decisions; they
  still report `available = false` with a specific `reasonCode` so the UI can
  show understandable feedback.
- No test case depends on real personal data, login, payment, or a production
  database. All data is fictional and fixed.

---

## 5. Mapping to the code-based implementation

The existing deterministic engine in `src/domain/availability.ts` already
implements AC1–AC5; the explanation adapter in `src/domain/explanation.ts`
maps engine reasons to the shared `reasonCode` vocabulary. The code-based side
derives `endTime = startTime + durationMinutes` before calling
`checkAvailability(room, start, end, currentTime)`, so the contract's
duration-based inputs line up with the engine's start/end inputs without
changing any booking rule.

## 6. Mapping to the low-code implementation

The low-code implementation must:

1. Store the fictional room and its two bookings as static data (spreadsheet
   rows or equivalent), not in a production database.
2. Accept `startTime` + `durationMinutes` and compute `endTime`.
3. Apply AC1–AC6 as rules/formulas, returning `available`, `reasonCode`, and
   `message`.
4. Pass T1–T8 against the same expected outcomes above.
5. Never mutate the booking rows as a side effect of a check (AC5).
