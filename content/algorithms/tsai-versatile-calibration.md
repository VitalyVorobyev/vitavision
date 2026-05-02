---
title: "Tsai's Versatile Camera Calibration"
date: 2026-05-02
summary: "Two-stage camera calibration that uses the radial alignment constraint to recover extrinsics and image scale linearly from a 3D calibration target, then refines focal length, depth translation, and one radial-distortion coefficient by a short nonlinear solve over three unknowns."
tags: ["calibration", "intrinsics", "extrinsics", "radial-distortion"]
category: calibration
author: "Vitaly Vorobyev"
difficulty: advanced
relatedAlgorithms: ["zhang-planar-calibration", "tsai-lenz-handeye", "kumar-generalized-rac"]
prerequisites: [camera-distortion-models]
comparedWith: [zhang-planar-calibration, kumar-generalized-rac]
failureModes: []
sources:
  primary: tsai1987-versatile
  references:
    - zhang2000-flexible
    - weng1992-camera
    - kumar2014-grac
    - daniilidis1999-hand-eye
  notes: |
    Two-stage technique. Stage 1 — radial alignment constraint (RAC) gives a
    linear system in five (coplanar, Eq. 10) or seven (non-coplanar, Eq. 16)
    unknowns encoding (R, T_x, T_y) and the image-scale uncertainty s_x.
    Stage 2 — fixes Stage 1 outputs and recovers (f, T_z, kappa_1) by a
    short nonlinear solve seeded by an ignoring-distortion linear
    approximation (Eq. 15 → Eq. 8b). One-term radial distortion only;
    tangential excluded "to avoid numerical instability" (§II-B).
    Coplanar target requires s_x known a priori (Lenz-Tsai 1987); non-coplanar
    target recovers s_x as part of the calibration.
---

# Goal

Given a 3D calibration target with $N \geq 5$ (coplanar) or $N \geq 7$ (non-coplanar) points of known metric coordinates $(x_w, y_w, z_w)$ and their measured pixel positions $(X_f, Y_f)$, recover the camera-to-world rigid transform $(R, T) \in SO(3) \times \mathbb{R}^3$, the effective focal length $f$, the first-order radial distortion coefficient $\kappa_1$, and the horizontal scan-uncertainty factor $s_x$. The defining property is a linear closed-form first stage that produces a near-correct extrinsic estimate without any initial guess, leaving only three coupled intrinsic parameters $(f, T_z, \kappa_1)$ for a short nonlinear refinement.

# Algorithm

Let $(x_w, y_w, z_w)$ denote a target point in the world frame and $(X_d, Y_d)$ its observed image position after radial distortion (so $(X_d, Y_d)$ is the back-corrected sensor reading $X_d = (X_f - C_x) d_x s_x^{-1}$, $Y_d = (Y_f - C_y) d_y$ with image-center $(C_x, C_y)$ and pixel pitch $(d_x, d_y)$). Let $(X_u, Y_u)$ denote the corresponding undistorted (ideal) image position.

:::definition[Radial alignment constraint (RAC)]
Radial lens distortion displaces every image point along the line from the image origin to that point — it does not rotate the direction. Therefore $\overrightarrow{O_i P_d}$, $\overrightarrow{O_i P_u}$, and the projection of the world-frame ray $\overrightarrow{P_{oz} P}$ onto the image are all parallel:

$$
\frac{X_d}{Y_d} = \frac{X_u}{Y_u} = \frac{x}{y},
$$

where $(x, y, z)$ is the world point in the camera frame. The constraint is independent of $f$, $\kappa_1$, $\kappa_2$, and $T_z$ — these can be eliminated from the resulting equations.
:::

## Stage 1 — extrinsic + scale (linear)

Substituting $(x, y, z) = R(x_w, y_w, z_w) + T$ into the RAC and clearing $T_y$ yields a linear system. For the **non-coplanar case** with $N \geq 7$ points:

$$
\bigl[\,Y_{di} x_{wi},\, Y_{di} y_{wi},\, Y_{di} z_{wi},\, Y_{di},\, -X_{di} x_{wi},\, -X_{di} y_{wi},\, -X_{di} z_{wi}\,\bigr]\,\begin{bmatrix} T_y^{-1} s_x r_1 \\ T_y^{-1} s_x r_2 \\ T_y^{-1} s_x r_3 \\ T_y^{-1} s_x T_x \\ T_y^{-1} r_4 \\ T_y^{-1} r_5 \\ T_y^{-1} r_6 \end{bmatrix} = X_{di}.
\quad \text{(Eq. 16)}
$$

For the **coplanar case** ($z_w \equiv 0$), the system collapses to five unknowns (Eq. 10) and $s_x$ must be known a priori.

