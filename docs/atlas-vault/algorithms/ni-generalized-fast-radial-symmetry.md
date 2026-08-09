---
title: "Generalised Fast Radial Symmetry"
type: algorithm
slug: ni-generalized-fast-radial-symmetry
---

> Generated stub — do not edit. Source: `content/algorithms/ni-generalized-fast-radial-symmetry.md`.

Affine extension of FRST: each pixel votes along a corrected direction $\hat V = G M G^{-1} M^{-1} \nabla I$ at radius $n$, where $G = R D \in A(2)$ is a rotation–anisotropic-scale pair from a sampled grid, so circles seen as ellipses under bounded perspective converge into a single peak in the per-pixel-max response stack while keeping FRS's $O(K)$ per-radius cost per $G_i$.

## Prerequisites

- [[image-gradient]]

## Sources

- Primary: [[ni2012-gfrs]]
- Reference: [[loy2003-frst]]
