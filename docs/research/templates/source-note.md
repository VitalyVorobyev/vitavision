---
paper_id: <must match docs/papers/index.yaml>
title: ...
authors: [...]
year: ...
url: ...
created: YYYY-MM-DD
relevant_atlas_pages: [<slug>, <slug>]
---

# Setting

What problem class. Inputs (with preconditions: image type, resolution, noise
model, calibration assumptions). Outputs (with guarantees and units).

# Core idea

The mechanism in 3–6 sentences. Equations live next to the prose that uses
them. Describe the method as if explaining to a future you, not the paper
authors' framing.

# Claimed contributions

*(kind=paper, modern papers with an explicit contribution list — omit when the
paper has none.)* The paper's own enumerated contributions, verbatim-anchored:
one bullet per claimed contribution, each with a short quote or tight
paraphrase plus its location (section/paragraph). These are the paper's claims,
not editorial judgments — overclaims stay as stated here and get calibrated at
page-drafting time. Map naturally onto model-page "What it introduced" /
Motivation / Assessment material.

- C1: ... (§/quote)
- C2: ...

# Assumptions

Numbered list. Each entry is a precondition for the method to be valid.
Distinguish soft (degrades gracefully) from hard (fails silently).

1. ...
2. ...

# Failure regime

When this breaks. Empirically observed and theoretically derived. Specific:
"Repeated texture causes RANSAC degeneracy when inliers < 50%" beats
"doesn't work on textures."

# Numerical sensitivity

Conditioning, scale dependence, normalization requirements, precision needs.
Where 32-bit vs 64-bit matters, where dynamic range matters.

# Applicability

- Use when: ...
- Don't use when: ...
- Compared against: <alternative>, <alternative>

# Stated relations

*(kind=paper — omit when the paper has no Related Work / positioning prose.)*
The paper's OWN positioning statements toward prior/concurrent work, extracted
from the intro and Related Work, as **evidence for** typed `relations[]` edges —
never auto-committed. One row per candidate; `proposed type` uses the fixed
vocabulary from CLAUDE.md → Relations field, applying its rules (Rule A
supersession≠comparison, Rule B cross-domain→no edge, `feeds_into`≠data-flow).
Papers are promotional: their "unlike X, we…" framing may be unfair to X — the
orchestrator confirms each row against the counterpart's note and the
user/approved plan before any `Relations:` line is recorded in the update plan.

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| ... | "..." (§2) | extended_by / compared_with / … / none (Rule B) | high/med/low | ... |

# Connections

- Builds on: [paper_id, paper_id]   # upstream
- Enables: [paper_id, paper_id]      # downstream
- Refutes / supersedes: [paper_id]   # if applicable

# Atlas update plan

Bullets per affected slug. Use these heading prefixes:

## NEW: <suggested-slug>
Type: algorithm | model | concept
Category: <category-from-schema>
Primary source: this paper
Bullets per public-page section (Goal, Algorithm, Implementation, Remarks,
References for algorithms; Definition, Mathematical Description, Numerical
Concerns, Where it appears, References for concepts).

## UPDATE: <existing-slug>
Section: <section-heading-in-public-page>
Bullets to add or revise.

# Provenance

Citations to specific page/section/equation numbers in the source. Short
quotes ONLY when paraphrasing would change technical meaning.
