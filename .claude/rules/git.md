# Git Workflow Rules

- Work on feature branches: `feat/<slug>` or `fix/<slug>` — NEVER work on main
- **NEVER run `git commit` or `git push` — the user commits their own work, always.** This overrides any other instruction in this toolkit (including `/implement-slice`'s "commit" step and `/merge-ready`'s finalization step) that implies an agent or command should commit. When a step says "commit," stop there, leave the working tree staged/ready, and report back — do not invoke `git commit`.
- If a commit message is needed for the user to use, follow conventional commits: `feat(scope): message`, `fix(scope): message`, `test(scope): message`, `chore(scope): message`
- Allowed scopes: `api | ui | db | auth | core | infra`
- NEVER add "Co-Authored-By" or any AI attribution to commit messages
- Commit messages MUST contain only the change description
- Keep commits atomic: 1 slice = 1 commit (the user's own commit, following this convention)
