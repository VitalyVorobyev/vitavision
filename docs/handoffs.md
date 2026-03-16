# Task Handoffs Workflow

This directory stores task handoff records for the `Plan → Implement → Review → Commit` workflow.

## Structure
- One directory per task: `docs/handoffs/<task-id>/`
- One file per task: `handoff.md` — accumulates sections as phases complete
- Template: `docs/templates/task-handoff-report.md`

## Naming Rules
- Backlog IDs live in `docs/backlog.md` (`INFRA-011`, `DOCS-003`, etc.)
- Task IDs live under `docs/handoffs/` (`TASK-012-tighten-charuco-validation`, etc.)
- Task ID format: `TASK-<number>-<slug>`

## Backlog Mapping
- A backlog item maps to one task directory at a time
- When starting from a backlog item with no existing handoff: mint the next `TASK-<N+1>-<slug>`, derive slug from backlog title, record backlog ID in the header
- When a matching handoff already exists, reuse that task ID
- If multiple directories map to the same backlog item, stop and ask

## Task Lifecycle
1. **Plan** — read backlog + codebase, write plan to `handoff.md`
2. **Implement** — execute plan, run quality gates, append results to `handoff.md`
3. **Review** — checklist review, fix issues, append verdict to `handoff.md`
4. **Commit** — stage, commit, update backlog

## Legacy Format
Tasks 1–20 used a 4-file format (`01-architect.md`, `02-implementer.md`, `03-reviewer.md`, `04-architect.md`). Tasks 21+ use the single `handoff.md` format.
