---
paper_id: horn1981-horn-schunck
title: "Determining optical flow"
authors: ["B. K. P. Horn", "B. G. Schunck"]
year: 1981
url: http://hdl.handle.net/1721.1/6337
created: 2026-05-13
relevant_atlas_pages: [lucas-kanade, image-gradient, structure-tensor, shi-tomasi-corner-detector]
---

# Setting

**Problem class:** Dense optical flow estimation — recovering a velocity vector $(u, v)$ at every pixel of an image from two or more consecutive frames of a grayscale image sequence.

**Inputs:**
- Grayscale image sequence $E(x, y, t)$, sampled on a square spatial grid with uniform time steps (Section 6).
- Brightness quantized to 256 levels in the experiments; method tolerates roughly 1% additive noise (Section 16).
- Spatial resolution of 32×32 in the reported experiments (Section 16); applicable to higher resolutions at increased iteration cost.
- No calibration assumed — the formulation is purely image-plane; 3-D geometry is not required.

**Outputs:**
- Dense 2-D flow field $(u_{i,j}, v_{i,j})$ at every picture cell, in units of picture cells per frame interval (Section 6, Fig. 6 caption: "velocity is 0.5 picture cells in the x direction and 1.0 picture cells in the y direction per time interval").
- No confidence map is produced; accuracy is highest where brightness gradient is large and varies in direction (Section 14).

# Core idea

The brightness constancy equation (derived in Section 4 and Appendix A) states that if a small patch of the image moves with velocity $(u, v)$, its brightness is conserved:

$$E_x u + E_y v + E_t = 0$$

where $E_x, E_y, E_t$ are the partial derivatives of image brightness with respect to $x$, $y$, and time $t$ (Section 4). This is one linear equation in two unknowns — the flow velocity lies on a constraint line in $(u, v)$-space; the component along the iso-brightness contour (perpendicular to the gradient $(E_x, E_y)$) is completely undetermined. This is the aperture problem (Section 4).

Horn and Schunck resolve the aperture problem by adding a global **smoothness prior**: minimize the squared magnitude of the spatial gradient of the flow field, $\|\nabla u\|^2 + \|\nabla v\|^2$ (Section 5). The combined variational energy to minimize over the whole image is (Section 9):

$$\mathcal{E}^2 = \iint \!\left(\alpha^2 \mathcal{E}_b^2 + \mathcal{E}_s^2\right) dx\, dy, \quad \mathcal{E}_b = E_x u + E_y v + E_t, \quad \mathcal{E}_s = \|\nabla u\|^2 + \|\nabla v\|^2$$

Applying the calculus of variations yields a pair of Euler-Lagrange equations; approximating the Laplacian $\nabla^2 u \approx K(\bar{u} - u)$ (where $\bar{u}$ is the weighted local average of $u$, and $K = 3$ for the 4-neighbor + diagonal stencil — Section 8) gives the closed-form iterative update (Section 12):

$$u^{n+1} = \bar{u}^n - \frac{E_x\!\left[E_x \bar{u}^n + E_y \bar{v}^n + E_t\right]}{\alpha^2 + E_x^2 + E_y^2}$$

$$v^{n+1} = \bar{v}^n - \frac{E_y\!\left[E_x \bar{u}^n + E_y \bar{v}^n + E_t\right]}{\alpha^2 + E_x^2 + E_y^2}$$

This is a Gauss-Seidel-style relaxation: new estimates at a point depend only on the *previous iteration's* local averages, not the point's own previous value (Section 12, note in brackets). Information propagates spatially across many iterations, filling uniform regions by solving the Laplace equation at the boundary (Section 13).

# Assumptions

1. **Brightness constancy** (hard): the apparent brightness of a point on the pattern remains constant as it moves — $dE/dt = 0$. Violated by illumination changes, specular reflections, or shading on rotating non-Lambertian objects (Section 2 explicitly notes the shading and specular exceptions). Failure is silent — the equation $E_x u + E_y v + E_t = 0$ simply has incorrect $E_t$.

2. **Small displacements** (soft, Taylor approximation): the first-order Taylor expansion used to derive the brightness-constancy equation (Appendix A) requires $\delta x, \delta y \ll 1$ (in grid units) within one frame interval. Large inter-frame motion breaks the linearization.

