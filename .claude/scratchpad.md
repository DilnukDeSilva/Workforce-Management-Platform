# Scratchpad

## Feature: MongoDB Backend Connection
## Branch: feat/mongodb-backend-connection
## Status: implementing wave 1 slice 1/6

## Plan

### Wave 1
1. **Add mongoose dependency and test tooling to server** — covers UC-1, UC-1-EC3
   - Files: `server/package.json`
   - Changes: add `mongoose` dep (done — already installed, ^9.8.0), add `supertest` devDep, replace stub `test` script with `node --test`
   - Verify: `npm ls mongoose supertest --workspace server`
   - Done when: `mongoose` resolves, `npm test --workspace server` runs `node --test` instead of the old stub
   - Pre-review: none
   - Status: pending (mongoose already installed manually during connection verification; supertest + test script still pending)
2. **Add server/.env.example and verify .gitignore coverage** — covers UC-1, UC-1-E1, UC-1-EC1
   - Files: `server/.env.example` (new — done), `.gitignore` (verify only — done, already covers `server/.env`)
   - Verify: `git check-ignore server/.env` / confirm `.env.example` trackable
   - Done when: `.env.example` documents `PORT` + `MONGODB_URI`, `.env` ignored, `.env.example` trackable
   - Pre-review: security (no real secrets in `.env.example`)
   - Status: done — `server/.env.example` created, `server/.env` confirmed gitignored, connection string verified working via standalone mongoose.connect() test

### Wave 2
3. **Create server/db.js connection module + unit tests** — covers UC-1, UC-1-A2, UC-1-E1/E2/E3, UC-1-EC2, UC-2, UC-3, UC-3-A1/E1/EC1
   - Files: `server/db.js` (new), `server/test/db.test.js` (new)
   - Changes: `connectDB()` (reads MONGODB_URI, validates, connects with serverSelectionTimeoutMS 5000, fail-loud on error, no process.exit inside db.js), `getDbStatus()` (readyState 1 → connected, else disconnected), connection event logging (connected/disconnected/error), no raw URI in logs
   - Verify: `node --test server/test/db.test.js`
   - Pre-review: security (no credential leakage in logs)
   - Status: pending

### Wave 3
4. **Wire dotenv + gate app.listen on connectDB in server/index.js** — covers UC-1 primary flow, UC-1-A1, UC-1-E1/E2/E3, UC-1-EC1/EC2
   - Files: `server/index.js`, `server/test/startup.test.js` (new)
   - Changes: dotenv.config() first statement, require ./db, export app, gate listen behind connectDB().then/catch with process.exit(1) on failure
   - Verify: `node --test server/test/startup.test.js`
   - Pre-review: security (startup failure logging must not echo credentialed URI)
   - Status: pending

### Wave 4
5. **Extend GET /api/health with live db status** — covers UC-2, UC-2-A1, UC-2-EC1/EC2
   - Files: `server/index.js`, `server/test/health.test.js` (new)
   - Changes: health handler returns `{ status: 'ok', db: getDbStatus() }`
   - Verify: `node --test server/test/health.test.js`
   - Pre-review: none
   - Status: pending

### Wave 5
6. **Runtime resilience E2E — disconnect/reconnect and no-crash** — covers UC-3, UC-3-A1/E1/EC1, TC-4.1
   - Files: `server/test/e2e.connection.test.js` (new, test-only)
   - Changes: simulate disconnect/reconnect via mongoose connection events, assert no crash, assert no models registered
   - Verify: `node --test server/test/e2e.connection.test.js`
   - Pre-review: none
   - Status: pending

## Completed
- PRD Section 2 written (docs/PRD.md)
- Use cases written (docs/use-cases/mongodb-backend-connection_use_cases.md — 3 UCs, 21 sub-scenarios)
- QA test cases written (docs/qa/mongodb-backend-connection_test_cases.md — 20 test cases)
- Architecture review: PASS (5 structural directives incorporated into plan above)
- Feature branch `feat/mongodb-backend-connection` created from `dev`
- `mongoose` installed in `server/` workspace
- `server/.env.example` created; `server/.env` created (gitignored) with a working connection string, verified via standalone connectivity check (mongoose.connect succeeded)

## Blockers
(none)
