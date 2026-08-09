---
title: "ViT"
type: model
slug: vit
---

> Generated stub — do not edit. Source: `content/models/vit.md`.

Vision Transformer — a pure-transformer image classification backbone that treats an image as a sequence of fixed-size patches: split RGB image into $N = HW/P^2$ patches of $P{\times}P$ pixels (P=16 for ViT-B/L, P=14 for ViT-H), linearly project to $D$-dim tokens, prepend a learnable [CLS] token, add learned positional embeddings, and feed through a standard transformer encoder; classification head reads the [CLS] token's final-layer output. ViT-B/16 86M params, ViT-L/16 307M, ViT-H/14 632M. With large-scale pretraining (JFT-300M) ViT matches or exceeds ResNet-based BiT-L on ImageNet at lower compute.

## Prerequisites

- [[attention-mechanism]]
- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[resnet]]
  > ViT vs ResNet (BiT) is the headline classification comparison in the paper. Both coexist as production backbones — ResNet's conv inductive bias dominates in small-data regimes; ViT scales better with large pretraining (JFT-300M).
- **Feeds into** — [[mobilesam]]
- **Feeds into** — [[rf-detr]] _(confidence: medium)_
  > RF-DETR's backbone is a DINOv2 self-supervised ViT.
- **Feeds into** — [[sam]]

## Sources

- Primary: [[dosovitskiy2020-vit]]
- Reference: [[he2016-resnet]]
