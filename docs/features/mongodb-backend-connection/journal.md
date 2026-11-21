# Journal: MongoDB Backend Connection

> Append-only working memory. Newest last.

- 2026-07-21 — PRD, use cases (3 UCs, 18 scenarios), QA test cases (20) written; architecture review PASS with 5 directives (now in design.md).
- 2026-07-21 — `mongoose` installed in `server/`; `server/.env.example` created; `server/.env` created locally (gitignored) and connectivity verified with a standalone `mongoose.connect()`.
- 2026-11-20 — Migrated to AI-DLC: PRD §2 → requirements.md, use-cases/qa docs moved here, scratchpad plan → plan.md (slices 1–6 → U1–U6). Gates need the user's re-approval in the new system (originally approved via PR #3).
- 2026-11-21 — Aligned with docs/PROJECT_CONTEXT.md: added FR-9 + 2 ACs (Phase 1 folder structure, response envelope, central error handler); design moved to server/src/ with D5–D7; plan re-written for server/src + Jest (U4 now includes app/server split); health examples wrapped in the envelope. Requirements gate needs a fresh review.
- 2026-11-21 — plan-critic: FAIL (2 critical, 7 major, 7 minor) → all resolved. Plan now 8 units / 5 waves (U4 split; new U7 docs). Added TC-5.1–5.5 for FR-9, design D8–D10, automated-vs-live TC note, TC-1.9 manual. Details in plan.md › Critic review.
