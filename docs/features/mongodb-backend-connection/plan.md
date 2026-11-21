# Plan: MongoDB Backend Connection

> Re-planned 2026-11-21 for the `server/src/` layout, the response envelope and Jest, then revised after a `plan-critic` pass (see *Critic review*). Same scope and use-case coverage as the plan approved with PR #3. Every commit leaves a working server: `server/index.js` keeps serving `GET /api/health` until U6 switches the entry point, and by then the new app already has the health route (U5).

### U1: Server test tooling
- **Wave:** 1
- **Use cases:** UC-1-EC3 (setup prerequisite; TC-1.9 itself is a manual triage check)
- **Tests:** tooling smoke test (no TC)
- **Files:** `server/package.json`, `server/tests/jest.smoke.test.js` [new]
- **Changes:** add devDependencies `jest` and `supertest` (the dependency hook asks you). Set `"test": "jest"` and `"jest": { "testEnvironment": "node", "roots": ["<rootDir>/tests"] }`. The smoke test asserts that `express`, `mongoose` and `supertest` resolve, so the folder exists and Jest has a real test to run.
- **Verify:** `npm ls mongoose jest supertest --workspace server && npm test --workspace server && npm run verify -- --quick`
- **Done when:** `npm test --workspace server` runs Jest, 1 test passes, it exits 0, and `npm run verify -- --quick` reports `server: tests PASS`.
- **Pre-review:** none
- **Suggested commit:** `chore(infra): add jest and supertest to server`

### U2: Environment example and ignore rules
- **Wave:** 1
- **Use cases:** UC-1 (configuration prerequisite)
- **Tests:** none (static check)
- **Files:** `server/.env.example`
- **Changes:** confirm `PORT` and `MONGODB_URI` are documented with placeholders and comments (the file exists already); touch it only if something is missing.
- **Verify:** `git check-ignore server/.env && git ls-files --error-unmatch server/.env.example && grep -q '^PORT=' server/.env.example && grep -q '^MONGODB_URI=' server/.env.example`
- **Done when:** the verify command exits 0.
- **Pre-review:** security
- **Suggested commit:** none if unchanged, otherwise `docs(infra): document server environment variables`

### U3: Config modules (env + database connection)
- **Wave:** 2
- **Use cases:** UC-1, UC-1-A1, UC-1-A2, UC-1-E1, UC-1-E2, UC-1-E3, UC-1-EC1, UC-1-EC2, UC-2, UC-3, UC-3-A1, UC-3-E1, UC-3-EC1
- **Tests:** TC-1.2 (port default), TC-1.3, TC-1.4, TC-1.5, TC-1.6, TC-1.7, TC-1.8, TC-3.2, TC-3.3, TC-3.4 (automated parts)
- **Files:** `server/src/config/env.js` [new], `server/src/config/db.js` [new], `server/tests/config/env.test.js` [new], `server/tests/config/db.test.js` [new]
- **Changes:**
  - `env.js` exports `getEnv()`, which reads `process.env` **when called** (not at require time). It returns `{ port, mongodbUri }`; `port` defaults to 5000. A missing or empty (`''`, whitespace) `MONGODB_URI` throws `Error("Missing required environment variable: MONGODB_URI. Copy server/.env.example to server/.env.")` (design D8).
  - `db.js` exports `connectDB(uri)`: `mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })`, and on failure rejects with a message containing the redacted URI plus the driver's reason, never calling `process.exit` (D2, D3). It also exports `getDbStatus()` (D4) and `redactUri(uri)` (`mongodb+srv://***@host/db`). The `connected` / `disconnected` / `error` listeners are registered **once**, behind a module-level guard.
  - Mocking: tests use `jest.spyOn(mongoose, 'connect')` and emit events on `mongoose.connection`; the real network is never touched. Log output is captured with `jest.spyOn(console, ...)`.
- **Verify:** `npm test --workspace server -- tests/config`
- **Done when:** all listed TCs pass, no captured log line contains the password from a test URI, and `mongoose.connection.listenerCount('disconnected')` is 1 after calling `connectDB` twice.
- **Pre-review:** security
- **Suggested commit:** `feat(db): add env config and MongoDB connection module`

