---
title: "SegFormer"
type: model
slug: segformer
---

> Generated stub — do not edit. Source: `content/models/segformer.md`.

Hierarchical Transformer encoder (MiT) producing multi-scale features at $1/4, 1/8, 1/16, 1/32$ without positional encodings, plus an all-MLP decoder that fuses per-stage features into a per-pixel prediction. Six variants MiT-B0..B5 trade compute for accuracy; B5 reaches 51.8 mIoU on ADE20K and 84.0 mIoU on Cityscapes (Tables 1 and 2).

## Prerequisites

- [[attention-mechanism]]
- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[deeplab-semantic-segmentation]]
- **Compared with** — [[fcn-semantic-segmentation]]
- **Compared with** — [[hrnet]]
- **Compared with** — [[mask2former]] _(confidence: medium)_
  > Mask2Former 2022 follows SegFormer 2021 with a mask-classification paradigm; different formulation (set prediction over masks vs per-pixel).
- **Compared with** — [[unet-segmentation]] _(confidence: medium)_
  > U-Net is the encoder-decoder ancestor; SegFormer keeps the multi-scale-fuse idea but drops skip connections in favour of MLP-aggregating decoder.
- **Feeds into** — [[focalclick]]
  > SegFormer-B0 and SegFormer-B3 are explicit Segmentor backbones in FocalClick Table 3; the MiT encoder + all-MLP decoder is reused intact and the decoder logits feed FocalClick's Refiner.

## Sources

- Primary: [[xie2021-segformer]]
- Reference: [[chen2018-deeplab]]
- Reference: [[dosovitskiy2020-vit]]
- Reference: [[long2015-fcn]]
