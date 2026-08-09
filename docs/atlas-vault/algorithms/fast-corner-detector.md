---
title: "FAST Corner Detector"
type: algorithm
slug: fast-corner-detector
---

> Generated stub — do not edit. Source: `content/algorithms/fast-corner-detector.md`.

Segment-test corner detector on a 16-pixel Bresenham ring of radius 3 around each candidate; classifies a point as a corner when N contiguous ring pixels are all brighter (or all darker) than the centre by a margin t.

## Prerequisites

- [[image-gradient]]
- [[non-maximum-suppression]]

## Practice

- **Feeds into** — [[orb]]

## Sources

- Primary: [[rosten2006-fast]]
