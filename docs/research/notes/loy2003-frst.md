---
paper_id: loy2003-frst
title: "Fast radial symmetry for detecting points of interest"
authors: ["Gareth Loy", "Alexander Zelinsky"]
year: 2003
url: https://ieeexplore.ieee.org/document/1217601
created: 2026-05-03
relevant_atlas_pages: [loy-fast-radial-symmetry, image-gradient]
---

# Setting

**Problem class:** Point-of-interest (keypoint) detection in grayscale images. Specifically, detecting pixels exhibiting high radial symmetry — i.e., centres of approximately circular structures such as eyes, blobs, circular calibration markers, or any high-contrast radially-symmetric pattern.

**Inputs:**
- A grayscale image $I: \Omega \to \mathbb{R}$, $\Omega \subset \mathbb{Z}^2$.
- A set of detection radii $N = \{n_1, n_2, \ldots\}$ in pixels, chosen to match the expected feature scale.
- A radial strictness parameter $\alpha \geq 1$, a gradient magnitude threshold $\beta \geq 0$, and a Gaussian kernel specification for each radius.

**Outputs:**
- A real-valued symmetry map $S: \Omega \to \mathbb{R}$ where large positive values correspond to bright radially-symmetric regions and large negative values to dark radially-symmetric regions.
- Local maxima (or minima) of $S$ are the detected points of interest.

**Guarantees:** No false-positive bound is stated; the transform is a voting-based soft detector. Complexity is $O(K \cdot |N|)$ for a $K$-pixel image, linear in the number of radii considered.

# Core idea

At each radius $n$, every pixel $p$ casts two "votes" along its gradient direction: a positive vote at the pixel one radius ahead in the gradient direction ($p^{+}(p)$) and a negative vote at the pixel one radius behind ($p^{-}(p)$). Two projection images, $O_n$ (orientation count) and $M_n$ (gradient magnitude sum), accumulate these votes. Because a radially-symmetric structure causes all surrounding gradient vectors to point inward (or outward), the projection images show a large coherent count at the structure's centre. The symmetry contribution at radius $n$ is formed by combining the normalised $O_n$ and $M_n$ maps, raising the orientation count to a power $\alpha$ to penalise non-radial votes, and then convolving with a small Gaussian kernel $A_n$ that spreads each vote's influence proportional to $n$. Contributions across all radii are summed to produce the final map $S$. Because only a gradient image is needed and every pixel is processed in a single pass, the algorithm avoids the expensive neighbourhood integration of earlier symmetry transforms.

# Assumptions

1. **Gradient orientation is meaningful** (soft): the image must have sufficient texture/contrast at feature locations so that gradient vectors reliably point toward or away from the feature centre. Uniform-intensity blobs fail (hard: no votes cast, feature missed silently).
2. **Features are approximately radially symmetric** (hard): the method is designed for circular structures. Elongated or non-symmetric features produce diffuse, attenuated responses.
3. **Feature scale is known or bounded** (soft): the set of radii $N$ must include values that bracket the feature size. Features entirely outside $[\min N, \max N]$ are missed or detected weakly.
4. **Single-channel input** (hard): the original formulation operates on a scalar gradient magnitude and orientation; extension to multi-channel images requires a channel-fusion step not described in the paper.
5. **Non-zero gradient at feature boundary** (soft): the gradient threshold $\beta$ discards small-magnitude gradients. If the feature boundary has very low contrast relative to $\beta$, votes are suppressed (graceful degradation).
6. **Integer pixel coordinate rounding** (soft): $p^{\pm}(p)$ are found by rounding the gradient unit vector to the nearest integer. At oblique angles this introduces a quantisation error of up to $\approx 0.41$ pixels per vote, which blurs the accumulation maps slightly.

# Failure regime

- **Large uniform regions / low-contrast images:** no gradient votes are cast in the interior; $O_n$ and $M_n$ remain near zero even with $\beta = 0$. The transform produces a flat, uninformative $S$ map.
- **Elongated structures (edges, lines):** gradient vectors along an edge all point in the same perpendicular direction, so their positive-affected pixels land on a line parallel to the edge, not at a single centre. Response is diffuse rather than peaked. Setting $\alpha \geq 2$ suppresses this but does not eliminate it for very strong edges.
- **Multiple overlapping features at the same scale:** projection images superpose votes from both features. If the two feature centres are within $\sim 2n$ pixels, the combined $O_n$ and $M_n$ peaks merge and localisation degrades.
- **Highly cluttered backgrounds:** off-target gradient elements produce a non-zero "background" in $S$, raising the detection threshold needed to suppress false positives. The $\beta$ threshold helps but cannot fully separate signal from a high-density background.
- **Non-circular calibration targets at large radii:** the round-to-integer step becomes the dominant error source when $n$ is small ($n \leq 2$). At $n = 1$, only 4–8 distinct integer offset directions exist, making the orientation count coarsely quantised.

