---
title: Local Versus Global Motion
summary: "Brightness constancy leaves optical flow underdetermined at every pixel, so each method is a choice of where the missing constraint comes from: a local window, a global smoothness prior, a robust version of both, and finally a learned update operator that may or may not still be imposing a prior at all."
tagline: One equation, two unknowns, four ways to borrow the rest.
tags:
  - optical-flow
  - motion
  - classical
  - deep-learning
date: 2026-09-15
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: constraint
    label: Constraint
  - id: hand-written
    label: Hand-written prior
  - id: learned
    label: Learned update
nodes:
  - id: optical-flow
    page: optical-flow
    area: constraint
    role: origin
    takeaway: Brightness constancy gives one equation per pixel for two velocity unknowns, so every optical-flow method is really a choice of where the missing second constraint comes from.
    remark: Lucas-Kanade borrows the missing constraint from a local window, Horn-Schunck borrows it from a global smoothness prior, and RAFT lets a learned operator decide implicitly.
  - id: lucas-kanade
    page: lucas-kanade
    area: hand-written
    role: milestone
    takeaway: Assumes the flow is constant inside a small window and solves the resulting least-squares system; the window's structure tensor decides whether the estimate is even well posed.
    remark: "It fails by refusing an answer rather than giving a wrong one: on a 1-D edge or a blank patch the normal-equation matrix is rank deficient, so no update is produced there."
  - id: horn-schunck
    page: horn-schunck
    area: hand-written
    role: milestone
    takeaway: "Borrows the missing constraint from the whole image at once: a global smoothness penalty lets well-defined flow near edges spread into textureless regions by relaxation."
    remark: The same global smoothness that fills in blank regions also blurs real motion boundaries; the worst errors sit exactly at occlusions and never fully disappear.
  - id: black-anandan-robust-flow
    page: black-anandan-robust-flow
    area: hand-written
    role: bridge
    takeaway: Keeps both the windowed and the global-smoothness ideas but swaps their quadratic penalties for redescending estimators, so outliers at motion boundaries stop wrecking the whole estimate.
    remark: A graduated non-convexity schedule anneals a convex stand-in down to the true robust penalty, sidestepping the local minima that make robust energies hard to optimize directly.
  - id: raft
    page: raft
    area: learned
    role: frontier
    takeaway: Replaces the hand-written smoothness prior with a learned iterative update operator reading an all-pairs correlation volume, refining one fixed-resolution flow field instead of a coarse-to-fine cascade.
    remark: Trained only on synthetic data, it still generalizes strongly to real scenes, and its accuracy keeps improving for hundreds of inference iterations well past its training unroll depth.
  - id: q-smoothness-prior
    question: Is a smoothness prior still needed once the update rule is learned, or has it simply moved into the network's weights?
    area: learned
    role: question
edges:
  - from: optical-flow
    to: lucas-kanade
    type: prerequisite
  - from: optical-flow
    to: horn-schunck
    type: prerequisite
  - from: optical-flow
    to: black-anandan-robust-flow
    type: prerequisite
  - from: optical-flow
    to: raft
    type: prerequisite
  - from: lucas-kanade
    to: horn-schunck
    type: contrast
    label: parallel
  - from: lucas-kanade
    to: black-anandan-robust-flow
    type: evolution
    label: extends
  - from: horn-schunck
    to: black-anandan-robust-flow
    type: evolution
    label: extends
  - from: horn-schunck
    to: raft
    type: evolution
    label: learned update
  - from: raft
    to: black-anandan-robust-flow
    type: bridge
    label: echoes
  - from: raft
    to: q-smoothness-prior
    type: bridge
    label: open question
lenses:
  - id: overview
    title: Overview
    coords:
      optical-flow:
        - 0
        - 0
      lucas-kanade:
        - 1.5
        - 1
      horn-schunck:
        - 3
        - 1
      black-anandan-robust-flow:
        - 4.6
        - 1
      raft:
        - 6.2
        - 2
      q-smoothness-prior:
        - 7.7
        - 2
steps:
  - title: One Equation, Two Unknowns
    anchor: one-equation-two-unknowns
    claim: Brightness constancy gives one equation per pixel for two velocity unknowns, so optical flow is underdetermined everywhere; the whole field of methods is a fight over where the second constraint comes from.
    focus:
      - optical-flow
  - title: Two 1981 Answers
    anchor: two-1981-answers
    claim: "In the same year, two opposite answers appear: Lucas-Kanade borrows the constraint from a small local window, Horn-Schunck borrows it from the smoothness of the whole image; neither is a special case of the other."
    focus:
      - lucas-kanade
      - horn-schunck
  - title: Making the Prior Robust
    anchor: making-the-prior-robust
    claim: Black-Anandan keeps both the local-window and global-smoothness machinery but makes the penalties robust, so a single dominant motion per window or region survives even when outliers sit right at its boundary.
    focus:
      - black-anandan-robust-flow
  - title: The Prior Becomes Learned
    anchor: the-prior-becomes-learned
    claim: RAFT keeps the single-flow-field, iteratively-refined shape of the classical methods but hands the update rule itself to a trained network reading a correlation volume, raising the question of where the prior went.
    focus:
      - raft
      - q-smoothness-prior
