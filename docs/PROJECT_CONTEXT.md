# Workforce Management Platform — Project Context for Claude Code

> **Product source of truth.** Why the project exists, what has been decided, the build order, and the feature specs. Where any harness rule or agent disagrees with this file on a *product* decision, this file wins. `CLAUDE.md` points here; *how* work gets done (gates, guardrails, commands) lives in [docs/aidlc/README.md](aidlc/README.md).
>
> Each phase below becomes one or more AI-DLC work items in `docs/features/<slug>/`. A feature spec written in this file (like §7) is the *input* to `/inception`; the approved `requirements.md` it produces is the detailed contract.

---

## 1. Background: why this project exists

The project was planned in three steps:

1. **Goal: get an Associate Software Engineer (ASE) role.** The first question was what React knowledge an ASE role expects. That produced a React + JavaScript learning roadmap (summarised in [Appendix A](#appendix-a--react-skills-this-project-must-demonstrate)).
2. **Portfolio strategy.** Small apps (Todo, Weather, Notes) were ruled out because recruiters see them constantly and they don't show auth, authorization, API design, database design or business logic. Four full-stack JavaScript (MERN) projects were recommended instead:

   | # | Project | Difficulty | Recruiter impression | Full stack |
   |---|---------|-----------|---------------------|-----------|
   | 1 | **Employee Management System** (this project) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
   | 2 | E-Commerce Platform | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
   | 3 | Expense Tracker / Finance Dashboard | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
   | 4 | Blogging Platform / Mini CMS | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |

3. **Project #1 chosen:** the Employee Management System, renamed **Workforce Management Platform**. It's the closest to a real enterprise app and covers CRUD, authentication, authorization, API design, forms, routing, state management, databases and deployment.

**This means:** the code is a portfolio piece that interviewers will read. Clean structure, readable code and decisions you can explain matter more than clever abstractions.

---

## 2. Repo description

**Long (README intro):**
> A full-stack workforce management application built with the MERN stack (MongoDB, Express.js, React, and Node.js) that streamlines employee and HR operations. The platform includes secure JWT authentication, role-based access control, employee management, attendance tracking, leave request management, department administration, and an interactive analytics dashboard. It features a responsive user interface, RESTful APIs, data visualization, and modern best practices for scalable full-stack web development.

**Short (GitHub "About"):**
> A full-stack MERN Workforce Management Platform featuring JWT authentication, role-based access control, employee management, attendance and leave tracking, department management, analytics dashboards, and RESTful APIs.

---

## 3. Tech stack (decided)

| Layer | Choice |
|------|--------|
| Frontend | React, Vite, React Router, Axios, Tailwind CSS, React Hook Form |
| State | Context API (Redux Toolkit only if larger-scale state is needed later) |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT access tokens + refresh tokens, bcrypt password hashing |
| File uploads | Multer + Cloudinary |
| Charts | Recharts or Chart.js |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

### Suggested folder structure

```
/client                # React (Vite)
  src/
    components/
    pages/
    hooks/
    services/          # Axios instances + API calls
    context/           # AuthContext etc.
    utils/
    assets/
    styles/
/server                # Node + Express
  src/
    config/            # db connection, env loading
    models/
    controllers/
    routes/
    middleware/        # auth, role, error handling, validation
    utils/
```

---

## 4. Roles

| Role | Can do |
|------|--------|
| **Admin** | Manage everything |
| **HR** | Manage employees, approve or reject leave |
| **Employee** | View own profile, apply for leave, mark attendance |

Role permissions are **Phase 3**. In Phase 2 the `role` field exists on the user, but no permission rules are enforced yet.

---

## 5. Implementation order (build in this sequence)

Each phase builds on the one before. **Don't jump ahead.**

### Phase 1: Project setup
- Initialise React (Vite) in `/client`
- Initialise Node.js + Express in `/server`
- Connect MongoDB (Mongoose)
- Set up the folder structure
- Environment variables (`.env` + `.env.example`; never commit secrets)
- ESLint / Prettier (optional)

### Phase 2: Authentication ← **first feature; full spec in §7**
- Registration, login, bcrypt hashing, JWT, refresh token, logout, auth middleware

### Phase 3: Roles & authorization
- Role middleware (Admin / HR / Employee)
- Protected routes (frontend + backend)
- Permission checks

### Phase 4: Employee management (core CRUD)
- Add / view list / view details / update / delete employee
- Fields: name, email, phone, department, position, joining date, salary, status

### Phase 5: Department management
- Add / edit / delete departments (e.g. IT, HR, Finance, Sales)
- Employee count per department

### Phase 6: Employee profiles
- Personal details, contact, department, position, salary, attendance summary, leave balance

### Phase 7: Attendance management
- Employee: check in / check out
- HR/Admin: view attendance, filter by employee, filter by date

### Phase 8: Leave management
- Employee: apply, view history, cancel request
- HR/Admin: approve / reject

### Phase 9: Dashboard
- Cards: total employees, present today, on leave, departments, pending requests
- Charts: attendance, employees per department, leave statistics, monthly hiring

### Phase 10: Search & filters
- Search employees, filter by department and status, sort, paginate

### Phase 11: Profile picture upload
- Employee and admin images via Multer + Cloudinary

### Phase 12: Notifications (simple)
- Leave approved, leave rejected, new employee added

### Phase 13: Settings
- Change password, edit profile, update contact info

### Phase 14: Extras (to stand out)
- Dark mode, email verification, forgot/reset password, audit logs, activity timeline
- Export employee list (CSV/PDF), responsive design, toast notifications, loading skeletons, 404/403 pages

### Backend API build order
1. Auth APIs → 2. Department APIs → 3. Employee CRUD → 4. Attendance → 5. Leave → 6. Dashboard stats → 7. Search → 8. File upload → 9. Notifications

### Frontend build order
1. Login page → 2. Register page → 3. Dashboard layout → 4. Sidebar/Navbar → 5. Protected routes → 6. Employee module → 7. Department module → 8. Attendance module → 9. Leave module → 10. Dashboard charts → 11. Profile module → 12. Settings → 13. Responsive design → 14. UI polish

---

## 6. Current status

_Last updated: 2026-11-21_

| Item | Status |
|------|--------|
| Project idea, stack, build order | ✅ Decided (this file) |
| AI-DLC development harness | ✅ Built: gates, guardrails, `npm run verify` ([guide](aidlc/README.md)) |
| Phase 1: React (Vite) + Express scaffold | ✅ Done (`client/`, `server/src/`) |
| Phase 1: MongoDB connection | 🟡 Built and tested (work item [`mongodb-backend-connection`](features/mongodb-backend-connection/), 8/8 units). `/merge-ready` done, all review gates pass; release gate ready for your approval |
| Phase 1: target folder structure (§3) | ✅ `server/src/{server.js, app.js, config, routes, controllers, middleware, utils}` + `server/tests/` |
| Phase 1: test setup | ✅ Jest + supertest (server), 51 tests |
| Phase 1: ESLint / Prettier | ✅ ESLint (server), oxlint (client), Prettier (both); all part of `npm run verify` |
| Feature guides | ✅ [`features/`](../features/): one plain-language guide per feature ([Project setup](../features/project-setup.md)) |
| Feature 01: Authentication spec | ✅ Written (§7), ready for `/inception` after Phase 1 is released |

### Phase → work item map

| Phase | Work item(s) | Track |
|---|---|---|
| 1 Setup | `mongodb-backend-connection` (DB + server structure + test tooling) | feature |
| 2 Authentication | `auth` (from §7) | feature |
| 3 Roles & authorization | `roles-authorization` | feature |
| 4–14 | one work item per phase, each starting from a spec in the §7 template | feature (small polish items use `chore`) |

**Next steps, in order:**
1. Commit the MongoDB work (suggested commands in the hand-back), run `/merge-ready`, then approve the `release` gate. That closes Phase 1.
2. `/inception` for Phase 2, using §7 as the request. Answer the open decisions (§7) at the requirements gate.
3. Then Phase 3, Phase 4, … one at a time. A phase starts only after the previous one's `release` gate is approved.

---

## 7. Feature 01: User Authentication System (spec)

### Summary
A secure authentication system that lets users register, log in and securely access the Workforce Management Platform. It provides identity verification, session management and the access-control foundation for every later feature (employee management, attendance, leave, dashboards).

### User stories
- As a user, I want to create an account and log in securely so that I can access the platform based on my permissions.
- As an authenticated user, I want my session to stay secure so that unauthorized users can't access my account or application data.

### Actors / roles
- **User:** can register, log in, log out, and access protected features after authenticating.
- **Admin / HR / Employee:** each uses authentication to reach their own features. Role-based permissions are handled separately (Phase 3).

### Functional requirements
1. Users can register with name, email and password.
2. The system validates registration data before creating an account.
3. The system prevents duplicate accounts with the same email.
4. Passwords are hashed with **bcrypt** before storage.
5. Passwords are **never** stored as plain text.
6. Users can log in with their registered email and password.
7. The system verifies credentials at login.
8. The system generates a **JWT access token** after successful authentication.
9. The system returns auth tokens securely after successful login.
10. Requests to protected API routes must include a valid JWT.
11. Authentication middleware verifies the JWT on protected endpoints.
12. The middleware must:
    - extract the JWT from the request headers (`Authorization: Bearer <token>`)
    - validate that the token is authentic
    - identify the authenticated user (attach to `req.user`)
    - allow or deny access based on authentication status
13. Users can log out.
14. Logout invalidates the user's active session/token where applicable.
15. The system supports **refresh tokens**, so users stay logged in without frequent logins.
16. Refresh token functionality:
    - generate a refresh token at login
    - store and manage refresh tokens securely
    - issue a new access token when the access token expires
17. The system returns appropriate responses for successful and failed authentication attempts.

### Non-functional requirements
- Passwords are hashed with bcrypt. (Hashing, not encryption: it's one-way.)
- Auth tokens are securely generated and validated.
- Protected APIs reject unauthenticated requests.
- The design must scale to role-based authorization later (Phase 3).
- Sensitive data (`passwordHash`, `refreshToken`) is **never** exposed in API responses.
- The auth flow follows secure web-app practices.

### API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Verify credentials, issue access + refresh tokens |
| POST | `/api/auth/logout` | Invalidate refresh token / session |
| POST | `/api/auth/refresh-token` | Issue new access token from a valid refresh token |

### Database: `users` collection

| Field | Notes |
|-------|-------|
| `id` | MongoDB `_id` |
| `name` | required |
| `email` | required, unique, lowercase |
| `passwordHash` | bcrypt hash; excluded from queries/responses by default |
| `role` | `admin` \| `hr` \| `employee` |
| `refreshToken` | optional; store hashed if possible |
| `createdAt` / `updatedAt` | Mongoose timestamps |

### UI
- Registration page
- Login page
- Logout
- Auth state management (`AuthContext`)
- Protected route handling
- User session handling (silent refresh with an Axios interceptor)

### Edge cases / error scenarios
- Registering with an existing email
- Incomplete registration data
- Wrong login credentials
- Accessing protected routes while not authenticated
- Expired JWT
- Invalid JWT
- Expired or invalid refresh token
- Logging out more than once (should succeed gracefully, not crash)
- Logging in to an account that doesn't exist
- Database connection failure during authentication

### Acceptance criteria
- [ ] A user can create an account with valid information.
- [ ] A user cannot register with an email that already exists.
- [ ] Passwords are stored only as hashed values.
- [ ] A user can log in with valid credentials.
- [ ] A user cannot log in with a wrong password.
- [ ] Successful login returns a valid JWT access token.
- [ ] Protected endpoints reject requests without a valid JWT.
- [ ] The auth middleware correctly identifies authenticated users.
- [ ] Invalid or expired JWTs are rejected.
- [ ] A user can log out.
- [ ] The refresh token flow works correctly.
- [ ] Auth errors return meaningful error messages.

### Out of scope (don't build in this feature)
- Role-based authorization rules (Phase 3)
- Email verification
- Password reset
- Two-factor authentication
- Social login (Google, GitHub, etc.)
- User profile management
- Employee-specific data management

### Open decisions (answer at the `auth` requirements gate)

Recommended defaults, already reflected in `.claude/rules/security.md`, are marked ★. The language decision is settled: **plain JavaScript** (the scaffold, tooling and harness are JS).

1. ~~**JavaScript or TypeScript?**~~ **Settled: JavaScript.**
2. ★ **Token storage:** recommended is access token in memory + refresh token in an **httpOnly, secure, sameSite cookie**, rather than localStorage (localStorage is exposed to XSS).
3. ★ **Token lifetimes:** suggested access token ~15 min, refresh token ~7 days.
4. ★ **Default role at registration:** suggested `employee`. Never let the client set `role` in the register request; otherwise anyone can register as admin.
5. ★ **Login error messages:** use one generic message ("Invalid email or password") for both wrong-email and wrong-password cases, so attackers can't find out which emails are registered.
6. ★ **Validation library:** e.g. `express-validator` or `zod` on the backend; React Hook Form on the frontend. (★ recommendation: `zod`. One schema style that can later be shared with the client, and it's easy to explain.)

---

## 8. Working rules for Claude Code

These are enforced or encoded in the harness. Where each rule lives is noted in brackets.

- **Work one phase / feature at a time.** Don't implement beyond the current spec, and check in before starting the next phase. [`.claude/rules/project.md`; the `release` gate closes each phase]
- **Readable over clever.** Prefer clear, conventional code to abstraction; follow conventions once they're set. [`project.md`, `code-reviewer`]
- **Every decision should be explainable in an interview.** Add short comments where a choice isn't obvious (e.g. why httpOnly cookies). Design decisions are recorded in each work item's `design.md`. [`project.md`, `architect`]
- **Consistent API responses:** `{ success: true, message, data }` on success and `{ success: false, message, errors? }` on failure, with correct HTTP status codes (400, 401, 403, 404, 409, 500). [`architecture.md`]
- **Centralised error handling** middleware on the backend. [`architecture.md`]
- **Secrets only in `.env`**; keep `.env.example` up to date. [hook-enforced: agents can't read or write `.env`]
- **Small, meaningful Git commits** per step (e.g. `feat(auth): add register endpoint`), so the history shows steady progress. **You make the commits;** Claude ends every unit with a suggested `git add … && git commit -m "…"`. One plan unit = one commit. [`git.md`, hook-enforced]
- **Check against the acceptance criteria** before calling a feature done. [traceability enforced at the `design` gate and audited in `/merge-ready`]

---

## Appendix A: React skills this project must demonstrate

The project is ASE interview prep, so the code should naturally show these skills.

**JavaScript prerequisites:** let/const, destructuring, spread/rest, template literals, arrow functions, callbacks, `map`/`filter`/`reduce`/`find`/`some`/`every`, closures, scope, `this`, Promises, async/await, ES modules, optional chaining `?.`, nullish coalescing `??`.

**React fundamentals:** SPA, component-based architecture, declarative UI, Virtual DOM vs real DOM, rendering process; JSX (expressions, fragments, `className`); functional components; parent/child components; props (destructuring, defaults, `children`); props vs state; `useState` (functional updates, object/array state, no direct mutation); events (`onClick`, `onChange`, `onSubmit`, `onBlur`, `onFocus`, passing params); conditional rendering (`if`, `&&`, ternary, `return null`); lists and keys (use `id`, not index).

**Forms:** controlled components, multiple inputs, textarea/checkbox/radio/select, `preventDefault`, validation (React Hook Form).

**Hooks:** `useState`; `useEffect` (dependency array behaviour, cleanup, API calls, avoiding infinite loops); `useRef` (DOM access, mutable values, how it differs from state); `useContext` (provider, avoiding prop drilling); `useMemo`, `useCallback`, `React.memo` (when they actually help).

**Component patterns:** parent→child, child→parent, siblings, lifting state up, lifecycle (mount/update/unmount) mapped to `useEffect`, reusable components, separation of concerns.

**Routing (React Router):** BrowserRouter, Routes/Route, Link/NavLink, Navigate, `useNavigate`, `useParams`, nested routes, protected routes, 404 page.

**APIs:** GET/POST/PUT/PATCH/DELETE with Axios; loading, error and success states.

**State management:** local vs global state, Context API, awareness of Redux concepts (store, action, reducer, dispatch, selector).

**Performance:** avoiding unnecessary re-renders, memoization, lazy loading, code splitting, dynamic import.

**Error handling:** try/catch, error boundaries, fallback UI.

**Styling:** CSS, CSS Modules, Tailwind; responsive, mobile-first design.

**Tooling:** Node + npm, Vite, Git; testing awareness (Jest, unit vs component tests).

**Mistakes to avoid:** memorising without building, misunderstanding `useEffect`, overusing global state, confusing props and state.
