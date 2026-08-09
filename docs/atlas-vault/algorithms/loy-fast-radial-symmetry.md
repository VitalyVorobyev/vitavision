---
title: "Fast Radial Symmetry Transform"
type: algorithm
slug: loy-fast-radial-symmetry
---

> Generated stub — do not edit. Source: `content/algorithms/loy-fast-radial-symmetry.md`.

Gradient-vote operator that highlights pixels of high local radial symmetry — bright/dark blobs and approximately circular features. Each pixel votes along its gradient direction at one or more radii into orientation and magnitude projection maps; the per-radius contribution is the magnitude projection weighted by a power of the orientation count and Gaussian-smoothed; the cumulative response across radii localises feature centres at $O(K \cdot |N|)$ cost.

## Prerequisites

- [[image-gradient]]

## Lineage

- **Extended by** — [[ni-generalized-fast-radial-symmetry]]

## Sources

- Primary: [[loy2003-frst]]
