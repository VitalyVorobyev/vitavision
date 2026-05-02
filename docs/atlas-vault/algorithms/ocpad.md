---
title: "OCPAD: Occluded Checkerboard Pattern Detection"
type: algorithm
slug: ocpad
---

> Generated stub — do not edit. Source: `content/algorithms/ocpad.md`.

Recover the largest visible checkerboard subgraph from a partially occluded pattern by running VF2 subgraph isomorphism against a model graph under a binary-search driver over vertex counts, then closing gaps by breadth-first region growing from a quad-density anchor.

## Prerequisites

- [[image-gradient]]
- [[topological-grid-recovery]]

## Related

- [[chessboard-x-corner-detection]]
- [[laureano-topological-chessboard]]
- [[puzzleboard]]
- [[shu-topological-grid]]

## Sources

- Primary: [[fuersattel2016-ocpad]]
- Reference: [[cordella2004-vf2]]
- Reference: [[placht2014-rochade]]
