---
title: "Tsai's Versatile Camera Calibration"
date: 2026-05-02
summary: "Two-stage 1987 camera calibration that uses the radial alignment constraint to recover extrinsics and image scale linearly from a precision 3D calibration target, then refines focal length, depth translation, and one radial-distortion coefficient by a short nonlinear solve over three unknowns. Superseded for practical use by Zhang's planar method."
tags: ["camera-model"]
domain: calibration
tasks: [camera-calibration]
author: "Vitaly Vorobyev"
difficulty: advanced
quality: historical
relations:
  - type: generalized_by
    target: zhang-planar-calibration
    confidence: high
  - type: feeds_into
    target: tsai-lenz-handeye
    confidence: high
    caution: "Tsai 1987's per-station extrinsics are the canonical input format for the Tsai-Lenz hand-eye AX = XB solver."
prerequisites: [camera-distortion-models]
failureModes: []
sources:
  primary: tsai1987-versatile
  references:
    - zhang2000-flexible
    - weng1992-camera
    - daniilidis1999-hand-eye
  notes: |
    Two-stage technique on a precision 3D target. Stage 1 — the radial
    alignment constraint (RAC) eliminates $f$, $\kappa_1$, $\kappa_2$, $T_z$
    from the projection equation, yielding a linear system in five
    (coplanar) or seven (non-coplanar) unknowns encoding $(R, T_x, T_y)$
    plus the image-scale factor $s_x$. Stage 2 — fixes Stage 1 outputs and
    recovers $(f, T_z, \kappa_1)$ by a short nonlinear solve seeded by an
    ignoring-distortion linear approximation. One-term radial distortion
    only; tangential excluded "to avoid numerical instability". The
    coplanar variant requires $s_x$ known a priori (Lenz–Tsai 1987); the
    non-coplanar variant recovers $s_x$ as part of the calibration.
---

# Goal

Given a precision 3D calibration target with $N \geq 5$ (coplanar) or $N \geq 7$ (non-coplanar) points of known metric coordinates $(x_w, y_w, z_w)$ and their measured pixel positions $(X_f, Y_f)$, recover the camera-to-world rigid transform $(R, T) \in SO(3) \times \mathbb{R}^3$, the effective focal length $f$, the first-order radial distortion coefficient $\kappa_1$, and the horizontal scan-uncertainty factor $s_x$. The defining property is a linear closed-form first stage that produces a near-correct extrinsic estimate without any initial guess, leaving only three coupled intrinsic parameters $(f, T_z, \kappa_1)$ for a short nonlinear refinement.

# Historical context

In 1987 the dominant alternative was Faig-style full-bundle calibration: an eleven-parameter Levenberg–Marquardt solve initialised from a rough manual guess, run on a precision-machined calibration object. Two costs followed from that approach — the LM solve was sensitive to the initial guess, and the wall-clock cost on minicomputer hardware was large enough to preclude in-line calibration. Industrial machine-vision pipelines worked around both by relying on hand-tuned calibration that was expensive to redo when a camera moved.

Tsai's contribution was the two-stage decomposition built on the radial alignment constraint. Because radial lens distortion displaces image points along the line from the image origin, the direction from the image origin to the distorted point is the same as the direction to the undistorted point and to the projection of the world ray onto the image. That parallelism eliminates $f$, $\kappa_1$, $\kappa_2$, and $T_z$ from the constraint equation, leaving Stage 1 as a linear least-squares solve for combinations of $R$ and $(T_x, T_y)$ — closed-form, no initial guess. Stage 2 then has three coupled unknowns and converges in one or two LM iterations from the ignoring-distortion linear seed. The reported wall-clock cost on a 68000-based minicomputer was roughly an order of magnitude lower than full eleven-parameter LM, with reported accuracy of one part in 2000 of the working range on a multi-plane calibration object.

The structural limitation was the precision 3D target. A flat pattern provides five constraints per view; the coplanar variant of the method cannot separate $s_x$ from the extrinsic parameters and requires $s_x$ to be supplied from a separate calibration. The non-coplanar variant recovers $s_x$ but needs a 3D fixture machined to roughly 0.1× the desired final accuracy. [Zhang's planar calibration](/atlas/zhang-planar-calibration) lifted this requirement: by capturing $\geq 3$ views of a single planar pattern and exploiting the image of the absolute conic, Zhang recovers all five intrinsics including $s_x$ from a flat checkerboard. The 1987 fixture-based workflow gave way to the 2000 multi-view planar workflow, which has been the industry-standard treatment for the last quarter century.

The page is preserved as the citation root for [Tsai-Lenz hand-eye calibration](/atlas/tsai-lenz-handeye) (which consumes Tsai's per-station extrinsics directly) and for the radial alignment constraint itself, which still appears in specialised calibration variants where the geometric trick is reused.

# References

1. R. Y. Tsai. *A versatile camera calibration technique for high-accuracy 3D machine vision metrology using off-the-shelf TV cameras and lenses.* IEEE Journal on Robotics and Automation 3(4):323–344, 1987. [pdf](https://cecas.clemson.edu/~stb/ece847/internal/classic_vision_papers/tsai_calibration1987.pdf)
2. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE TPAMI 22(11):1330–1334, 2000. The successor: lifts the precision-3D-target requirement.
3. J. Weng, P. Cohen, M. Herniou. *Camera calibration with distortion models and accuracy evaluation.* IEEE TPAMI 14(10):965–980, 1992. Adds tangential / Brown–Conrady distortion that Tsai 1987 explicitly excluded.
4. R. K. Lenz, R. Y. Tsai. *Techniques for calibration of the scale factor and image center for high accuracy 3D machine vision metrology.* IEEE TPAMI 10(5):713–720, 1988. Companion paper that recovers $(C_x, C_y)$ alongside $s_x$ for the coplanar variant.
