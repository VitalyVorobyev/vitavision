---
title: "MobileSAM"
type: model
slug: mobilesam
---

> Generated stub — do not edit. Source: `content/models/mobilesam.md`.

Lightweight SAM family — replaces SAM's heavy ViT-H image encoder (632M params, ~452 ms on a single GPU) with a distilled TinyViT encoder (5.78M params, ~8 ms), keeping SAM's prompt encoder + mask decoder frozen and unchanged; MobileSAMv2 adds an object-aware prompt sampler (YOLOv8-style detector → bounding-box prompts) that replaces SAM's 32×32 grid-prompt + NMS pipeline for the Segment-Everything task, cutting end-to-end latency from ≈1616 ms to ≈97 ms (>16×) at equivalent mask quality.

## Prerequisites

- [[attention-mechanism]]
- [[sam]]

## Practice

- **Compared with** — [[focalclick]] _(confidence: medium)_
  > Both target lightweight on-device interactive segmentation but from different lineages — MobileSAM distils SAM's foundation-model encoder into TinyViT (zero-shot, no mask correction); FocalClick is a small specialised two-stage network with native preexisting-mask refinement.

## Sources

- Primary: [[zhang2023-mobilesam]]
- Reference: [[kirillov2023-sam]]
- Reference: [[zhang2023-mobilesamv2]]