# Numerical sensitivity

- **Normalisation by $\max\|O_n\|$ and $\max\|M_n\|$:** if the image has very few strong-gradient pixels (sparse scene), the maximum can be taken over a small set, causing numerical noise in the normalised maps to be amplified. The paper does not discuss this edge case.
- **Radial strictness $\alpha$:** the $\alpha$-th power of the normalised orientation count is computed. With $\alpha = 2$ (recommended) this is a squaring, which is well-conditioned. $\alpha = 3$ cubes a value in $[-1, 1]$; floating-point precision is sufficient. Larger $\alpha$ risks underflow near zero.
- **Gaussian kernel size:** the paper specifies standard deviation $\sigma = 0.5n$ and kernel support $n \times n$ (Table 1 in the cache). At small $n$ (e.g., $n = 1$), the kernel collapses to a $1\times 1$ delta — no spatial spreading occurs. This is correct behaviour but means single-radius detection at $n = 1$ is maximally sensitive to gradient quantisation noise.
- **Gradient magnitude scale:** $M_n$ accumulates raw gradient magnitudes (e.g., from a Sobel kernel, which outputs values in $[-4 \times 255, +4 \times 255]$ for 8-bit images). No absolute normalisation is imposed across images; the $S$ map's absolute scale depends on the image's overall gradient strength. Only relative comparisons within one image are meaningful.
- **32-bit float sufficiency:** all operations (integer accumulation in $O_n$, float accumulation in $M_n$, Gaussian convolution, power operation) are well within 32-bit float precision for typical image sizes (up to $\sim 10^7$ pixels). No 64-bit arithmetic is required.

# Applicability

- **Use when:** detecting approximately circular blobs or radially-symmetric keypoints (eyes, ring targets, circular calibration markers, pupil centres) at a known or bounded scale range; real-time or near-real-time constraints apply (complexity $O(KN)$); both dark-on-light and light-on-dark features must be detected in a single pass.
- **Don't use when:** the features of interest are corners (use Harris or Shi-Tomasi), elongated features (use edge detectors), or when sub-pixel localisation accuracy $< 0.5$ px is required without additional refinement (the integer rounding of $p^{\pm}$ limits intrinsic localisation). Also avoid when the feature scale is entirely unknown and a full-scale search would require $|N|$ comparable to the image size.
- **Compared against:** Reisfeld's generalised symmetry transform (complexity $O(KN^2)$, better theoretical foundation but ~13–33× slower per Table 2 in the cache), circular Hough transform (complexity $O(KBN)$ with $B$ gradient bins, ~4× slower per Table 2), Sela & Levine real-time attention mechanism (complexity $O(KBN)$, requires gradient quantisation), Di Gesù et al. discrete symmetry transform (complexity $O(KB)$, no neighbourhood radius sensitivity).

# Connections

- Builds on: [] (no prior paper IDs registered in this atlas; related works are cited by author name — see Remarks in Atlas update plan)
- Enables: [] (downstream: FRST is used as an interest-point seed in active vision and calibration pipelines, but no specific later papers are registered yet)
- Refutes / supersedes: [] (the paper positions FRST as a faster alternative to, not a refutation of, Reisfeld et al.)

# Atlas update plan

## NEW: loy-fast-radial-symmetry

Type: algorithm
Category: `feature-detection` (same tags as harris-corner-detector and fast-corner-detector; FRST is a generic interest-point / keypoint detector, not a corner detector, but no separate `keypoint-detector` category exists on the site — `feature-detection` is the correct fit)
Primary source: loy2003-frst

**Goal:**
Detect pixels of high radial symmetry in a grayscale image — centres of approximately circular structures (blobs, eyes, ring targets, circular calibration markers) where gradient vectors from surrounding pixels coherently point toward or away from the centre. Output is a real-valued symmetry map $S$ whose local maxima (bright regions) and minima (dark regions) identify points of interest. The method is designed for speed: $O(K \cdot |N|)$ for a $K$-pixel image with $|N|$ detection radii, with no gradient quantisation or neighbourhood convolution loops required.

**Algorithm:**
The transform is computed over a user-chosen set of radii $N = \{n_1, n_2, \ldots\}$. At each radius $n$, the image gradient $\mathbf{g}(p)$ (computed with, e.g., the Sobel operator) is evaluated at every pixel $p$. Each gradient element votes to two affected pixels:

