# Intent: MongoDB Backend Connection

> Migrated into the AI-DLC layout on 2026-11-20. The original request predates the harness; this records it from the approved requirements (PR #3).

## Request
Connect the Node/Express backend to MongoDB so future features can persist data, with fail-loud startup and a health check that reports live database state.

## Problem & outcome
- **Problem:** the server has no persistence layer; `dotenv` is installed but unused.
- **Desired outcome:** the server connects to MongoDB via Mongoose at startup, refuses to run without a database, and `GET /api/health` reports `db: connected|disconnected` live.
- **Success signal:** the acceptance criteria in [requirements.md](requirements.md) pass under `npm run verify`.

## Actors
| Actor | Can | Cannot |
|---|---|---|
| Developer running the server | configure `MONGODB_URI`, start the server, read logs | — |
| HTTP client of `/api/health` | read service + DB status | change anything |

## Constraints & assumptions
- Local development database only; production Atlas provisioning is out of scope.
- No models or schemas in this work item.
- Also completes Phase 1's "Set up the folder structure" (`docs/PROJECT_CONTEXT.md` §3/§5): the server moves into `server/src/` and adopts the response envelope and central error handler.

## Open questions
None outstanding (resolved during the original PRD review).

## Out of scope
- Application entity models, production database setup, auth around DB access.
