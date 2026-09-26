---
paper_id: chum2003-lo-ransac
title: "Locally Optimized RANSAC"
authors: ["Ondřej Chum", "Jiří Matas", "Josef Kittler"]
year: 2003
url: https://cmp.felk.cvut.cz/~matas/papers/chum-dagm03.pdf
created: 2026-09-15
relevant_atlas_pages: [lo-ransac, ransac, fischler-bolles-ransac, raguram-usac, barath-magsac]
---

# Setting

Robust model estimation from data contaminated by outliers, in the standard
RANSAC setting: a two-view geometry (epipolar geometry or homography)
estimated from a set of tentative point correspondences with unknown inlier
fraction $\varepsilon = I/N$ (§1-§2). Input: $N$ correspondences, a minimal
sample size $m$ (7 for epipolar geometry via the 7-point algorithm, or 4 for
homography in the paper's experiments — §4, "linear algorithm"), and an
inlier threshold $\theta$. Output: model parameters (fundamental matrix or
homography) plus the achieved inlier count/set, with the same termination
guarantee as standard RANSAC but reached with fewer samples in practice.

# Core idea

Standard RANSAC's termination criterion,
$$\eta = (1-P_I)^k \qquad(1)$$
where $\eta$ is the probability of having missed the full inlier set after
$k$ samples and
$$P_I = \binom{I}{m}\Big/\binom{N}{m} = \prod_{j=0}^{m-1}\frac{I-j}{N-j}
\approx \varepsilon^m \qquad(2)$$
is the probability that an $m$-point minimal sample is entirely
outlier-free, implicitly assumes that a model fit from one uncontaminated
minimal sample is consistent with *all* $I$ inliers. This assumption "rarely
holds in practice" because minimal-sample model estimates are themselves
noisy, so real RANSAC runs need far more than the $k = \log(\eta)/\log(1-P_I)$
samples the formula predicts (§1, §2).

LO-RANSAC keeps the outer RANSAC loop unchanged but inserts a **local
optimization** step whenever a new best model is found (Algorithm 1, §2):

> Repeat until $\eta$ from Eq. 1 falls below threshold: (1) draw a minimal
> sample $S_m$; (2) estimate model parameters from $S_m$; (3) count inliers
> $I_k$ (error below $\theta$); (4) if $I_k > I_j$ for all previous $j<k$, run
> local optimization and store the resulting model if it is better.

The key theoretical result bounding the added cost: since the sequence of
per-sample inlier counts behaves as a random variable whose $k$-th draw has
probability $1/k$ of being a new running maximum, the expected number of
"new-maximum" events (hence local-optimization invocations) within $k$
samples is bounded by
$$\sum_{i=1}^k \frac{1}{i} \le \int_1^k \frac{1}{x}dx + 1 = \log k + 1
\qquad\text{(§2, unnumbered display)}$$
so local optimization is applied at most $O(\log k)$ times over a run — the
paper's basis for claiming the extra cost is asymptotically negligible
relative to $k$ total samples (§2, Contribution (c); confirmed empirically
in Table 3).

Five local-optimization variants are compared (§3):
1. **Standard** — no local optimization (baseline RANSAC).
2. **Simple** — collect all points with error $<\theta$ under the
   minimal-sample model and re-fit with a linear (non-minimal, least-squares
   style) algorithm.
3. **Iterative** — collect points with error $< K\cdot\theta$ (looser
   threshold), re-fit, then shrink the threshold toward $\theta$ and repeat.
4. **Inner RANSAC** — run a fresh, smaller RANSAC restricted to the $I_k$
   inlier points of the current best model, using a non-minimal inner sample
   size ($\min(I_k/2, 14)$ for epipolar geometry, $\min(I_k/2, 12)$ for
   homography in the experiments) since minimality is no longer required
   once sampling from a mostly-inlier set; verified against the full data
   set; run 10 times per invocation.
5. **Inner RANSAC with iteration** — method 4, but each inner-RANSAC sample
   is itself refined by method 3.

Two empirical observations motivate the design (§3): **Observation 1 (sample
size)** — a controlled experiment (Fig. 1) adding varying noise to two
disjoint 100-point correspondence sets and fitting the fundamental matrix
from samples of size 7 (7-point algorithm), 8, 9, and 14 (linear 8-point-style
algorithm) shows monotonically decreasing average error with sample size,
*except* that 8-point samples are noticeably worse than 7-point ones due to
"singularity enforcement in the eight point algorithm" — i.e., minimal-sample
models are measurably less accurate than models fit from more points, which
motivates re-fitting on a larger inlier-consistent set once one is found.
**Observation 2 (iterative re-weighting is dangerous with leverage points)**
— naively iterating "fit by least squares → drop worst residual → repeat"
over the *whole* dataset is known to fail catastrophically in the presence
of a single far-outlying (leverage) point, since least squares is not robust
to it; method 3 avoids this by only ever including points already within
$K\cdot\theta$ of a sample-consistent model, so leverage points never enter
the re-fit.

# Assumptions

1. The minimal-sample model hypothesis is assumed to be "almost always
   sufficiently near the optimal solution" — a soft empirical assumption
   underpinning why local refinement (rather than a global search) suffices
   (§1, "novel improvement" paragraph).
2. Threshold $\theta$ and inner-loop threshold multiplier $K$ (method 3) are
   treated as externally fixed, dataset-appropriate constants; the paper
   fixes $\theta = 3.84\sigma^2$ for epipolar geometry and $\theta =
   5.99\sigma^2$ for homography with $\sigma=0.3$ in experiments (§4) — a
   soft assumption inherited from the standard RANSAC/robust-statistics
   convention that these thresholds derive from a chi-squared error model.
3. Inner RANSAC's non-minimal inner-sample size ($\min(I_k/2, 14)$ or
   $\min(I_k/2, 12)$) is a heuristic cap, not derived analytically — a soft,
   empirically-tuned choice for the tested problems (§3, "Inner RANSAC").
