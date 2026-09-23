# Shared subagent contracts for Atlas authoring skills

This document defines the reusable subagent contracts used by `paper-ingest`,
`algo-page`, `deep-model-page`, `concept-page`, `narrative-page`, and
`atlas-audit`. Each Atlas skill cites this document instead of duplicating
prompt text.

The architect+reviewer pattern from `.claude/skills/impl/SKILL.md` applies: the
main agent (Opus) orchestrates and verifies; Sonnet does the heavy reads.

**Single source of truth: the research note.** Notes at
`docs/research/notes/<source-id>.md` are the canonical structured artifact for a
source. They carry the narrative (Setting, Core idea, Assumptions, Failure
regime, Numerical sensitivity, Connections, Atlas update plan, Provenance), all
equations as inline LaTeX, all numerical constants, and citation pointers back
to the source. Downstream page-authoring skills draft from notes — never from
raw cache files.

## Cross-link scan contract

Used by `paper-ingest` Step 4 to find Atlas pages a newly-registered source
might relate to, without loading every page's body into the orchestrator's
context (a full scan of `content/{algorithms,models,concepts}/` frontmatter
plus title-heuristic matching is cheap for a subagent but not worth spending
the main agent's context budget on for a check that runs once per ingest).

**Inputs (provided by orchestrator):**
- `source_id` — the canonical paper id (from paper-ingest Step 3).
- Title and abstract from the Step 2 metadata fetch — used for heuristic
  title-matching.
- The three content directories to walk: `content/algorithms/`,
  `content/models/`, `content/concepts/`.

**Output (reply):** a JSON array. No file writes.

```json
[{ "slug": "harris-corner-detector", "match_kind": "primary", "evidence": "sources.primary == source_id" }]
```

`match_kind` values: `primary` (`sources.primary == source_id`), `reference`
(`source_id` in `sources.references[]`), `title-heuristic` (words from the
paper title appear in the page's `summary` or `title`). Capped at ~30
entries — if more candidates match, keep the strongest `primary`/`reference`
matches and the highest-overlap `title-heuristic` matches.

**Hard rules:**
- Read only frontmatter (not page bodies) when scanning the three content
  directories.
- Never read `docs/papers/.cache/**` or `docs/sources/.cache/**`.
- Do not decide relevance beyond the three `match_kind` categories — ranking
  and final confirmation happen in the orchestrator (paper-ingest Step 4's
  user-confirmation step), not here.

## Extract contract

Used by `paper-ingest` to turn a cached source into a research note.

**Inputs (provided by orchestrator):**
- `cache_path` — explicit path under `docs/papers/.cache/` (paper) or
  `docs/sources/.cache/` (repo/doc)
- `source_id`, `kind` (`paper` | `repo` | `doc`)
- Path to the appropriate template under `docs/research/templates/`
- Candidate Atlas slugs (string list) for `relevant_atlas_pages` and the
  Connections / Atlas update plan sections

**Output (file write):**
- `docs/research/notes/<source-id>.md` — written ONLY IF the file does not
  already exist. If it exists, the subagent reports "already ingested" and
  exits without overwriting. Notes are hand-curated reasoning substrate; they
  are never auto-overwritten.

**Output (reply):**
- A short status report: source-id, atlas role, affected slugs, equations
  count, constants count. The orchestrator uses this to populate Step 8 of
  `paper-ingest`.

**Hard rules:**
- Read only the cache file + template. Do not network-fetch.
- Every numerical constant / equation / symbol that appears in the note prose
  MUST be traceable to a `# Provenance` citation pointing to a specific
  paper section, equation number, or table.
- Mark uncertain claims with `?` inline. Do not hallucinate.
- For arxiv papers, prefer reading `<id>.html` (ar5iv rendering, LaTeX
  preserved) for equation fidelity; fall back to `<id>.txt` (pdftotext) for
  search-and-narrow.
- For modern papers with an explicit contribution list and Related Work
  section, fill the template's `# Claimed contributions` (verbatim-anchored)
  and `# Stated relations` sections. Stated-relations rows are the paper's own
  positioning claims (quote + location) with a *proposed* `relations[].type`
  mapped through CLAUDE.md's rules — proposals only; the orchestrator confirms
  each row with the user before anything is committed. Omit both sections for
  papers without that structure.

## Draft contract

Used by `algo-page`, `deep-model-page`, `concept-page` to turn note(s) into a
page body.

**Inputs (provided by orchestrator):**
- Primary research note path (`docs/research/notes/<id>.md`)
- List of reference note paths (for cited references and competing methods)
- Page-template skeleton path. The orchestrator selects the template on
  `frontmatter.quality`: pass `algo-page-template-historical.md` (trimmed:
  Goal + Historical context + References) when the page is `quality: "historical"`;
  otherwise pass the default `algo-page-template.md` (the standard 5-section
  structure). The Draft subagent reads whichever skeleton is supplied and
  matches its voice and structure verbatim — there is no per-section gating
  inside the subagent.
- Optional implementation-file paths (Rust/Python source for the
  `# Implementation` snippet) — omitted when the historical template is used
  (historical pages have no Implementation section).
- Target slug

**Output (reply):**
- The full page body as a markdown string in the reply (not wrapped in fences;
  so it can be appended directly to a frontmatter block).
- A `<<<AUDIT>>>{json}<<<END>>>` block listing every constant / symbol /
  equation used in the body. Each entry points to the note that supplied it:
  `{ "kind": "constant", "name": "k", "value": "0.04", "source_note": "harris1988-corner.md" }`.
  This lets Opus mechanically check that nothing was invented.

**File writes:**
- NONE. The Draft subagent never writes files. Opus is the only writer for
  page files; it assembles `--- frontmatter --- \n <body string>` and calls
  `Write` once.

**Hard rules:**
- Read only the provided notes + template + impl files. NEVER read cache files
  (`docs/papers/.cache/*.{html,txt}` or `docs/sources/.cache/**`).
- If a needed equation / constant / symbol is not present in any provided
  note, return exactly: `blocked: missing <kind> <name> for <source-id>` and
  stop. Do not improvise. The orchestrator will extend the note (re-running
  `paper-ingest` after deleting the note, or asking the user to amend it
  by hand) and retry.
- Voice and structure must match the page-template skeleton.

## Narrative outline contract

Used by `narrative-page` Step 1 to turn a candidate node list into a proposed
graph, lens coordinates, and step/chapter outline.

**Inputs (provided by orchestrator):**
- Candidate node list: for each, `{ kind: "page" | "paper" | "question", ref:
  <atlas-slug> | <paper-id> | <question text> }`.
- For `page` nodes: the page's frontmatter + `summary` + `# Remarks` (algo/model)
  or `# Assessment`/`# Where it appears` (concept) section — paths, not whole
  pages read wholesale beyond what's needed.
- For `paper` nodes: the paper's title/year/url looked up from
  `docs/papers/index.yaml` — the paper itself (cache) is NOT read.
- For any candidate with an existing research note: the note's `Connections`
  and `Stated relations` sections only.
- Thesis (one sentence) and any lens ideas from Gate 0. Target slug.

**Output (reply):** a single JSON object. No file writes.

```json
{
  "areas": [{ "id": "substrate", "label": "Substrate" }],
  "nodes": [
    {
      "id": "vit",
      "kind": "page",
      "ref": "vit",
      "area": "backbone",
      "role": "milestone",
      "takeaway": "<= 280 chars",
      "remark": "<= 400 chars, optional",
      "label": "<= 80 chars, required only when kind is \"paper\""
    },
    { "id": "q1", "kind": "question", "ref": "<= 200 chars, the question text itself", "area": "backbone" }
  ],
  "edges": [
    {
      "from": "vit",
      "to": "deit",
      "type": "prerequisite | evolution | bridge | contrast",
      "label": "<= 24 chars, optional",
      "justification": "one line naming the specific Atlas relations[] entry (type + target) or note Connections line this edge compresses"
    }
  ],
  "lenses": {
    "overview": { "vit": [3, 1], "deit": [3.6, 1] }
  },
  "steps": [
    { "title": "...", "anchor": "kebab-case-slug", "claim": "<= 360 chars", "focus": ["vit", "deit"] }
  ],
  "chapters": [
    { "anchor": "kebab-case-slug", "bullets": ["2-5 short outline bullets, not prose"] }
  ]
}
```

**Hard rules:**
- Read only the paths given. Never `docs/papers/.cache/**` or
  `docs/sources/.cache/**`.
- Enforce the length caps before returning: `takeaway` ≤280, `remark` ≤400,
  paper-node `label` ≤80, edge `label` ≤24, step `claim` ≤360, question `ref`
  ≤200.
- Every edge's `justification` must name a specific Atlas `relations[]` entry
  (type + target slug) or a specific note `Connections`/`Stated relations`
  line — never propose an edge with no cited source. This is what lets the
  orchestrator's Step 2 reconciliation check the edge against
  `src/generated/content-graph.ts` mechanically.
- `lenses.overview` coordinates must include every node id, in grid units
  (1.0 = one chip pitch). Keep x loosely chronological — do not compute exact
  years; the build derives the generated `timeline` lens from years itself.
- A question node's `ref` is the question text; it carries no `takeaway`,
  `label`, or year.
- If a candidate node lacks enough source material (no summary/Remarks
  section, no note) to write a grounded `takeaway`, return exactly
  `blocked: missing summary for <node-id>` and stop.

## Narrative draft contract

Used by `narrative-page` Step 3 to write the essay body from the outline the
orchestrator reconciled in Step 2.

**Inputs (provided by orchestrator):**
- The reconciled outline JSON (areas, nodes, edges, steps, chapters) from the
  Narrative outline contract, post Step-2 corrections.
- Page paths (for `page` nodes) and research note paths (for any node or
  edge justification that cites a note) — never cache files.
- `.claude/skills/_shared/voice-rules.md` plus the narrative-specific voice
  rules below.

**Output (reply):**
- The full essay body as a markdown string, not wrapped in fences: exactly
  one `##` heading per step, each heading's rehype-slug id equal to that
  step's `anchor`; 1-3 paragraphs of chapter prose under each heading.
- A `<<<AUDIT>>>{json}<<<END>>>` block:
  `[{ "claim": "<number/date/mechanism/attribution as it appears in the body>", "source": "page:<slug>" | "note:<paper-id>.md", "quote": "<verbatim text from that source>" }]`.

**Hard rules:**
- Every number, date, named mechanism, and attributed claim in the body must
  have a matching AUDIT entry pointing at a provided page or note.
- Link atlas pages as `/atlas/<slug>`. Paper-only (debt) nodes link to the
  paper's `url` from `docs/papers/index.yaml`, never to `/atlas/<paper-id>`.
- Voice: essay register — third person, present tense, concrete mechanisms;
  no first person, no hype adjectives, no "in this narrative we". Each
  chapter ends on the constraint the next chapter removes. The final chapter
  ends on the thesis restated as a consequence, or on the question node's
  question.
- Chapter headings must slugify to exactly `steps[].anchor` — check by hand
  (rehype-slug lowercases, strips punctuation, hyphenates spaces) before
  returning.
- Read only the provided page/note paths. Never
  `docs/papers/.cache/**` or `docs/sources/.cache/**`.
- If a claim a chapter needs isn't in any given page or note, return exactly
  `blocked: missing <claim> for <node-id>` and stop. Do not improvise.
- No file writes. The orchestrator assembles `--- frontmatter --- \n <body>`
  and calls `Write` once.

## Audit contract

Used by `atlas-audit` Step 2 for the fidelity + voice pass over already
published pages.

**Inputs (provided by orchestrator):**
- The page path (e.g. `content/algorithms/<slug>.md`).
- Research note paths for `sources.primary` and every `sources.references[]`
  entry.
- A small JSON slice of the page's forward + reverse edges from
  `src/generated/content-graph.ts` (`forward[slug]`, `reverse[slug]`) — not
  the whole generated file.
- Page kind (`algorithm` | `model` | `concept`), which fixes the expected
  section list.

**Output (reply):** a JSON array. No file writes.

```json
[
  {
    "slug": "harris-corner-detector",
    "severity": "blocker" | "major" | "minor",
    "category": "fidelity" | "voice" | "structure" | "relations" | "comparison-discipline",
    "line": "<line number or heading text the finding is anchored to>",
    "finding": "<one sentence>",
    "fix_skill": "algo-page" | "deep-model-page" | "concept-page",
    "proposal": { "type": "<relations vocabulary>", "target": "<slug>", "confidence": "high" | "medium" | "low" }
  }
]
```

`proposal` is present only on `category: "relations"` findings and is always
a proposal — the audit never marks a relation confirmed.

**Hard rules:**
- Read only the page, the listed notes, and the content-graph slice. Never
  `docs/papers/.cache/**` or `docs/sources/.cache/**`, and never rely on
  memory of the cited paper.
- Every `fidelity` finding must quote the page line and either the
  supporting note text (a MISS: not found) or state the note lacks it.
- Section-structure checks are exact: algorithm pages need
  Goal/Algorithm/Implementation/Remarks/References (or the historical trim);
  model pages follow `deep-model-page`'s section list; concept pages follow
  `concept-page`'s five sections.
- `comparison-discipline` findings name the violated CLAUDE.md rule (Rule A,
  B, or C) in the finding text.
- Do not propose a relation that already exists in either direction — check
  `forward[slug].relations` and `reverse[slug]` first.

## Verification recipe (run by Opus after Draft contract returns)

For each entry in the AUDIT JSON, verify the value appears verbatim in the
named source note. This is a cheap string-match — no cache file is opened.

```bash
BODY=/tmp/draft.md       # the body string Opus received from Sonnet
AUDIT=/tmp/audit.json    # the AUDIT JSON block extracted from Sonnet's reply
miss=0
total=0
jq -r '.[] | "\(.name)\t\(.value // .latex // "")\t\(.source_note)"' "$AUDIT" \
  | while IFS=$'\t' read -r name value note; do
      [ -n "$value" ] || continue
      total=$((total+1))
      if ! grep -F -- "$value" "docs/research/notes/$note" > /dev/null; then
        echo "MISS: $name = $value (not in $note)"
        miss=$((miss+1))
      fi
    done
# Zero MISS lines = page faithfully copies from notes; nothing invented.
```

Any MISS line is a hallucination flag. Opus has two responses:
1. **Note is incomplete.** The constant/equation belongs in the note but isn't
   there. Extend the note by hand, then re-delegate the Draft contract.
2. **Sonnet invented.** The constant/equation isn't in any cited paper. Reject
   the draft; re-delegate with a stricter "use only what's in the notes" clause.

The verification only catches mismatches between page and note. To catch
mismatches between note and source paper, review the note when it is first
created (Step 7 of `paper-ingest`). Notes are the trust boundary.
