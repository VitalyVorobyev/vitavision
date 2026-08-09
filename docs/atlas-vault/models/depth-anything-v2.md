---
title: "Depth Anything V2"
type: model
slug: depth-anything-v2
---

> Generated stub — do not edit. Source: `content/models/depth-anything-v2.md`.

A monocular depth foundation model that trains its teacher purely on synthetic images for label precision, then distills to a student over 62M pseudo-labeled real images, sharpening detail over V1 while staying far faster than diffusion-based depth.

## Prerequisites

- [[monocular-depth-estimation]]
- [[vit]]

## Lineage

- **Generalised by** — [[depth-anything-3]]
  > DA3 generalizes DA2 to any-view geometry and surpasses it on monocular depth; DA2 is also DA3's distillation teacher.

## Sources

- Primary: [[yang2024-depth-anything-v2]]
- Reference: [[oquab2023-dinov2]]
- Reference: [[ranftl2019-midas]]
- Reference: [[yang2024-depth-anything]]
