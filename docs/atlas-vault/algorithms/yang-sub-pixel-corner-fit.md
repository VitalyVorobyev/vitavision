---
title: "Yang Parametric-Model Sub-Pixel Corner Fit"
type: algorithm
slug: yang-sub-pixel-corner-fit
---

> Generated stub — do not edit. Source: `content/algorithms/yang-sub-pixel-corner-fit.md`.

Refine pixel-level chessboard corner positions to sub-pixel accuracy by nonlinear least-squares fitting a seven-parameter ideal blurred-corner model directly to the raw image patch, then reject unreliable corners via a boxplot-based fit-quality self-check before passing to PnP.

## Prerequisites

- [[image-gradient]]

## Practice

- **Compared with** — [[duda-radon-corners]] _(confidence: medium)_
- **Compared with** — [[geiger-chessboard-detector]]
- **Compared with** — [[pyramidal-blur-aware-xcorner]] _(confidence: medium)_
  > Pyramidal builds on ROCHADE; yang2018 fits a parametric saddle model — different mechanism
- **Compared with** — [[rochade]]

## Sources

- Primary: [[yang2018-sub-pixel]]
- Reference: [[chen2005-xcorner]]
- Reference: [[harris1988-corner]]
- Reference: [[lepetit2009-epnp]]
- Reference: [[placht2014-rochade]]
- Reference: [[zhang2000-flexible]]
