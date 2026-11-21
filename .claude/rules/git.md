# Git Rules

- **The user commits and pushes. Never run `git commit` or `git push`** (blocked by hook and permissions). End work with suggested commands instead.
- Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>` matching the work item; base branch `dev`; never work on `main`/`dev` directly. `npm run aidlc -- start` creates the branch.
- Suggested commits follow Conventional Commits: `type(scope): summary` — types `feat|fix|test|chore|docs|refactor`, scopes `api|ui|db|auth|core|infra|aidlc`.
- One plan unit = one commit. Suggest `git add <exact files>` — never `git add -A` / `git add .`.
- No AI attribution in any suggested message (no Co-Authored-By, no mention of Claude/AI).
- Phase history matters (portfolio): small, meaningful commits like `feat(auth): add register endpoint`.
- Destructive git (`reset --hard`, `clean -f`, `branch -D`, discarding changes) requires the user's confirmation (hook asks).
