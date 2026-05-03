---
title: "GP Checkerboard Enhancement (PyCBD)"
type: algorithm
slug: gp-checkerboard-enhancement
---

> Generated stub — do not edit. Source: `content/algorithms/gp-checkerboard-enhancement.md`.

Post-process a partially detected checkerboard by training two Gaussian processes (one per pixel coordinate) on the allocated (boardXY, boardUV) pairs to allocate unassigned detections to grid positions, predict UV for occluded or out-of-frame corners, and apply a global-consistency refinement to every allocated corner.

## Prerequisites

- [[image-gradient]]

## Related

- [[chessboard-x-corner-detection]]
- [[geiger-chessboard-detector]]
- [[ocpad]]

## Sources

- Primary: [[hillen2023-enhanced]]
- Reference: [[duda2018-accurate]]
- Reference: [[fuersattel2016-ocpad]]
- Reference: [[geiger2012-automatic]]
- Reference: [[placht2014-rochade]]
- Reference: [[rasmussen2006-gpml]]
- Reference: [[rufli2008-blurred]]
