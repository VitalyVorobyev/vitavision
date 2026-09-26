---
# Required
title: "<Display title of the narrative>"
date: YYYY-MM-DD
summary: "<One sentence. Shown on narrative cards and in <meta description>.>"
tagline: "<<= 120 chars. Shown under the title on the narrative page.>"
tags: ["<one or more free-text tags, e.g. deep-learning, geometry>"]
author: "Vitaly Vorobyev"

# Optional
draft: false   # true keeps it out of every published listing/sitemap; used for
               # in-progress narratives and the schema-exercise fixture.

# Narrative-level walkthrough mode. Default "focus" only dims nodes outside the
# current step's focus set. "reveal" additionally hides (opacity 0, no pointer
# events) any node not yet reached by step index — use for narratives whose
# thesis depends on the reader not seeing what comes next.
walkthrough: focus   # focus | reveal

# Named lanes for the y-axis of every lens and for grouping in the legend.
# Every node must reference exactly one area id declared here.
areas:
  - id: substrate          # stable id, referenced by nodes[].area
    label: "Substrate"     # display label in the legend

# The graph. Every node is EXACTLY ONE of:
#   page:     an atlas slug under content/{algorithms,models,concepts}/ —
#             must exist on disk and be non-draft (hard build error otherwise).
#   paper:    a registered id in docs/papers/index.yaml with no atlas page yet.
#             Tracked as "page debt" — a build warning, and a row in
#             `bun run narratives:debt`. Requires `label` (<= 80 chars):
#             paper nodes have no page title to fall back on for display.
#   question: the question text itself (<= 200 chars), asked by this node in
#             the essay. No year, no outbound link, never counted as debt.
# The three are mutually exclusive (XOR) — a build error otherwise.
nodes:
  - id: attention                    # this narrative's own id, referenced by
                                      # edges[].from/to, lenses[].coords keys,
                                      # steps[].focus, and the ?node= URL param.
                                      # Keep stable across edits — it's a public URL.
    page: attention-mechanism        # atlas slug (page-kind node)
    area: substrate                  # must match an areas[].id above
    role: "origin"                   # free-text badge shown on the chip;
                                      # no fixed vocabulary, keep it short
    takeaway: "<<= 280 chars. The one thing this node contributes to THIS
                narrative's argument — not a general summary of the page.>"
    remark: "<<= 400 chars, optional. A cross-reference forward to where
               this node resurfaces later in the essay, or a caveat.>"
    # label: only required when this node is `paper:`-kind (see below).

  - id: registers                    # paper-kind node example
    paper: darcet2023-registers      # id from docs/papers/index.yaml — must
                                      # already be registered (run paper-ingest
                                      # first if not); the paper ITSELF has no
                                      # atlas page yet
    area: backbone
    label: "Register tokens"         # REQUIRED for paper nodes, <= 80 chars —
                                      # the display title paper nodes lack
    role: "fix"
    takeaway: "<<= 280 chars>"

  - id: q1                           # question-kind node example
    question: "<<= 200 chars. A genuine question this essay's chapters raise
                and leave open or resolve — not a rhetorical aside.>"
    area: substrate
    # no page, no paper, no takeaway, no label, no year — question nodes
    # carry only the question text and an area.

# Typed edges at STORY altitude — deliberately a different, coarser vocabulary
# than the Atlas relations[] field. An edge compresses an underlying Atlas
# relation or a note's stated connection; it never creates a new one. Do not
# write these back onto page frontmatter.
edges:
  - from: attention                  # must be a declared node id
    to: registers                    # must be a declared node id, != from
    type: evolution                  # prerequisite | evolution | bridge | contrast
                                      #   prerequisite: reader needs `from` to follow `to`
                                      #   evolution: `to` is a next step along the same
                                      #     lineage as `from` — chronology-checked
                                      #     (build error if from's year > to's year)
                                      #   bridge: `to` imports `from`'s idea into a
                                      #     different area/lineage
                                      #   contrast: peer alternatives worth setting
                                      #     side by side — must NOT sit over an Atlas
                                      #     generalized_by/extended_by relation between
                                      #     the same two pages (validator warning)
    label: "<<= 24 chars, optional. Short caption on the edge, e.g. \"artifact fix\".>"

# Alternate 2D layouts. Coordinates are GRID UNITS: 1.0 == one chip pitch, not
# pixels and not years. `overview` is REQUIRED and its coords must include
# EVERY declared node id (build error otherwise). Additional thematic lenses
# may cover a subset — a node absent from a thematic lens's coords is simply
# hidden when that lens is active. The id "timeline" is RESERVED: the build
# generates it itself (x proportional to derived publication year, y = area
# lane) — never author a lens with that id.
lenses:
  - id: overview
    title: "Overview"
    coords:
      attention: [1, 0]     # [x, y] in grid units
      registers: [3, 1]
      q1: [2, 0.5]
  # - id: some-thematic-lens
  #   title: "..."
  #   coords: { <subset of node ids>: [x, y] }

# The guided walkthrough. >= 2 steps required (build error otherwise). Each
# step anchors to one `##` heading in the body below via `anchor`, which must
# equal that heading's rehype-slug id exactly (lowercase, punctuation
# stripped, spaces -> hyphens) — build error otherwise.
steps:
  - title: "<Step title, shown in the story rail and mobile list>"
    anchor: step-one-heading-slug     # must match a `## ...` heading below
    claim: "<<= 360 chars, optional. The step's headline claim — a single
             sentence a reader could disagree with, not a restatement of
             the title.>"
    focus: [attention, registers]     # node ids highlighted during this step;
                                       # must reference declared nodes
---

<!--
  Body: prose only, one `##` heading per step, in step order. Heading text
  must slugify (rehype-slug) to the matching step's `anchor`. 1-3 paragraphs
  per chapter. Voice: essay register (third person, present tense, concrete
  mechanisms; no first person, no hype adjectives, no "in this narrative
  we"). Each chapter ends on the constraint the next chapter removes; the
  final chapter ends on the thesis restated as a consequence, or on a
  question node's question. Link atlas pages as `/atlas/<slug>`; link
  paper-only (debt) nodes to their `docs/papers/index.yaml` url, never to
  `/atlas/<paper-id>`.
-->

## Step one heading slug

Chapter prose for the first step goes here.
