---
title: "RITM"
type: model
slug: ritm-interactive-segmentation
---

> Generated stub — do not edit. Source: `content/models/ritm-interactive-segmentation.md`.

Feedforward click-based interactive segmentation: HRNet+OCR encoder-decoder taking RGB + positive/negative disk-encoded clicks + previous mask, trained with iterative click simulation and Normalized Focal Loss on COCO+LVIS — sets a new state of the art without inference-time backward passes.

## Lineage

- **Extended by** — [[focalclick]]
  > FocalClick adds Focus View + Progressive Merge for CPU-feasible mask correction; RITM remains the foundational feedforward click-based reference.

## Cross-paradigm

- **Learned alternative of** — [[grabcut-iterative-segmentation]]
- **Learned alternative of** — [[graph-cut-segmentation]] _(confidence: medium)_
  > RITM replaces interactive (click-seeded) graph-cut workflows; not all energy-min segmentation.

## Sources

- Primary: [[sofiiuk2021-ritm]]
- Reference: [[chen2018-deeplab]]
- Reference: [[sun2019-hrnet]]
