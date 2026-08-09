---
title: "Stereo Rectification"
date: 2026-07-19
summary: "Warping a stereo pair so corresponding epipolar lines become collinear image rows, reducing dense correspondence to a scanline search; calibrated Euclidean methods and uncalibrated projective methods solve the same problem under different input assumptions."
tags: ["stereo", "two-view-geometry", "survey"]
author: "Vitaly Vorobyev"
domain: geometry
difficulty: advanced
prerequisites: [epipolar-geometry, homography, pinhole-camera-model, pose-estimation]
sources:
  references:
    - hartley1999-projective-rectification
    - loop1999-rectifying-homographies
    - pollefeys1999-polar-rectification
    - fusiello2000-compact-rectification
    - hartley1997-eight-point
---

# Definition

Stereo rectification is the geometric preprocessing step that resamples a two-view image pair, related by a known epipolar geometry, so that every pair of conjugate epipolar lines maps to a single common image row. After rectification, the general search along an arbitrary epipolar line implied by the fundamental-matrix constraint (see [epipolar geometry](/atlas/epipolar-geometry)) collapses to a 1-D horizontal scanline search; if the rig is also metrically calibrated, per-pixel horizontal disparity converts directly to depth.

:::definition[Rectified pair]
Two images $\hat I, \hat I'$, related to the originals by resampling maps $\hat{\mathbf x} = \phi(\mathbf x)$, $\hat{\mathbf x}' = \phi'(\mathbf x')$, are **rectified** when every pair of conjugate points $\mathbf x \leftrightarrow \mathbf x'$ satisfies

$$
\hat y = \hat y',
$$

i.e. corresponding points fall on the same image row, equivalently every epipolar line maps to a horizontal line $v = \text{const}$. For three of the four methods below, $\phi$ and $\phi'$ are $3\times3$ projective homographies $H, H'$; for the fourth, $\phi$ is a nonlinear per-pixel polar remap.
:::

Four methods, published within a sixteen-month window (1999–2000), instantiate this requirement under four different assumptions about what is known about the cameras in advance: nothing beyond the fundamental matrix $F$ estimated from point correspondences (Hartley 1999, Loop-Zhang 1999); $F$ plus its sign orientation (Pollefeys 1999); or full metric calibration — both perspective projection matrices (Fusiello 2000). A homography can represent the rectifying map only when the epipole can be sent to a point at infinity without discarding part of the view window; when the epipole lies inside the window, no homography can do this without an unboundedly large output, which is why Pollefeys' method abandons the homography representation entirely in favor of a bounded, nonlinear remap.

# Decision table

| | Hartley 1999 | Loop-Zhang 1999 | Pollefeys 1999 | Fusiello 2000 |
|---|---|---|---|---|
| **Calibration required** | none — fundamental matrix $F$ only | none — $F$ (or $E$, if available) only | none — oriented $F$ (one extra point match for sign) | full — both projection matrices $\tilde P_{o1}, \tilde P_{o2}$ (intrinsics + pose) known |
| **Epipole location** | must lie **outside** the view window (Theorem 5.7's hypothesis); inside-window case has no proved construction | not discussed by the paper; construction implicitly targets the outside-window case, like Hartley's | designed for **either** location, including inside the window — the paper's stated target case | epipole always sent to infinity by construction; fails only under pure forward motion (optical axis $\parallel$ baseline) |
| **Rectifying map** | pair of $3\times3$ homographies $H, H'$ | pair of $3\times3$ homographies $H = H_sH_rH_p$, $H' = H_s'H_r'H_p'$ | nonlinear per-row polar remap around each epipole — no single matrix | pair of $3\times3$ homographies $T_1 = Q_{n1}Q_{o1}^{-1}$, $T_2 = Q_{n2}Q_{o2}^{-1}$ |
| **What is minimized** | horizontal disparity between conjugate points (linear least squares) | projective + affine distortion (closed-form stages + one iterative degree-7 root-find) | nothing — a geometric guarantee of bounded, pixel-lossless output | nothing — orientation is fixed by the baseline and a reference viewing direction, not an optimum |
| **Output shape** | rectangular; grows without a fixed bound as the epipole approaches the window | rectangular | non-rectangular; bounded purely by source size: height $\le 2(W+H)$, width $\le \sqrt{W^2+H^2}$ | rectangular |
| **Geometric result** | projective — no metric depth | projective | projective — topological guarantee only | Euclidean — metric depth recoverable, $Z = fB/d$ |
| **Closed form?** | yes, once $H'$ is fixed (linear affine least-squares fit) | mostly — one stage requires an iterative degree-7 polynomial root-find | yes — pure geometric construction, no optimization | yes — direct 22-line construction |

# How the four methods differ

## Hartley 1999 - uncalibrated, minimum-disparity

Given $F$ (estimated linearly from $\ge 8$ correspondences), Hartley factors rectification into two sequential stages. First, a transform $H' = GRT$ is built for the second image: a translation $T$ centers a chosen reference point at the origin, a rotation $R$ aligns the epipole $\mathbf p'$ with the $x$-axis, and a perspectivity $G$ sends the aligned epipole to the point at infinity $(f, 0, 0)^\top$. $G$ is chosen, rather than an arbitrary epipole-to-infinity map, because its Jacobian at the origin is the identity to first order, so $H'$ behaves like a rigid transform near the reference point and does not grossly distort its neighborhood. Second, the family of homographies of the first image that preserve epipolar-line correspondence with this $H'$ is characterized in closed form (Theorem 4.5); once $H'$ sends the epipole exactly to the canonical point at infinity, this family collapses (Corollary 4.6) to an affine correction $A$ applied to a fixed base map, whose three free parameters are fixed by minimizing $\sum_i (a\hat u_i + b\hat v_i + c - \hat u_i')^2$ over the matched points — a linear least-squares problem specifically because $A$ is restricted to be affine rather than general projective; the paper notes explicitly that a general projective $A$ would not admit a linear solution.

