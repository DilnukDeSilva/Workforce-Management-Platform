# Workforce Management Platform

A full-stack workforce management application built with the MERN stack (MongoDB, Express.js, React, and Node.js) that streamlines employee and HR operations. The platform includes secure JWT authentication, role-based access control, employee management, attendance tracking, leave request management, department administration, and an interactive analytics dashboard. It features a responsive user interface, RESTful APIs, data visualization, and modern best practices for scalable full-stack web development.

> **Status:** Phase 1 (project setup) in progress. See the [roadmap and current status](docs/PROJECT_CONTEXT.md#6-current-status).

## Structure

```
.
├── client/          # React frontend (Vite)
├── server/          # Node/Express backend (src/ = app code, tests/ = Jest tests)
├── features/        # One plain-language guide per feature (what it does, how it works)
├── docs/
│   ├── PROJECT_CONTEXT.md # Vision, stack, roadmap, feature specs, status
│   ├── PRD.md          # Product overview + feature index
│   ├── features/<slug>/ # One folder per work item (requirements → plan → review, state.json)
│   └── aidlc/           # AI-DLC guide, templates, lessons
├── scripts/            # aidlc CLI, verify, harness tests
├── CLAUDE.md           # Project facts for Claude Code
├── CHANGELOG.md        # One entry per released work item
└── .claude/
    ├── agents/          # 16 specialist subagents
    ├── commands/        # /aidlc /inception /fix /construction /merge-ready /retro
    ├── rules/           # Path-scoped rules (architecture, security, testing, git, ...)
    ├── hooks/           # Guardrails: git policy, secrets, phase gate, session context
    └── settings.json    # Permissions + hook wiring
```

## Setup

**Prerequisites:** Node.js 20+, and MongoDB, either installed locally or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
npm install                              # installs client + server (npm workspaces)
cp server/.env.example server/.env       # then edit server/.env
```

In `server/.env`, set `MONGODB_URI` to your database:

- local: `MONGODB_URI=mongodb://localhost:27017/wfm`
- Atlas: `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/wfm`

The server connects to MongoDB **before** it starts listening. If `MONGODB_URI` is missing or the database can't be reached, it prints a clear error (credentials hidden) and exits.

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

## Testing

```bash
npm test --workspace server   # Jest + supertest (no real database needed)
npm run lint --workspace server
npm run verify                # every quality check: tests, lint, build, harness
```

## Backend API

Every response uses one envelope: `{ success, message, data }` on success, `{ success: false, message, errors? }` on failure.

- `GET /api/health`: server and database status

```json
{ "success": true, "message": "Service healthy", "data": { "status": "ok", "db": "connected" } }
```

`db` is `"connected"` or `"disconnected"`. The endpoint returns 200 even when the database is down, because its job is to report the status.

## AI-Driven Development (AI-DLC)

This repo is built with an **AI-Driven Development Lifecycle**: Claude Code agents do the analysis, design, tests and code. You approve at three gates: requirements, design, release. You make every commit yourself. Hooks enforce the rules, a CLI tracks the state, and `npm run verify` is the single quality bar.

```text
/inception "Managers can approve time-off requests"   # → intent, requirements, use cases  → you approve
                                                       # → design, test cases, unit plan    → you approve
/construction                                          # → one wave of test-first units     → you commit
/merge-ready                                           # → verify + parallel reviews + changelog → you approve release
/retro                                                 # → lessons that improve the harness
```

```bash
npm run aidlc -- status            # where is the current work item?
npm run aidlc -- approve design    # humans only — agents are blocked from approving
npm run verify                     # lint, tests, build, harness checks
```

For larger features, fill in [`docs/requirement-template.md`](docs/requirement-template.md) first and hand it to `/inception`.

Full guide: **[docs/aidlc/README.md](docs/aidlc/README.md)**: lifecycle, artifacts, guardrails, agents, escape hatch.
