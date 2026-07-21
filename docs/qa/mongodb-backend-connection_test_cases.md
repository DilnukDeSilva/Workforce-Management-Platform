# Test Cases: MongoDB Backend Connection

> Based on [PRD](../PRD.md) Section 2 and [Use Cases](../use-cases/mongodb-backend-connection_use_cases.md)

---

## 1. UC-1: Server Startup with Valid MongoDB Connection

### 1.1 Happy Path

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-1.1 | UC-1 (Primary Flow) | Start server with `server/.env` containing a valid `MONGODB_URI` pointing at a running, reachable local MongoDB instance (`mongoose`/`dotenv` installed). Run `npm run dev:server`. | `dotenv` loads env; `mongoose.connect(MONGODB_URI)` resolves; Mongoose `readyState` becomes `1`; server logs a clear success message (e.g. `MongoDB connected`) naming host/DB without leaking full credentials; server then starts listening on `PORT`; process keeps running (no exit); subsequent `GET /api/health` returns `200` with `db: "connected"`. |

### 1.2 Alternative Flows

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-1.2 | UC-1-A1 | `server/.env` has a valid `MONGODB_URI` but omits `PORT` entirely. Start the server. | Mongo connection succeeds identically to TC-1.1 (independent of `PORT`); server falls back to documented default port `5000`; server listens and accepts requests on `5000`; `GET /api/health` on port `5000` returns `200` with `db: "connected"`. |
| TC-1.3 | UC-1-A2 | `MONGODB_URI` encodes username/password, replica-set name, `appName`, and/or TLS options (e.g. an Atlas-style URI) against a local Mongo instance configured with matching auth. Start the server. | Mongoose passes the full URI through unmodified; connection succeeds exactly as in TC-1.1 given valid credentials and a reachable target; server reaches the listening state; `GET /api/health` returns `db: "connected"`. |

