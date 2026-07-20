---
title: "U-Net"
type: model
slug: unet-segmentation
---

> Generated stub — do not edit. Source: `content/models/unet-segmentation.md`.

Symmetric encoder-decoder fully-convolutional network for dense pixel-wise biomedical image segmentation — contracting path with channel-doubling 3×3 convs and max-pool downsampling, expansive path with up-convs and skip concatenation of cropped encoder features, trained from scratch on tens of images via heavy elastic-deformation augmentation and a distance-weighted cross-entropy loss that learns inter-instance separation borders.

## Sources

- Primary: [[ronneberger2015-unet]]
- Reference: [[long2015-fcn]]