$$
p^{+}(p) = p + \mathrm{round}\!\left(\frac{\mathbf{g}(p)}{\|\mathbf{g}(p)\|}\, n\right), \quad
p^{-}(p) = p - \mathrm{round}\!\left(\frac{\mathbf{g}(p)}{\|\mathbf{g}(p)\|}\, n\right),
$$

where $p^{+}$ is the positively-affected pixel (ahead in the gradient direction at distance $n$) and $p^{-}$ is the negatively-affected pixel (behind, at distance $n$). Two projection images — the orientation projection $O_n$ and the magnitude projection $M_n$, both initialised to zero — are updated:

$$
O_n(p^{+}) \mathrel{+}= 1, \quad O_n(p^{-}) \mathrel{-}= 1, \quad
M_n(p^{+}) \mathrel{+}= \|\mathbf{g}(p)\|, \quad M_n(p^{-}) \mathrel{-}= \|\mathbf{g}(p)\|.
$$

Gradients with magnitude below threshold $\beta$ are skipped. The symmetry contribution at radius $n$ is:

$$
S_n = F_n \ast A_n, \quad \text{where} \quad
F_n(p) = \left|\tilde{O}_n(p)\right|^{\alpha} \tilde{M}_n(p),
$$

with $\tilde{O}_n = O_n / \max_p\|O_n\|$ and $\tilde{M}_n = M_n / \max_p\|M_n\|$ being normalised maps, $\alpha$ the radial strictness parameter, and $A_n$ a 2-D Gaussian of size $n \times n$ and standard deviation $\sigma = 0.5n$. The full transform accumulates contributions across all radii:

$$
S = \sum_{n \in N} S_n.
$$

Positive values of $S$ correspond to bright radially-symmetric regions; negative values to dark ones (assuming gradient points from dark to light).

**Implementation:**
- **Parameter selection:** $\alpha = 2$ is suitable for most applications (eliminates line responses while preserving circular-feature responses); $\alpha = 1$ minimises computation. $\beta \approx 20\%$ of the maximum gradient magnitude gives a good speed/quality trade-off (per Table 1 in the paper).
- **Gaussian kernel:** use a 2-D Gaussian of size $n \times n$ and $\sigma = 0.5n$ as specified by the paper. At $n = 1$ this collapses to a $1 \times 1$ kernel (no smoothing); increase $n$ to spread votes over a meaningful arc.
- **Multi-radius strategy:** computing $S$ at a representative sparse subset (e.g., $\{1, 3, 5\}$ instead of $\{1, 2, 3, 4, 5\}$) gives a close approximation while roughly halving computation (see Figure 2 in the paper). Use a continuous range only when fine scale-resolution is required.
- **Polarity control:** to detect only dark regions, accumulate only the negatively-affected pixels when updating $O_n$ and $M_n$; for bright-only detection use only positive-affected pixels. Both polarities can be computed in a single pass at no extra gradient evaluation cost.
- **Complexity:** $O(K \cdot |N|)$ where $K$ is the number of image pixels and $|N|$ is the number of radii; the Gaussian convolution per radius adds an $O(K)$ term with a kernel-size constant.
- **Working implementation:** the `@vitavision/radsym` WASM package exposes FRST as the `radsym` algorithm in the editor.

**Remarks:**
FRST was inspired by the *generalised symmetry transform* of Reisfeld, Wolfson, and Yeshurun (1995), which also uses gradient orientation to vote for symmetry centres but requires explicit pairwise comparison of all gradient elements within a neighbourhood, yielding $O(KN^2)$ complexity. Sela and Levine's *real-time attention mechanism* (1997) is closer in spirit — it also projects gradient effects to affected pixels — but requires gradient quantisation into discrete angular bins ($B$ bins, complexity $O(KBN)$). The *circular Hough transform* (Kimme, Ballard, Sklansky 1975; Minor and Sklansky 1981) is conceptually similar (edge-pixel voting into a 2-D accumulator at radius $r$) but also requires angular quantisation, giving $O(KBN)$. FRST's key improvement over all three is that it processes all gradient orientations in a single continuous pass without binning, because the two affected pixels are computed directly from the unit gradient vector rather than looked up in a quantised table. The bidirectional vote (positive and negative affected pixels) simultaneously allows detection of both dark-on-light and light-on-dark features without a separate pass, which distinguishes it from single-direction Hough-style accumulators.

