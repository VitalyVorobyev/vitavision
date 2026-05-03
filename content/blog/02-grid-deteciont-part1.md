---
title: "Grid detection I: topology"
date: 2026-05-15
summary: "How Delaunay triangulation and mesh filtering can turn detected chessboard corners into an ordered grid."
tags: ["feature-detection", "calibration-targets"]
author: "Vitaly Vorobyev"
repoLinks: ["https://github.com/VitalyVorobyev/calib-targets-rs"]
relatedAlgorithms: []
draft: true
relatedDemos: ["delaunay-voronoi"]
difficulty: intermediate
---

# Introduction

Regular grid detection is a backbone of many computer vision tasks: camera calibration, pose estimation, metrology, industrial inspection, and more. This is a large topic, so this post starts with one specific problem.

Assume that chessboard corners are already detected in the image. Some of them may be missing, and some detections may be false positives. The task is to recover the grid structure: connect neighboring corners, reject inconsistent detections, and assign integer grid coordinates to the connected points.

This post discusses a topological approach to this problem, inspired by [Shu, Brunton, and Fiala’s paper](https://doi.org/10.1007/s00138-009-0202-2). It is also the idea behind the topological grid finder in the [projective-grid](https://crates.io/crates/projective-grid) crate.

The important point is that the grid should be recovered before we make strong global assumptions about its geometry. Under occlusion, oblique views, and visible lens distortion, the image can be locally regular but globally difficult to describe with one clean model.

# Why the ordering matters

A detected grid is useful only after its points are ordered. For calibration or pose estimation, we need correspondences between image points and known points on the physical target.

For a planar target, these correspondences are especially powerful. If lens distortion is ignored, points on the target plane and points in the image are related by a [homography](/concepts/homography). [Zhang’s calibration method](/algorithms/zhang-planar-calibration) uses homographies from several target views to initialize camera intrinsics. If the camera is already calibrated, the same correspondences can be used to estimate the target pose.

But homography is the result of grid detection, not the starting point. With occlusion, false corner detections, and visible lens distortion, fitting one global model too early can be fragile. The topological approach first tries to recover local grid connectivity, and only then uses geometry to validate the result.

# Grid as a graph

Assume we already have a set of candidate X-junctions, for example from the ChESS detector discussed in the [previous post](/blog/01-chesscorners). Some candidates may be missing, and some may be false positives.

Now the problem becomes combinatorial. We need to decide which corners are neighbors, which groups of four corners form grid cells, and how to assign consistent integer coordinates to all connected corners.

This is naturally a graph problem:

- detected corners are nodes,
- neighboring chessboard corners are edges,
- grid cells are quadrilaterals,
- a recovered board is a connected component with regular grid topology.

Different detectors make different first assumptions. Classical OpenCV-style detectors first segment black squares and recover the board from connected regions. Duda-Frese and OpenCV `findChessboardCornersSB` use a checkerboard-specific local corner response, but still work as whole-board detectors. ROCHADE is a stronger checkerboard-specific pipeline with robust board recovery. Shu, Brunton, and Fiala take the topological route discussed here: connect corner candidates with Delaunay triangulation and recover the grid as a filtered quad mesh.

# Delaunay triangulation as a candidate graph

[Shu, Brunton, and Fiala](https://doi.org/10.1007/s00138-009-0202-2) suggest starting with Delaunay triangulation of the detected corners.

:::definition[Delaunay triangulation]
Delaunay triangulation connects a set of points into triangles such that no point lies inside the circumcircle of any triangle.
:::

This is useful because Delaunay triangulation tends to connect nearby points. For a regular grid, this usually gives a graph that contains the correct neighbor connections, plus one diagonal inside each grid cell.

The method is not based on line fitting. This matters for distorted images: the edges of the projected board may be curved, but the local neighborhood structure between nearby corners is still often preserved.

There is one important limitation. Delaunay triangulation is not projective invariant. At very oblique viewing angles, it can create triangles that do not correspond to real grid cells. In practice, these cases are rare, and such images are often not useful for calibration anyway.

:::illustration[delaunay-voronoi]{preset="compact"}
:::

# From triangles to cells

Delaunay triangulation gives triangles, but a chessboard grid is made of quadrilateral cells. For each real board square, the triangulation usually creates two triangles separated by one diagonal. The next step is to merge the right pairs of neighboring triangles back into quadrilaterals.

Shu, Brunton, and Fiala use image intensity for this step. Two neighboring triangles are merged if they have similar average color, because both triangles should belong to the same black or white square.

My implementation does not use image pixels at this stage. Each ChESS corner already stores two local grid directions. I check whether the triangle edges follow these directions. If two neighboring triangles pass this check and share the right diagonal, they can be merged into a quadrilateral cell.

> Needs an illustration plot
> Show:
> * four corners of one cell,
> * Delaunay diagonal,
> * local orientation axes at each corner,
> * accepted triangle pair,
> * rejected wrong pair.

# Filtering the quad mesh

After triangle merging, we have a set of quadrilateral cell candidates. In a clean image, this may already be enough. In harder images, false corner detections, background texture, noise, or missing corners can create wrong cells.

The Shu, Brunton, and Fiala method first filters these candidates using topology, before applying geometric checks.

## Topological filtering

In a regular grid mesh, each corner has only a few valid edge connections:

- degree 2 at a grid corner,
- degree 3 on a grid boundary,
- degree 4 inside the grid.

So if a node has edge-degree greater than 4 in the quad mesh, something is wrong around that node.

The paper uses a simple rule:

:::quote[]
If a quadrilateral has two illegal nodes, remove it from the mesh.
:::

Here “remove” means removing the quadrilateral candidate, not deleting its corner points. The same detected corner can still be part of other valid cells.

This is a good first filter because it uses only mesh topology. It does not care whether the image edges are straight, whether the board is viewed at an angle, or whether the cell looks like a perfect square.

> Best visual: a small synthetic grid with one false point inside a cell, showing two fake quads before filtering and their removal after the degree test.

## Geometry filters

After the topological filter, geometric checks can be applied.

Shu, Brunton, and Fiala use a very loose shape test. They compare the lengths of opposite sides of a quadrilateral. If one side is more than 10 times longer than the opposite side, the quadrilateral is rejected.

This does not require a cell to look like a square. The threshold is intentionally weak and only removes candidates with clearly unreasonable shape.

In `projective-grid`, I use local consistency checks between neighboring cells instead: adjacent cells should agree on their shared edge and should predict similar local grid directions.

# Ordering the grid

After filtering, we have a mesh of quadrilateral cells. This is still not enough for calibration. We need to assign each detected corner a position in the board coordinate system: `(0, 0)`, `(1, 0)`, `(2, 0)`, and so on.

This can be done by walking through the quad mesh. Start from one cell, assign integer coordinates to its four corners, then visit neighboring cells through shared edges and propagate the coordinates.

The important point is that this step uses mesh connectivity, not straight image lines. The image of a row can be curved by lens distortion, but the next corner in the row is still the next node in the graph.

This gives us the final output of the detector: image points with consistent integer grid coordinates.

> Best visual: one highlighted starting quad with coordinates assigned, arrows showing propagation to neighboring quads, and the resulting integer coordinate labels.

# Delaunay triangulation as a candidate graph
# From triangles to cells
# Filtering the quad mesh
# Ordering the grid

# Examples

Show three images:
1. clean or moderate chessboard,
2. occluded / partial board,
3. lens-distorted or difficult view.

For each example, show:
- detected corners,
- Delaunay triangulation,
- accepted quads / ordered grid.

# Using the library

Rust example first, because the crate is Rust-native.
Python example second, if bindings are available.

# Performance

Give image size, hardware, crate version/commit, feature flags, and timing stages if possible.

# Practical notes

This approach works best when false detections are sparse or unstructured. That is usually the case for plain chessboards and puzzleboard-like calibration targets: wrong corners may appear, but they rarely form a consistent grid.

The harder case is structured clutter inside the target itself. ChArUco markers are a good example. Marker interiors contain many extra corners, and some of them can form locally plausible cells. For these targets, I use a different graph-growth algorithm with local homography checks, which I will discuss in the next post.

Delaunay triangulation also has a geometric limit: it is not projective invariant. At very oblique viewing angles, it can connect points that are not real grid neighbors. In practice, these views are rare and usually not the best views for calibration.

# Summary

The main idea is simple: start from detected corners, build a local candidate graph with Delaunay triangulation, merge triangles into cell candidates, and then use topology and local geometry to recover an ordered grid.

The strength of this approach is that it does not start from a single global homography or a straight-line model. It first recovers local grid structure, which makes it useful for partially visible targets and images with visible lens distortion.

In the practical implementation, this gives a fast and robust grid finder for chessboards and similar calibration targets. The next post will cover the second strategy used in [projective-grid](https://crates.io/crates/projective-grid): graph growth with local homography consistency checks, which is better suited for targets with many structured false positives.
