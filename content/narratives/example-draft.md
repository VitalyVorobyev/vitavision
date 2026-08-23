---
title: "Example Narrative (draft fixture)"
date: 2026-08-23
summary: "A minimal draft fixture exercising the narrative content kind's parse and validation paths — not intended for publication."
tagline: "Backend test fixture"
tags: ["test-fixture"]
author: "Vitaly Vorobyev"
draft: true
areas:
  - id: foundations
    label: "Foundations"
  - id: architectures
    label: "Architectures"
nodes:
  - id: attn
    page: attention-mechanism
    area: foundations
    role: "prerequisite"
    takeaway: "Attention lets every token weigh every other token before the transformer block mixes them."
  - id: chess-paper
    paper: bennett2013-chess
    area: foundations
    label: "ChESS corner detection"
    takeaway: "Included only to exercise a paper-only ('page debt') node in this fixture."
  - id: vit-node
    page: vit
    area: architectures
    role: "milestone"
    takeaway: "Treats an image as a sequence of patches and feeds them through a standard transformer encoder."
  - id: dinov2-node
    page: dinov2
    area: architectures
    role: "milestone"
    takeaway: "Self-supervised ViT features that transfer without fine-tuning."
edges:
  - from: attn
    to: vit-node
    type: prerequisite
  - from: vit-node
    to: dinov2-node
    type: evolution
    label: "scales up"
lenses:
  - id: overview
    title: "Overview"
    coords:
      chess-paper: [0, 0]
      attn: [1, 0]
      vit-node: [2, 1]
      dinov2-node: [3, 1]
steps:
  - focus: [attn, vit-node]
    title: "Attention to ViT"
    anchor: attention-to-vit
  - focus: [vit-node, dinov2-node]
    title: "ViT to DINOv2"
    anchor: vit-to-dinov2
---

This is a minimal draft fixture for the narrative content kind. It exists to
exercise the parse and validation paths end to end — a mix of atlas-page
nodes (`vit`, `dinov2`, `attention-mechanism`) and a paper-only "page debt"
node (`bennett2013-chess`), one `prerequisite` edge and one `evolution` edge,
an `overview` lens covering every node, and two guided steps anchored to the
`##` headings below. `draft: true` keeps it out of every published listing.

## Attention to ViT

Attention lets every position in a sequence attend to every other position
before the block's feed-forward layer runs. ViT reuses the same mechanism
directly on image patches: split the image into fixed-size patches, embed
them as tokens, and hand the sequence to a standard transformer encoder.

## ViT to DINOv2

DINOv2 keeps the ViT backbone but trains it self-supervised at scale, so the
resulting features transfer to dense downstream tasks without fine-tuning.