3. **Spatial smoothness of flow** (soft, breaks at boundaries): the smoothness prior $\|\nabla u\|^2 + \|\nabla v\|^2$ is physically justified for rigid-body motion and deformation, but "an algorithm based on a smoothness constraint is likely to have difficulties with occluding edges" (Section 5, verbatim). Smoothness degrades gracefully in interiors; it fails at motion discontinuities.

4. **Uniform illumination** (hard): the restricted problem domain assumes "incident illumination is uniform across the surface" (Section 3). Non-uniform illumination causes gradients that are not due to reflectance motion.

5. **No occlusions** (hard): "we exclude situations where objects occlude one another, in part, because discontinuities in reflectance are found at object boundaries" (Section 3). Occluding boundaries produce velocity discontinuities that the smoothness term will over-smooth.

6. **Differentiable brightness** (hard): the derivation requires $E$ to be differentiable; spatial discontinuities in reflectance are excluded in the basic formulation (Section 3).

# Failure regime

- **Large displacements:** The Taylor expansion in Appendix A becomes inaccurate when inter-frame displacement exceeds roughly 1 pixel. The method was tested only up to 1.0 picture-cell/frame displacement (Fig. 6 caption). Multi-scale (pyramid) extensions are needed for real-world motions.

- **Occlusion boundaries:** The global smoothness term over-regularizes flow discontinuities at object boundaries. The experiments on a rotating cylinder and sphere show that "the worst errors occur on the occluding boundary" where "the Laplacian for one of the velocity components becomes infinite on the occluding bound" (Section 17). The error is one-dimensional and shrinks as resolution increases (Section 17), but is never zero.

- **Uniform / low-gradient regions:** Where $E_x^2 + E_y^2 \approx 0$, the denominator $\alpha^2 + E_x^2 + E_y^2$ is dominated by $\alpha^2$ and the update is suppressed; velocities are filled in from surrounding regions via Laplace propagation (Section 13). The number of iterations required exceeds the number of picture cells across the largest uniform region (Section 13).

- **Illumination changes:** Violates brightness constancy (hard assumption 1). Gradient-based partial derivatives $E_t$ absorb both motion-induced and illumination-induced brightness change; the two are indistinguishable.

- **Repetitive textures with sub-pixel motion:** The finite-difference estimates of $E_x, E_y, E_t$ are derived at the center of a 2×2×2 spatial–temporal cube (Section 7); aliased or near-period textures produce unreliable gradient estimates even with correct displacement.

- **Slow convergence on large images:** Iteration count should exceed the largest uniform-region diameter (Section 13). On high-resolution images this can be O(hundreds) of iterations.

# Numerical sensitivity

**Gradient estimation — the 2×2×2 cube (Section 7):** $E_x$, $E_y$, $E_t$ are each estimated as "the average of four first differences taken over adjacent measurements in the cube" formed by the eight voxels $(i, i+1) \times (j, j+1) \times (k, k+1)$ (Section 7, Fig. 2). This makes all three partial derivatives consistent — referring to the same center point in space-time. Formulae with larger support are explicitly rejected because they are equivalent to applying small-support differences to pre-smoothed images (Section 7, citing [14]).

**Laplacian approximation — proportionality factor $K = 3$ (Section 8):** The local average $\bar{u}_{i,j,k}$ uses a weighted 3×3 stencil (Fig. 3); $\nabla^2 u = K(\bar{u} - u)$ with $K = 3$ when "the unit of length equals the grid spacing interval" (Section 8). Using a different grid spacing would rescale $K$.

**Smoothness weight $\alpha^2$ (Section 9):** "Should be roughly equal to the expected noise in the estimate of $E_x^2 + E_y^2$" (Section 10). Low $\alpha$ → sharp flow but haphazard updates in low-gradient regions; high $\alpha$ → smooth flow but blurred discontinuities. The denominator $\alpha^2 + E_x^2 + E_y^2$ prevents division by zero in uniform regions.

**Iteration count:** Convergence to ~10% velocity error after 32 iterations in the single-step (two-frame) experiment; ~7% error after 16 time-steps in the one-iteration-per-frame experiment (Section 17). "Few changes occur after 32 iterations" in the translation experiment. The paper recommends one iteration per time step in practice (Section 15).

**Precision:** float32 is adequate at the reported 32×32 resolution and 256-level brightness quantization. The authors note robustness to "approximately 1% noise" and coarse brightness quantization (Abstract, Section 16).

