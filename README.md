# Workforce Management Platform

Full-stack app with a React (Vite) frontend and a Node/Express backend, managed as an npm workspaces monorepo.

## Structure

```
.
├── client/          # React frontend (Vite)
├── server/          # Node/Express backend
├── docs/
│   ├── PRD.md        # Product requirements (owned by the prd-writer agent)
│   ├── use-cases/     # Business-analyst use-case docs (ba-analyst agent)
│   └── qa/             # QA test case docs (qa-planner agent)
├── CLAUDE.md         # Project facts + mandatory AI development workflow
├── CHANGELOG.md      # Auto-maintained by the doc-updater agent
└── .claude/
    ├── agents/        # 15 specialized subagent definitions
    ├── commands/      # Slash commands that drive the pipeline
    ├── rules/         # Process rules (git, testing, security, etc.)
    ├── scratchpad.md   # Persistent cross-session working memory
    └── settings.json   # Permissions for the pipeline (commit, scratchpad writes)
```

## Setup

```bash
npm install
```

This installs dependencies for both `client` and `server` via npm workspaces.

## Development

Run both frontend and backend together:

```bash
npm run dev
```

Or individually:

```bash
npm run dev:client   # http://localhost:5173
npm run dev:server   # http://localhost:5000
```

## Backend API

- `GET /api/health` — health check endpoint

## AI-Driven Development (Harness-Engineered SDLC)

This project uses a **harness-engineered SDLC** for AI-assisted development: instead of asking Claude Code to write code directly from a one-line request, every change is routed through a fixed pipeline of specialized subagents that mirror a real software team. The pipeline itself — which agent runs when, what it's allowed to touch, and what gate it must pass — is defined declaratively in [`CLAUDE.md`](CLAUDE.md), `.claude/agents/`, `.claude/commands/`, and `.claude/rules/`. Claude Code loads `CLAUDE.md` automatically at the start of every session in this repo, so the pipeline is enforced without you having to repeat instructions.

### Why a harness instead of ad hoc prompting

Left unconstrained, an AI coding agent tends to fail in a few predictable ways: it reports success on code that doesn't actually work, it loses context on large files or long sessions, it renames things with a text search and misses references, it drifts from vague plans, and it writes code before anyone (human or AI) has written down what "done" means. The harness in this repo is a set of guardrails against exactly those failure modes — mandatory documentation before code, small verifiable slices, explicit quality gates, and a shared scratchpad so context survives across sessions.

### The agent roster

| Stage | Agent | Role |
|---|---|---|
| Docs | `prd-writer` | Writes feature requirements into `docs/PRD.md` |
| Docs | `ba-analyst` | Writes use cases (all flows/edge cases) into `docs/use-cases/` |
| Docs | `architect` | Reviews module boundaries, schema, and API design; PASS/FAIL gate |
| Docs | `qa-planner` | Maps every use case to a test case in `docs/qa/`, before any code exists |
| Docs | `planner` | Breaks the feature into 5–9 small, independently verifiable slices |
| Implementation | `security-auditor` | Audits slices touching auth, payments, or sensitive data |
| Implementation | `test-writer` | Writes tests first, from the documented use cases and QA cases (TDD) |
| Implementation | `build-runner` | Runs typecheck/tests/build and reports failures |
| Cleanup | `refactor-cleaner` | Removes dead code, dedups, improves type safety — no behavior change |
| Quality gates | `code-reviewer` | Reviews the diff for quality, consistency, and correctness |
| Quality gates | `e2e-runner` | Writes/runs end-to-end tests mapped to use-case scenarios |
| Quality gates | `verifier` | Confirms new code is actually wired up, not just present (no stubs/TODOs left behind) |
| Quality gates | `doc-updater` | Keeps docs accurate and writes the single `CHANGELOG.md` entry per feature |
| Cross-cutting | `performance-auditor` | Flags N+1 queries, unnecessary re-renders, bundle bloat |
| Cross-cutting | `database-agent` | Writes and reviews schema migrations |

Each agent has a narrow, explicit tool permission set (e.g. most reviewers are read-only — they can't modify code, only report findings).

### How to give a requirement

Just describe what you want in plain language — you don't write the PRD, use cases, or test cases yourself; the agents do.

```
Add a feature so managers can approve or reject employee time-off requests.
```

From there:
- Claude will typically enter plan mode, then (once you approve) run `/bootstrap-feature` to produce the PRD section, use cases, architecture review, QA test cases, and an implementation plan — before writing any code.
- `/develop-feature` runs the entire pipeline autonomously end-to-end: docs → TDD implementation, slice by slice → cleanup → all quality gates.
- `/implement-slice` implements one slice at a time, if you'd rather review progress between slices.
- `/merge-ready` runs the 9 quality gates (review, security, build, E2E, verification, docs, changelog) once implementation is done.
- `/context-refresh` rebuilds session context from `.claude/scratchpad.md` if you're resuming work after a break.

The more concrete the requirement (who does what, what happens on each outcome, any constraints), the better the generated PRD and use cases will be — `prd-writer` and `ba-analyst` document what you tell them, they don't invent product decisions.
