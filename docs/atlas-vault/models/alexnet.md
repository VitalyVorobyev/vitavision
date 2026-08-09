---
title: "AlexNet"
type: model
slug: alexnet
---

> Generated stub — do not edit. Source: `content/models/alexnet.md`.

Eight-layer convolutional neural network for 1000-class image classification on ImageNet, trained end-to-end on two GPUs with ReLU activations, local response normalisation, overlapping max-pooling, and dropout; the first deep CNN to win ILSVRC by a large margin.

## Prerequisites

- [[convolutional-neural-network]]

## Lineage

- **Extended by** — [[vgg]]
  > VGG extends AlexNet's CNN classifier paradigm from 8 to 16/19 weight layers via stacked 3×3 conv blocks; same task, deeper architecture, same training framework.

## Sources

- Primary: [[krizhevsky2012-alexnet]]
- Reference: [[szegedy2015-inception]]
