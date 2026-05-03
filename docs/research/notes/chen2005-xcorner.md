---
paper_id: chen2005-xcorner
title: "A New Sub-Pixel Detector for X-Corners in Camera Calibration Targets"
authors: ["D. Chen", "G. Zhang"]
year: 2005
url: https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.87.5833&rep=rep1&type=pdf
created: 2026-05-01
relevant_atlas_pages: [rochade, laureano-topological-chessboard]
---

# Setting

**Problem class.** Single-step per-pixel detection and subpixel localisation of X-corners in planar checkerboard calibration targets. The paper targets the same use case as Lucchese-Mitra 2002 (saddle-fitting for subpixel refinement) but eliminates both the preliminary intensity interpolation and the global quadratic surface-fitting step.

**Inputs.** Grayscale image of a checkerboard pattern, Gaussian-smoothed with a $(2N+1)\times(2N+1)$ kernel where $N = 4\lfloor\sigma\rfloor$ and $\sigma$ is a user-chosen scale. Pixel-level corner candidates are required as precondition for the subpixel stage; the paper supplies these via the Hessian saddle operator it introduces.

**Outputs.** Subpixel corner positions $(x_0 + s,\, y_0 + t)$ where $(x_0, y_0)$ is the pixel-detected candidate and $(s, t) \in [-0.5, 0.5]^2$ is a closed-form offset derived from the local second-order Taylor expansion of the Gaussian-smoothed intensity.

**Scope.** Simulation only (§4). No real images, no calibration pipeline evaluation. 144-corner $512\times512$ synthetic target; a single projective transform serves as the geometric distortion model; Gaussian white noise at six levels ($\sigma_n \in \{0, 0.04, 0.08, 0.12, 0.16, 0.20\}$) for the robustness sweep.

# Core idea

**Detection operator.** At a checkerboard X-junction the Gaussian-smoothed intensity $r(x,y)$ has a saddle shape: the Hessian $H = \bigl[\begin{smallmatrix} r_{xx} & r_{xy} \\ r_{xy} & r_{yy} \end{smallmatrix}\bigr]$ has eigenvalues $\lambda_1 > 0$, $\lambda_2 < 0$. The paper defines the saddle response

$$S = \lambda_1 \cdot \lambda_2 = r_{xx}\,r_{yy} - r_{xy}^2 = \det H.$$

At an X-corner $\det H < 0$, so $S$ is strictly negative; the corner is found as the **local negative extremum** (most-negative local minimum) of $S$ in the pixel image. In practice, maxima of $-S$ (the negated determinant) mark X-corners; blobs and edges produce $S\approx 0$ or $S > 0$ and are suppressed. This operator pre-dates and prefigures the Hessian-saddle response later used by Laureano et al. (2013) and the PuzzleBoard detector.

**Subpixel refinement.** Given the integer candidate $(x_0, y_0)$, write a second-order Taylor expansion of $r$ around it:

$$r(x_0+s,\, y_0+t) \approx r + \begin{pmatrix}s & t\end{pmatrix}\begin{pmatrix}r_x \\ r_y\end{pmatrix} + \tfrac{1}{2}\begin{pmatrix}s & t\end{pmatrix} H \begin{pmatrix}s \\ t\end{pmatrix}.$$

Setting $\partial/\partial s = \partial/\partial t = 0$ gives the linear system

$$H \begin{pmatrix}s \\ t\end{pmatrix} = -\begin{pmatrix}r_x \\ r_y\end{pmatrix},$$

