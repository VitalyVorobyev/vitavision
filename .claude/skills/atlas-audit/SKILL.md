---
name: atlas-audit
description: Audit published Atlas pages (algorithm/model/concept) for quality problems — fidelity to research notes, voice, section structure, missing relations, comparison-hosting discipline — and turn findings into docs/atlas/backlog.md rows. Never fixes a page itself; fixes route through algo-page, deep-model-page, or concept-page. Haiku runs the cheap mechanical scan; Sonnet runs the fidelity/voice pass; the orchestrator triages.
---

# Vitavision Atlas Page-Quality Audit

`atlas-audit` finds problems on pages that already exist and publishes them
as backlog rows — it never edits `content/**`. Fixing a finding is a
separate, later invocation of `algo-page`, `deep-model-page`, or
`concept-page`, each pointed at one specific `docs/atlas/backlog.md` row or a
batch of rows for one page.

## Purpose and non-goals

- Purpose: catch drift between a published page and (a) the research notes
  it claims to be grounded in, (b) the voice/structure rules the page-kind
  skill enforces at authoring time, (c) the Atlas relations a page should
  plausibly carry given its neighbours, and (d) the comparison-hosting rules
  in `CLAUDE.md`.
- Non-goal: content authoring. This skill never runs `Write` on a
  `content/**` file.
- Non-goal: confirming a proposed relation. Every relations finding is a
  *proposal* with a confidence level — never a fact. A human or the fixing
  skill confirms it the same way `paper-ingest` Step 4b requires.
- Non-goal: re-deriving the paper's content from memory. Every fidelity claim
  is checked against the page's cited research notes, never against what the
  auditor recalls about the paper.

## Inputs

