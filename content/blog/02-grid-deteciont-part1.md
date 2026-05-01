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

Detection of regular grids on images is a backbone for various applications,
spanning calibration, pose estimation, metrology, industrial inspection and more. This is a large topic, and in this post I want to begin discussing it.

Lets consider a very specific task: detecting an image of a chessboard.
Our solution should be able to cope with occlusions, not orthogonal
view angles and visible lense distortions. It means that orientation of board edges changes across the
image and corners structure cannot be described with a single [homography](concepts/homography).

By the end of this reading, you should have a good idea about algorithms behind the
**topological grid finder** in the [projective-grid](https://crates.io/crates/projective-grid)
crate.

# Plane homography

One property makes planar grids very useful in computer vision. It motivates the rest of the text. A *projective camera* creates and image (2D) of objects by a projection of 3D objects. It is a one-to-one correspondence between image points and *rays* from the camera center.

If a *flat object* is observed, we can say more. In this case, there is a one-to-one correspondence between plane points and image points, defined by a $3 \times 3$ matrix acting in homogeneous space.

:::definition[Homography]
A **homography** is a projective transformation from $\mathbb{P}^2$ to $\mathbb{P}^2$ represented by a non-singular $3 \times 3$ matrix $H$, defined up to scale. It maps points as $x' \sim Hx$ where $\sim$ denotes equality up to a non-zero scalar.
:::

If there are features on the plane with known geometry and that we can detect on the image, then we can derive camera intrinsic parameters from the measures homography. The Zhang's camera calibration algorithm is based on that [link]. If we already have a calibrated camera, then we can infer the camera pose in space using the same homography data.

# Grid as a graph

There are different approaches to grid chessboard on image. Older approaches are based on thresholding the image and detecting black squares first. Other methods detect board edges first as line segments.  Modern detectors usually begin with corners detection. The problem is not solved in general case and there is no single *best* detector. Some detectors work in specific cases better than universal detectors like OpenCV `findChessboardCornersSB`. [ROCHADE](algorithms/rochade), [1](laureano-topological-chessboard).

Assume we are provided with a set of X-junstions detected with a good precision (e.g. with the ChESS detector, discussed in the [previous post](/blog/01-chesscorners)). Our task now is to connect neibghour chessboard corners, to reject false positive corners and to assign consistent grid coordinated to all connected corners. This can be considered as building the *grid graph*. Different methods solve this task in different ways. 

# Topological board detection

## Delaunay trinagulation

[Shu, Brunton, and Fiala](https://doi.org/10.1007/s00138-009-0202-2) suggested to begin with a classical Delaunay triangulation of the corners.

:::definition[Delaunay triangulation]
Delaunay triangulation is a way to connect a set of points into triangles such that no point lies inside the circumcircle of any triangle.
:::

You can easily see that for a correct regular grid it gives a very good graph that already contains all correct edges. Take some time to play with a demo.

:::illustration[delaunay-voronoi]{preset="compact"}
:::

## Merging triangles

First problem is that triangulation graph contains diagonal edges that should be eliminated. 

## Topological filter

## Geometry filter

# Summary


