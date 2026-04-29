---
title: "Grid detection I"
date: 2026-05-15
summary: "A chessboard-specific detector, from sampling geometry to a practical multiscale implementation."
tags: ["feature-detection", "calibration-targets"]
author: "Vitaly Vorobyev"
repoLinks: ["https://github.com/VitalyVorobyev/calib-targets-rs"]
relatedAlgorithms: []
draft: true
relatedDemos: ["delaunay-voronoi"]
difficulty: intermediate
---

# Introduction

Detection of regular grid structures on images is a backbone for various applications,
spanning calibration, pose estimation, metrology, industrial inspection and more.

We limit this discussion with a very specific task: detecting an image of a chessboard.
Our target solution should be able to cope with occlusions, when not all corners of the board
are in the image or some objects occlude part of the board. We also aim to cope with significant
view angles and lense distortions. It means that orientation of board edges changes across the
image and corners structure cannot be described with a single homography transtorm (see the discussion below).

By the end of this reading, you should have a good idea about algorithms behind the
**topological grid finder** in my [projective-grid](https://crates.io/crates/projective-grid)
crate.

# Plane homography

Before we dive in, lets discuss one concept that makes planar grids so useful in computer vision. A *projective camera* creates and image (2D) of objects by a projection of 3D objects. It is a one-to-one correspondence between image points and *rays* from the camera center.

We can obtain more if we know that we observe a *flat object*, a plane. In this case, there is a one-to-one correspondence between plane points and image points, defined by a $3 \times 3$ matrix acting in homogeneous space.

:::definition[Homography]
A **homography** is a projective transformation from $\mathbb{P}^2$ to $\mathbb{P}^2$ represented by a non-singular $3 \times 3$ matrix $H$, defined up to scale. It maps points as $x' \sim Hx$ where $\sim$ denotes equality up to a non-zero scalar.
:::

Next, if there are features on the plane with known geometry and that we can detect on the image, then we can derive camera intrinsic parameters from the measures homography. The Zhang's camera caoibration algorithm is based on that.

# Grid as a graph