**Boundary conditions:** Zero normal derivative (natural boundary condition of the variational problem). At image edges, velocities from points outside the image are replaced by copying from adjacent interior points (Section 12).

# Applicability

- **Use when:** a dense flow field is needed at every pixel; the scene contains smooth motion fields (rigid bodies away from occlusion boundaries, laminar flow); inter-frame displacement is sub-pixel to ~1 pixel; computational simplicity (per-pixel linear update, no matrix inversion) is a priority.
- **Don't use when:** large displacements are expected (use coarse-to-fine pyramid or phase-correlation); sharp flow discontinuities must be preserved (use TV-L1 or other edge-preserving variational methods); illumination is non-uniform or changing; only sparse feature tracks are needed (Lucas-Kanade is cheaper and more accurate at sparse keypoints).
- **Compared against:** Lucas-Kanade (1981, contemporaneous) — sparse local least-squares method using a windowed sum of brightness-constancy equations; more accurate at texture-rich keypoints, produces no flow in uniform regions. Horn-Schunck produces a complete dense field but blurs discontinuities.

# Connections

- **Builds on:** brightness constancy equation (derived from first principles in Appendix A; Section 4); calculus of variations / Euler-Lagrange (Section 9, citing [33, 34]); Gauss-Seidel iterative methods (Section 12, citing [11, 13]).
- **Enables:** dense variational optical flow as a research program; Brox et al. (2004) TV-L1 variational flow; CLG (combined local-global) methods; FlowNet / PWC-Net (deep replacements). Also enables 3-D structure recovery from flow divergence/curl (cautioned as "impractical" due to noise amplification — Section 18).
- **Refutes / supersedes:** nothing — this is a foundational paper. The aperture-problem analysis it introduces is original to this paper (Section 4).

# Atlas update plan

## NEW: horn-schunck
Type: algorithm
Category: motion / optical-flow
Primary source: horn1981-horn-schunck

**Goal:** Compute a dense 2-D optical flow field $(u, v)$ at every pixel from consecutive image frames. Resolves the aperture problem — one brightness-constancy equation, two unknowns per pixel — by imposing a global spatial smoothness prior on the velocity field.

**Algorithm:**
- Brightness-constancy equation: $E_x u + E_y v + E_t = 0$ (Section 4).
- Global variational energy: $\mathcal{E}^2 = \iint (\alpha^2(E_x u + E_y v + E_t)^2 + \|\nabla u\|^2 + \|\nabla v\|^2)\,dx\,dy$ (Section 9).
- Derivatives estimated as average of four first-differences over a 2×2×2 spatial–temporal cube (Section 7).
- Laplacian approximated as $\nabla^2 u \approx K(\bar{u} - u)$, $K = 3$ for the weighted 3×3 neighbor stencil (Section 8).
- Iterative update per pixel per iteration (Section 12):
  $$u^{n+1} = \bar{u}^n - \frac{E_x(E_x\bar{u}^n + E_y\bar{v}^n + E_t)}{\alpha^2 + E_x^2 + E_y^2}, \quad v^{n+1} = \bar{v}^n - \frac{E_y(E_x\bar{u}^n + E_y\bar{v}^n + E_t)}{\alpha^2 + E_x^2 + E_y^2}$$
- Boundary condition: zero normal derivative; edge pixels copy from adjacent interior (Section 12).
- Initialize $(u^0, v^0) = (0, 0)$; warm-start from previous frame in video streams.

**Implementation:**
- Requires two consecutive frames; frame-to-frame loop with one or many iterations per step.
- $\alpha^2$ should be set to the expected noise level in $E_x^2 + E_y^2$ (Section 10); typical range 1–100 depending on image noise.
- Iteration count: ≥ diameter of largest uniform region in pixels (Section 13); 16–64 iterations typical (Section 17).
- Pure array operations; no sparse matrix solve. float32 sufficient.
- Parallel update (Jacobi) is safe — new estimates at a point do not depend on the same point's previous estimate (Section 12).

**Remarks:**
- Global smoothness blurs flow discontinuities at occlusion boundaries; this is a known limitation (Section 5, 17).
- Filling-in of uniform regions is equivalent to solving Laplace's equation with boundary conditions (Section 13).
- Contemporaneous dense variational counterpart to Lucas-Kanade (sparse, local); both papers appeared in 1981 and together founded the optical flow field.
- Superseded for practical use by edge-preserving variational methods (TV-L1, Brox) and deep flow networks, but remains the canonical reference formulation.

