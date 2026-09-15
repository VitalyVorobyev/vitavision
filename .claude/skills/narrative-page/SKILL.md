---
name: narrative-page
description: Author or update a narrative in content/narratives/ — a curated argument told by moving through the Atlas graph. Nodes are an atlas slug XOR a registered paper (tracked as page debt) XOR a question; edges compress Atlas relations at story altitude, deliberately a different vocabulary from relations[]. Enforces node/paper existence, non-draft status, lens/step completeness, and an AUDIT-JSON fidelity check before writing. Sonnet drafts the outline and the essay body; the orchestrator reconciles edges against the content graph and assembles the file.
---

# Vitavision Narrative Authoring

A narrative is a long-form essay (`content/narratives/<slug>.md`) that walks a
reader through a small, hand-picked slice of the Atlas graph to make one
argument. The exemplar is `content/narratives/foundation-models-for-vision.md`:
21 nodes, a chronological `overview` lens plus three thematic lenses, and
seven `##`-anchored chapters that each end on the bottleneck the next chapter
removes. A page (`vit`, `dinov2`, …) can appear in many narratives — the
narrative doesn't own the page, it borrows it for one argument. Narrative
edges (`prerequisite | evolution | bridge | contrast`) are deliberately a
different, coarser vocabulary from the Atlas `relations[]` field: they carry
story altitude ("this bridges into that"), not encyclopedic claims, and are
never written back onto the page's own frontmatter.

Use `atlas-audit` to find page-quality problems; use `algo-page` /
`deep-model-page` / `concept-page` to author or fix the underlying pages
first if a candidate node doesn't exist yet or is a draft.

## What a narrative is (and isn't)

- It is one thesis, argued by ordering existing pages (plus at most a few
  tracked-debt papers and question nodes) into steps and lenses.
- It is not a new page kind for content that belongs on an atlas page —
  don't smuggle definitions or algorithm detail into chapter prose that
  should live on the page itself.
- It is not a duplicate of the Atlas relationship graph. A narrative
  `evolution` edge with label "scale + curation" is a compressed, readable
  restatement of an underlying Atlas relation or a note's stated connection —
  it must be traceable to one, but it is not the same field.

## Gate 0 — inputs and refusals

Required inputs before starting: a `slug`, a one-sentence `thesis` (a claim,
not a topic), a candidate node list (mix of atlas slugs, paper ids, and
question ideas), and any lens ideas.

Refuse and stop, telling the user what's missing, when:

- A `page` node's slug does not resolve to a file under
  `content/algorithms/`, `content/models/`, or `content/concepts/`, or that
  page has `draft: true`. Point at the missing/draft page; suggest the
  relevant page skill first.
- A `paper` node's id is not registered in `docs/papers/index.yaml`. Say:
  "Run `paper-ingest` first — paper-only nodes are tracked page debt, not a
  substitute for a missing page."
- The candidate list exceeds ~25 nodes. Narratives are curated, not
  constellations — suggest splitting into two narratives or two lenses.
- Fewer than 2 steps are planned. A narrative always argues in motion.
- The thesis reads as a topic ("attention and its uses") rather than a claim
  ("attention became a substrate that everything else in the story reuses").

## Step 1 — Outline (Sonnet, Narrative outline contract)

Delegate via the **Narrative outline contract** in
`.claude/skills/_shared/subagent-prompts.md`. The subagent reads ONLY:
frontmatter + summary + `# Remarks`/`# Assessment` (or `# Where it appears`
for concepts) for each candidate `page` node; title/year/url from
`docs/papers/index.yaml` for each candidate `paper` node; and, for any
candidate with an existing research note, that note's `Connections` and
`Stated relations` sections only. Never the paper cache.

It returns the JSON shape defined in the contract: `areas`, `nodes` (with
`kind: page|paper|question`, `takeaway`/`remark`/`label` as applicable),
`edges` (each with a `justification` naming the Atlas relation or note
connection it compresses), `lenses.overview` (+ optional thematic lenses) in
grid units, `steps` (title, `anchor`, `claim`, `focus`), and a `chapters`
outline (2-5 bullets each — an outline, not prose).

## Step 2 — Reconcile (orchestrator)