4. The $O(\log k)$ bound on local-optimization invocation count assumes the
   per-sample inlier-count distribution is the same for every sample (i.i.d.
   draws) — stated explicitly: "This density function is the same for all
   samples, so the probability that $k$-th sample will be the best so far is
   $1/k$" (§2) — a modeling assumption, not something verified to hold under
   adversarial or highly structured outlier distributions. ? The paper notes
   the bound is only an upper bound because "the number of correspondences is
   finite and discrete."
5. Local optimization (methods 3 and 5) assumes no leverage points remain
   once points are filtered to the $K\theta$/$\theta$ band around a
   sample-consistent hypothesis (§3, "Observation 2") — valid only if the
   initial minimal-sample hypothesis is itself not badly outlier-corrupted;
   the method inherits ordinary RANSAC's minimal-sample outlier-freedom
   requirement at this first step.

# Failure regime

- Standard RANSAC systematically overruns its theoretically predicted sample
  count: across experiments A-E (Table 2, "eff" = actual/expected samples),
  standard RANSAC's efficiency ratio ranges from 2.63 to 3.35 (i.e., 2.6-3.3x
  more samples than theory predicts), attributed to the single-uncontaminated-
  sample assumption failing under noise (§1, §4).
- Method 2 (Simple) and method 4 (Inner RANSAC without iteration) are
  "inferior to methods with iteration (3 and 5 respectively) without any time
  saving advantage" (§4, closing paragraph) — non-iterative re-fitting alone
  underperforms; the iterative threshold-shrinking step is necessary for the
  gains.
- Method 5's resampling cost is a liability specifically when inlier
  fraction is high and total correspondence count is low: "Resampling... might
  be quite costly in the case of high number of inliers, especially if
  accompanied by a small number of correspondences" — demonstrated in
  experiment A (61% inliers out of only 94 correspondences), where method 3
  was fastest instead of method 5 (§4).
- The paper explicitly does not test degenerate-configuration handling,
  guided sampling, or non-uniform sampling — it states its improvement "does
  not interfere with other modifications of the algorithm, the MLESAC,
  R-RANSAC and NAPSAC" (§1), implying those failure modes (degenerate data,
  non-uniform inlier structure) are out of scope and left to be combined
  with LO-RANSAC rather than addressed by it.