### 1.3 Error Flows

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-1.4 | UC-1-E1 | `server/.env` exists but does not define `MONGODB_URI` (and it is not set via any other mechanism). Run `npm run dev:server`. | Server detects `MONGODB_URI` is `undefined`; logs a clear, specific error naming the missing variable (e.g. "Missing required environment variable: MONGODB_URI. Did you copy server/.env.example to server/.env?"); does **not** call `mongoose.connect()` with an invalid/undefined value; process exits with a non-zero exit code before `app.listen()` is called; nothing responds on `PORT`. |
| TC-1.5 | UC-1-E2 | `MONGODB_URI` is syntactically valid (e.g. `mongodb://localhost:27017/wfm`) but no MongoDB process is listening at that host/port (e.g. `mongod` not started). Run `npm run dev:server`. | `mongoose.connect()` is called and the attempt fails (`ECONNREFUSED` / server-selection timeout); server logs a clear, descriptive error including the underlying driver failure reason (host/port + cause) distinguishable from a misconfigured-URI error; process exits with a non-zero exit code rather than calling `app.listen()`; nothing responds on `PORT`. |
| TC-1.6 | UC-1-E3 | `MONGODB_URI` is set to a malformed value (e.g. missing `mongodb://` scheme, typo'd `mongo://localhost`, or illegal characters). Run `npm run dev:server`. | Mongoose/driver throws a parse/validation error synchronously or rejects the connection promise; server logs a clear error indicating the URI could not be parsed/used, including the underlying driver error; process exits with a non-zero exit code, same as TC-1.5. |

### 1.4 Edge Cases

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-1.7 | UC-1-EC1 | `server/.env` file does not exist at all (developer never copied `server/.env.example`). Run `npm run dev:server`. | Functionally equivalent to TC-1.4 (`MONGODB_URI` resolves to `undefined`); error message remains actionable and still points at `.env.example` despite the root cause being a missing file rather than a missing key; process exits non-zero before `app.listen()`. |
| TC-1.8 | UC-1-EC2 | `server/.env` sets `MONGODB_URI=` (present key, empty string value). Run `npm run dev:server`. | Empty string is treated the same as "missing" (same code path as TC-1.4), i.e. never passed through to `mongoose.connect("")`; server logs the same clear "missing required environment variable" style message rather than a confusing low-level driver error; process exits non-zero. |
| TC-1.9 | UC-1-EC3 | `server/` dependencies were never installed (`node_modules` absent / no `npm install` run, so `mongoose` is not present). Run `npm run dev:server`. | Node throws `MODULE_NOT_FOUND` on `require('mongoose')` (or ESM equivalent) before any env/connection logic executes; failure is visibly a dependency/setup error in the console output, distinct in cause from TC-1.4/TC-1.5 (documented so it is not misdiagnosed as a `MONGODB_URI` problem during triage). |

---

## 2. UC-2: `GET /api/health` Reports Live MongoDB Connection State

### 2.1 Happy Path

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-2.1 | UC-2 (Primary Flow) | With the server up and `mongoose.connection.readyState === 1` (post TC-1.1), send `GET /api/health`. | Server reads `readyState` synchronously with no new DB round-trip; responds `200 OK` with a JSON body including `db: "connected"` alongside any existing fields (e.g. `status`); response reflects live state at request time; no state is mutated by the call. |

### 2.2 Alternative Flows

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-2.2 | UC-2-A1 | After a mid-run MongoDB drop (see UC-3), with `readyState` at `0` (disconnected) or `3` (disconnecting), send `GET /api/health`. | Server responds `200 OK` (the HTTP endpoint itself remains reachable/healthy) with `db: "disconnected"` in the body; this is **not** surfaced as a `5xx` — the endpoint's job is to report DB state accurately, not fail because the DB is unhealthy. |

### 2.3 Error Flows

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-2.3 | UC-2 (Error Flows) | N/A — no dedicated error-flow test. Per the use-case doc, `GET /api/health` has no external dependencies beyond reading in-process Mongoose state and should not itself throw under normal operation; all failure conditions that could prevent this endpoint from being reachable are already covered by UC-1's error flows (TC-1.4–TC-1.6), which stop the server before it ever starts listening. | N/A |

### 2.4 Edge Cases

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-2.4 | UC-2-EC1 | (Applicable only if the implementation accepts HTTP connections before/concurrently with the initial `mongoose.connect()` resolving.) Send `GET /api/health` while `readyState` is `2` (connecting) or `0` (not yet attempted). | Server does not crash, hang, or return an undefined/malformed `db` value; responds `200 OK` with `db: "disconnected"` (any `readyState !== 1` maps to `"disconnected"` — no third "connecting" value in the response contract). Follow-up: once the initial connection resolves to `readyState === 1`, a subsequent call in the same test returns `db: "connected"`. If the implementation instead fully blocks `app.listen()` until the initial connection settles (a valid architecture per the PRD), this test should assert the race window does not exist — i.e. the port is not accepting connections until after a successful/failed connect, making this case structurally unreachable, which is itself a pass. |
| TC-2.5 | UC-2-EC2 | Issue multiple `GET /api/health` requests in rapid succession (e.g. 5 requests within 1 second) while deliberately toggling connection state between calls (connected → disconnected via a forced Mongo restart, or via a test double). | Each response independently reflects the `readyState` current at the moment of that specific request, with no caching/staleness beyond the state's actual transition time; no two responses disagree with the actual driver state at their respective request times. |

---

## 3. UC-3: MongoDB Connection Drop and Recovery During Runtime

### 3.1 Happy Path

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-3.1 | UC-3 (Primary Flow) | With the server running and `readyState === 1` (post TC-1.1), stop the MongoDB process (or block the network path) to force a disconnect, then restart/restore MongoDB. | Mongoose's driver detects the loss and fires a `disconnected` event; `readyState` transitions away from `1`; server logs a clear disconnect message (e.g. `MongoDB connection lost`, timestamped) worded distinctly from UC-1-E2's startup-failure logs; the Node process is **not** terminated and keeps listening on `PORT`; `GET /api/health` during this window returns `db: "disconnected"` (TC-2.2); once MongoDB is reachable again, Mongoose's built-in reconnection logic re-establishes the connection automatically, `readyState` returns to `1`, server logs a clear recovery message (e.g. `MongoDB reconnected`); subsequent `GET /api/health` calls return `db: "connected"` again with no server restart required. |

### 3.2 Alternative Flows

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-3.2 | UC-3-A1 | Force a MongoDB outage as in TC-3.1 but do not restore it for the duration of the test (simulate a permanent/long-lived outage). | Steps 1-5 of TC-3.1 occur identically (disconnect detected, logged, process stays up); no reconnection ever occurs; `readyState` remains `0` indefinitely for the observed window; server process keeps running and continues serving `GET /api/health` with `db: "disconnected"` on every call; no automatic process exit occurs at any point. |

### 3.3 Error Flows

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-3.3 | UC-3-E1 | With MongoDB down (as in TC-3.2), allow the underlying driver's automatic reconnection attempts to fire repeatedly over an extended window (e.g. several minutes) while monitoring logs and process health. | Repeated failed reconnect attempts (if logged per-attempt) do not flood logs with duplicate/unclear messages, do not produce unhandled promise rejections, and do not crash the process; each retry failure is distinguishable from a "new" outage rather than being misreported as one; process remains up and `GET /api/health` continues returning `db: "disconnected"` throughout. |

### 3.4 Edge Cases

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-3.4 | UC-3-EC1 | Simulate flapping connectivity: bring MongoDB down and back up multiple times in quick succession (e.g. 3-4 cycles within a short window), interleaving `GET /api/health` calls throughout. | Each disconnect/reconnect transition is logged; every `GET /api/health` call returns the *most recent* `readyState` at query time (never a stale cached value from a prior state); process remains stable throughout — no crash, no leaked event listeners, no leaked connections (verify no growth in listener count / open handles across cycles). |
| TC-3.5 | UC-3-EC2 | N/A for this slice — no test authored. This edge case (a drop occurring while a DB read/write is in flight) is explicitly noted in the use cases as not actionable yet: this feature introduces no Mongoose models/queries, so there is no in-flight application data operation that could be interrupted by a drop today. Deferred to the test suite of the future feature that introduces the first models/queries. | N/A |

---

## 4. Cross-Cutting Categories

### 4.1 Auth Boundaries — N/A

No test cases authored. Per the PRD's Non-Functional Requirements ("No authentication, authorization, or multi-tenancy concerns apply to this feature — it is foundational infrastructure, not a user-facing or access-controlled capability"), there is no auth surface in this feature to test; `GET /api/health` remains unauthenticated by design both before and after this change.

### 4.2 Concurrency — N/A

No dedicated race-condition/duplicate-request test cases beyond TC-2.4/TC-2.5/TC-3.4 above. This feature introduces no writes, no mutable application state, and no multi-step transactions (no Mongoose models exist yet per the PRD's Out of Scope) — the only "concurrency-shaped" behavior in scope is concurrent reads of `mongoose.connection.readyState` via repeated/simultaneous `GET /api/health` polling, which is already covered by TC-2.5 (rapid repeated polling) and TC-3.4 (flapping state under interleaved polling).

### 4.3 Data Integrity

| # | Use Case | Test Case | Expected Result |
|---|----------|-----------|-----------------|
| TC-4.1 | UC-1 Data Requirements / PRD Schema Changes | During and after TC-1.1 (successful startup) and TC-3.1 (disconnect/reconnect cycle), verify no application data is written, modified, or persisted anywhere. | Confirms the "no writes" contract explicit in the use cases ("no writes to the database occur as part of this feature — no models exist yet"): no collections are created, no documents are inserted, and the only observable side effect is the connection/connection-pool lifecycle itself. This is effectively a regression guard until the first real model lands in a future slice. |

---

## Coverage Summary

| Use Case | Sub-scenarios | Test Cases |
|---|---|---|
| UC-1 | Primary, A1, A2, E1, E2, E3, EC1, EC2, EC3 | TC-1.1 – TC-1.9 |
| UC-2 | Primary, A1, Error (N/A), EC1, EC2 | TC-2.1, TC-2.2, TC-2.3 (N/A), TC-2.4, TC-2.5 |
| UC-3 | Primary, A1, E1, EC1, EC2 (N/A) | TC-3.1, TC-3.2, TC-3.3, TC-3.4, TC-3.5 (N/A) |
| Cross-cutting | Auth (N/A), Concurrency (N/A), Data integrity | TC-4.1 |

**Total test cases documented: 20** (18 executable test cases + 2 explicitly justified N/A entries: TC-2.3, TC-3.5).

Every UC-1/UC-2/UC-3 scenario and sub-scenario listed in `docs/use-cases/mongodb-backend-connection_use_cases.md` — including all Primary Flows, Alternative Flows, Error Flows, and Edge Cases — has a corresponding entry above; no gaps.