### U4: Express app with central error handling
- **Wave:** 2
- **Use cases:** UC-2 (the app that will serve health)
- **Tests:** TC-5.1, TC-5.2, TC-5.3
- **Files:** `server/src/app.js` [new], `server/src/utils/ApiError.js` [new], `server/src/middleware/notFound.js` [new], `server/src/middleware/errorHandler.js` [new], `server/tests/app.test.js` [new]
- **Changes:** `app.js` creates the app with `cors()` and `express.json()`, then `notFound` and `errorHandler` last. It exports the app and never calls `listen` (D5). `ApiError(status, message, errors?)`. `errorHandler` produces the failure envelope: `ApiError` → its status/message/errors; other errors with a 4xx `status` (e.g. malformed JSON) → that status (D10); anything else → 500 "Something went wrong", logged server-side, with no stack in the response (D6). Tests mount throwaway routes on the app to trigger errors.
- **Verify:** `npm test --workspace server -- tests/app.test.js`
- **Done when:** TC-5.1–5.3 pass. `server/index.js` is untouched and still serves `/api/health`.
- **Pre-review:** security
- **Suggested commit:** `feat(core): add express app with central error handling`

### U5: Health route with live database status
- **Wave:** 3
- **Use cases:** UC-2, UC-2-A1, UC-2-EC1, UC-2-EC2
- **Tests:** TC-2.1, TC-2.2, TC-2.3, TC-2.4, TC-2.5, TC-5.4
- **Files:** `server/src/routes/health.routes.js` [new], `server/src/controllers/health.controller.js` [new], `server/src/app.js`, `server/tests/health.test.js` [new]
- **Changes:** the controller returns `200 { success: true, message: 'Service healthy', data: { status: 'ok', db: getDbStatus() } }`. The router is mounted at `/api/health` in `app.js` before `notFound`. Tests set `mongoose.connection.readyState` through a `getDbStatus` mock for each state.
- **Verify:** `npm test --workspace server -- tests/health.test.js`
- **Done when:** the listed TCs pass, and `data.db` follows every `readyState` value in the UC-2 table.
- **Pre-review:** none
- **Suggested commit:** `feat(api): report database status in health check`

### U6: Switch the entry point to `src/server.js`
- **Wave:** 4
- **Use cases:** UC-1, UC-1-A1, UC-1-E1, UC-1-E2, UC-1-E3, UC-1-EC1, UC-1-EC2
- **Tests:** TC-1.1, TC-1.2, TC-1.4, TC-1.5, TC-1.6, TC-1.7, TC-1.8 (startup-ordering parts), TC-5.5
- **Files:** `server/src/server.js` [new], `server/package.json`, `server/index.js` [delete], `server/tests/server.test.js` [new]
- **Changes:**
  - `server.js` exports `start()`: `getEnv()` → `connectDB(mongodbUri)` → `app.listen(port)` with a "listening" log. Any rejection or throw → `console.error` with the redacted message → `process.exit(1)`.
  - At the bottom: `if (require.main === module) { require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true }); start(); }`, with a why-comment (D9).
  - `package.json`: `main`, `start`, `dev` → `src/server.js`. Delete `index.js`.
  - Tests: `jest.mock('../src/config/db')`, `jest.spyOn(process, 'exit').mockImplementation(() => {})`, `jest.spyOn(app, 'listen').mockImplementation(...)`. They show connect happens before listen, there is no listen and exit(1) on each failure, `listen(5000)` when PORT is unset, and no credentials in the error log.
- **Verify:** `npm test --workspace server -- tests/server.test.js && node -e "const p=require('./server/package.json');if(![p.main,p.scripts.start,p.scripts.dev].every(s=>/src\/server\.js/.test(s)))process.exit(1)" && test ! -e server/index.js && npm run verify -- --quick`
- **Manual smoke (live parts of TC-1.1/1.2/1.4/1.5/1.6; record the results in journal.md):** with local MongoDB running, `npm run dev:server` logs "MongoDB connected" then "listening on 5000", and `curl localhost:5000/api/health` shows `data.db: "connected"`. With MongoDB stopped, the process exits non-zero within ~5s with a clear, redacted error.
- **Done when:** the verify command passes and the manual smoke results are recorded.
- **Pre-review:** security
- **Suggested commit:** `feat(core): start server from src/server.js after database connects`

### U7: Setup documentation
- **Wave:** 4
- **Use cases:** UC-1-E1, UC-1-EC1 (actionable setup), NFR-2
- **Tests:** none (docs)
- **Files:** `README.md`, `CLAUDE.md`
- **Changes:** README "Setup": MongoDB prerequisite (local or Atlas), `cp server/.env.example server/.env`, set `MONGODB_URI`, then `npm run dev`; API section shows the health envelope. CLAUDE.md: Structure (`server/index.js` → `server/src/`), Database and Testing lines updated (FR-8).
- **Verify:** `grep -q 'cp server/.env.example server/.env' README.md && grep -q 'MONGODB_URI' README.md && grep -q 'server/src/' CLAUDE.md && ! grep -q 'server/index.js' CLAUDE.md`
- **Done when:** the verify command exits 0.
- **Pre-review:** none
- **Suggested commit:** `docs: document MongoDB setup and new server structure`

