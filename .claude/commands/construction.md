---
description: AI-DLC Construction — implement the next unit (or wave) test-first, verify, and hand back for the user to commit
argument-hint: "[U<n> | wave <n>]   (default: next pending wave)"
---

# /construction — build units test-first

Target: `$ARGUMENTS` (default: the lowest wave with pending units)

Precondition: the construction gate is approved (`npm run aidlc -- status` shows phase CONSTRUCTION). If not, stop and point to `/inception` or `/fix`.

**Commit boundary:** you never commit. Each unit ends with a verified working tree and a suggested commit command; the user reviews and commits. Because of that, run **one wave per invocation**, then stop.

## 1. Select work
- Read `plan.md` and `journal.md`. Pick the target units; confirm the working tree contains no unrelated uncommitted changes (if it does, ask the user to commit the previous wave first).
- Units with **Pre-review: architect/security**: run that reviewer on the unit spec first and fold its requirements into the unit before coding.

## 2. Execute
- **One unit in the wave** → do it yourself with the TDD loop below.
- **Several units in the wave** → spawn one Agent per unit **in a single message** (they own disjoint files — the CLI verified this). Prompt each with: the unit block verbatim, the paths of `use-cases.md`/`test-cases.md`/`design.md`, "follow the TDD loop in .claude/commands/construction.md, touch only your Files, do not run aidlc unit/record, do not commit; report PASS/FAIL, files changed, verify output, deviations".

### TDD loop (per unit)
1. `npm run aidlc -- unit U<n> in-progress`
2. **Red** — delegate to `test-writer` for this unit's TCs. Run them; they must fail for the right reason.
3. **Green** — minimal implementation in the unit's Files only. Re-read each file before editing. Follow `.claude/rules/architecture.md`.
4. **Verify** — run the unit's `Verify:` command, then `npm run verify -- --quick`. Check the `Done when:` condition literally.
5. Errors: classify per `.claude/rules/error-recovery.md` (3-retry budget per unit). Log deviations to `journal.md`.
6. Outcome: `npm run aidlc -- unit U<n> done` or `... failed --note "<reason>"` / `blocked --note`.

## 3. Hand back
- Record parallel results (`unit ... done|failed`) as the orchestrator.
- Report per unit: files changed, tests added (TC ids), verify result, deviations.
- Give the user ready-to-run commit commands, one per unit, using each unit's *Suggested commit*:
  ```
  git add <unit files> && git commit -m "feat(api): ..."
  ```
- *What to understand*: 2–4 concepts from this wave the user should be able to explain before committing (e.g. why `app.js` is separate from `server.js`). Offer to walk through any of them.
- State what's next (next wave, or `/merge-ready` when all units are done). Stop.
