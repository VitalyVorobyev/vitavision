---
title: "Geiger Chessboard Corner Detector"
type: algorithm
slug: geiger-chessboard-detector
---

> Generated stub — do not edit. Source: `content/algorithms/geiger-chessboard-detector.md`.

Detect checkerboard X-corners by computing a four-quadrant corner likelihood at each pixel using axis-aligned and 45°-rotated prototype filters at three fixed scales, verifying candidates by gradient-orientation statistics, and refining to subpixel accuracy via gradient-orthogonality weighted least squares — the libcbdetect detector that anchors many subsequent calibration pipelines.

## Prerequisites

- [[image-gradient]]

## Related

- [[chess-corners]]
- [[chessboard-x-corner-detection]]
- [[pyramidal-blur-aware-xcorner]]
- [[rochade]]

## Compared with

- [[pyramidal-blur-aware-xcorner]]

## Sources

- Primary: [[geiger2012-automatic]]
- Reference: [[harris1988-corner]]
- Reference: [[hillen2023-enhanced]]
- Reference: [[lucchese2003-saddle]]
- Reference: [[rufli2008-blurred]]
- Reference: [[shi-tomasi1994-features]]
- Reference: [[zhang2000-flexible]]