which is solved in closed form (Cramer's rule on $2\times2$). No surface fitting over a window, no intensity interpolation, no iterative refinement. The computation at each corner reduces to evaluating first- and second-order Gaussian derivative filters at $(x_0, y_0)$ and solving a $2\times2$ system. The derivatives are computed by convolving the original image with the appropriate differential Gaussian kernels.

**Versus Lucchese-Mitra 2002.** Lucchese (cited as [Luc00a], proceedings 2002) detected saddle points via a morphological shrinking operation on the locally interpolated intensity surface — requiring sub-pixel intensity interpolation on a $2\times2$ neighbourhood and a separate fitting stage. Chen-Zhang eliminates both steps by working directly with the Taylor expansion at the integer detection site; the tradeoff is that accuracy depends on Gaussian-smoothed derivatives rather than locally interpolated surface values.

# Assumptions

1. (hard) The image has been Gaussian-smoothed before computing $H$. The Taylor-expansion subpixel formula is derived from the model $r(x,y) = g(x,y) \otimes f(x,y)$ where $g$ is a Gaussian and $f$ is an ideal step-function X-corner. Without smoothing, the second-order Taylor approximation is not valid at the discontinuity.
2. (hard) $\det H < 0$ at the pixel candidate, i.e. the candidate is a true saddle. The closed-form solve is only valid when $H$ is indefinite; the paper does not discuss what happens if the candidate has $\det H \geq 0$ (a local minimum or maximum in the smoothed image).
3. (soft) The subpixel offset $(s, t)$ falls within $[-0.5, 0.5]^2$. If the pixel-level detection is off by more than half a pixel, the Taylor expansion centred on $(x_0, y_0)$ does not describe the true corner neighbourhood well.
4. (soft) The Gaussian scale $\sigma$ is matched to the image resolution and corner field size. The paper uses $\sigma=3$ with a $25\times25$ kernel on $32\times32$-pixel checker fields; mismatch degrades both the operator's selectivity and the Taylor approximation's fidelity.
5. (soft) White Gaussian noise model. The robustness evaluation is limited to additive Gaussian noise; structured noise (motion blur, compression artefacts, lens distortion) is not assessed.

# Failure regime

- **Insufficient smoothing or scale mismatch.** The saddle response $S = \det H$ is computed on derivatives of the Gaussian-smoothed image. If $\sigma$ is too small, $r_{xy}$, $r_{xx}$, $r_{yy}$ are dominated by pixel noise and the $S < 0$ criterion admits many false detections. If $\sigma$ is too large, nearby corners contaminate each other's Taylor neighbourhoods.
- **Large pixel-level error.** The Taylor expansion is second-order; it approximates the saddle well only within a fraction of a pixel from the true corner. A Harris or Noble pixel detector may produce candidates offset by $>0.5$ px under noise or lens distortion. In that case the Taylor-derived $(s, t)$ may not converge to the true subpixel position.
- **Partial X-corners (border squares, occlusion).** The operator assumes a full four-quadrant X-junction. Partially visible corners at the pattern boundary or under occlusion produce non-saddle Hessians ($\det H \geq 0$) and will be silently rejected or mislocated.
- **Real-image bias.** The paper evaluates only on synthetic images with projective transform and additive white noise. No real-camera evaluation is provided; lens distortion, rolling shutter, anti-aliasing, and non-Gaussian noise are not characterised. The "slightly more accurate" claim (Table 1) is limited to the synthetic regime.
- **Non-checkerboard textures.** Repetitive textures with saddle-shaped Hessians (grids, lattices, fabric) will produce false detections. The paper provides no false-positive analysis.

# Numerical sensitivity

- **Gaussian kernel size $N = 4\lfloor\sigma\rfloor$.** The kernel spans $8\lfloor\sigma\rfloor+1$ pixels; for $\sigma=3$ this is $25\times25$. Larger $\sigma$ requires significantly more convolution work and widens the scale at which corners are detected.
- **Hessian sign as saddle test.** $S = r_{xx}r_{yy} - r_{xy}^2$. At noise level $\sigma_n=0$ (noiseless), the estimated position error is $0.0086$ (new) vs $0.0088$ (traditional) — a $\sim2\%$ improvement. At $\sigma_n=0.20$, new: $0.1585$ vs traditional: $0.1598$ — the improvement is consistently sub-1\%. The advantage of the new method is minimal in absolute terms and exists only in the synthetic regime.
- **Closed-form $2\times2$ solve.** The denominator is $\det H = r_{xx}r_{yy} - r_{xy}^2$, which must be nonzero (and negative for a valid saddle). Near-zero determinants (weakly curved corners, very small fields) produce numerically large offsets $(s,t)$; the paper provides no guard for this case.
- **Derivative filter accuracy.** First- and second-order partial derivatives are obtained by convolving with differential Gaussian kernels. The paper does not specify kernel parameterisation for the derivative filters beyond the primary Gaussian. Discrete finite-difference approximations could introduce bias.

# Applicability

- Use when: a fast per-pixel Hessian-based saddle response is required for X-corner detection as an upstream step in a larger pipeline (e.g., before graph-based topology verification as in Laureano et al., or before ROCHADE's stage-1 graphing). The detector is conceptually clean and computationally lightweight.
- Use when: subpixel refinement must be simple and allocation-free — one $2\times2$ linear solve per corner, no window accumulation.
- Don't use when: high subpixel accuracy is required on real images with lens distortion or blur. The paper provides no evidence beyond synthetic additive Gaussian noise; ROCHADE's cone-filter quadratic fit is empirically grounded on real sensors.
- Don't use when: partial patterns or arbitrary corner topologies are expected. The operator is per-pixel and does not include topology verification.
- Compared against: Lucchese-Mitra 2002 (the direct precursor, using morphological shrinking + interpolation instead of Taylor expansion); Harris corner detector (generic structure-tensor approach, not saddle-specialised).

# Connections

- Builds on:
  - Lucchese-Mitra 2002 (`lucchese2003-saddle` in `docs/papers/index.yaml`) — the foundational saddle-fitting framework for subpixel X-corner detection; Chen-Zhang explicitly positions itself as a simplification of this approach.
  - Harris-Stephens 1988 (cited as [Har01a]) — motivation for the Hessian-based operator; Chen-Zhang replaces the structure-tensor response with the Hessian determinant.
  - Haralick 1983 (cited as [Har00a], "The Topographic Primal Sketch") — theoretical grounding for the Hessian eigenvalue interpretation of image surface curvature.
  - Zhang 1999 (cited as [Zha00a]) — the calibration use case (Zhang-style planar calibration) that motivates the X-corner detector.
- Enables (in the atlas):
  - `rochade` — cites chen2005-xcorner as a reference saddle-fitting variant (ROCHADE's `sources.references`). ROCHADE's bivariate quadratic refinement is the successor approach (window fit + cone filter instead of Taylor + Gaussian).
  - `laureano-topological-chessboard` — applies the Hessian saddle response $S = I_{xx}I_{yy} - I_{xy}^2$ as its subpixel refinement step (§5 of the Laureano paper, Eq. 4), directly instantiating the Chen-Zhang operator.
  - `puzzleboard` — uses the same Hessian saddle response $s = f_{xy}^2 - f_{xx}f_{yy}$ (sign-negated form) as its per-pixel corner score; the conceptual lineage is Chen-Zhang → Laureano → PuzzleBoard.
- Refutes / supersedes:
  - Lucchese's morphological-shrinking+interpolation approach (2001/2002 formulation) — replaced by a simpler closed-form Taylor solve at the detected candidate, with comparable or slightly better accuracy in the synthetic regime.

# Atlas update plan

## UPDATE: rochade

Section: References
- `chen2005-xcorner` is already listed in `sources.references` and cited in the References section (ref 5). No content gap in the references block.

Section: Remarks or Algorithm
- The rochade page does not describe what Chen-Zhang contributed vs what Lucchese-Mitra contributed. ROCHADE's refinement (cone filter + bivariate quadratic) replaces *both* the Gaussian smoothing of Lucchese-Mitra *and* the Taylor-based approach of Chen-Zhang. A single Remarks bullet would clarify the lineage: "Chen-Zhang 2005 proposes a Hessian-based detection operator ($S = r_{xx}r_{yy} - r_{xy}^2$, the Hessian determinant) and a subpixel offset via second-order Taylor expansion — a simpler precursor to the cone-filter quadratic fit used here. ROCHADE's Stage 2 replaces both the Gaussian preprocessing and the Taylor approximation with a cone-filtered window fit that is exact for piecewise-step checkerboards." Defer until the rochade page is reviewed for completeness; the current page is well-grounded without this detail.

## UPDATE: laureano-topological-chessboard

Section: Sources
- The `laureano-topological-chessboard` page's `sources.references` does not include `chen2005-xcorner`, but the page's source notes say "Chen-Zhang Hessian subpixel refinement S = Ixx·Iyy − Ixy² at surviving vertices only (§5, Eq. 4)" and the public page has a named `:::definition[Chen-Zhang Hessian response]:::` block. The paper (`laureano2013-topological`) cites Chen-Zhang for this step. When the laureano page is next reviewed, add `chen2005-xcorner` to its `sources.references` so the citation is traceable through the build.

Section: Algorithm / definition block
- The existing `:::definition[Chen-Zhang Hessian response]:::` block on the laureano page is accurate: $S = \det H = I_{xx}I_{yy} - I_{xy}^2$, negative at saddles, subpixel solve via $H[s,t]^\top = -[I_x,I_y]^\top$. No content correction needed; adding the source reference is the only change required.

# Provenance

- Paper full text: `docs/papers/.cache/chen2005-xcorner.txt` (4-page WSCG Short Paper, January 2005).
- Abstract: "a new sub-pixel detector for X-corners, which is much simpler than the traditional sub-pixel detection algorithm … Neither preliminary intensity interpolation nor quadratic fitting of the intensity surface is necessary." Retained because "simpler" and elimination of interpolation+fitting are the paper's explicit contributions.
- §3 "Model for X-Corner Intensity Profile": ideal X-corner model $f(x,y) = \begin{cases}0 & xy \leq 0 \\ 1 & xy > 0\end{cases}$; Gaussian smoothing model $r(x,y) = g \otimes f$; intensity profile shape described as saddle ("3D shape of the intensity profile is just like a saddle," Fig. 2c).
- §3 "Operator for X-Corner Detection": Hessian $H = \bigl[\begin{smallmatrix} r_{xx} & r_{xy} \\ r_{xy} & r_{yy} \end{smallmatrix}\bigr]$; eigenvalues $\lambda_1 = \tfrac{1}{2}(r_{xx}+r_{yy}+D)$, $\lambda_2 = \tfrac{1}{2}(r_{xx}+r_{yy}-D)$, $D=\sqrt{(r_{xx}-r_{yy})^2+4r_{xy}^2}$; operator defined as $S = \lambda_1\lambda_2 = r_{xx}r_{yy} - r_{xy}^2$; "The corner to be detected is the local negative extremum point of $S$."
- §3 "Sub-Pixel Detection": Taylor expansion Eq. 3; linear system $\{r_{xx}s + r_{xy}t + r_x = 0;\; r_{xy}s + r_{yy}t + r_y = 0\}$; closed-form $(s,t)$ via Cramer's rule on the $2\times2$ Hessian.
- §4 "Experimental Results": Table 1 — $\sigma_s$ (RMS error over 100 trials per noise level); noiseless: traditional 0.0088, new 0.0086; $\sigma_n=0.20$: traditional 0.1598, new 0.1585. The improvement is marginal and monotone in noise level.
- §5 "Conclusion": "Neither intensity interpolation nor surface fitting is necessary, which simplifies the detection process greatly." Confirms that elimination of fitting is the headline contribution, not accuracy improvement.
- Discrete implementation (§3, "Detection of X-corners in Discrete Space"): Gaussian kernel $g(m,n) = \frac{1}{2\pi\sigma^2} e^{-(m^2+n^2)/(2\sigma^2)}$, size $(2N+1)\times(2N+1)$, $N=4\lfloor\sigma\rfloor$; partial derivatives by convolving with differential Gaussian kernels.
