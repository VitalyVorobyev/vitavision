---
title: "XFeat"
type: model
slug: xfeat
---

> Generated stub — do not edit. Source: `content/models/xfeat.md`.

Lightweight CNN that jointly detects keypoints, extracts 64-D dense descriptors, and refines semi-dense matches from coarse descriptor pairs, targeting CPU-grade inference on hardware-constrained devices.

## Prerequisites

- [[image-gradient]]

## Cross-paradigm

- **Learned alternative of** — [[brief]]
  > XFeat replaces the FAST+BRIEF binary-descriptor pipeline with a featherweight learned model targeting CPU inference.
- **Learned alternative of** — [[orb]]
  > XFeat targets ORB-class deployment budgets (mobile, real-time, low-power CPU) and replaces ORB's hand-crafted oFAST + rBRIEF binary pipeline with a learned 64-D float descriptor.
- **Learned alternative of** — [[sift]]
  > XFeat targets CPU-grade compute and replaces SIFT's classical hand-crafted pipeline with a featherweight learned model.
- **Learned alternative of** — [[surf]]
  > XFeat replaces SURF's integral-image Hessian detector + Haar-wavelet descriptor with a featherweight learned model targeting CPU inference.

## Sources

- Primary: [[potje2024-xfeat]]
- Reference: [[detone2018-superpoint]]
