---
description: Show AI-DLC status for the current work item and do (or ask for) the single next step
argument-hint: "[status | start <feature|fix|chore> <slug> \"<title>\"]"
---

# /aidlc — lifecycle router

Arguments: `$ARGUMENTS`

1. Run `npm run aidlc -- status` (and `npm run aidlc -- next` when on a work-item branch).
2. If arguments start with `start`, run `npm run aidlc -- start <track> <slug> --title "<title>"` and continue with step 3.
3. Report in ≤6 lines: work item, phase, gate states, units progress, failing checks, the next action.
4. Then act on the next action:
   - **Gate is `ready`** → stop. Tell the user exactly which files to review and the command to approve or reject. Never approve on their behalf (the hook blocks it anyway).
   - **Inception** → offer `/inception` (feature) or `/fix` (fix/chore).
   - **Construction** → offer `/construction`.
   - **Operations** → offer `/merge-ready`.
   - **Done** → offer `/retro`.
5. If `status` shows "changed since approval", explain which approved artifact drifted and that the user must re-approve (`npm run aidlc -- approve <gate>` after `ready`).
