---
title: "MnasNet"
type: model
slug: mnasnet
---

> Generated stub — do not edit. Source: `content/models/mnasnet.md`.

Mobile-CPU CNN image classifier discovered by platform-aware neural architecture search: an RNN controller trained with reinforcement learning samples architectures from a factorized hierarchical search space and maximizes a multi-objective reward trading ImageNet top-1 accuracy against latency measured directly on a phone.

## Prerequisites

- [[convolutional-neural-network]]

## Practice

- **Feeds into** — [[mobilenetv3]]
  > MobileNetV3 uses MnasNet-style platform-aware NAS and the SE-augmented search space as the basis of its block-level search.

## Sources

- Primary: [[tan2019-mnasnet]]
- Reference: [[howard2019-mobilenetv3]]
- Reference: [[sandler2018-mobilenetv2]]
