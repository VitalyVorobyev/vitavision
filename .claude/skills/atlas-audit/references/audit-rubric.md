# Audit rubric

One row per check. `run` says which step performs it. Severity is a default —
Step 3 triage may downgrade/upgrade with a stated reason.

| id | what | how detected | run | default severity | fix skill |
|---|---|---|---|---|---|
| MECH-01 | Section too thin | word count per top-level section below a substantive-content floor (concept pages: <500 words total, per `concept-page`'s page-creation criterion; algo/model: any required section under ~40 words) | Haiku | minor | matching page skill |
| MECH-02 | Placeholder marker | `<!-- TODO`, `TBD`, `FIXME` present in body | Haiku | major | matching page skill |
| MECH-03 | Broken internal link | `/atlas/<slug>` reference resolves to no on-disk page, or to a `draft: true` page | Haiku | major | matching page skill |
| MECH-04 | Unbalanced block | `$$...$$` or `:::...:::` directive opened without a matching close | Haiku | blocker (breaks rendering) | matching page skill |
| MECH-05 | Reference list mismatch | a `[n]` citation in prose has no matching numbered entry in `# References`, or vice versa | Haiku | major | matching page skill |
| MECH-06 | Unregistered source id | `sources.primary` / `sources.references[]` entry not in `docs/papers/index.yaml` | Haiku | blocker (build error if it ever reaches validator) | matching page skill |
| MECH-07 | Empty relations | `relations:` absent or `[]` | Haiku | minor (informational — feeds Step 2 relations-completeness, not a defect on its own) | matching page skill |
| MECH-08 | Quality-field mismatch | `quality: canonical` set but page has a `TODO`, missing sources, or thin sections (canonical gate per CLAUDE.md); or `quality: historical` page still carries `# Algorithm`/`# Implementation`/`# Remarks`, `editorAlgorithmId`, or `comparedWith:` | Haiku | blocker (validator-enforced for canonical; historical trim is a hard content rule) | matching page skill |
| MECH-09 | Live validator warning | `bun run scripts/validate-content.ts` warning output names this slug | Haiku | matches the validator's own class (usually minor/major, never silently dropped) | matching page skill |
| FID-01 | Untraceable numeric constant | a number/equation on the page has no matching value in any cited note | Sonnet | blocker | matching page skill (extend note first if the number is real) |
| FID-02 | Untraceable attributed claim | a claim attributed to a source ("X showed that…") has no matching note passage | Sonnet | blocker | matching page skill |
| STRUCT-01 | Wrong/missing section for page kind | algo: not exactly Goal/Algorithm/Implementation/Remarks/References (or the historical trim); model: not `deep-model-page`'s Motivation/Architecture/Implementations/Assessment/References; concept: not `concept-page`'s five sections | Sonnet | major | matching page skill |
| STRUCT-02 | Narrative opener / intuition paragraph | prose before a formula that explains "why it matters" instead of defining the quantity | Sonnet | minor | matching page skill |
| VOICE-01 | First-person pronoun | "I", "my", "in my view", "one notable property" | Sonnet | minor | matching page skill |
| VOICE-02 | Rhetorical/framing question | a sentence posed as a question rather than a declarative statement | Sonnet | minor | matching page skill |
| VOICE-03 | Softener / marketing word / hedge | per `_shared/voice-rules.md` §"No softeners" | Sonnet | minor | matching page skill |
| VOICE-04 | Attribution in prose body | author names or "unlike X, this does Y" asides inside `# Goal`/`# Algorithm`/`# Definition` instead of `# References` | Sonnet | minor | matching page skill |
| REL-01 | Plausible missing typed relation | note `Connections` section or `content-graph.ts` neighbour pattern (e.g. both pages share a prerequisite and cite each other's method by name) suggests a relation neither page authors | Sonnet | minor (always a proposal, never auto-applied) | matching page skill, after human/skill confirmation |
| REL-02 | Comparison discipline violation (Rule A) | an existing `compared_with` edge where one side is a strict same-problem generalization of the other | Sonnet | major | matching page skill (retype to `generalized_by`, consider `quality: historical`) |
| REL-03 | Comparison discipline violation (Rule B) | an existing relation between cross-domain pages (different problem classes) | Sonnet | major | matching page skill (remove the edge) |
| REL-04 | Comparison discipline violation (Rule C) | an existing relation using the wrong type from the vocabulary (e.g. `feeds_into` used for a runtime data-flow claim, not intellectual lineage) | Sonnet | major | matching page skill (retype) |
| REL-05 | Duplicated comparison prose | both sides of a `compared_with` pair carry a full comparison section instead of one host + one Remarks-bullet pointer | Sonnet | major | matching page skill (trim the non-host side) |

## Severity guide (condensed from CLAUDE.md)

- **blocker**: would fail `scripts/validate-content.ts`, breaks rendering, or
  states something false that a reader would act on (wrong constant, wrong
  attribution).
- **major**: violates an authoring rule that affects correctness or the
  Atlas's connective structure (wrong relation type, missing required
  section, duplicated comparison prose).
- **minor**: voice/polish issues that don't mislead a reader.

## Quality-field and relations rules (condensed, see CLAUDE.md for full text)

- `quality` omitted = normal page. `stub` = placeholder, visible warning
  badge. `canonical` = flagship, stricter validation (sources, prerequisites,
  no TODO). `historical` = superseded; body trimmed to Goal + Historical
  context + References only; requires a `generalized_by`/`confidence: high`
  relation; drops `editorAlgorithmId` and `comparedWith:`.
- `relations[]` vocabulary, three categories: **Lineage**
  (`generalized_by`, `alternative_formulation_of`, `parallel_foundation_with`,
  `extended_by`), **Practice** (`compared_with`, `feeds_into`),
  **Cross-paradigm** (`learned_alternative_of`). Every entry needs `target`
  (validated slug) and `confidence` (`high`/`medium`/`low`, no default).
- Comparison pages are prohibited outright — comparison content is
  `relations[type=compared_with]` plus one inline `## When to choose X over Y`
  section on the more-authoritative side (older paper hosts; tie → more
  general scope; tie → author judgment recorded in the commit message).
