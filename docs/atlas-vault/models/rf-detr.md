---
title: "RF-DETR"
type: model
slug: rf-detr
---

> Generated stub — do not edit. Source: `content/models/rf-detr.md`.

Light-weight specialist real-time detection transformer that discovers an accuracy-latency Pareto frontier for any target dataset from a single training run: a DINOv2-ViT backbone feeds an LW-DETR-style set-prediction decoder, and weight-sharing NAS evaluates thousands of sub-network configurations without retraining. First real-time detector to exceed 60 AP on COCO.

## Prerequisites

- [[attention-mechanism]]
- [[convolutional-neural-network]]

## Sources

- Primary: [[robinson2025-rf-detr]]
- Reference: [[carion2020-detr]]
- Reference: [[dosovitskiy2020-vit]]
