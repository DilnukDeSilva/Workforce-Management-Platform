# Project Principles (portfolio project)

Product source of truth: `docs/PROJECT_CONTEXT.md`. Read the relevant section before inception or design work. On a product decision (stack, structure, roles, phase order, response format, feature scope), it overrides any other harness file.

**Why this matters:** this is a portfolio project for an Associate Software Engineer job hunt. Interviewers will read the code, and the owner must be able to explain every line.

1. **One phase at a time.** Build only the current phase/work item (`PROJECT_CONTEXT.md` §5). Never implement ahead ("while I'm here, I'll add roles"). The next phase starts only after the current work item's `release` gate is approved.
2. **Readable over clever.** Conventional Express/React patterns, descriptive names, small functions, no premature abstraction or generic frameworks. If a junior developer couldn't follow it in one read, simplify it.
3. **Explainable decisions.** Every non-obvious choice gets a short *why* comment in code (e.g. why the refresh token is in an httpOnly cookie) and an entry under *Decisions* in the work item's `design.md`.
4. **Show the skills.** Where it fits naturally, prefer code that demonstrates the skills in `PROJECT_CONTEXT.md` Appendix A (hooks used correctly, Context for auth, React Router protected routes, controlled forms with React Hook Form, loading/error/empty states). Never add a pattern just to show it off.
5. **Explain at the gates.** When a gate is ready or a wave is handed back, include a short "what to understand" note: the 2–4 concepts the user should be able to explain about this change, so approving is also learning.
