---
name: impl
description: Delegate a discrete implementation task to a Sonnet subagent, then review the diff before committing. Use when a plan has been approved and you need to implement a well-scoped change. The main agent (you) is the architect + reviewer; the Sonnet subagent writes the code. Invoke via `/impl <task description or plan-stage reference>`.
---

# impl skill

Delegate-and-review workflow for implementation tasks in this repo.

## When to use

- A plan file exists or the user has approved a concrete change.
- The task is scoped to one focused change that can be verified in isolation (build + lint + tests + a visible behavior).
- Not for trivial edits — do those directly in the main agent.

## Workflow

### 1. Scope the task

Read the relevant plan or user instructions. Identify:
- **Goal**: one-sentence outcome.
- **Files to touch**: exact paths (create / modify / delete).
- **Reused code**: existing helpers, components, patterns the subagent should build on rather than reinvent. Search the codebase first if unsure.
- **Don'ts**: explicit scope boundaries (no refactors outside the stated files, no new abstractions, no drive-by formatting).
- **Verification**: the commands that must pass (`bun run build`, `bun run lint`, `bunx vitest run`, any task-specific checks) and the visible behavior to inspect in the browser if relevant.

If anything is ambiguous, ask the user before delegating. A wrong prompt wastes a full subagent turn.

### 2. Delegate to Sonnet

Spawn the implementer:

```
Agent({
  description: "Implement <stage>: <short title>",
  subagent_type: "general-purpose",
  model: "sonnet",
  prompt: "<self-contained brief — see template>",
})
```

**Prompt template** (fill every section; omit nothing):

```
# Task: <short title>

## Goal
<one sentence>

## Context
<what the user is building and why this task matters; link to plan file if one exists>

## Files
Create:
- <path> — <what goes in it>

Modify:
- <path:line-range> — <what to change>

Delete:
- <path> — <reason>

## Reuse these
- <helper / component / pattern> at <path> — use for <purpose>
- <...>

## Don'ts
- No refactors outside the listed files.
- No new abstractions or config flags unless the goal requires them.
- No drive-by formatting of untouched code.
- No documentation files unless explicitly listed above.

## Verification
Run before reporting complete:
1. `bun run content:build` (if content pipeline touched)
2. `bun run build`
3. `bun run lint`
4. `bunx vitest run`
5. <task-specific check, e.g. "confirm dist/demos/index.html is emitted">

Fix any failures before returning. Do not disable rules or skip tests to make them pass — ask instead.

## Report back
- Files changed (short list)
- Any deviations from the brief and why
- Verification results (pass/fail per command)
- Anything ambiguous that needed a judgment call
```

Include enough context that the subagent can make judgment calls. Terse command-style prompts produce shallow work.

### 3. Review

Do not re-run the verification the subagent already ran unless you suspect it lied. Instead:

**A. Read the diff.** Focus on:
- Did the agent touch files outside the listed scope?
- Did it reinvent something from the "Reuse these" list?
- Did it add unasked-for abstractions, config flags, or docstrings?
- Are there dead branches, commented-out code, TODOs left behind?
- Does it match the plan's file/line-level guidance?

**B. Inspect key behaviors.** For UI/UX changes, run the dev server and check the flow. Type-check passing is not proof of correctness.

**C. Check the working principles.**
- Was any external contract (WASM schema, API shape) guessed? If yes, demand the agent prove it by calling the real thing.
- Did it write tests that actually exercise the new code, or only structural mocks?

**Verdict:**
- **Clean** — commit.
- **Small issues** — fix directly in the main agent (5-10 line edits). No second delegation needed.
- **Substantive issues** — delegate a follow-up pass with a targeted prompt listing exactly what to change. Reference the original task so the agent has continuity.

### 4. Commit

Only commit when the user asks, or when the task batch is complete and the user has signaled batch-commit intent. Commit messages: conventional style, concise, no backlog ids.

```
feat(demos): add /demos route and content pipeline
```

Do NOT:
- Create a `docs/handoffs/` entry.
- Update a backlog file.
- Skip hooks with `--no-verify`.

## Anti-patterns

- **Prompt too thin.** "Implement Stage 2 of the plan" — the subagent does not have the plan in context. Paste the relevant section.
- **Delegating something trivial.** A one-line Zod edit doesn't need a subagent.
- **Skipping review because the agent reported success.** Read the diff.
- **Bundling unrelated changes into one delegation.** Split them so each can be reviewed and reverted independently.
