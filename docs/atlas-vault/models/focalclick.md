---
title: "FocalClick"
type: model
slug: focalclick
---

> Generated stub — do not edit. Source: `content/models/focalclick.md`.

Practical click-based interactive segmentation that runs each click as a small local-crop forward pass (Segmentor on a Target Crop, Refiner on a Focus Crop) and composits results back via Progressive Merge — sub-300 ms per click on CPU with first-class support for refining preexisting masks.

## Cross-paradigm

- **Learned alternative of** — [[grabcut-iterative-segmentation]] _(confidence: medium)_
  > FocalClick replaces interactive click-based annotation workflows; not a drop-in for energy-min/graph-cut on seeded segmentation generally.

## Sources

- Primary: [[chen2022-focalclick]]
- Reference: [[sofiiuk2021-ritm]]
- Reference: [[sun2019-hrnet]]
