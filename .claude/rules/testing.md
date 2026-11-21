---
paths:
  - "server/**"
  - "client/**"
  - "**/*.test.*"
  - "docs/features/**/test-cases.md"
  - "docs/features/**/plan.md"
---
# Testing Rules

## Runners (chosen for interview recognisability; confirmed at the MongoDB design gate)
- **Server:** Jest + supertest. Tests in `server/tests/`, named `<name>.test.js`, driving the exported `app` (no listening port). Added by `mongodb-backend-connection` U1.
- **Client:** Vitest + React Testing Library (Jest-compatible API, Vite-native). Added by the first work item with UI (auth).
- Until a runner exists, `npm run verify` reports that step as SKIP with the reason.

## Commands
- `npm run verify` runs everything. `--quick` skips the production build.
- `npm test --workspace server` / `npm test --workspace client` once the runners are configured.

## Conventions
- Test names carry trace IDs: `TC-1.2 UC-1-E1: rejects a missing MONGODB_URI`.
- Tests never use the developer's `.env` or database. Unit tests mock Mongoose. Integration tests that need MongoDB use a disposable database the test sets up itself (the mechanism is decided in the first work item that needs it).
- Assert the response envelope: `success`, `message`, `data`/`errors`, and the status code.
- No `.only`, no unexplained `.skip`, no real sleeps (use fake timers or events).
- TDD: write tests first and watch them fail for the right reason.
- Every UC scenario has a TC in `test-cases.md` (enforced by `aidlc ready design`). Every TC has a test (audited in `/merge-ready`).
