# AI-DLC Lessons

Append-only log written by `/retro`. Format: `- **YYYY-MM-DD · <slug>** — <lesson> → <harness change>`. The SessionStart hook shows the last five to every new session.

- **2026-11-20 · harness-audit** — A rule that exists only in prose was contradicted by config: the commit ban sat next to a `Bash(git commit*)` allow rule and commands that said "commit". → Commit/push denied by hook + permissions; commands now end with suggested commit commands.
- **2026-11-20 · harness-audit** — A generic toolkit leaks wrong assumptions (typecheck, SQL, ORM, migrations) into a JS + MongoDB repo, and agents then "verify" with commands that don't exist. → Stack-specific agents/rules; one `npm run verify` that reports SKIP with a reason instead of pretending.
- **2026-11-20 · harness-audit** — A single free-text scratchpad can't express gates, parallel work items, or what was approved. → Per-work-item `state.json` (CLI-only writes) + `journal.md`; phase derived, not stored.
- **2026-11-20 · harness-audit** — Full autonomy ("never stop to ask") skipped the human decisions AI-DLC depends on. → Human-only approve/reject at requirements, design and release; construction stops after every wave.
- **2026-11-20 · harness-audit** — A stray non-agent file in `.claude/agents/` loads as a broken agent definition. → Keep `.claude/agents/` to agent definitions only; check during `/retro`.
- **2026-11-21 · harness-audit** — The harness invented product decisions (folder layout, error format, test runner) that the owner's PROJECT_CONTEXT.md had already settled differently. → `docs/PROJECT_CONTEXT.md` is the product source of truth, loaded via `.claude/rules/project.md`; architects and planners read it first.
