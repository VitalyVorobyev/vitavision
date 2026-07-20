---
title: "Shi-Tomasi Corner Detector"
type: algorithm
slug: shi-tomasi-corner-detector
---

> Generated stub — do not edit. Source: `content/algorithms/shi-tomasi-corner-detector.md`.

Scores each pixel by the smaller eigenvalue of the gradient structure tensor M; returns integer pixel locations where that eigenvalue exceeds a threshold, derived from a feature-tracking quality criterion.

## Prerequisites

- [[image-gradient]]
- [[non-maximum-suppression]]
- [[structure-tensor]]

## Sources

- Primary: [[shi-tomasi1994-features]]
- Reference: [[harris1988-corner]]
