# Feature guides

One plain-language guide per feature (or per roadmap phase from [`docs/PROJECT_CONTEXT.md`](../docs/PROJECT_CONTEXT.md) §5). Each guide explains **what was built, how it works, and how to explain it in an interview**.

These differ from the work-item folders in [`docs/features/<slug>/`](../docs/features/). Those hold the *process* (requirements, use cases, design, plan, gates). The guides here describe the *result*, written for a reader who has never seen the code.

| # | Feature | Guide | Status |
|---|---|---|---|
| 1 | Project setup (Vite, Express, MongoDB, folder structure, Jest, ESLint/Prettier) | [project-setup.md](project-setup.md) | ✅ Built, awaiting release |
| 2 | Authentication | _written when the feature is released_ | ⬜ |

A guide is written or updated in `/merge-ready` for every work item. Copy the template below.

---

## Template

```markdown
# <Feature name>

> Phase <n> · work item(s): [`<slug>`](../docs/features/<slug>/) · status: <built / released>

## What it does
Two or three sentences a non-developer would understand.

## How it works
The flow, step by step (a small diagram if it helps). Name the files involved.

## Files
| File | Responsibility |
|---|---|

## API (if any)
Method, path, who can call it, example request and response.

## How to run and test it
Commands, and what you should see.

## Design decisions
The 3–5 choices worth defending, each with a one-line "why".

## What to understand (interview prep)
Questions an interviewer could ask about this feature, with short answers.

## Not included yet
What was deliberately left for a later phase.
```