The construction is proved valid only when the epipole lies outside the view window: Theorem 5.7's hypothesis is exactly "the epipole $\mathbf p'$ in image $J'$ does not lie in $W'$," and under that hypothesis the paper proves the matching transform $H$ is *quasi-affine* — it sends no point of a convex sub-window to the line at infinity — on some sub-window $W_+ \subseteq W$. The paper proves nothing about the epipole-inside-window case; its own text offers only an informal remedy — shrink the view window, or choose a different projectivity — with no guarantee that a valid full-window solution exists.

## Loop-Zhang 1999 - uncalibrated, minimum-distortion

Also assumes $F$ known in advance and also produces a homography pair, but factors each one differently: $H = H_sH_rH_p$, a projective stage, then a similarity stage, then a shearing stage, chosen to minimize distortion explicitly rather than disparity. $H_p$ sends the epipole to infinity while staying "as affine as possible," selected from a one-parameter family of admissible directions by minimizing the variance of a per-pixel projective weight around its value at the image center, summed over both images as two Rayleigh-quotient-like terms; this joint two-image criterion is not closed-form — its stationary condition is a degree-7 polynomial, solved iteratively from an initial guess given by the two single-image closed-form solutions (each a generalized-eigenvector problem). $H_r$ then rotates the now-infinite epipole into the canonical direction and finds a shared translation aligning the two images' scanlines; $H_s$ spends the one remaining degree of freedom on a shear that preserves the perpendicularity and aspect ratio of the quadrilateral formed by the image's edge midpoints, without disturbing the rectification already achieved, because a shear affects only the $u$-coordinate.

Loop & Zhang's own text states plainly that this construction cannot reach zero distortion in general — "we cannot have identical weights in general (except when the epipole is already at $\infty$)" — so some residual projective distortion is structurally unavoidable in their construction too. Their paper neither discusses nor cites the in-image-epipole case, and its five-entry bibliography contains no Hartley citation at all: any framing that contrasts Hartley's disparity-minimizing criterion against Loop-Zhang's distortion-minimizing criterion is this survey's synthesis of two independently stated design goals, not a claim either paper makes about the other.

## Pollefeys 1999 - polar, handles in-image epipoles

Targets exactly the regime the two planar methods leave unresolved: the epipole inside the view window (forward or near-forward motion). A planar homography cannot handle this case in the limit, because sending an in-window epipole to infinity would require an unboundedly large output. Pollefeys states the failure of the classical planar approach directly: "This approach fails when the epipoles are located in the images since this would have to result in infinitely large images. Even when this is not the case the image can still become very large (i.e. if the epipole is close to the image)." The fix is to never send the epipole to infinity at all: reparametrize each image in polar coordinates centered on its own epipole, so the epipole becomes the pole of the coordinate system rather than a point that must be pushed outward. Orientation is recovered from the fundamental matrix plus one extra point correspondence beyond the $\ge 7$ used to estimate $F$ itself, which restricts every epipolar line's ambiguity to a single positive half-line; the rectified image is then built row by row, one output row per angular sector, with the radial distance along each half epipolar line preserved unchanged. The angular step between consecutive rows is chosen independently per line, from a similar-triangle construction on the worst-case border pixel; the same computation is repeated in the other image and the smaller of the two candidate steps is used, which is what makes the guarantee of zero pixel loss hold simultaneously in both images. When the epipole itself lies inside the image, the angular sweep starts from an arbitrary line and extends past $360°$, overlapping by the size of the stereo-matching window, to avoid a seam artifact at the wrap-around.

