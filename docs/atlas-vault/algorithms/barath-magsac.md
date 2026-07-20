---
title: "MAGSAC: Marginalising Sample Consensus"
type: algorithm
slug: barath-magsac
---

> Generated stub — do not edit. Source: `content/algorithms/barath-magsac.md`.

Robust estimator that eliminates the user-tuned inlier threshold by treating the noise scale σ as a random variable on [0, σ_max] and marginalising the RANSAC quality function over σ; the final model is a weighted least-squares fit using marginal-likelihood weights via iteratively reweighted least squares (σ-consensus).

## Prerequisites

- [[ransac]]

## Sources

- Primary: [[barath2019-magsac]]