### U8: Runtime resilience
- **Wave:** 5
- **Use cases:** UC-3, UC-3-A1, UC-3-E1, UC-3-EC1, UC-3-EC2
- **Tests:** TC-3.1, TC-3.2, TC-3.3, TC-3.4, TC-3.5, TC-4.1
- **Files:** `server/tests/connection.e2e.test.js` [new]
- **Changes:** with `mongoose.connect` mocked, emit `disconnected` → `connected` (including rapid flapping) on `mongoose.connection`. Assert that the process stays up (no exit spy calls), `GET /api/health` `data.db` follows each change, each transition is logged without duplicates, there are no unhandled rejections (`process.on('unhandledRejection')` spy), and `mongoose.modelNames()` is empty.
- **Verify:** `npm test --workspace server -- tests/connection.e2e.test.js && npm run verify -- --quick`
- **Done when:** the listed TCs pass with no unhandled-rejection warnings.
- **Pre-review:** none
- **Suggested commit:** `test(db): cover runtime disconnect and recovery`

## Wave summary
| Wave | Units | Rationale |
|---|---|---|
| 1 | U1, U2 | Independent setup, no shared files |
| 2 | U3, U4 | Config and app are independent (disjoint files); both need Jest from U1 |
| 3 | U5 | Needs `getDbStatus` (U3) and `app.js` (U4) |
| 4 | U6, U7 | Entry switch needs U3–U5; docs describe the final structure; disjoint files |
| 5 | U8 | Exercises the fully wired system |

## Risks & dependencies
- New devDependencies `jest` and `supertest`: the dependency hook asks once in U1.
- U6 changes the run scripts; the manual smoke check plus `npm run dev` from the root confirm both apps still start.
- Tests never load the developer's `.env` or touch a real database (D9 guard, mocked Mongoose). The live behaviour is checked only by the U6 manual smoke.
- Express 5 forwards rejected promises from async handlers to `errorHandler`, so no `asyncHandler` wrapper is needed (worth knowing for interviews).

## Critic review
`plan-critic`, 2026-11-21: **FAIL → resolved.** 2 critical, 7 major, 7 minor findings.

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | CRITICAL | Jest `roots` dir didn't exist → U1 Verify fails | U1 adds `server/tests/jest.smoke.test.js` |
| 2 | CRITICAL | `jest` with no tests exits 1; `verify` would fail for later units | Smoke test present; `--passWithNoTests` removed; U1 verifies `npm run verify -- --quick` |
| 3 | MAJOR | FR-9 ACs had no TCs | Added TC-5.1–5.5, assigned to U4/U5/U6 |
| 4 | MAJOR | dotenv vs `env.js` load order unspecified | `getEnv()` reads at call time; dotenv loaded before `start()` (D8, D9) |
| 5 | MAJOR | Mocking of `server.js` side effects (exit, listen, `.env`) undefined | `require.main` guard plus explicit mocks/spies in U3 and U6 |
| 6 | MAJOR | Script switch / `index.js` deletion / dev smoke not verified | U6 Verify checks `package.json` and the file is gone; manual smoke recorded in journal |
| 7 | MAJOR | Live-process TCs can't be proven by mocked Jest | test-cases.md note splits automated vs live parts; live parts are U6's manual smoke |
| 8 | MAJOR | No unit documented the new `MONGODB_URI` requirement (NFR-2, AC-7) | New U7 (README + CLAUDE.md) |
| 9 | MAJOR | TC-1.9 assigned to U1 with no possible test | TC-1.9 marked manual/triage; removed from U1 |
| 10 | MINOR | U4 too big and deleting `index.js` early broke health in history | Split into U4 (app + errors) and U6 (entry switch); health route (U5) lands before the switch |
| 11 | MINOR | Env validation placement vs architecture.md; no env test | Validation in `env.js` (D8); `env.test.js` added |
| 12 | MINOR | "Register listeners once" dropped | Explicit guard plus a `listenerCount` assertion in U3 |
| 13 | MINOR | Startup-failure log could leak the URI | Redacted logging asserted in U6 tests |
| 14 | MINOR | Malformed JSON would become 500 | `errorHandler` honours 4xx `status` (D10, TC-5.3) |
| 15 | MINOR | dotenv cwd dependence + v17 banner | Explicit path + `quiet: true` (D9) |
| 16 | MINOR | U2 Verify didn't check both variables; runtime TCs misassigned | grep checks added; runtime TCs moved to U3/U6 |