Because the polar construction never maps anything to infinity, its output size is bounded purely by the source dimensions — height $\le 2(W+H)$, width $\le \sqrt{W^2+H^2}$ — independent of where the epipole sits. The cost is a non-rectangular, visibly warped output and a per-row lookup table for the inverse mapping, in place of a single $3\times3$ matrix.

## Fusiello 2000 - calibrated, Euclidean

Solves a different problem: rather than rectifying from point correspondences alone, it assumes both cameras are already calibrated, with both perspective projection matrices $\tilde P_{o1}, \tilde P_{o2}$ known. The new, rectifying cameras keep the same optical centers as the old ones — rectification only re-orients each camera about its own center, it never translates — and share a common orientation $R$ built as an orthonormal frame: the new $X$-axis along the baseline, $r_1 = (c_1 - c_2)/\lVert c_1 - c_2\rVert$; the new $Y$-axis $r_2 = k \wedge r_1$, orthogonal to both the baseline and an arbitrary reference direction $k$ (the paper's own implementation takes $k$ as the old left camera's viewing direction); and $r_3 = r_1 \wedge r_2$ completing the right-handed frame. Both new cameras also share a common intrinsic matrix $A$ (the reference implementation averages the two old intrinsic matrices and zeroes skew), which is what forces conjugate points onto the same row. Once the new projection matrices are fixed, rectifying either image reduces to a single $3\times3$ homography $T = Q_nQ_o^{-1}$ (leading $3\times3$ blocks of the new and old projection matrices) applied by bilinear-interpolated resampling — the entire construction is 22 lines of MATLAB, and the paper reports that triangulating directly from the rectified images introduces no appreciable loss of 3-D reconstruction accuracy relative to triangulating from the originals.

Because both cameras share intrinsics and a baseline-aligned $X$-axis, the result is a genuine Euclidean rectification, not merely a projective one: horizontal disparity $d$ between conjugate points converts directly to depth via $Z = fB/d$, where $f$ is the shared (rectified) focal length and $B$ the baseline length. The construction fails outright — the cross product defining the new $Y$-axis degenerates to zero — under pure forward motion, when the optical axis is parallel to the baseline; as the rig approaches that configuration, the axis normalization becomes numerically ill-conditioned well before the hard failure point.

# When to choose what

- **Calibrated rig available.** Use Fusiello 2000. It is the cheapest of the four (a 22-line closed-form construction), and it is the only one of the four that yields metric depth directly ($Z = fB/d$) rather than a projective result that must be upgraded separately. It fails only under pure forward motion.
- **Uncalibrated, epipole comfortably outside both view windows.** Choose between Hartley 1999 and Loop-Zhang 1999 by which stated design goal matters more downstream: Hartley's linear least-squares fit minimizes horizontal disparity, which shrinks the subsequent correspondence search range directly; Loop-Zhang's two-stage construction minimizes an explicit, quantifiable projective-plus-affine distortion criterion, which produces a visually less-warped rectified pair at the cost of one iterative polynomial solve. Neither paper argues the other case is wrong — the choice is a genuine tradeoff between search-range reduction and visual fidelity of the output.
- **Uncalibrated, forward or near-forward motion (epipole inside or very close to either view window).** Use Pollefeys 1999. It is the only one of the four with a proved bounded-output guarantee in this regime; Hartley 1999's own Theorem 5.7 explicitly excludes this case by hypothesis, and Loop-Zhang 1999 neither proves nor discusses a construction for it.
- **Calibrated pipelines, background practice not sourced from a primary paper reviewed here.** Bouguet's widely used toolbox variant (the basis of OpenCV's `stereoRectify`) splits Fusiello's shared rotation half-and-half between the two cameras, rather than anchoring the shared orientation to one camera's original axis as Fusiello's reference implementation does. Splitting the rotation halves the maximum per-camera reprojection distortion relative to fully rotating one camera to match the other. Bouguet's toolbox also exposes an `alpha` parameter trading off between showing every original pixel (introducing black borders in the rectified output) and cropping to a fully valid rectangular region (discarding some source pixels) — a valid-ROI concern the Fusiello paper itself does not address; its own experiments instead apply a manual, dataset-specific principal-point shift to keep the output centered in a fixed window.

