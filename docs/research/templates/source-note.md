---
paper_id: <must match docs/papers/index.yaml>
title: ...
authors: [...]
year: ...
url: ...
created: YYYY-MM-DD
relevant_atlas_pages: [<slug>, <slug>]
---

> **Private — do not publish.** This file is a reasoning substrate for Claude
> and the repo owner. Public Atlas pages are authored by the page-type skills
> using the bullets in "Atlas update plan" below.

# Setting

What problem class. Inputs (with preconditions: image type, resolution, noise
model, calibration assumptions). Outputs (with guarantees and units).

# Core idea

The mechanism in 3–6 sentences. Equations live next to the prose that uses
them. Describe the method as if explaining to a future you, not the paper
authors' framing.

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