---

## One Equation, Two Unknowns

[Optical Flow](/atlas/optical-flow) assigns every pixel a two-dimensional velocity $(u, v)$ from the assumption that brightness is conserved as a point moves between frames. That assumption collapses to a single linear constraint, $I_x u + I_y v + I_t = 0$, relating the two unknown velocity components at every pixel. The constraint is one linear equation in two unknowns per pixel, and no amount of algebra recovers a second one from it.

Geometrically the equation fixes a line in the $(u, v)$ plane, not a point. A single edge, viewed through any finite aperture, determines only the gradient-aligned component of its motion. Recovering the full 2-D velocity requires either pooling pixels whose gradient directions span two dimensions, or imposing a prior over the velocity field. Every method below accepts this equation as given, then makes a choice the equation itself cannot make: where the missing second constraint, the one pinning down the component along the edge, comes from. Two incompatible answers to that choice appear in the same year.

## Two 1981 Answers

In 1981, [Lucas-Kanade](/atlas/lucas-kanade) and [Horn-Schunck](/atlas/horn-schunck) supply the two founding answers, and they disagree about where locality belongs. Lucas-Kanade borrows the missing constraint from a small neighbourhood: under the assumption that all pixels in a window $\mathcal{W}$ share a single velocity, the brightness-constancy equations over the window form an over-determined system solvable in the least-squares sense. The system is solvable only where the window's gradient directions span two independent dimensions; on a blank patch or a single edge the coefficient matrix is rank-deficient, and the method produces no estimate there rather than a wrong one.

Horn-Schunck borrows the constraint from the opposite end of the scale. The smoothness prior resolves the aperture problem, one brightness-constancy equation, two unknowns per pixel, by propagating boundary velocity information across uniform regions through iterated local averaging, filling in a dense field everywhere, including where Lucas-Kanade declines to commit. Both papers appeared in 1981 and together founded the optical flow field; neither supersedes the other; they are the two foundational threads of optical flow. The same averaging that fills blank interiors also blurs real motion boundaries, and the errors it leaves behind sit exactly where two motions meet.

## Making the Prior Robust

[Black-Anandan Robust Optical Flow](/atlas/black-anandan-robust-flow) keeps the machinery of both 1981 answers, the windowed regression and the global smoothness energy, and changes only the penalty each one places on disagreement. Both outputs are obtained by replacing the quadratic (L2) penalty in the data conservation and spatial smoothness terms with a redescending robust M-estimator, solved via Iteratively Reweighted Least Squares within a Graduated Non-Convexity continuation schedule. A quadratic penalty treats every residual as equally informative, so a second motion crossing a window or a neighbourhood drags the least-squares estimate toward an average of both; an estimator whose influence function is redescending equals zero once the residual passes a fixed threshold, so a residual large enough to belong to a different motion stops pulling on the fit entirely.

Because the resulting energy is non-convex, the scale is initialised large enough that the objective is convex, then reduced in stages, so the solver commits to which residuals are outliers only gradually. Both the data term and the smoothness term must use robust penalties; robustifying the smoothness term alone leaves the data term quadratic and can increase flow error relative to the fully quadratic baseline. What survives untouched is the requirement that a person hand-derive the penalty, the scale schedule, and the smoothness structure.

## The Prior Becomes Learned

[RAFT](/atlas/raft) keeps the single fixed-resolution flow field and the iterative refinement of the classical methods, but hands the update itself to a trained network. In place of a hand-derived data term, the model builds an all-pairs 4D correlation volume, computed once as a single matrix multiplication and queried repeatedly at the current flow estimate, together with a weight-tied recurrent update operator that plays the role of an optimization step at every iteration. Every pixel's similarity to every pixel in the other frame is available from the start, instead of being reconstructed one Taylor expansion at a time.

The update operator replaces the closed-form gradient-descent step of the classical methods with a learned one: rather than a subpixel Taylor approximation of the data term, the operator learns to propose the descent direction. Trained only on synthetic data, the resulting network still generalizes to real footage, and its accuracy keeps improving over iterations from 1 to 200, far beyond what it ever saw during training. What has disappeared by name is the explicit smoothness term that Horn-Schunck wrote down and Black-Anandan made robust. Is a smoothness prior still needed once the update rule is learned, or has it simply moved into the network's weights?