# Numerical concerns shared across the family

- **$F$ must be estimated well before any of the three uncalibrated methods runs.** None of Hartley 1999, Loop-Zhang 1999, or Pollefeys 1999 estimates $F$ itself — all three take it as a given input, and in practice $F$ is produced by the normalized eight-point algorithm (Hartley 1997) applied to the same correspondence set used later for the rectifying fit. Un-normalized linear estimation of $F$ is severely ill-conditioned (condition number scaling with the square of the pixel-coordinate range); none of the four rectification papers reviewed here cites Hartley's 1997 normalization paper directly, but the eight-point estimation step it fixes is the standard upstream source of $F$ for all three uncalibrated methods.
- **Planar output size is a function of epipole proximity, not a fixed bound.** For Hartley 1999, and by the same geometric necessity for Loop-Zhang 1999 (though that paper does not discuss the point), the output size a homography-based rectification requires grows without a fixed bound as the epipole approaches the view window, because the rectifying homography must send the epipole toward infinity. Hartley's own remedy — shrinking the view window — is stated only informally, with no numerical bound on the required shrink given anywhere in the paper. Pollefeys' polar construction sidesteps the issue entirely by never mapping the epipole to infinity in the first place; Fusiello's calibrated construction sidesteps it because the epipole is sent to infinity purely by an orientation change, never a translation, and its only reported failure mode is a hard degeneracy (pure forward motion), not a gradual size blow-up.
- **The distortion-vs-disparity tradeoff is real, not free.** Hartley's linear fit optimizes for minimum disparity; Loop-Zhang's construction optimizes for minimum distortion but, by the authors' own admission, cannot reach zero distortion except in the degenerate case where the epipole already sits at infinity. Neither criterion dominates the other in general.
- **Projective vs. Euclidean rectification changes what downstream code may assume.** Only Fusiello's calibrated construction yields a metrically valid disparity-to-depth relationship ($Z = fB/d$). Code that assumes this relationship on output rectified by Hartley, Loop-Zhang, or Pollefeys is silently assuming calibration information those three methods never used.
- **Undistort and rectify should be composed into a single remap, not applied as two sequential resampling passes.** All four methods assume an already-rectilinear pinhole image; a lens-distorted input must be undistorted first. Because undistortion and rectification are each themselves per-pixel coordinate maps, composing them analytically into one lookup table and resampling once avoids compounding two independent rounds of interpolation blur from two sequential bilinear resamples.

# Where this concept appears

- [Hartley Projective Rectification](/atlas/hartley-projective-rectification) — the uncalibrated, minimum-disparity branch.
- [Loop-Zhang Rectifying Homographies](/atlas/loop-zhang-rectification) — the uncalibrated, minimum-distortion branch.
- [Pollefeys Polar Rectification](/atlas/pollefeys-polar-rectification) — the polar branch for in-image epipoles.
- [Fusiello Compact Rectification](/atlas/fusiello-compact-rectification) — the calibrated, Euclidean branch.
- [Epipolar geometry](/atlas/epipolar-geometry) — supplies the fundamental matrix, essential matrix, and epipole that every rectification method here consumes as input.
- [Homography](/atlas/homography) — the $3\times3$ projective map used to represent the rectifying transform in three of the four methods.

# References

1. R. I. Hartley. *Theory and Practice of Projective Rectification.* International Journal of Computer Vision 35(2):115–127, 1999. DOI: 10.1023/A:1008115206617
2. C. Loop, Z. Zhang. *Computing Rectifying Homographies for Stereo Vision.* IEEE CVPR, 1999, pp. I:125–131. DOI: 10.1109/CVPR.1999.786928
3. M. Pollefeys, R. Koch, L. Van Gool. *A Simple and Efficient Rectification Method for General Motion.* IEEE ICCV, 1999, pp. 496–501. DOI: 10.1109/ICCV.1999.791262
4. A. Fusiello, E. Trucco, A. Verri. *A Compact Algorithm for Rectification of Stereo Pairs.* Machine Vision and Applications 12(1):16–22, 2000. DOI: 10.1007/s001380050120
5. R. I. Hartley. *In Defense of the Eight-Point Algorithm.* IEEE Transactions on Pattern Analysis and Machine Intelligence 19(6):580–593, 1997. DOI: 10.1109/34.601246
