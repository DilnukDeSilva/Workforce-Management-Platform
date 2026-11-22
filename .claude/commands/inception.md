---
description: AI-DLC Inception — turn a feature request into approved requirements, use cases, design, test cases and a unit plan
argument-hint: "<feature request, or path to a filled docs/requirement-template.md>"
---

# /inception — from intent to an approved plan

Request: `$ARGUMENTS`

If the request names a phase or feature that has a spec in `docs/PROJECT_CONTEXT.md` (e.g. Phase 2 → §7), that spec is the request. Check §5/§6 first: if an earlier phase isn't released yet, tell the user and ask before starting (one phase at a time).

Inception produces the artifacts the human approves at two gates. **You write no production code here** — the file guard blocks it until the `design` gate is approved. Re-running `/inception` resumes from the current gate.

## 0. Locate or create the work item
- `npm run aidlc -- status`. If the current branch already has a feature work item, resume at its current gate.
- Otherwise derive a kebab-case slug and run `npm run aidlc -- start feature <slug> --title "<Title>"` (creates `feat/<slug>` and `docs/features/<slug>/` from templates). If the tree is dirty, ask the user before using `--no-branch`.

## Stage A — Requirements (gate: `requirements`)
1. **Intent** — fill `intent.md` yourself from the request. Put every inferred fact under *Assumptions* and every ambiguity under *Open questions*.
2. **Clarify** — if any open question changes scope, data, or permissions, ask the user now (one batched question set) and record answers in `intent.md`. Do not guess product decisions.
3. **Requirements** — delegate to `prd-writer` → `requirements.md` + one index line in `docs/PRD.md`.
4. **Use cases** — delegate to `ba-analyst` → `use-cases.md`.
5. `npm run aidlc -- ready requirements`. Fix any reported problem and retry.
6. **STOP.** Present a ≤10-line summary (scope, actors, FR count, UC count, assumptions needing confirmation), plus a *What to understand* note (2–4 concepts the user should be able to explain) and ask the user to review the three files and run `npm run aidlc -- approve requirements` (or `reject requirements --note "..."`). **Strictly do not commit or push** — approval is not permission; the user commits.

## Stage B — Design & plan (gate: `design`) — only after `requirements` is approved
Run 1 and 2 **in parallel** (one message, two Agent calls) — they only read the approved requirements:
1. `architect` → `design.md` (verdict, component design, API contract, data model, decisions, risks).
2. `qa-planner` → `test-cases.md` (every UC id mapped).
3. If the architect verdict is FAIL: revise per its action items and re-run it (max 2 rounds), then escalate to the user.
4. `planner` → `plan.md` (units, waves, files, verify commands, done-conditions, suggested commits).
5. `plan-critic` → findings on `plan.md`. Fix every CRITICAL/MAJOR in the plan, record the outcome under *Critic review*. One critic pass only.
6. `npm run aidlc -- ready design` — this enforces traceability (every UC tested and planned) and same-wave file exclusivity. Fix and retry until it passes.
7. Append key decisions to `journal.md`.
8. **STOP.** Summarize: verdict, units × waves, risky units (pre-review), anything descoped, and *What to understand*: the key design decisions with their interview one-liners. Ask the user to review `design.md`, `test-cases.md`, `plan.md` and run `npm run aidlc -- approve design`. Approval registers the units and unlocks `/construction`. **Strictly do not commit or push** — approval is not permission; the user commits.

## Rules
- Specialist agents write their own artifact; you orchestrate, validate, and summarize. Remove the `<!-- aidlc:template -->` marker only from files that are genuinely complete.
- Hedging that silently cuts in-scope work ("v1", "for now", "placeholder") is not allowed unless `requirements.md` lists it as out of scope.
- If an approved artifact must change, say so explicitly — the guard will ask for confirmation and the gate will need re-approval.