Before delegating the draft, check the outline by hand:

- For every proposed edge, look up the cited Atlas relation in
  `src/generated/content-graph.ts` (`forward[slug].relations`) or the cited
  note `Connections` line. Reject any edge whose justification doesn't
  resolve.
- No `contrast` edge may sit over an Atlas `generalized_by` or `extended_by`
  relation between the same two pages — that's supersession, not a peer
  contrast; the validator will warn if this slips through, but catch it here.
- No `evolution` edge may run against the direction of an Atlas lineage
  relation between the same pages (e.g. `extended_by` pointing one way, the
  narrative's `evolution` edge pointing the other) — the validator warns on
  this too; treat the warning as a hard signal, not decoration.
- `evolution` edges respect chronology using years from
  `docs/papers/index.yaml` / page `sources.primary` — same check the
  validator runs, so failures here are pre-empted, not discovered later.
- Every `question` node must be a question the essay actually raises in some
  chapter's outline bullets — not a floating provocation with no chapter.
- Every step's `focus` set must intersect the node ids that chapter's outline
  bullets actually discuss.
- Confirm with the user only where the outline contradicts the Atlas graph
  (a rejected edge, a chronology conflict) or gate 0 boundaries; otherwise
  proceed without asking.

## Step 3 — Draft (Sonnet, Narrative draft contract)

Delegate via the **Narrative draft contract**. Inputs are the reconciled
outline plus the page/note paths it cites — never cache files. The subagent
writes the essay body (one `##` per step, heading slugs matching
`steps[].anchor`, 1-3 paragraphs per chapter) and an AUDIT JSON mapping every
number, date, named mechanism, and attributed claim to `{claim, source:
"page:<slug>" | "note:<id>.md", quote}`.

Voice: essay register, not reference-page voice. Third person, present
tense, concrete mechanisms. No first person, no hype adjectives, no "in this
narrative we". Each chapter ends on the constraint the next chapter removes.
The final chapter ends on the thesis restated as a consequence, or on the
question node's question. Reuse `.claude/skills/_shared/voice-rules.md` for
banned patterns (it's written for reference pages; the tone differences here
are the essay-register rules above, not a license for hedges or hype).

## Step 4 — Verify and assemble

Run the AUDIT grep recipe from `.claude/skills/_shared/subagent-prompts.md`
("Verification recipe") against the cited pages and notes — zero MISS lines.
Any MISS means either the source is incomplete (extend it, re-delegate) or
Sonnet invented the claim (reject, re-delegate with a stricter prompt).

Assemble `--- frontmatter --- \n <body>` from the reconciled outline (areas,
nodes, edges, lenses, steps) and the verified body string, and call `Write`
once to `content/narratives/<slug>.md`.

## Step 5 — Validate

```bash
INCLUDE_DRAFTS=true bun run scripts/validate-content.ts   # 0 errors; page-debt warnings only for intended debt; 0 lens inversions or unjustified warnings
bun run narratives:debt                                   # confirm the debt table matches what Gate 0 intended
bun run build
bun run dev   # open /atlas/narratives/<slug>, step through every step on desktop
```

Then a Chrome device-toolbar touch pass per `CLAUDE.md` §"Touch & mobile
interaction": tap a chip, pan, pinch-zoom, switch lenses, expand the mobile
card. Verify `walkthrough: reveal` (if used) actually hides not-yet-focused
chips at each step, and that question-node chips render with no outbound
link.

## Step 6 — Record

Update the narrative's row in `docs/atlas/roadmap.md` under "Narratives
program": status, node count, debt count, PR. Paste any new rows `bun run
narratives:debt` prints into the same document's page-debt table.

## Updating an existing narrative

Same flow, but never rewrite a chapter the update doesn't touch — outline
only the nodes/edges/steps that change, reconcile, redraft just those
chapters. Keep node ids stable: the canvas URL state is `?node=<id>`, so
renaming an id breaks every link anyone has shared.

## Lens authoring rules

- Coordinates are grid units: `1.0` = one chip pitch, not pixels or years.
- The `overview` lens is required and must cover every node id declared in
  `nodes[]`. Thematic lenses may subset — a node missing from a thematic
  lens's `coords` is simply hidden in that lens, which is a valid way to
  declutter a sub-argument.
- Keep x loosely chronological in every lens (this is a narrative-wide
  convention, not per-lens): same-year or adjacent-year nodes may reorder
  freely, but an inversion of ≥2 years between two nodes draws a validator
  warning. Never author y-axis chronology; y is the area lane.
- Aim for ≤6 chips per lane row before a lens reads as crowded — split into
  a thematic lens or add an area lane instead of stacking.
- Put the thesis-carrying nodes in the middle lanes/columns, not the edges of
  the canvas, so the eye lands on them first.
- `timeline` is a reserved lens id — the build generates it (x ∝ derived
  year, y = area lane). Never author a lens named `timeline`.

## Don'ts

- No paper node without a `docs/papers/index.yaml` entry — that's not a
  narrative shortcut, it's an unregistered source.
- No reverse Atlas edges written anywhere from this skill — narratives don't
  touch page frontmatter at all.
- No hand-authored `year` on a node — years are always derived (from the
  page's `sources.primary` or the paper registry).
- No lens named `timeline` — reserved, build-generated.
- No step without a chapter — every `steps[].anchor` must resolve to a real
  `##` heading in the body.
- No `claim` that just restates the step `title` in other words — a claim
  earns its place by adding a fact or a stake the title doesn't carry.
- No node id that collides with an *different* page's atlas slug — node ids
  are the narrative's own namespace; picking a slug-shaped id for a
  different concept confuses the AUDIT recipe and the URL state.
- No more than one narrative authored per PR, unless the plan explicitly
  batches two (see the plan's "Narrative authoring order").
- Never load `docs/papers/.cache/**` or `docs/sources/.cache/**` — outline
  and draft both work from pages and notes only.

## Checklist

- [ ] Gate 0 passed: all `page` nodes exist and are non-draft; all `paper`
      nodes are registered; ≤~25 nodes; ≥2 steps; thesis is a claim.
- [ ] Outline (Step 1) returned with every length cap respected (takeaway
      ≤280, remark ≤400, paper-node label ≤80, edge label ≤24, claim ≤360,
      question ≤200).
- [ ] Every edge's justification checked against `content-graph.ts` or a
      note's `Connections` section (Step 2); no `contrast` over
      `generalized_by`/`extended_by`; no `evolution` against Atlas or year
      chronology.
- [ ] Every question node is raised in some chapter.
- [ ] Every step's `focus` intersects its chapter's actual content.
- [ ] Draft's AUDIT JSON grep-verified at zero MISS.
- [ ] `overview` lens covers every node; no lens named `timeline`.
- [ ] `INCLUDE_DRAFTS=true bun run scripts/validate-content.ts` — 0 errors,
      only intended page-debt warnings, 0 lens inversions.
- [ ] `bun run narratives:debt` output pasted into the roadmap if it changed.
- [ ] `bun run build` succeeds.
- [ ] Desktop step-through + Chrome device-toolbar touch pass done.
- [ ] `docs/atlas/roadmap.md` narrative-program row updated.

## Resources

- `content/narratives/foundation-models-for-vision.md` — canonical exemplar.
- `content/narratives/example-draft.md` — minimal schema-exercise fixture
  (never published; `draft: true`).
- `.claude/skills/narrative-page/references/narrative-template.md` —
  annotated frontmatter+body skeleton.
- `src/lib/content/schema.ts` (narrative section, `~L308-464`) —
  `narrativeFrontmatterSchema` and the resolved-graph types.
- `scripts/validate-content.ts` (Rule 11, `~L868-1046`) — the exact narrative
  validator checks (XOR, resolution, lens/step completeness, chronology).
- `scripts/narrative-debt.ts` / `bun run narratives:debt` — page-debt table.
- `.claude/skills/_shared/subagent-prompts.md` — Narrative outline, Narrative
  draft contracts, and the AUDIT verification recipe.
- `.claude/skills/_shared/voice-rules.md` — banned reference-page patterns;
  read alongside the essay-register rules in Step 3 above.
- `docs/atlas/roadmap.md` — "Narratives program" table and Decisions log
  (narrative design rationale: loosely-chronological layout, edge vocabulary
  divergence from Atlas relations, chapter-length steps).
