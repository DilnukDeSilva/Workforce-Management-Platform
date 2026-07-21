# Use Cases: MongoDB Backend Connection

> Based on [PRD](../PRD.md) Section 2: MongoDB Backend Connection

---

## Note on Actor

This feature is backend infrastructure with no end-user UI. The primary "actor" throughout is **the developer running the server process** (via `npm run dev:server` / `npm run dev`), and secondarily **any HTTP client polling `GET /api/health`** (a developer's browser/curl, or a future monitoring tool). Flows are framed around server startup and runtime behavior rather than a UI journey.

---

## UC-1: Server Startup with Valid MongoDB Connection

**Actor**: Developer running the server process
**Preconditions**:
- `server/.env` exists and contains a valid `MONGODB_URI` (and optionally `PORT`)
- A MongoDB instance is running and reachable at the URI given
- `npm install` has been run so `mongoose` and `dotenv` are installed

**Trigger**: Developer runs `npm run dev:server` (or `npm run dev`, which also starts the client)

### Primary Flow (Happy Path)
1. Node process starts `server/index.js` (or its entry point).
2. `dotenv` loads `server/.env` into `process.env`.
3. Server reads `MONGODB_URI` from `process.env`.
4. Server initiates a Mongoose connection: `mongoose.connect(MONGODB_URI)`.
5. Mongoose successfully establishes the connection to MongoDB (`readyState` transitions to `1` / connected).
6. Server logs a clear success message (e.g. `MongoDB connected`) including enough detail to confirm which host/DB was used (without leaking full credentials to logs where avoidable).
7. Server starts listening for HTTP requests on `PORT` (default `5000` if unset).
8. Server is ready to accept requests, including `GET /api/health`.

**Postconditions**:
- Mongoose connection `readyState` is `1` (connected).
- HTTP server is listening and accepting requests.
- `GET /api/health` returns `200` with a body reflecting `db: "connected"`.
- Process continues running (no exit).

### Alternative Flows
- **UC-1-A1: `PORT` not set** — applies when `server/.env` omits `PORT` (or it's unset in the environment).
  1. Steps 1-6 proceed identically (Mongo connection is independent of `PORT`).
  2. Server falls back to the documented default port `5000`.
  3. Rejoins primary flow at step 8.

- **UC-1-A2: `MONGODB_URI` includes auth credentials / options** — applies when the connection string encodes a username/password, replica set name, `appName`, TLS options, etc. (e.g. an Atlas-style URI, still valid for local dev per a local MongoDB configured with auth).
  1. Steps 1-6 proceed identically; Mongoose passes the full URI through unmodified.
  2. Connection succeeds exactly as in the primary flow provided credentials are valid and the target is reachable.
  3. Rejoins primary flow at step 7.

### Error Flows
- **UC-1-E1: `MONGODB_URI` missing entirely** — applies when `server/.env` doesn't define `MONGODB_URI`, or `server/.env` itself doesn't exist and the variable isn't set any other way.
  1. Server starts and `dotenv` loads whatever env is available (possibly nothing relevant).
  2. Server checks for `MONGODB_URI` and finds it `undefined`.
  3. Server logs a clear, specific error identifying the missing variable by name (e.g. `Missing required environment variable: MONGODB_URI. Did you copy server/.env.example to server/.env?`) — not a generic/opaque Mongoose connection error.
  4. Server does **not** call `mongoose.connect()` with an invalid/undefined value.
  5. Server exits the process with a non-zero exit code before calling `app.listen()`.
  6. System returns: no server accepting requests at all — connecting to the intended `PORT` fails/refuses (nothing listening).

- **UC-1-E2: MongoDB unreachable at startup (valid URI, nothing listening)** — applies when `MONGODB_URI` is syntactically valid (e.g. `mongodb://localhost:27017/wfm`) but no MongoDB process is listening at that host/port (e.g. developer forgot to start `mongod`, or a remote host is down).
  1. Server starts, loads env, reads `MONGODB_URI`.
  2. Server calls `mongoose.connect(MONGODB_URI)`.
  3. The connection attempt fails (e.g. `ECONNREFUSED`, or Mongoose's server-selection timeout elapses).
  4. Server logs a clear, descriptive error including the underlying connection failure reason (e.g. host/port and the driver error message) so a developer can distinguish "MongoDB isn't running" from "URI is misconfigured."
  5. Server exits the process with a non-zero exit code rather than calling `app.listen()` / continuing to run in a false-healthy state.
  6. System returns: server process has terminated; nothing responds on `PORT`.

- **UC-1-E3: `MONGODB_URI` malformed** — applies when the value is set but is not a valid MongoDB connection string (e.g. missing `mongodb://` scheme, typo'd like `mongo://localhost`, or contains illegal characters).
  1. Server starts, loads env, reads the malformed `MONGODB_URI`.
  2. Server calls `mongoose.connect(MONGODB_URI)`.
  3. Mongoose/the MongoDB driver throws a parse/validation error synchronously or rejects the connection promise.
  4. Server logs a clear error indicating the URI could not be parsed/used, including the underlying driver error.
  5. Server exits the process with a non-zero exit code, same as UC-1-E2.

### Edge Cases
- **UC-1-EC1**: `server/.env` file itself doesn't exist at all (developer never copied `server/.env.example`). Functionally equivalent to UC-1-E1 — `MONGODB_URI` is `undefined` — but the error message should still be actionable (pointing at `.env.example`) even though the root cause is a missing file rather than a missing key within an existing file.
- **UC-1-EC2**: `MONGODB_URI` is set but is an empty string (`MONGODB_URI=`). Must be treated the same as "missing" (UC-1-E1), not passed through to `mongoose.connect("")`, which could produce a confusing low-level driver error instead of the intended clear message.
- **UC-1-EC3**: `npm run dev:server` is run from a machine that has never run `npm install` in `server/` (i.e. `mongoose` isn't installed). This is a dependency/setup error, not a runtime env error — Node will throw a `MODULE_NOT_FOUND` on `require('mongoose')` before any connection logic runs. Documented here so QA doesn't confuse it with UC-1-E1/E2 when diagnosing a startup failure.

### Data Requirements
- **Input**: `MONGODB_URI` (required, from `server/.env`, no default, no hardcoded fallback), `PORT` (optional, default `5000`).
- **Output**: process exit code `0` (kept running) on success; non-zero exit code on any startup failure (UC-1-E1/E2/E3). Log lines to stdout/stderr describing success or the specific failure cause.
- **Side Effects**: opens a live TCP connection/connection pool to MongoDB on success; no writes to the database occur as part of this feature (no models exist yet).

---

## UC-2: `GET /api/health` Reports Live MongoDB Connection State

**Actor**: Any HTTP client (developer via browser/curl, future uptime/monitoring tooling)
**Preconditions**: The server process is up and listening on `PORT` (see UC-1 primary flow — by definition this postcondition of UC-1 is a precondition here, since per UC-1-E1/E2/E3 the server never reaches a listening state without a successful initial Mongo connection).
**Trigger**: HTTP `GET /api/health` request.

### Primary Flow (Happy Path)
1. Client sends `GET /api/health`.
2. Server reads the current Mongoose connection `readyState` synchronously (no new DB round-trip).
3. `readyState` is `1` (connected).
4. Server responds `200 OK` with a JSON body including (at minimum) `db: "connected"`, alongside whatever the endpoint already returned (e.g. a status/uptime field).

**Postconditions**: Response reflects the live state at the moment of the request; no state is mutated by calling this endpoint.

### Alternative Flows
- **UC-2-A1: Queried while disconnected after a mid-run drop** — see UC-3. `readyState` is `0` (disconnected) or `3` (disconnecting).
  1. Steps 1-2 proceed identically.
  2. Server responds `200 OK` (the HTTP endpoint itself is still healthy/reachable — it is the *database* that is unhealthy) with `db: "disconnected"`.
  3. This is not treated as a `5xx` error response — `GET /api/health`'s job is to *report* DB state accurately, not to fail when DB state is bad.

### Error Flows
- None specific to this endpoint under normal operation — `GET /api/health` has no external dependencies of its own beyond reading in-process Mongoose state, so it should not itself throw. (Contrast with UC-1's error flows, which prevent the server from ever reaching a state where this endpoint is reachable.)

### Edge Cases
- **UC-2-EC1: Called before the MongoDB connection attempt completes (startup race)** — applies only if the chosen implementation starts accepting HTTP connections before/concurrently with the initial `mongoose.connect()` resolving (as opposed to fully gating `app.listen()` on a successful connection, per UC-1). Whichever approach the architect/implementer chooses, this contract must hold:
  1. Client sends `GET /api/health` while Mongoose `readyState` is `2` (connecting) or `0` (not yet attempted/disconnected).
  2. Server must not crash, hang, or return an undefined/malformed `db` value.
  3. Server responds `200 OK` with `db: "disconnected"` (the binary `connected`/`disconnected` contract in the PRD has no third "connecting" value — any `readyState !== 1` maps to `"disconnected"`).
  4. Once the initial connection resolves to `readyState === 1`, subsequent calls return `db: "connected"` per the primary flow.
  - Note: if the implementation instead fully blocks `app.listen()` until the initial connection succeeds or the process exits (a valid reading of PRD requirement 2/acceptance criteria — "before (or as part of)"), this race window does not exist in practice, since no connection can be accepted on `PORT` until after UC-1 primary flow step 5 completes. This use case documents the required *contract* so it holds under either valid architecture.
- **UC-2-EC2: Rapid repeated polling** — multiple `GET /api/health` calls in quick succession (e.g. a monitoring tool polling every second) must each independently reflect the current `readyState` with no caching/staleness beyond the state's actual transition time.

### Data Requirements
- **Input**: none (no request body/params/auth required — matches existing unauthenticated `GET /api/health`).
- **Output** — response body must include a `db` field (or equivalently-named field per PRD's `db: "connected" | "disconnected"` suggestion) whose value is derived live from `mongoose.connection.readyState` at request time:

  | Mongoose `readyState` | Meaning | `db` field value |
  |---|---|---|
  | `1` | connected | `"connected"` |
  | `0` | disconnected | `"disconnected"` |
  | `2` | connecting (see UC-2-EC1) | `"disconnected"` |
  | `3` | disconnecting | `"disconnected"` |

  Example response, connected:
  ```json
  { "status": "ok", "db": "connected" }
  ```
  Example response, disconnected (mid-run drop, or startup race, or never-connected state reachable only under UC-2-EC1's non-blocking design):
  ```json
  { "status": "ok", "db": "disconnected" }
  ```
- **Side Effects**: none — read-only status check, does not open new connections or touch application data.

---

## UC-3: MongoDB Connection Drop and Recovery During Runtime

**Actor**: The running server process (no direct human action triggers this — it is an environmental/infrastructure event); developer observes indirectly via logs and `GET /api/health`.
**Preconditions**: Server has completed UC-1 primary flow successfully and is currently running with `readyState === 1`.
**Trigger**: MongoDB becomes unreachable while the server is running (e.g. `mongod` service is stopped/restarted, network partition, container restart).

### Primary Flow (Happy Path — "happy" in the sense of correct fail-safe handling)
1. The MongoDB server/process stops responding or the network path is interrupted.
2. Mongoose's underlying driver detects the loss of connection and fires a `disconnected` event; `readyState` transitions away from `1`.
3. Server's disconnect handler logs a clear message identifying the disconnect event (e.g. `MongoDB connection lost` with timestamp), distinct in wording from the startup-failure logs in UC-1-E2, so log readers can tell "never connected" apart from "was connected, then dropped."
4. The Node process is **not** terminated and continues running — the running Express server keeps listening on `PORT`.
5. Any `GET /api/health` request received during this window returns `db: "disconnected"` (per UC-2-A1).
6. MongoDB becomes reachable again (service restarted, network restored).
7. Mongoose's built-in reconnection logic (default driver behavior) re-establishes the connection automatically; `readyState` transitions back to `1`.
8. Server's connected/reconnect handler logs a clear recovery message (e.g. `MongoDB reconnected`).
9. Subsequent `GET /api/health` requests return `db: "connected"` again, with no server restart required.

**Postconditions**: Server process ran continuously through the entire disconnect/reconnect cycle; `GET /api/health` accurately reflected each state transition at the time it was queried; no requests caused the process to crash.

### Alternative Flows
- **UC-3-A1: MongoDB never recovers** — applies when the underlying outage is permanent/long-lived within the observed window.
  1. Steps 1-5 proceed identically.
  2. No reconnection ever occurs; `readyState` remains `0` indefinitely.
  3. Server process keeps running indefinitely, continuing to serve `GET /api/health` with `db: "disconnected"` on every call.
  4. No automatic process exit occurs — per PRD requirement 7, a mid-run drop must not crash the process (this is explicitly different behavior from the startup failure case in UC-1-E2, where failure to ever connect is fatal).

### Error Flows
- **UC-3-E1: Reconnection attempts themselves keep failing** — not a distinct failure mode from the developer's perspective; it is the same as UC-3-A1. Documented separately only to clarify that repeated failed reconnect attempts by the underlying driver (if any are logged per-attempt) should not flood logs with duplicate/unclear messages or cause unhandled promise rejections that could crash the process. Each retry failure, if logged, should not be mistaken for a new/distinct outage.

### Edge Cases
- **UC-3-EC1: Rapid disconnect/reconnect flapping** — MongoDB becomes intermittently available (e.g. flapping network), causing multiple `disconnected`/`connected` events in quick succession.
  1. Each transition is logged.
  2. `GET /api/health` always reflects the *most recent* `readyState` at query time — no stale cached value from a prior state.
  3. The process remains stable and does not leak listeners/connections or crash from repeated event handling.
- **UC-3-EC2: Drop occurs while a request is otherwise in flight** — since this feature introduces no models/queries yet, no in-flight DB read/write can be interrupted by the drop today; this edge case is noted for future feature work (once real queries exist) rather than actionable within this slice's scope.

### Data Requirements
- **Input**: none from the client; the "input" here is the environmental MongoDB availability state.
- **Output**: log lines on each transition (`disconnected` → logged; `connected`/reconnected → logged); `GET /api/health`'s `db` field value changes to match, per the table in UC-2's Data Requirements.
- **Side Effects**: none to application data (no models exist yet); purely a connection-state observability concern.

---

## Cross-Cutting Data Requirements Summary

For all use cases above, `GET /api/health`'s `db` field is the single source of truth a test/consumer should assert against, driven directly by `mongoose.connection.readyState`:

| Scenario | `readyState` | `db` value | HTTP status |
|---|---|---|---|
| Startup succeeded, steady state (UC-1, UC-2 primary) | `1` | `"connected"` | `200` |
| Startup never succeeded (UC-1-E1/E2/E3) | n/a — process has exited, port not listening | n/a — connection refused | n/a |
| Startup race, connection still pending (UC-2-EC1) | `0` or `2` | `"disconnected"` | `200` |
| Mid-run drop (UC-3 primary, steps 1-5) | `0` | `"disconnected"` | `200` |
| Mid-run recovery (UC-3 primary, steps 6-9) | `1` | `"connected"` | `200` |
| Permanent mid-run outage (UC-3-A1) | `0` | `"disconnected"` (indefinitely) | `200` |
