---
title: "SAM"
type: model
slug: sam
---

> Generated stub — do not edit. Source: `content/models/sam.md`.

Promptable segmentation foundation model family — SAM (v1, 2023) introduces image-prompt segmentation with a heavy ViT-H encoder and lightweight transformer decoder trained on the 1.1B-mask SA-1B dataset; SAM 2 (2024) extends to video via a streaming memory module on a Hiera hierarchical-ViT encoder; SAM 3 (2025) generalises from single-object prompts to *concept* prompts (free-form noun phrases or visual exemplars) via a presence token, segmenting all matching instances on images and videos.

## Prerequisites

- [[attention-mechanism]]
- [[convolutional-neural-network]]

## Lineage

- **Extended by** — [[mobilesam]]
  > MobileSAM is a lightweight derivative — distils SAM v1's ViT-H image encoder into a 5.78M-param TinyViT (~56× faster) while keeping SAM's prompt encoder + decoder frozen; MobileSAMv2 adds an object-aware prompt sampler for Segment-Everything.

## Practice

- **Compared with** — [[focalclick]] _(confidence: medium)_
  > Opposite design points — SAM is a heavy promptable foundation model with zero-shot generalisation but no preexisting-mask refinement; FocalClick is a small specialised network with native mask correction but no zero-shot.
- **Compared with** — [[mask-rcnn]] _(confidence: medium)_
  > Different problem classes — Mask R-CNN is closed-set instance detection with category labels; SAM is class-agnostic promptable segmentation.
- **Compared with** — [[ritm-interactive-segmentation]] _(confidence: medium)_
  > Both are click-prompted interactive segmenters; different sub-paradigms — SAM is a foundation model with a prompt-conditioned decoder, RITM is iterative-mask refinement on a per-image encoder.

## Cross-paradigm

- **Learned alternative of** — [[felzenszwalb-graph-segmentation]]
- **Learned alternative of** — [[grabcut-iterative-segmentation]]
- **Learned alternative of** — [[graph-cut-segmentation]]

## Sources

- Primary: [[kirillov2023-sam]]
- Reference: [[carion2025-sam3]]
- Reference: [[ravi2024-sam2]]
