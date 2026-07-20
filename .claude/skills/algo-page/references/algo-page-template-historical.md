<!--
Trimmed template for `quality: "historical"` algorithm pages.

A historical page is preserved on the site for citation/lineage value; the
method is superseded for practical use by another page on the site (named in
the `successor:` frontmatter field). The body is intentionally minimal —
three sections only. The original paper's math lives in the cached PDF and
the private research note at docs/research/notes/<paper-id>.md; do not
duplicate it here.

Voice rules (binding — see `.claude/skills/algo-page/SKILL.md` →
"Historical pages — voice rules"):

- No editorialising about obsolescence. Words like "outdated", "obsolete",
  "primitive", "legacy", "archaic" are forbidden. The reader-visible
  "Historical" badge already conveys the status.
- No `# Algorithm`, `# Implementation`, `# Remarks` headings. Math lives
  in the original paper and the research note.
- No "When to choose X over Y" subsections. Supersession is not comparison.
- References include the successor's primary source.
-->

---
# Required
title: "<Display name>"
date: YYYY-MM-DD
summary: "<One sentence describing what the original paper set out to do. Present tense. No algorithmic detail.>"
tags: ["<primary>", "<secondary>"]
domain: <features|calibration|targets|geometry|stitching|depth|detection|image-formation>
author: "Vitaly Vorobyev"

# Required for historical pages
quality: historical
relations:
  - type: generalized_by         # required: at least one entry of this type with confidence: high
    target: <successor-slug>     # must resolve to a non-draft, non-historical page on disk
    confidence: high
    # caution: <one-line note>   # optional: surface editorial nuance in the rendered "Relations" section

# Optional
difficulty: <beginner|intermediate|advanced>
draft: false
prerequisites: []                     # concept slugs this method depends on; keep only if still load-bearing
sources:
  primary: <paper-id>                 # the original paper's id from docs/papers/index.yaml
  references: [<paper-id>]            # include the successor's primary source so the reader can follow the lineage forward
  notes: |
    Brief reasoning substrate (optional). Same shape as canonical pages.

# A genuine pipeline link is OK as an additional `relations[]` entry
# (e.g. `type: feeds_into`); do NOT list the successor there — that
# relationship is the required `generalized_by` entry above.

# Forbidden on historical pages
# editorAlgorithmId: ...                        ← drop entirely; no Try-in-editor CTA
# relations[type=compared_with]: [...]          ← drop entirely; supersession is not comparison (CLAUDE.md → Rule A)
---

# Goal

<One paragraph (3–5 sentences). What the original paper set out to do, in
present tense. State the input, the output, and the property that distinguished
the contribution at the time of publication. No algorithmic detail; no
attribution; no rhetorical opener.>

# Historical context

<Two to four paragraphs covering:>

<Paragraph 1 — when and in what landscape the paper appeared. State the year
and the dominant alternative at the time (one named method or one named family).
Avoid editorial framing.>

<Paragraph 2 — what was new. The contribution sentence, plus the technical
mechanism that produced the contribution (one or two sentences, no equations).>

<Paragraph 3 — what the successor improved. Link the successor's page using
the slug as anchor text, e.g. `[Zhang's planar calibration](/atlas/zhang-planar-calibration)`.
State concretely what limitation of the original method was lifted, in one
or two sentences. No comparison table; no "when to choose X over Y".>

<Paragraph 4 (optional) — why the page is preserved. Citation lineage,
pedagogical value, period-correct understanding. One short paragraph at most.
Skip if there's nothing to add beyond "it remains the canonical citation for
later work that uses this notation".>

# References

1. <Authors.> *<Original paper title.>* <Venue>, <Year>. [link-text](url)
2. <Successor's primary reference.> The reader who wants the modern method should land on this entry.
3. <At most 5 entries total.> Keep only those that genuinely deepen the reader's understanding of the original paper or the successor relationship. Drop tangential cross-domain pointers.

<!-- Template for content/algorithms/*.md only when quality: "historical".
     Delete all comment blocks before publishing. -->
