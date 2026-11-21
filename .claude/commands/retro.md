---
description: AI-DLC learning loop — mine a finished work item for lessons and propose concrete harness improvements
argument-hint: "[slug]   (default: current branch's work item)"
---

# /retro — make the harness better every cycle

Work item: `$ARGUMENTS` (default: current branch)

1. Gather evidence (read-only): `state.json` history (rejections + notes, failed units, retries), `journal.md` deviations, `review.md` findings fixed late, recorded checks, and `git log` for the branch.
2. Classify each friction point by **where the harness should have caught it**: intent/clarification, requirements, use cases, design, test cases, plan, a hook/guard, a rule, an agent prompt, or verify tooling.
3. Append ≤5 lessons to `docs/aidlc/lessons.md` in the existing format (`- **YYYY-MM-DD · <slug>** — <lesson> → <harness change>`). Lessons must be specific and actionable; skip generic advice.
4. For each lesson, draft the exact harness edit (diff for the agent/rule/command/hook/test). **Present them; apply only the ones the user approves.** Hook or lib changes need a matching test in `scripts/aidlc/aidlc.test.mjs` and a green `npm run test:harness`.
