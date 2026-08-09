---
title: "Localized Radon Checkerboard Corners"
type: algorithm
slug: duda-radon-corners
---

> Generated stub — do not edit. Source: `content/algorithms/duda-radon-corners.md`.

Detect checkerboard X-junctions by approximating a localized Radon transform with 1-D box filters on rotated copies of the image; the per-pixel response is the squared difference between the maximum and minimum directional line integrals over four discrete angles.

## Prerequisites

- [[image-gradient]]

## Sources

- Primary: [[duda2018-accurate]]
- Reference: [[harris1988-corner]]
- Reference: [[rufli2008-blurred]]
- Reference: [[sinzinger2007-model-based]]