# Numerical sensitivity

- Per-experiment characteristics (Table 1): experiments A-E have 94, 94,
  1500, 160, 94 correspondences with inlier fractions $\varepsilon$ = 61%,
  29%, 32%, 19%, 18% respectively, and theoretically-expected sample counts
  ranging from 115 (A) to 34,529 (B) — the theoretical sample count is highly
  sensitive to $\varepsilon$ (roughly $\varepsilon^{-m}$ scaling per Eq. 2),
  which is why low-inlier-fraction experiment B needs ~300x more samples
  than high-inlier-fraction experiment A.
- Table 2 quantifies the accuracy/speed gain per method across experiments;
  representative rows: experiment B inlier count rises from 23.3 (standard)
  to 25.7 (method 5) with sample count dropping from 90,816 to 39,886 (more
  than 2x fewer samples) and time from 3.911s to 1.731s; experiment C:
  423.5→474.9 inliers, 25,205→9,916 samples, 4.114s→1.850s.
- Method 5's efficiency ratio approaches the theoretical optimum: "the
  efficiency of method 5 is almost 1" (§5, Conclusions) — e.g. experiment A
  eff = 1.01, experiment B eff = 1.16, vs. standard RANSAC's 3.35 and 2.63
  respectively (Table 2).
- Table 3 confirms the $O(\log k)$ local-optimization-invocation bound
  empirically: e.g. experiment C shows method-5 average invocation count 6.5
  against a $\log(\text{avg. samples})$ value of 9.2 — the empirical count
  stays below the logarithmic bound across all five experiments and five
  methods reported.
- Reported speed-up: "In all experiments, the running-time is reduced by a
  factor of at least two" (§5, Conclusions), consistent with the abstract's
  "two to three fold" and "10-20%" more inliers claims.

# Applicability

- Use when: RANSAC-based two-view geometry (or any minimal-sample robust
  estimation problem) needs faster convergence and/or a higher-quality
  (more-complete inlier set) final model without extra input information or
  changing the outer sampling scheme (§1, "requires no extra input
  information").
- Don't use when: minimal-sample model hypotheses are so poor that no
  useful "so-far-the-best" sample ever forms a good starting point for local
  refinement (i.e., extremely low or highly structured/degenerate inlier
  configurations) — not evaluated in this paper's experiments (all five use
  ordinary wide/short-baseline stereo or homography image pairs, §4).
