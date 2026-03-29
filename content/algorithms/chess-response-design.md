---
title: "ChESS Response Design"
date: 2026-03-29
summary: "An interactive explainer for how SR, DR, MR, and the final ChESS score separate corners from edges and stripes."
tags: ["computer-vision", "feature-detection", "calibration", "interactive"]
author: "Vitaly Vorobyev"
relatedPosts: ["01-chesscorners", "01-chess_ai"]
relatedAlgorithms: ["chess-corners", "harris-corner-detector", "fast-corner-detector"]
---

The ChESS detector is easiest to understand when the response stays attached to a concrete local pattern. This page keeps the geometry synthetic on purpose: a small grayscale pixel grid, a fixed 16-sample ring, and three canonical cases that explain why the final score is selective.

:::illustration[chess-response]{preset="article" pattern="corner" rotation="22.5"}
:::

## What to look for

- In the **corner** case, opposite samples support the expected two-cycle structure, so `SR` stays large.
- In the **edge** case, opposite points land on different sides of the edge, so `DR` rises and suppresses the response.
- In the **stripe** case, the ring alone can still look corner-like, but the bright center patch pushes `MR` upward and the final score drops.

## Indexing convention

The ring is indexed as `I0 ... I15`, starting at the top sample and moving clockwise. Rotation changes the synthetic image pattern, not the ring indexing, so the combinatorics of the response terms remain readable while the visual layout turns.

## Final score

The illustration reports the term values that correspond to the displayed synthetic intensities:

$$
R = SR - DR - 16 \cdot MR
$$

This is not a benchmark plot or a physical image-formation model. It is an article figure meant to teach why the ChESS response rewards a chessboard-like X-junction and rejects simpler false positives.
