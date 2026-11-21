---
description: AI-DLC Operations — run every quality gate, fix what fails, write the release review and changelog, and hand the release gate to the user
---

# /merge-ready — quality gates and release review

Precondition: all units are `done` (`npm run aidlc -- status` shows OPERATIONS). Otherwise stop and report which units remain.

## 1. Deterministic gates (run first — cheap and authoritative)
- `npm run verify` → `npm run aidlc -- record verify pass|fail`
- **Hygiene:** branch is the work item's branch; `git diff --stat <base>...` contains only files the plan names, plus docs/tests; no `.env` changes. Record `hygiene`.

## 2. Review gates — spawn in parallel (one message, multiple Agent calls)
| Check | Agent | Scope |
|---|---|---|
| `code-review` | `code-reviewer` | diff vs base |
| `security` | `security-auditor` | diff vs base (always for server/ changes) |
| `integration` | `verifier` | plan.md units vs code |
| `traceability` | `qa-planner` (audit mode) | every UC → TC → an actual test name |
| `docs` | `doc-updater` (accuracy mode, no changelog) | CLAUDE.md, README, requirements vs behaviour |
| `performance` | `performance-auditor` | only when data access or list rendering changed |
| `ui` | yourself | only when client/ changed: loading/error/empty states, responsive |

Each agent ends with an `aidlc-result` block. Record each: `npm run aidlc -- record <check> <pass|fail|warn> --note "<1 line>"`.

## 3. Fix loop
For each FAIL: fix it (classify per error-recovery rules), re-run **only** that gate, re-record. Max 3 rounds per gate; then mark NOT READY and report the blocker. Fixes touching production code are allowed (construction stays unlocked) but must be listed in review.md.

## 4. Release package (only when no gate is `fail`)
1. Fill `review.md` (gate table, fixes, residual risks, suggested commit commands for any review fixes).
2. Changelog: run `date -u +'%Y-%m-%d %H:%M'`, then delegate to `doc-updater` (changelog mode) per `.claude/rules/changelog.md`. A changelog failure is a WARNING, not a blocker.
3. `npm run aidlc -- ready release`.
4. Write or update the feature guide `features/<phase-or-feature>.md` (template: `features/README.md`): what it does, how it works, files, how to run and test it, what to understand. One guide per feature/phase; a phase built by several work items shares one guide.
5. Update the *Current status* table in `docs/PROJECT_CONTEXT.md` §6 for this work item.
6. **STOP.** Strictly do not commit or push. Report the gate table and ask the user to commit outstanding changes, open/merge the PR, and run `npm run aidlc -- approve release`. Suggest `/retro`, and name the next phase from `PROJECT_CONTEXT.md` §5, without starting it.