Relations:
- `{ type: parallel_foundation_with, target: lucas-kanade, confidence: high, caution: "Dense variational vs sparse local LSQ — co-founded optical flow in 1981; pick by problem (dense flow field vs sparse displacement of features)" }`

## UPDATE: lucas-kanade
Section: Remarks
Bullets:
- Horn-Schunck (1981) is the contemporaneous dense variational counterpart: it covers every pixel but imposes global smoothness, blurring discontinuities. Lucas-Kanade constrains flow locally (windowed least-squares) and produces no flow in untextured regions. The build renders the `parallel_foundation_with` relation from horn-schunck's frontmatter — do NOT add a `relations[]` entry on the lucas-kanade page.

## UPDATE: image-gradient
Section: Where it appears
Bullets:
- Horn-Schunck (1981) uses the spatiotemporal gradient $(E_x, E_y, E_t)$ as its primary input. The paper introduces a specific finite-difference scheme: each of $E_x$, $E_y$, $E_t$ is estimated as the average of four first-differences along four parallel edges of a 2×2×2 voxel cube in the $(x, y, t)$ grid (Section 7, Fig. 2). This ensures all three partial derivatives are co-located at the cube center — a worked example of consistent temporal-gradient computation in a multi-frame setting.

# Provenance

- **Brightness-constancy equation** $E_x u + E_y v + E_t = 0$: Section 4, derived via chain rule; full Taylor derivation in Appendix A.
- **Aperture problem** (one equation, two unknowns): Section 4 ("a single linear equation in the two unknowns $u$ and $v$") and Section 1 ("flow velocity has two components while the change in image brightness … yields only one constraint").
- **Smoothness prior** $\|\nabla u\|^2 + \|\nabla v\|^2$: Section 5 ("minimize the square of the magnitude of the gradient of the optical flow velocity").
- **Variational energy** $\mathcal{E}^2 = \iint (\alpha^2 \mathcal{E}_b^2 + \mathcal{E}_s^2)\,dx\,dy$: Section 9 ("Let the total error to be minimized be …").
- **Euler-Lagrange equations** after calculus of variations: Section 9 ("Using the calculus of variation we obtain $E_x^2 u + E_x E_y v = \alpha^2 \nabla^2 u - E_x E_t$, …").
- **Iterative update equations**: Section 12 (displayed equations for $u^{n+1}$ and $v^{n+1}$).
- **2×2×2 cube finite-difference scheme for gradients**: Section 7, Fig. 2 ("average of four first differences taken over adjacent measurements in the cube").
- **Laplacian approximation** $\nabla^2 u = K(\bar{u} - u)$, $K = 3$: Section 8 ("The proportionality factor $K$ equals 3 if the average is computed as shown").
- **Smoothness weight** $\alpha^2$ guidance: Section 10 ("$\alpha^2$ plays a significant role only for areas where the brightness gradient is small … This parameter should be roughly equal to the expected noise in the estimate of $E_x^2 + E_y^2$").
- **Boundary conditions**: Section 12 ("natural boundary conditions … zero normal derivative … we simply copy velocities from adjacent points further in").
- **Iteration count guidance**: Section 13 ("The number of iterations should be larger than the number of picture cells across the largest region that must be filled in").
- **Convergence results**: Section 17 — 32 iterations yields ~10% error (single-step); 16 time-steps yields ~7% error (one-iteration-per-frame). Average over whole image within 1% of correct.
- **Experiment parameters**: Section 16 — 32×32 resolution, ~1% additive noise, 256 brightness levels; velocity up to 1.0 picture cell/frame (Fig. 6 caption).
- **Occlusion failure**: Section 5 ("An algorithm based on a smoothness constraint is likely to have difficulties with occluding edges"); Section 17 ("worst errors occur on the occluding boundary").
- **Laplace fill-in**: Section 13 ("the values filled in will correspond to the solution of the Laplace equation for the given boundary condition").
- **Recommended one-iteration-per-frame practice**: Section 15 ("A practical implementation would most likely employ one iteration per time step").
- **Divergence/curl impractical**: Section 18 ("Proposed methods for obtaining information about the shapes of objects using derivatives (divergence and curl) … may turn out to be impractical since the inaccuracies will be amplified").
