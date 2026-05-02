<!-- Use this template for design docs, README sections, MODEL_CARD files, and
     spec/guide documents that are not standalone papers. Keep claims traceable
     to specific section anchors or line ranges in the source document. -->
---
source_id: doc-<basename>                # convention: doc-<basename> (basename without .md)
kind: doc
title: "<doc title>"
path: <repo-relative path>               # e.g. docs/atlas-design.md
created: YYYY-MM-DD
relevant_atlas_pages: [<slug>, <slug>]
---

# Doc scope

What the document covers; where it lives (repo-relative path, external owner if
applicable). 1–3 sentences on the document's purpose and intended audience.

# Key claims

The doc's load-bearing assertions that are relevant to Atlas pages.

1. ...
2. ...
3. ...

# Applicability

- Cite when: ...
- Don't cite when: ...

# Connections

- Draws on: [paper-or-doc-id, ...]   # upstream sources the doc references
- Should be cited by: [slug, ...]    # downstream Atlas pages that should cite this doc

# Atlas update plan

Bullets per affected slug. Use these heading prefixes:

## NEW: <suggested-slug>
Type: algorithm | model | concept
Category: <category-from-schema>
Primary source: this doc
Bullets per public-page section.

## UPDATE: <existing-slug>
Section: <section-heading-in-public-page>
Bullets to add or revise.

# Provenance

Citations to specific section anchors or line ranges in the source document
that ground each claim in "Key claims." Short quotes ONLY when paraphrasing
would change technical meaning.
