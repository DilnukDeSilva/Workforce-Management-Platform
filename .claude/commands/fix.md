---
description: AI-DLC light track for bugs and chores — evidence-based root cause, one plan gate, regression test first
argument-hint: "<bug report or chore description>"
---

# /fix — light track

Report: `$ARGUMENTS`

Use for defects and small chores with no new product behaviour. If the work adds a capability, an endpoint, or a schema change, stop and use `/inception` instead.

1. **Work item** — `npm run aidlc -- start fix <slug> --title "<Title>"` (use `chore` for non-defects). Resume if it exists.
2. **Intent** — fill `intent.md`: observed vs expected, reproduction.
3. **Root cause** — reproduce first (failing command or test). Trace to `file:line`. Write the evidence in `plan.md › Root cause`. No guessing; if you cannot reproduce, say so and ask.
4. **Plan** — regression test + 1–3 units in `plan.md`.
5. `npm run aidlc -- ready plan` → **STOP** for the user to `approve plan`.
6. After approval: run `/construction` (regression test must fail first, then pass).
7. Then `/merge-ready` (the lighter checklist applies: verify, code review, security if touched, docs).