:::algorithm[Tsai's two-stage calibration]
::input[$N$ correspondences $\{(x_{wi}, y_{wi}, z_{wi}) \leftrightarrow (X_{fi}, Y_{fi})\}$, camera/frame-buffer constants $(N_{cx}, N_{fx}, d_x, d_y)$, image center $(C_x, C_y)$, and (coplanar case) the scale factor $s_x$.]
::output[Rotation $R$, translation $T = (T_x, T_y, T_z)$, focal length $f$, distortion $\kappa_1$, and (non-coplanar case) the recovered $s_x$.]

1. **Stage 1.a — linear solve.** Convert $(X_f, Y_f)$ to $(X_d, Y_d)$ using the camera/frame-buffer constants. Build the design matrix from Eq. 16 (or Eq. 10 for the coplanar case); solve by least squares.
2. **Stage 1.b — recover $|T_y|$.** From the $2 \times 2$ submatrix $C$ of recovered parameters,
   $$
   |T_y| = \left(\frac{S_r - \sqrt{S_r^2 - 4\,(r_1' r_5' - r_4' r_2')^2}}{2\,(r_1' r_5' - r_4' r_2')^2}\right)^{1/2},
   \quad S_r = (r_1')^2 + (r_2')^2 + (r_4')^2 + (r_5')^2.
   \quad \text{(Eq. 12)}
   $$
   Use Eq. 13 in the rare degenerate Case II (a whole row or column of $C$ vanishes — camera viewing the target nearly tangentially).
3. **Stage 1.c — sign of $T_y$ and full $R$.** Pick the sign of $T_y$ so that one image point projects with the correct sign of $X_u$; recover $R$ algebraically from the seven (or five) parameters and project to $SO(3)$ if needed.
4. **Stage 1.d — recover $s_x$ (non-coplanar only).** $s_x = (a_1^2 + a_2^2 + a_3^2)^{1/2}\,|T_y|$ from the first three recovered parameters (Eq. 18).
5. **Stage 2.a — linear approximation of $(f, T_z)$.** With $R$, $T_x$, $T_y$ fixed, ignore distortion and solve the $2 \times 1$ linear system $\bigl[y_i,\; -d_y Y_i\bigr]\,[f, T_z]^T = w_i d_y Y_i$ where $y_i = r_4 x_{wi} + r_5 y_{wi} + r_6 z_{wi} + T_y$ and $w_i = r_7 x_{wi} + r_8 y_{wi} + r_9 z_{wi}$. (Eq. 15)
6. **Stage 2.b — nonlinear refinement.** Minimise the radial-distorted reprojection error over $(f, T_z, \kappa_1)$ jointly:
   $$
   \min_{f,\,T_z,\,\kappa_1}\; \sum_i \Bigl( Y_{di}\,(1 + \kappa_1 r_i^2)\,(r_4 x_{wi} + r_5 y_{wi} + r_6 z_{wi} + T_y) - d_y\,Y_i\,f\,\bigl[(r_7 x_{wi} + r_8 y_{wi} + r_9 z_{wi}) + T_z\bigr] \Bigr)^2.
   \quad \text{(Eq. 8b)}
   $$
   Seeded by Stage 2.a, one or two LM iterations converge.
:::

```mermaid
flowchart LR
    A["Sub-pixel<br/>extract (X_f, Y_f)"] --> B["Convert to<br/>(X_d, Y_d)"]
    B --> C["Stage 1: linear<br/>RAC solve"]
    C --> D["Recover R, T_x, T_y, s_x<br/>(closed form)"]
    D --> E["Stage 2.a: linear<br/>(f, T_z) ignoring distortion"]
    E --> F["Stage 2.b: LM refine<br/>(f, T_z, κ₁)"]
```

# Remarks

- **Two-stage decomposition is the contribution.** Stage 1 uses the RAC to eliminate $f$, $\kappa_1$, $\kappa_2$, $T_z$ from the constraint, leaving a closed-form linear extrinsic recovery. Stage 2 then has only three coupled unknowns $(f, T_z, \kappa_1)$ — a small nonlinear search seeded by a linear approximation. Compared with full Levenberg-Marquardt over all eleven parameters (Faig 1975), the two-stage technique avoids initial-guess sensitivity and reduces wall-clock cost by an order of magnitude.
- **Coplanar target recovers everything except $s_x$.** A single planar target gives only five constraints per pose, so the image-scale factor $s_x$ must come from a separate calibration (Lenz-Tsai 1987). This single fact is the structural limitation that [Zhang's planar method](/atlas/zhang-planar-calibration) lifts: by using $\geq 3$ views of one planar pattern and exploiting the IAC, Zhang recovers all intrinsics including $s_x$ from flat targets.
- **Distortion scope is one-term radial.** $\kappa_2$ is excluded on stability grounds (§II-B); tangential / decentering distortion is excluded entirely. For wide-angle lenses or sensors with appreciable decenter, the [Brown-Conrady model in Weng 1992](/atlas/weng-brown-conrady-distortion) is a drop-in replacement for the projection step.
- **Accuracy.** Monoview multi-plane experiments report $x, y$ average error 0.4 mil, depth 0.6 mil, max 1.8 mil — about 1 part in 2000 of the working range (§IV-B-2). Predicted error scales as $N_0^{-1/2}$ in the calibration-point count; 60 points is the practical minimum (§III-B).
- **Degenerate configurations.** Stage 1's linear system loses rank when (i) all calibration points lie at the same depth, (ii) the camera views the target tangentially (Case II), (iii) the coplanar target is tilted less than 30° from the image plane. The first is handled by using a 3D target; the second is "rare" in practice; the third is a simple staging constraint.
- **Image-center error.** The "Note Added in Proof" reports that an image-center offset of up to ten pixels does not significantly affect 3D measurement accuracy, but Lenz-Tsai (1987) gives a more rigorous treatment that recovers $(C_x, C_y)$ alongside $s_x$.
- **Pipeline role.** Tsai's per-station extrinsic estimates feed [Tsai-Lenz hand-eye calibration](/atlas/tsai-lenz-handeye) directly: each $(R_i, T_i)$ from this method becomes a $(R_{c_i}, T_{c_i})$ input to the AX = XB solver. Errors in Tsai's extrinsics propagate one-for-one into the recovered hand-eye transform.

## When to choose Tsai over Zhang

[Zhang's planar calibration](/atlas/zhang-planar-calibration) replaces Tsai's 3D non-coplanar target with $\geq 3$ views of a single planar pattern, recovering all five intrinsics including $s_x$ from the IAC. Tsai requires a precision 3D object (or known multi-plane stack) but completes the full calibration from a **single image**.

| | Tsai 1987 | Zhang 2000 |
|---|---|---|
| Target | 3D (non-coplanar) or multi-plane stack | single planar pattern |
| Min views | 1 (non-coplanar) | 3 (planar) |
| Recovers $s_x$ | yes (from non-coplanar Stage 1) | yes (from $\geq 3$ homographies) |
| Distortion model | one radial term $\kappa_1$ | two radial terms $(k_1, k_2)$ |
| Computation | linear + 3-unknown nonlinear | per-view homography + linear IAC + full LM |

Choose Tsai when (1) you have a precision 3D fixture (robotics arm with known calibration object) and want a single-shot calibration — Zhang's $\geq 3$ views requirement adds workflow overhead; (2) memory and runtime are constrained — the two-stage solver completes in milliseconds with no LM iteration; (3) the $\kappa_1$-only distortion model is sufficient for your lens. Choose Zhang when the target is a planar checkerboard (the dominant industrial workflow) and you can afford the multi-view capture; on the same hardware Zhang's accuracy matches Tsai's at 1 part in 2000 of the working range, with no precision-3D-target requirement.

## When to choose Tsai over Kumar gRAC

[Kumar gRAC](/atlas/kumar-generalized-rac) extends Tsai's RAC by parametrising lens-sensor tilt as a 2-DoF rotation $R(\rho, \sigma, 0)$, projecting observations onto a hypothesised frontal sensor, and solving a seven-parameter linear system that recovers both extrinsics and tilt simultaneously. gRAC reduces to Tsai when $(\rho, \sigma) = 0$.

Choose Tsai when the lens is mounted normal to the sensor (the standard machine-vision case) — the simpler five- or seven-parameter system is faster and has fewer degeneracies. Choose Kumar gRAC when (1) the camera body has a tilt-shift mount or a known lens decentering, (2) the sensor itself is tilted relative to the optical axis (some specialised metrology setups), or (3) calibration must explicitly account for sensor-skew that other distortion models absorb implicitly into $(k_1, k_2)$. The page-equivalence is exact at $R = I$, so no accuracy is lost by adopting gRAC even when the tilt is zero — the additional cost is the seven-parameter linear solve in place of five (coplanar) or seven (non-coplanar Tsai).

# References

1. R. Y. Tsai. *A versatile camera calibration technique for high-accuracy 3D machine vision metrology using off-the-shelf TV cameras and lenses.* IEEE Journal on Robotics and Automation 3(4):323–344, 1987. [pdf](https://cecas.clemson.edu/~stb/ece847/internal/classic_vision_papers/tsai_calibration1987.pdf)
2. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE TPAMI 22(11):1330–1334, 2000. (Lifts Tsai's 3D-target requirement.)
3. J. Weng, P. Cohen, M. Herniou. *Camera calibration with distortion models and accuracy evaluation.* IEEE TPAMI 14(10):965–980, 1992. (Adds tangential / Brown-Conrady distortion.)
4. R. K. Lenz, R. Y. Tsai. *Techniques for calibration of the scale factor and image center for high accuracy 3D machine vision metrology.* IEEE Transactions on Pattern Analysis and Machine Intelligence 10(5):713–720, 1988.
5. M. K. Kumar, N. Ahuja. *A Generalized Radial Alignment Constraint for Camera Calibration.* IEEE ICPR, 2014. (gRAC generalises Tsai's RAC to non-frontal sensors.)
