<!-- aidlc:template -->
# Plan: <feature name>

> Inception · owner: `planner`, critiqued by `plan-critic` · sources: all inception artifacts.
> Units are parsed by the CLI: keep the `### U<n>: <title>` heading and the bold field names exactly.
> Same-wave units must not share files (they may run in parallel). Each unit = one reviewable commit by the user.

### U1: <title>
- **Wave:** 1
- **Use cases:** UC-1, UC-1-E1
- **Tests:** TC-1.1, TC-1.2
- **Files:** `server/...` [new], `server/test/...` [new]
- **Changes:** <specific, per file>
- **Verify:** `<exact command>`
- **Done when:** <binary, testable condition>
- **Pre-review:** none | architect | security
- **Suggested commit:** `feat(api): <summary>`

## Wave summary
| Wave | Units | Rationale |
|---|---|---|

## Risks & dependencies
-

## Critic review
<plan-critic findings and how each CRITICAL/MAJOR was resolved>
