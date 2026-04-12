---
title: "ChESS Corners Detector"
date: 2026-03-29
summary: "A chessboard-specific corner detector that scores the X-junction structure of calibration-board intersections."
tags: ["computer-vision", "feature-detection", "calibration", "chessboard"]
category: corner-detection
author: "Vitaly Vorobyev"
draft: false
relatedPosts: ["01-chesscorners", "01-chess_ai"]
relatedAlgorithms: ["harris-corner-detector"]
---

The ChESS detector is a specialized corner detector for chessboard intersections. Unlike generic detectors such as Harris or FAST, it is designed to respond to the alternating black-white quadrants of an X-junction, which makes it especially useful for calibration targets and structured-light pipelines.

## What problem this solves

Calibration does not need generic "interesting points." It needs stable, repeatable detections at checkerboard intersections under blur, noise, and perspective distortion. ChESS narrows the problem to that exact local pattern and suppresses responses from plain edges, blobs, and unrelated texture.

## Core idea

ChESS samples intensities on a ring around a candidate center pixel and evaluates whether those samples follow the alternating structure expected from a chessboard corner. The response combines:

- a term that rewards the expected alternating pattern
- a term that penalizes edge-like responses
- a local-mean consistency penalty that suppresses blob-like structures

That makes ChESS less general than Harris, but much more selective for calibration-board geometry.

## Implementation notes

- The detector is naturally paired with non-maximum suppression and optional subpixel refinement.
- Ring radius and multiscale search determine the tradeoff between speed, robustness, and target scale coverage.
- For real systems, it is often part of a larger pipeline that includes orientation recovery, duplicate suppression across scales, and corner ordering.

## Failure modes and tradeoffs

ChESS is not a general-purpose interest-point detector. It performs best when the target is known to be a chessboard-like pattern and when the ring scale matches the visible cell geometry. If the scene contains arbitrary corners or large scale variation, a generic detector or a multiscale wrapper is usually a better baseline.

## Used in Vitavision

Vitavision's current chessboard prototype and longer write-up both center on ChESS as the detector that is actually aligned with calibration-board geometry. See [ChESS Corners Detector](/blog/01-chesscorners) for the broader story and [Implementing ChESS Corners in Rust](/blog/01-chess_ai) for the implementation-oriented article.
