# Project: Workforce Management Platform

A MERN workforce management platform: JWT auth, role-based access (Admin / HR / Employee), employees, departments, attendance, leave and an analytics dashboard. It's a **portfolio project for an Associate Software Engineer job hunt**, so interviewers will read the code and the owner must be able to explain all of it.

- **Product source of truth:** `docs/PROJECT_CONTEXT.md`. Background, decided stack, folder structure, roles, the 14-phase build order, feature specs, current status. It wins on product decisions.
- **How work gets done:** AI-DLC with human approval gates, enforced by hooks. See `.claude/rules/aidlc.md` and `.claude/rules/project.md` (both always loaded) and `docs/aidlc/README.md`.

## Tech Stack (decided; libraries are added in the phase that needs them)
- **Frontend:** React 19 + Vite (`client/`), plain JavaScript. Coming: React Router, Axios, Tailwind CSS, React Hook Form, Context API, Recharts.
- **Backend:** Node.js + Express 5 (`server/`), CommonJS, `cors`, `dotenv`. Coming: bcrypt, jsonwebtoken, cookie-parser, zod.
- **Database:** MongoDB + Mongoose. `server/src/config/db.js` connects at startup (the server exits if it can't); `GET /api/health` reports `data.db`.
- **Testing:** Jest + supertest (server, installed; tests in `server/tests/`). Vitest + React Testing Library (client, added with the first UI work item).
- **Deploy (later):** Vercel (client), Render (server), MongoDB Atlas.

## Commands
```bash
npm install                        # all workspaces
npm run dev                        # client :5173 + server :5000
npm run verify                     # THE quality gate (harness tests, work items, server, client); --quick skips build
npm run aidlc -- status            # lifecycle state for the current branch (help: npm run aidlc)
npm run lint --workspace client
npm run build --workspace client
```

## Structure
```
client/src/            React app (default Vite scaffold today; target layout in .claude/rules/architecture.md)
server/src/            server.js (entry: env → connect DB → listen), app.js, config/, routes/, controllers/, middleware/, utils/
server/tests/          Jest + supertest tests (mock Mongoose; never touch .env or a real DB)
features/              one plain-language guide per feature (written in /merge-ready)
server/.env.example    documented env vars (real values in server/.env, which agents never read)
docs/PROJECT_CONTEXT.md  product vision, roadmap, specs, status
docs/PRD.md            product overview + feature index
docs/features/<slug>/  one folder per work item (intent → requirements → use cases → design → tests → plan → review)
docs/aidlc/            lifecycle guide, templates, lessons
scripts/               aidlc CLI, verify, harness tests
.claude/               agents, commands, path-scoped rules, hooks, settings
```

## Conventions (details in `.claude/rules/architecture.md`)
- Server: `server/src/{server.js, app.js, config, routes, controllers, models, middleware, services?, utils}`. Routes → controllers → models; central error handler.
- Every API response: `{ success, message, data }`, or `{ success: false, message, errors? }` with the correct status code.
- Client: `components, pages, hooks, services (Axios), context, utils`. Components never call Axios directly.

## Environment Variables (`server/.env`, documented in `server/.env.example`)
```
PORT          # default 5000
MONGODB_URI   # required: the server exits at startup without it
```

## How to work here
- One phase at a time (`PROJECT_CONTEXT.md` §5). `/aidlc` shows where you are. Then: `/inception` (feature) or `/fix` (bug/chore) → `/construction` → `/merge-ready` → `/retro`.
- Readable over clever. Explain non-obvious choices with a short *why* comment and a `design.md` decision.
- **You never commit or push.** End each unit with a suggested `git add <files> && git commit -m "type(scope): …"`, with no AI attribution.
- A tool call blocked by an `[aidlc]` hook is policy, not an error to work around.
