---
title: "Fischler–Bolles RANSAC"
type: algorithm
slug: fischler-bolles-ransac
---

> Generated stub — do not edit. Source: `content/algorithms/fischler-bolles-ransac.md`.

Founding random-sample-consensus paradigm: fit a parametric model to data containing an unknown fraction of gross outliers by drawing minimal random subsets, instantiating candidate models, counting consensus inliers, and retaining the largest consensus set.

## Prerequisites

- [[ransac]]

## Lineage

- **Extended by** — [[barath-magsac]]
  > MAGSAC marginalises the inlier threshold rather than fixing it — orthogonal axis to USAC's framework refactor
- **Extended by** — [[raguram-usac]]
  > USAC is a unifying engineering framework, not a single new technique

## Sources

- Primary: [[fischler1981-ransac]]
