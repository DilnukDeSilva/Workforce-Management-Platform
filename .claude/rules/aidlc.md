# AI-DLC Operating Rules

Full model: `docs/aidlc/README.md`. Product decisions: `docs/PROJECT_CONTEXT.md` (see `project.md`). These rules are enforced by hooks in `.claude/hooks/` — a blocked tool call is the harness working; read the reason and follow it. Do not work around a guard (e.g. writing files via shell to dodge the file guard).

## Lifecycle
Every change is a **work item** in `docs/features/<slug>/` on branch `feat|fix|chore/<slug>`. State lives in `state.json`, written only by `npm run aidlc -- …`.

| Phase | What happens | Ends at gate (human approves) |
|---|---|---|
| Inception | intent → requirements → use cases → design → test cases → plan | `requirements`, then `design` (feature) · `plan` (fix/chore) |
| Construction | units, wave by wave, test-first | — (units marked done) |
| Operations | `npm run verify` + review gates + release review + changelog + feature guide in `features/` | `release` |

- Commands: `/aidlc` (status/next), `/inception`, `/fix`, `/construction`, `/merge-ready`, `/retro`.
- Production code (`server/**`, `client/src/**`, `client/index.html`) is editable only after the construction gate is approved.
- You mark a gate `ready`; **only the human runs `approve`/`reject`**. When a gate is ready, stop and ask for review.
- Editing an approved artifact requires confirmation and invalidates that approval (drift is detected by hash).

## Non-negotiables
1. **STRICTLY never `git commit` or `git push`, not even after a gate is approved or a wave is green.** Approval is not permission to commit. The user commits. End each unit/wave with suggested `git add … && git commit -m "…"` commands. No AI attribution in suggested messages.
2. **Never read or write `.env` files.** Use `.env.example`.
3. **Evidence over assertion.** "Done" means the unit's `Verify:` command and `npm run verify -- --quick` passed in this session, and you show the output summary. Never report success you did not observe.
4. **Ask, don't guess, product decisions.** Scope, data, permissions, and new dependencies are the user's call (error-recovery Rule 4).
5. **Keep the journal.** Decisions, deviations, and blockers go to `docs/features/<slug>/journal.md` as they happen — it is your memory across compaction.
6. Trivial non-code edits (typos, comments, docs outside approved artifacts) need no work item.
