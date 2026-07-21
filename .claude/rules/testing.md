# Testing Rules

## Test Locations

- Unit/integration tests: not yet established — no `tests/` directory exists in `client/` or `server/`.
- QA test case docs: `docs/qa/`
- Use case docs: `docs/use-cases/`

## Commands

- Tests: not configured yet. `server`'s `npm test` is a stub that exits 1; `client` has no test script at all.
- Typecheck: none — this is a plain JS/JSX project, no TypeScript.
- Lint: `npm run lint --workspace client` (oxlint).
- Build: `npm run build --workspace client` (vite build); `server` has no build step.

TODO: introduce a real test runner (e.g. Vitest for `client`, Jest or `node:test` for `server`) before the `test-writer`/`build-runner`/`e2e-runner` agents have anything to actually run.

## Requirements

- New API endpoints and business logic MUST have test coverage
- Follow existing test patterns in the codebase
- Test cases MUST be documented in `docs/qa/<feature>_test_cases.md` before writing actual tests
- Use cases MUST be documented in `docs/use-cases/<feature>_use_cases.md` before test cases
- Cover happy path, error cases, edge cases, and auth boundary cases