**References:**
- Loy, G. & Zelinsky, A. "Fast radial symmetry for detecting points of interest." *IEEE TPAMI* 25(8), 2003. DOI: 10.1109/TPAMI.2003.1217601
- Reisfeld, D., Wolfson, H., Yeshurun, Y. "Context free attentional operators: the generalized symmetry transform." *IJCV* 14:119–130, 1995.
- Sela, G. & Levine, M. D. "Real-time attention for robotic vision." *Real-Time Imaging* 3:173–194, 1997.
- Minor, L. G. & Sklansky, J. "Detection and segmentation of blobs in infrared images." *IEEE Trans. SMC* SMC-11(3):194–201, 1981.

## UPDATE: image-gradient

Section: `# Where it appears`
Bullet to add:
- **loy-fast-radial-symmetry** — votes along the gradient orientation $\hat{\mathbf{g}}(p) = \mathbf{g}(p)/\|\mathbf{g}(p)\|$ at each pixel; positive- and negatively-affected pixels at distance $n$ accumulate magnitude and orientation contributions, yielding a symmetry-contribution map per radius.

# Provenance

> **Note on cache version:** the cached file at `docs/papers/.cache/loy2003-frst.txt` is the freely available **ECCV 2002 conference paper** (Loy & Zelinsky, Springer LNCS 2350), not the 2003 TPAMI journal version (which is paywalled). The algorithmic core, equations, and parameter discussion are identical between the two versions. All citations below reference the conference paper as read. Journal-only content (extended experiments, additional comparisons) is not claimed.

- **Algorithm overview, $O(KN)$ complexity:** §1 Introduction, p. 1, lines 43–44: "Computationally the algorithm is very efficient, being of order O(KN) when considering local radial symmetry in N×N neighbourhoods across an image of K pixels."
- **Affected pixel coordinates (Eq. for $p^+$, $p^-$):** §2 "Definition of the Transform", p. 2, equations following "The coordinates of the positively-affected pixel are given by" (lines 88–98 of cache).
- **Orientation and magnitude projection update rules ($O_n$, $M_n$):** §2, p. 2–3, equations at lines 105–114 of cache.
- **Symmetry contribution formula $S_n = F_n \ast A_n$, Eq. (1):** §2, p. 3, equation (1) and (2), lines 118–127 of cache.
- **Full transform sum $S = \sum_{n \in N} S_n$, Eq. (3):** §2, p. 3, equation (3), line 139 of cache.
- **Positive = bright / negative = dark convention:** §2, p. 3: "If the gradient is calculated so it points from dark to light then the output image S will have positive values…" (lines 143–145 of cache).
- **Gaussian kernel parameters ($\sigma = 0.5n$, size $n \times n$):** §3 "Applying the Transform" and Figure 3 caption, p. 3–4: "a 2D Gaussian of size n × n and standard deviation σ = 0.25n" (Figure 3 caption, line 195). Note: Table 1 (p. 6, line 259) gives standard deviation 0.5n for the experimental settings; Figure 3 caption states 0.25n for the illustration; the implementation note in the Atlas update plan uses 0.5n from Table 1 as the operative value.
- **$\alpha$ recommendation ($\alpha = 2$):** §3, p. 4: "A choice of α = 2 is suitable for most applications." (lines 202–203 of cache).
- **$\beta$ parameter and effect:** §3, p. 5, lines 215–224 of cache; Figure 5 shows $\beta = 0, 20\%, 40\%$.
- **Polarity (dark/bright) control:** §3, p. 5, lines 232–237 of cache.
- **Experimental parameter table (Table 1):** §4, p. 6, lines 251–263 of cache — radii $\{1,2,\ldots,6\}$ (Full) or $\{1,3,5\}$ (Fast), $\alpha = 2$, $\sigma = 0.5n$, $\beta = 0$ or $20\%$.
- **Computation comparison (Table 2, Table 3):** §4, p. 7, lines 296–354 of cache — FRST Full 19.7 Mflop vs Reisfeld Generalised Symmetry 179–259 Mflop; complexity table confirms $O(KN)$ for FRST vs $O(KN^2)$, $O(KBN)$, $O(KB)$ for others.
- **Related work (Reisfeld, Sela & Levine, circular Hough):** §1, p. 1, lines 33–35: "The approach was inspired by the results of the generalised symmetry transform [8, 4, 9], although the method bares more similarity to the work of Sela and Levine [10] and the circular Hough transform [5, 7]."
- **References [7] (Minor & Sklansky), [8] (Reisfeld et al.), [10] (Sela & Levine):** References section, p. 7–8, lines 403–410 of cache.
- **Sparse-radius approximation quality:** §3, p. 3–4: "the results obtained by examining a representative subset of ranges give a good approximation of the output obtained by examining a continuous selection of ranges" (lines 168–170 of cache); Figure 2 caption confirms $\{1,3,5\}$ closely approximates $\{1,\ldots,5\}$.
