---
name: cv-article-writer
description: Plan, outline, and draft technical computer vision articles for the Vitavision website. Use when Codex needs to help write a new post for this React-based CV site, especially when the article should connect theory, Rust implementations, Python bindings, backend API contracts, and the editor-based interactive demo workflow; when Codex should interview the author, inspect available editor surfaces/posts/algorithms in the repo, decide whether a topic should be split into a series, or propose a professional outline plus figure plan for computer vision practitioners.
---

# CV Article Writer

## Overview

Interview the author, inspect the current repo, and turn a topic idea into a scoped article brief or draft for computer vision professionals.
Keep the work grounded in the actual editor workflow, APIs, visuals, and implementations instead of producing generic educational prose.

## Workflow

### 1. Clarify the brief

Ask a short first-round interview before proposing structure. Ask only what is needed to scope the article well.

Ask at most 5 questions in the first round. Prefer these:
- What is the one-sentence thesis or claim?
- What should the reader already know?
- What should the reader leave with: theory, implementation insight, benchmark intuition, system design guidance, or failure analysis?
- Which demo, algorithm, endpoint, crate, or binding should anchor the article?
- What reading-time band is acceptable?

If the user already supplied some of this, do not re-ask it.

If the Rust crate or Python binding is outside the current workspace, ask for the relevant path, repo, or commit. Continue gathering repo-local context in parallel instead of blocking immediately.

### 2. Survey the repo before outlining

Read `references/vitavision-source-map.md` and inspect only the files relevant to the topic.

Always verify the live repo state before proposing structure:
- inspect the current editor workflow and curated sample surfaces
- inspect current posts to avoid repetition
- inspect the relevant algorithm adapters and API contracts
- inspect backend models or docs when the article depends on config or response semantics

Prefer direct file inspection over memory. Use `rg` for keyword discovery.

If a relevant interactive behavior is only visible in the running app, inspect the editor implementation first and use runtime inspection only when that detail materially affects the article plan.

### 3. Set scope aggressively

Assume the audience is technically strong. Do not pad the article with basics they already know.

Estimate reading time before finalizing the outline:
- `12-25 min` is the default target
- `25-45 min` is acceptable for a dense deep dive
- `>45 min` should trigger a split recommendation
- `>60 min` should be treated as too long and split into a series

Prefer one strong claim per article over a broad survey. If the topic naturally branches, propose a sequence and make the cut line explicit.

Because the cadence is monthly, end planning work with 1 or 2 credible follow-up topics.

### 4. Produce a planning brief

When the user asks for planning, structure the response as:
- working title options
- thesis
- target reader and prerequisites
- why the topic matters in production
- concrete repo/editor/code evidence to use
- recommended article shape
- outline with section goals
- visual design plan
- estimated reading time
- what to omit or defer
- likely follow-up article ideas

Recommended article shapes:
- implementation deep dive
- demo companion
- algorithm design note
- benchmark or tradeoff memo
- system architecture note
- failure-analysis post

For each section, state the job of the section. Avoid empty headings such as "Background" unless it carries necessary technical weight.

The visual design plan is mandatory. Include:
- diagrams or schemes to draw
- code-adjacent figures to capture from the repo or runtime
- reference images or sample inputs to show
- interactive editor states or overlays worth embedding or recreating
- the purpose of each visual in the argument

### 5. Draft only after the scope is coherent

When the user asks for prose, write for peer practitioners:
- lead with the problem, assumptions, and why the chosen method matters
- tie theory directly to implementation choices
- prefer Rust implementation details first, Python binding or API integration second, React demo integration third
- use equations only when they remove ambiguity
- design visuals in parallel with the text instead of treating them as afterthoughts
- make tradeoffs explicit
- keep claims falsifiable and grounded in code, configuration, or experiments

Avoid:
- textbook history sections
- beginner primers unless the user explicitly wants them
- marketing tone
- inflated claims about robustness or speed without evidence
- long lists of unrelated methods

### 6. Support repo-aware writing work

If the user wants to turn the plan into a site change, inspect the current publishing surface first.

Do not assume MDX or a CMS exists. Check the live content path before editing:
- `src/data/posts.ts`
- `src/pages/BlogPage.tsx`
- `src/pages/BlogPostPage.tsx`
- `src/data/example.md`

If the current blog surface is too limited for the requested article format, say so explicitly and separate "write the article" from "change the publishing system".

## Output Standards

Keep every plan concrete enough that the next step is obvious.

A good plan for this skill should:
- name the exact editor or algorithm surfaces to reference
- expose the central technical question
- show where code, figures, schemes, reference images, and interactive views belong
- protect the article from becoming a longread
- leave the user with a usable outline, not just topic brainstorming

If information is missing, list the smallest missing items at the end instead of bloating the plan with guesses.
