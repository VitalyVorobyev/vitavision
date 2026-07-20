---
title: "Graph-Cut Interactive Segmentation"
type: algorithm
slug: graph-cut-segmentation
---

> Generated stub — do not edit. Source: `content/algorithms/graph-cut-segmentation.md`.

Compute the global minimum of a binary region-and-boundary MRF energy as a single s-t min-cut on a pixel graph; user-marked seeds enter as hard constraints, the output is a binary labelling $A : P \to \{\text{obj}, \text{bkg}\}$ with topology-free segments.

## Prerequisites

- [[energy-minimization]]

## Lineage

- **Extended by** — [[grabcut-iterative-segmentation]]

## Sources

- Primary: [[boykov2001-graph-cut-segmentation]]
