---
title: "SuperPoint"
type: model
slug: superpoint
---

> Generated stub — do not edit. Source: `content/models/superpoint.md`.

Fully-convolutional CNN that jointly detects interest points and computes 256-D descriptors in a single forward pass, trained without human annotations via Homographic Adaptation on synthetic shapes and MS-COCO images.

## Prerequisites

- [[image-gradient]]

## Practice

- **Compared with** — [[xfeat]]
- **Feeds into** — [[lightglue]]
  > LightGlue ships SuperPoint-paired pretrained weights as the default configuration; recommended over SuperGlue for new pipelines (faster, Apache-2.0).
- **Feeds into** — [[superglue]]
  > SuperGlue is the canonical learned matcher paired with SuperPoint; SuperPoint keypoints + descriptors are SuperGlue's typical front-end.

## Cross-paradigm

- **Learned alternative of** — [[brief]]
  > SuperPoint replaces the FAST+BRIEF / SIFT / ORB classical pipeline with a single learned encoder + decoder heads.
- **Learned alternative of** — [[harris-corner-detector]]
  > SuperPoint replaces classical sparse keypoint+descriptor pipelines (Harris/Shi-Tomasi + SIFT/ORB) with a single learned model; it does not literally re-implement the Harris response.
- **Learned alternative of** — [[orb]]
  > SuperPoint replaces ORB's oFAST + rBRIEF detector-descriptor bundle with a single learned encoder + dual decoder heads; descriptor matching is float-valued L2 instead of Hamming.
- **Learned alternative of** — [[shi-tomasi-corner-detector]]
- **Learned alternative of** — [[sift]]
  > SuperPoint replaces SIFT's hand-crafted DoG + 128-D descriptor with a single learned encoder + dual decoder heads.
- **Learned alternative of** — [[surf]]
  > SuperPoint replaces SURF's box-filter Hessian detector + 64-D Haar-wavelet descriptor with a learned VGG encoder + dual decoder heads.

## Sources

- Primary: [[detone2018-superpoint]]
- Reference: [[harris1988-corner]]
- Reference: [[rosten2006-fast]]
- Reference: [[shi-tomasi1994-features]]