- Compared against (paper's own framing, §1): explicitly compatible with,
  not competing against, MLESAC (Torr & Zisserman), R-RANSAC (Chum & Matas
  2002), and NAPSAC (Myatt et al.) — "it does not interfere with other
  modifications of the algorithm." Direct experimental baseline is standard
  RANSAC (method 1 in Tables 2-3).

# Connections

- Builds on: [fischler1981-ransac] — "The RANSAC algorithm introduced by
  Fishler and Bolles in 1981 is possibly the most widely used robust
  estimator in the field of computer vision" (§1, opening).
- Builds on (cited, not registered in index.yaml): Torr's 7-point algorithm
  and PhD thesis [13]; Hartley's 8-point algorithm [4]; Torr & Zisserman's
  MLESAC [14]; Chum & Matas's R-RANSAC / randomized $T(d,d)$ test [1]; Myatt
  et al.'s NAPSAC [8]. ? None registered in `docs/papers/index.yaml`, left
  as prose only.
- Enables: not stated in-paper (2003 publication; the paper does not
  discuss forward influence on later RANSAC variants such as USAC or
  MAGSAC, which postdate it).
- Refutes / supersedes: none claimed — the paper explicitly states its
  modification "makes no new assumptions about the data" and is compatible
  with (not a replacement for) contemporary RANSAC variants (§1, Abstract).

# Atlas update plan

## NEW: lo-ransac
Type: algorithm
Category: robust-estimation
Primary source: this paper
Bullets per public-page section:
- Goal: reduce RANSAC's sample count and improve solution quality by
  correcting the false assumption that a minimal-sample model is consistent
  with all inliers (§1, §2).
- Algorithm: Algorithm 1 (§2) — standard RANSAC loop + local optimization on
  every new best model; five compared optimization variants (Standard,
  Simple, Iterative, Inner RANSAC, Inner RANSAC with iteration, §3); the
  $O(\log k)$ invocation-count bound (§2).
- Implementation: note method 5 (Inner RANSAC with iteration) as the
  paper's recommended default, with method 3 (Iterative) as a faster
  alternative when the inlier fraction is high (§4, closing paragraph).
- Remarks: quantified 2-3x speed-up and 10-20% more inliers vs. standard
  RANSAC (Abstract; Table 2); efficiency ratio near 1.0 for method 5 vs.
  2.6-3.35 for standard RANSAC (Table 2, §5).
- References: this paper (primary); fischler1981-ransac (foundational
  algorithm this improves on).

## UPDATE: ransac
Section: Where it appears / extensions
Bullets to add:
- Add LO-RANSAC as the earliest widely-cited local-optimization extension:
  identifies that the standard termination model (Eq. 1-2) assumes a
  minimal-sample-consistent model matches all inliers, which fails in
  practice, and fixes this by refining the model (via one of five tested
  strategies) whenever a new best inlier count is found, with only
  $O(\log k)$ extra refinement steps over a run (§1, §2).

## UPDATE: fischler-bolles-ransac
Section: Relations / Where it appears
Bullets to add:
- LO-RANSAC's own framing: "The RANSAC algorithm introduced by Fishler and
  Bolles in 1981 is possibly the most widely used robust estimator..." (§1).
  Candidate `extended_by` edge (Fischler-Bolles → LO-RANSAC): LO-RANSAC adds
  a local-refinement step without replacing the base algorithm or changing
  its data assumptions ("makes no new assumptions about the data," Abstract)
  — propose confidence high at page-authoring time; not committed here per
  plan.

## UPDATE: raguram-usac
Section: Relations / Where it appears
Bullets to add:
- No direct paper-stated relation (LO-RANSAC 2003 predates USAC and neither
  paper names the other). USAC's published framework explicitly incorporates
  local optimization as one of its pluggable stages, drawing on this paper's
  method — candidate `feeds_into` edge (LO-RANSAC → USAC) to confirm against
  USAC's own note/positioning at page-authoring time; not confirmed here
  since it is not evidenced by an in-paper quote from *this* paper (LO-RANSAC
  cannot cite a paper published after it).

## UPDATE: barath-magsac
Section: Relations / Where it appears
Bullets to add:
- No direct paper-stated relation (chronology precludes it: LO-RANSAC 2003
  predates MAGSAC). If MAGSAC's own note states it builds on or compares
  against local optimization, record a candidate relation there instead;
  flagged here only as a pointer, not a proposed edge on this side.

# Provenance

- Abstract: "two to three fold" speed-up, "10-20%" inlier increase claims.
- §1 (Introduction): RANSAC application domains list; termination-assumption
  critique; three main contributions (a)-(c); compatibility claim with
  MLESAC/R-RANSAC/NAPSAC.
- §2 (Algorithm): Eqs. 1-2 (termination criterion, $P_I$); Algorithm 1 (LO-
  RANSAC pseudocode); $\log k + 1$ expected-invocation-count derivation.
- §3 (Local Optimization Methods): five method definitions (Standard,
  Simple, Iterative, Inner RANSAC, Inner RANSAC with iteration); inner-sample
  size heuristics ($\min(I_k/2,14)$ / $\min(I_k/2,12)$, 10 repetitions);
  Observation 1 (Fig. 1 sample-size experiment); Observation 2 (leverage-point
  argument).
- §4 (Experimental Results): experiment descriptions A-E (Figs. 3-4);
  $\theta = 3.84\sigma^2$ (epipolar) / $5.99\sigma^2$ (homography), $\sigma =
  0.3$, $\eta < 0.05$; Table 1 (correspondence/inlier/sample counts per
  experiment); Table 2 (per-method inlier/sample/time/efficiency numbers);
  Table 3 (local-optimization invocation counts vs. $\log k$ bound); Fig. 2
  (inlier-count histograms).
- §5 (Conclusions): summary claims — "at least two" times speedup, method-5
  efficiency "almost 1."
