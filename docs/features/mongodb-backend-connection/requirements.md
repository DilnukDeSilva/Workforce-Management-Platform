# Requirements: MongoDB Backend Connection

> Inception · owner: `prd-writer` · migrated verbatim from `docs/PRD.md` Section 2 (approved via PR #3) into the AI-DLC work-item layout. Use cases: [use-cases.md](use-cases.md).

### Feature Description

Connect the existing Node/Express backend (`server/index.js`) to MongoDB via Mongoose, giving the application a real persistence layer for the first time. Today the server has no database at all — `dotenv` is installed but unused, and `GET /api/health` is the only endpoint. This feature wires up the DB connection, environment-based configuration, and a fail-loud startup check, but does **not** introduce any Mongoose models or app-entity schemas — that is deferred to future feature work.

### User Story

As a developer running the Workforce Management Platform backend, I want the server to establish and report a real MongoDB connection so that future features can persist data reliably, and so that I can immediately tell from the health check whether the database is actually reachable.

### Functional Requirements

1. Add `mongoose` as a dependency of `server/` and use it as the ODM for connecting to MongoDB, consistent with the existing Node/Express stack.
2. On server startup, load configuration via `dotenv` (already a dependency, currently unused) and connect to MongoDB using a connection string read exclusively from an environment variable (`MONGODB_URI`). No connection string or credential may be hardcoded in source.
3. Add `server/.env.example` (committed to git) documenting every required environment variable, including at minimum `MONGODB_URI` and the existing `PORT`, with placeholder/example values and inline comments explaining each.
4. `server/.env` (the real local-dev file with actual values) must be gitignored and never committed. Verify/update `.gitignore` (root or `server/`) to exclude `server/.env` while still allowing `server/.env.example` to be tracked.
5. If `MONGODB_URI` is missing, or the initial MongoDB connection attempt fails, the server must fail loudly: log a clear, descriptive error identifying the cause, and exit the process with a non-zero exit code (or otherwise clearly halt startup) rather than continuing to run without a database.
6. Extend `GET /api/health` to include the current MongoDB connection state (e.g. a field such as `db: "connected" | "disconnected"`, derived from the live Mongoose connection state) in its JSON response, in addition to whatever it already returns.
7. If MongoDB becomes unreachable after a successful startup (connection drops mid-run), the server must not crash the running process; it should log the disconnect event clearly and `GET /api/health` must reflect the updated (disconnected) state on subsequent requests.
8. Update `CLAUDE.md`'s "Environment Variables" and "Database" sections to document `MONGODB_URI` and the fact that MongoDB/Mongoose is now the project's database layer (tracked as a doc-updater follow-up, not part of this PRD's acceptance criteria, but noted here for cross-reference).
9. *(Added 2026-11-21 to cover Phase 1 "Set up the folder structure" in `docs/PROJECT_CONTEXT.md`.)* Server code moves into the decided `server/src/` structure: `server.js` (entry: env, DB connect, listen), `app.js` (Express app, exported for tests), `config/` (env + DB), `routes/`, `controllers/`, `middleware/` (central error handler + 404) and `utils/`. Every response, including `GET /api/health`, uses the project envelope `{ success, message, data }` / `{ success: false, message, errors? }`.

### Non-Functional Requirements

- No authentication, authorization, or multi-tenancy concerns apply to this feature — it is foundational infrastructure, not a user-facing or access-controlled capability.
- Must not break the existing `GET /api/health` behavior for a developer who has not yet set up MongoDB locally: the documented local dev workflow (README/CLAUDE.md) must clearly explain that `MONGODB_URI` is now required for the server to start, avoiding an undocumented breaking change to the existing `npm run dev:server` workflow.
- Startup failure handling must be synchronous/clear enough to show up immediately in `npm run dev:server` / `npm run dev` output — no silent background failures.
- No performance targets beyond a standard local MongoDB connection (this is a dev-environment slice; production Atlas provisioning is explicitly out of scope).

### Acceptance Criteria

- [ ] Starting the server with a valid `MONGODB_URI` in `server/.env` establishes a MongoDB connection via Mongoose before (or as part of) the server accepting requests.
- [ ] Starting the server with `MONGODB_URI` unset, or pointing at an unreachable MongoDB instance, produces a clear logged error and the process exits non-zero / does not continue serving as if healthy.
- [ ] `server/.env` is listed in `.gitignore` and is not tracked by git.
- [ ] `server/.env.example` exists, is committed, and documents every environment variable the server reads (`PORT`, `MONGODB_URI`, and any others introduced).
- [ ] `GET /api/health` returns a field reflecting live MongoDB connection status, and that field changes value (connected → disconnected) if the DB connection is lost after startup.
- [ ] Connection failures (startup and mid-run) are visible in server logs with enough detail to diagnose the cause (e.g. host/URI misconfiguration vs. MongoDB not running).
- [ ] `npm run dev` / `npm run dev:server` continues to work for a developer following the updated documented setup steps (i.e., the workflow is not silently broken — it now requires an extra documented step: copying `.env.example` to `.env` and running MongoDB).
- [ ] Server code lives under `server/src/` per FR-9; `server/index.js` is removed and `npm run dev:server` / `npm start` run `src/server.js`.
- [ ] An unknown route returns `404` and an unhandled error returns `500`, both in the failure envelope, from the central error handler.

### Affected Endpoints

- `GET /api/health` — **modified**. Response payload extended to include MongoDB connection status alongside existing content.

### Schema Changes

- None. This feature introduces MongoDB as the project's database and establishes the connection layer only. No collections, Mongoose models, or document schemas are created in this slice — those are explicitly out of scope and deferred to future feature work.

### UI Changes

- None. This is a backend-only, non-user-facing infrastructure feature. No `client/` changes.

### Other Affected Areas

- `server/package.json` — add `mongoose` as a new dependency.
- `server/index.js` → replaced by `server/src/server.js` + `server/src/app.js` (FR-9). Connection module at `server/src/config/db.js` (the architect's choice, as this section allowed).
- New file: `server/.env.example` (committed).
- New file: `server/.env` (gitignored, local dev only, not committed).
- `.gitignore` — updated if `server/.env` is not already covered.

### Known Edge Cases

1. MongoDB is unreachable at server startup (e.g. not running locally) → server must fail loudly and not start in a false-healthy state.
2. `MONGODB_URI` environment variable is missing entirely → server must fail loudly with a message identifying the missing variable, not a generic/opaque connection error.
3. MongoDB connection is established successfully at startup but drops later during runtime (e.g. MongoDB service restarts or network blip) → server process must stay up, log the disconnect, and `GET /api/health` must reflect `disconnected` until/unless the connection recovers.

### Out of Scope

- Mongoose models/schemas for actual application entities (employees, shifts, schedules, etc.) — future feature work.
- Production MongoDB Atlas setup, provisioning, or connection-string management — this slice covers the local dev connection layer only.
- Auth, multi-tenancy, or access control around database access.
