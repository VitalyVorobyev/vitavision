---
title: "MAE"
type: model
slug: mae
---

> Generated stub — do not edit. Source: `content/models/mae.md`.

Masked Autoencoder — self-supervised pretraining for Vision Transformers: randomly mask 75 % of input patches, feed the visible 25 % through a ViT encoder, then run a lightweight ViT decoder over the full sequence (visible + shared learnable mask tokens) to reconstruct the masked patches' raw pixel values under MSE on per-patch-normalised targets. The asymmetric encoder-decoder design (encoder operates only on visible tokens, decoder is much smaller and discarded after pretraining) gives a 2.8–4.1× pretraining speedup vs full-sequence masked-ViT baselines and reaches 87.8 % ImageNet-1k top-1 with ViT-H fine-tuning.

## Prerequisites

- [[attention-mechanism]]
- [[convolutional-neural-network]]

## Practice

- **Feeds into** — [[sam]]
  > SAM v1's ViT-H image encoder is MAE-pretrained; SAM 2's Hiera (hierarchical ViT) is also MAE-pretrained. MAE is the SSL recipe that makes the SAM-family foundation segmenters' large encoders feasible.

## Sources

- Primary: [[he2021-mae]]
- Reference: [[dosovitskiy2020-vit]]
- Reference: [[he2016-resnet]]
