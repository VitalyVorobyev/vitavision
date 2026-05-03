<!-- Repo note template (GitHub/GitLab, WASM packages). Fill every section; use "?" for uncertain claims. -->
---
source_id: repo-<owner>-<repo>
kind: repo
title: "<owner>/<repo>"
repo: https://github.com/<owner>/<repo>
commit: <7-40 hex sha>
license: <SPDX>
framework: pytorch | tensorflow | jax | other  # omit if not a DL repo
weights_url: <url>          # omit if no weights; weights_license: <SPDX> if set
created: YYYY-MM-DD
relevant_atlas_pages: [<slug>, <slug>]
---

# Repository scope

What the repo implements; public surface area (CLI, Python API, WASM exports,
etc.). Inputs and outputs as the repo presents them. 3–6 sentences.

# Architecture

One-paragraph summary of internals: module layout, key abstractions, data flow,
notable design choices. Describe the implementation, not the README pitch.

# Failure regime

Known issues, deprecated paths, version incompatibilities. Specific: "GPU
inference requires CUDA ≥ 11.8; CPU fallback silently produces wrong output."

# Maintenance signal

- Last commit: <date> | Release cadence: <active | sporadic | archived>
- License: <SPDX> | Weights license: <SPDX or N/A>
- Pinned framework versions: <e.g. torch==2.1.0>

# Applicability

- Use when: ...
- Don't use when: ...
- Compared against: <alternative>

# Connections

- Builds on: [repo-or-paper-id, ...]   # upstream repos / papers
- Enables: [repo-or-paper-id, ...]      # downstream pages that cite this repo
- Refutes / supersedes: [id]            # if applicable

# Atlas update plan

## NEW: <suggested-slug>
Type: algorithm | model | concept  |  Category: <category-from-schema>
Primary source: this repo  |  Bullets per public-page section.

## UPDATE: <existing-slug>
Section: <section-heading>  |  Bullets to add or revise.

# Provenance

Repo paths, README sections, MODEL_CARD entries grounding each claim above. Short
quotes ONLY when paraphrasing changes technical meaning.
