# /review

Review current git changes against GenICam Studio standards.

---

## Steps

### 1 — Capture Changes
Run:
```bash
git diff --stat HEAD
git diff HEAD
git diff --name-only HEAD
```

If the working tree is clean (no unstaged changes), check staged changes:
```bash
git diff --stat --cached
git diff --cached
git diff --name-only --cached
```

If there are no changes at all, report "Nothing to review — working tree is clean."

### 2 — Spawn Reviewer
Launch the `genicam-reviewer` agent with:
- The full diff output
- The list of changed files
- Instruction to run the full review checklist (invariants + quality gates) per its system prompt

### 3 — Present Findings
Report the reviewer's output grouped by severity:
- **Blocking** — must fix
- **Important** — should fix
- **Minor** — optional
- **Quality Gate Results** — fmt / clippy / test / bun build pass/fail

If all gates pass and no blocking issues found, state clearly: "Review passed — ready to commit."
