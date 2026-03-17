---
description: Full architect → implementer → reviewer pipeline with automated retry and commit
argument-hint: <backlog-id>
---

# /implement $ARGUMENTS

Architect → Implement → Review → Commit pipeline for backlog task `$ARGUMENTS`.
Runs automatically without pausing unless Open Questions arise or blocking issues cannot be resolved.

Refer to `CLAUDE.md` for repo boundaries, quality gate commands, and architecture overview. Do not duplicate that content here.

---

## Phase 1 — Plan

Act as Architect. Read-only — no code changes.

**Reading order:**
1. `docs/backlog.md` — find `$ARGUMENTS`, read notes, milestone, acceptance scenarios
2. `CLAUDE.md` — architecture, boundaries, commands
3. All source files directly relevant to the task

**Mint the task ID:**
- Scan `docs/handoffs/` for existing directories to find the highest `TASK-N` number
- If a directory already exists whose `handoff.md` contains `Backlog: $ARGUMENTS`, reuse that task ID
- Otherwise mint `TASK-<N+1>-<slug>` (slug = first 4–5 meaningful words, lowercased, hyphens)

**Produce a plan with these sections (skip any that don't apply):**

- **Summary** — what and why (2–4 sentences)
- **Current State** — what exists, what's missing, what needs changing
- **Affected Files** — exact paths, one-line description each
- **Implementation Steps** — numbered, with file + line-level guidance; functions ≤ 40 lines, modules ≤ 300 lines
- **API Contract** — *(only if endpoints change)* method, path, request/response models, error cases
- **Test Plan** — *(only if testable code)* test name, file, what it checks
- **Open Questions** — *(only if any)* things that can't be resolved from the codebase

**Write `docs/handoffs/<task-id>/handoff.md`:**
```markdown
# <task-id>: <task title>
Backlog: $ARGUMENTS | Date: <today>

## Plan
<plan content here>
```

**Show the Summary and Open Questions to the user.**
If Open Questions exist, stop and ask the user before proceeding to Phase 2.

---

## Phase 2 — Implement

Follow the Phase 1 plan exactly. Read every file before modifying it.

**Implementation workflow:**
1. Implement steps in order from the plan
2. Run relevant quality gates (see `CLAUDE.md` for commands):
   - Backend changes: `ruff check .` → `ruff format --check .` → `mypy` → `pytest`
   - Frontend changes: `bun run lint` → `bun run build`
3. Fix all gate failures before proceeding
4. Append one line to `CHANGELOG.md` under `## [Unreleased]`
5. Update `README.md` only if a user-visible capability was added

**Append to `docs/handoffs/<task-id>/handoff.md`:**
```markdown
## Implementation
- **Files changed:** <list>
- **Deviations:** <any departures from plan, or "None">
- **Gate results:** <table of pass/fail for each gate run>
```

**Do NOT:** refactor outside plan scope · add docstrings to unchanged code · create one-use abstractions · use `npm` · silently skip a quality gate.

---

## Phase 3 — Review

Act as Reviewer. Do NOT re-run quality gates (the implementer already ran them). Focus on the checklist.

**Review checklist:**

**A. Repo Boundary Violations (Blocking)** — per CLAUDE.md boundaries
**B. Code Safety (Blocking)**
- Bare `except` that silences errors
- `HTTPException` without `from exc`

**C. Code Quality (Important)**
- Functions > 40 lines
- Modules > 300 lines
- Logic duplicated between backend and frontend

**D. Test Coverage (Important)**
- New endpoints without happy-path + error-path tests
- New pure functions without unit tests

**E. API Contract Stability (Blocking if API changed)**
- No removal/rename of existing response fields
- `CHANGELOG.md` entry exists

**F. Feature Model Invariants (Blocking if adapter changed)**
- Algorithm features have `readonly: true`, `algorithmId`, `runId`

**If Blocking issues found:** fix them directly (max 3 attempts), re-run only the affected quality gates, then re-review.
**If only Important/Minor issues:** fix them automatically and note what was fixed.
**If review is clean:** proceed to Phase 4.

After 3 failed attempts on blocking issues:
> "Could not resolve blocking issues after 3 attempts. Manual intervention needed."
> List remaining issues and stop.

**Append to `docs/handoffs/<task-id>/handoff.md`:**
```markdown
## Review
- **Verdict:** approved | approved_with_followups
- **Issues found & fixed:** <list, or "None">
- **Residual risks:** <if any>
```

---

## Phase 4 — Commit

When review is clean:

1. Stage all changed source files plus `docs/handoffs/<task-id>/handoff.md` and `CHANGELOG.md` (and `README.md` if modified)
2. Commit:
   ```
   git commit -m "feat($ARGUMENTS): <task title from backlog>"
   ```
   using a HEREDOC for the message
3. Update `docs/backlog.md`: change task status to `done`, add `~~strikethrough~~`, move to `## Done` table with today's date
4. Commit the backlog update:
   ```
   git commit -m "chore: mark $ARGUMENTS done in backlog"
   ```

---

## Phase 5 — Summary

Print:
- What was implemented (one paragraph)
- Handoff location: `docs/handoffs/<task-id>/`
- Next suggested task: first `todo` P0 or P1 from `docs/backlog.md`
