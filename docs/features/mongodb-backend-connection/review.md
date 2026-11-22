# Release Review: MongoDB Backend Connection (Phase 1: Project setup)

> Operations · owner: `/merge-ready` orchestrator, 2026-11-22. The human approves the `release` gate after reading this.

| Gate | Result | Notes |
|---|---|---|
| verify (`npm run verify`) | ✅ PASS | All steps pass; client tests SKIP (no runner until the first UI work item). 51 server tests, 15 harness tests. |
| hygiene | ⚠️ WARN | Right branch, no secret files changed. The diff also has harness fixes and ESLint/Prettier (user-requested, journaled, outside `plan.md`). |
| traceability (UC → TC → test) | ✅ PASS | Every UC scenario has a TC and every executable TC has a named test. TC-1.9, TC-2.3 and TC-3.5 are manual/N-A by design. |
| code review | ✅ PASS | 0 blockers, 0 majors, 3 minors, all fixed (below). |
| security audit | ✅ PASS (round 2) | Round 1 FAILED on vulnerable production dependencies. Fixed, re-audited and passed. |
| integration verification | ✅ PASS | U1–U8 present, no stubs, entry point and routes wired. |
| docs accuracy | ✅ PASS | CLAUDE.md commands block completed; everything else matched. |
| performance | n/a | No queries or list rendering yet. |
| UI/UX | n/a | Client changed only by Prettier formatting. |

## Findings fixed during review
- **Security HIGH: vulnerable production dependencies.** body-parser 2.3.0 (DoS via compressed bodies, reachable through `express.json()`), mongoose 9.8.0 and proxy-addr 2.0.7 → `npm audit fix` gave body-parser 2.4.0, mongoose 9.12.3 and proxy-addr 2.0.8. Lockfile only, within the declared ranges. `npm audit --omit=dev` now reports 0.
- **Security MEDIUM: `redactUri` leaked passwords containing a raw `/` or `@`.** It now hides everything up to the last `@`. 3 tests added.
- **Security MEDIUM: secrets-guard bypasses** (`cat ';ls' server/.env`, `ls & cat …`, `ls <(cat …)`, `cat server/.env>out`, brace expansion). The exemption now covers only plain listing commands, and redirect and brace characters were added to the detector. 8 harness tests added.
- **Security LOW: `errorHandler`.** It now passes a 4xx message through only when the library marks it safe (`expose`), and treats a non-integer status as a 500. 2 tests added.
- **Security LOW:** `X-Powered-By: Express` header disabled; 1 test added.
- **Code review minor:** a listen error (e.g. port in use) crashed with a raw stack. Now it logs "Server failed to start" and exits 1; 1 test added.
- **Code review minor:** the `PORT` fallback to 5000 on a non-numeric value is now documented as intentional.
- **Traceability minor:** four tests had no TC id in their name; added.

## Residual risks / follow-ups
- 19 moderate advisories in **dev-only** tooling (jest/nodemon via glob/minimatch). The only fix is a semver-major downgrade with `--force`; revisit when jest and nodemon ship fixes. Not in the runtime path.
- `cors()` allows any origin, and there is no helmet or rate limiting yet. Deferred to the **auth** work item, per `.claude/rules/security.md`.
- The secrets guard is a regex: globs and quote-splitting (`cat server/.en*`) can still disguise the filename. The `Read(**/.env*)` permission deny rules are the second layer. Candidate for `/retro`.
- `redactUri` does not handle a raw space inside the credentials. Such URIs are invalid anyway (`%20`).
- The live MongoDB stop/restart for TC-3.1–3.3 was proven by mocked tests only. The live smoke covered connect, auth failure and an unreachable host.
- The harness guard blocks shell heredocs whose *text* mentions the env file path (a false positive), so some docs had to be written with the editor. Candidate for `/retro`.

## Suggested commits (user runs these)
```bash
git add package-lock.json && git commit -m "fix(infra): update body-parser, mongoose and proxy-addr to patched versions"
```
```bash
git add server/src/config/db.js server/src/middleware/errorHandler.js server/src/app.js server/src/server.js server/src/config/env.js server/tests && git commit -m "fix(core): harden log redaction, error responses and startup errors"
```
```bash
git add scripts/aidlc/lib.mjs scripts/aidlc/aidlc.test.mjs && git commit -m "fix(aidlc): close secrets-guard bypasses"
```
```bash
git add CHANGELOG.md CLAUDE.md features docs/PROJECT_CONTEXT.md docs/features/mongodb-backend-connection && git commit -m "docs: release review and changelog for project setup"
```

## Changelog entry
Written to `CHANGELOG.md`: "Project setup: database connection, server structure, tests and linting", 2026-11-22 04:07 UTC.