One of:
- An explicit list of slugs.
- A domain/kind selector (e.g. "all `geometry`-domain algorithms", "all
  model pages").
- The literal phrase "all zero-relation pages" — resolve from
  `src/generated/content-graph.ts`, not from frontmatter grep (a page can
  have an empty authored `relations:` field and still be connected via a
  build-mirrored symmetric edge or a reverse bucket). A page is isolated
  only when ALL of the following are empty for its slug: `forward[slug]
  .relations` (which already includes symmetric types — `compared_with`,
  `alternative_formulation_of`, `parallel_foundation_with` — mirrored onto
  this page by the build when authored on the other side) AND every reverse
  bucket in `reverse[slug]` (`usedBy`, `affects`, `generalises`, `extending`,
  `fedBy`, `hasLearnedAlternative`).

Cap a single audit run at ~15 pages so Step 3 triage stays reviewable in one
pass; split a larger request into multiple runs.

## Step 1 — Mechanical scan (Haiku, cheap)

For each slug, a Haiku subagent computes, per page, without judgment calls:

- Body word count per top-level section.
- Placeholder markers: `<!-- TODO`, `TBD`, `FIXME`.
- Broken internal links: every `/atlas/<slug>` reference must resolve to an
  existing, non-draft page.
- Unbalanced `$$...$$` / `:::...:::` directive blocks.
- Reference list: entries numbered sequentially, every `[n]` citation in
  body prose resolves to a numbered entry.
- Frontmatter `sources.primary` / `sources.references[]` ids all registered
  in `docs/papers/index.yaml`.
- `relations:` field: present/absent, entry count.
- `quality:` field value (absent, `stub`, `canonical`, `historical`).
- Validator warnings naming this slug: run
  `bun run scripts/validate-content.ts` once for the whole batch and grep
  its warning output for each slug — don't re-run per page.

Returns one JSON object per page: `{slug, word_counts, placeholders,
broken_links, unbalanced_blocks, reference_issues, unregistered_sources,
relations_count, quality, validator_warnings}`. No file writes.

## Step 2 — Fidelity + voice audit (Sonnet, Audit contract)

Delegate via the **Audit contract** in
`.claude/skills/_shared/subagent-prompts.md`. Inputs: the page path, research
note paths for `sources.primary` + every `sources.references[]` entry, a
small JSON slice of `forward[slug]`/`reverse[slug]` from
`src/generated/content-graph.ts`, and the page kind. Never the paper cache.

The subagent checks:
- **Fidelity**: every numeric constant, equation, and attributed claim on
  the page is traceable to one of the given notes. Report each miss with
  the page line.
- **Structure**: section list matches the page kind — algorithm pages need
  Goal/Algorithm/Implementation/Remarks/References (or the trimmed
  historical set); model pages follow `deep-model-page`'s section list
  (Motivation/Architecture/Implementations/Assessment/References); concept
  pages follow `concept-page`'s five sections
  (Definition/Mathematical Description/Numerical Concerns/Where it
  appears/References).
- **Voice**: violations of `.claude/skills/_shared/voice-rules.md`, each
  with a line reference.
- **Relations completeness**: given the note's `Connections` section and the
  page's neighbours in `content-graph.ts`, list plausible missing typed
  relations as proposals (`type` + `confidence`) — never as confirmed facts.
- **Comparison-hosting discipline**: apply CLAUDE.md Rule A (supersession is
  not `compared_with`), Rule B (cross-domain pairs get no edge), Rule C
  (pick the right type) to every existing `relations[]` entry and to every
  proposal it makes.

Returns the JSON array shape defined in the Audit contract:
`{slug, severity, category, line, finding, fix_skill, proposal?}`.

## Step 3 — Triage (orchestrator)

- Dedupe findings across Step 1 and Step 2 for the same page/line.
- Drop any finding the orchestrator can refute directly from the page (e.g.
  Step 2 flags a missing section that's actually present under a slightly
  different heading spelling — verify before keeping).
- Assign `BL-nnn` ids continuing from the highest id already in
  `docs/atlas/backlog.md`. If the file doesn't exist yet, create it with the
  header row `| ID | Scope | Severity | Category | Issue | Fix path | Status |`
  before appending — this skill is the first consumer, not just a reader.
- Append one row per surviving finding, matching that column order:
  `| BL-nnn | <slug> | <severity> | <category> | <finding> | <fix skill> | open |`.
- Group survivors into a suggested first fix batch, by domain or page kind,
  so the next `algo-page`/`deep-model-page`/`concept-page` invocation has a
  coherent scope instead of one row at a time.

## Step 4 — Report

Report to the user: counts by severity (`blocker`/`major`/`minor`), the top
5 findings by severity then page-traffic-relevance, and the suggested first
fix batch (slugs + `BL-nnn` ids + the fixing skill to invoke).

## Don'ts

- Never edit any file under `content/**`. This skill only reads pages and
  notes and writes `docs/atlas/backlog.md` rows.
- Never mark a relations proposal as confirmed — it stays a proposal until a
  human or a fixing-skill invocation confirms it, the same discipline
  `paper-ingest` Step 4b applies to new relations.
- Never audit fidelity from memory of the cited paper — every fidelity claim
  traces to a note path actually read in Step 2, or is reported as
  unverifiable.
- Never load `docs/papers/.cache/**` or `docs/sources/.cache/**` — Step 2
  reads pages and notes only.
- Never open a fix PR from this skill. Triage output is backlog rows; fixing
  is a separate, later invocation of a page-authoring skill.

## Resources

- `.claude/skills/atlas-audit/references/audit-rubric.md` — the per-check
  table (id, what, how detected, default severity, fixing skill).
- `.claude/skills/_shared/subagent-prompts.md` — Audit contract (exact
  input/output JSON, hard rules).
- `.claude/skills/_shared/voice-rules.md` — the voice checklist Step 2
  applies.
- `.claude/skills/algo-page/SKILL.md`, `.claude/skills/deep-model-page/SKILL.md`,
  `.claude/skills/concept-page/SKILL.md` — the section structures Step 2
  checks against, and the skills that consume `docs/atlas/backlog.md` rows.
- `src/generated/content-graph.ts` — forward/reverse relation slices for the
  relations-completeness check.
- `docs/atlas/backlog.md` — this skill's only write target (row-append).
- `scripts/validate-content.ts` — source of the validator-warning check in
  Step 1.
- `CLAUDE.md` → "Relations field" and "Comparison authoring discipline" —
  Rule A/B/C, applied verbatim in Step 2.
