---
title: "Grid detection I: topology"
date: 2026-05-15
summary: "How Delaunay triangulation and mesh filtering can turn detected chessboard corners into an ordered grid."
tags: ["feature-detection", "calibration-targets"]
author: "Vitaly Vorobyev"
repoLinks: ["https://github.com/VitalyVorobyev/calib-targets-rs"]
relatedAlgorithms: []
relatedDemos: ["delaunay-voronoi"]
difficulty: intermediate
---

# 1. Introduction

The [previous post](blog/01-chesscorners) showed how to detect chessboard corners with [ChESS response](atlas/chess-corners). That gives a sparse set of X-junctions, each with two local grid axes. Some may be missing and some may be false positives. This post covers what comes next: connecting neighboring corners, rejecting inconsistent detections, and assigning integer grid coordinates to the connected points.

The setups I care about are partially visible or occluded boards under strong lens distortion. This rules out detectors that require the full requested pattern to be visible, including OpenCV's `findChessboardCornersSB`. It also makes global lines or a homography model not applicable.

The approach is topological, inspired by [Topological Grid Finding](atlas/shu-topological-grid). It is also the idea behind the topological grid finder in the [projective-grid](https://crates.io/crates/projective-grid) crate.

> maybe delete this paragraph?

The method starts locally. It first connects nearby corners into plausible cells, then uses the grid topology to remove inconsistent detections and assign integer coordinates. Geometric models such as homographies or grid lines can still be used later, after the structure is known.

We will use this image to illustrate all the steps.

![](../images/02-topo-grid/GeminiChess1/00-input.png)

# 2. Grid as a graph

We start from a set of candidate X-junctions like the ones shown below (I use [my implementation](https://github.com/VitalyVorobyev/chess-corners-rs) of X-junction detector that provides local grid orientations, also indicated in the overlay).

![](../images/02-topo-grid/GeminiChess1/01-corners-axes.png)

> I don't think "combinatorial" adds any value or clarity

Now the problem becomes combinatorial. We need to decide which corners are neighbors, which groups of four corners form grid cells, and how to assign consistent integer coordinates to all connected corners.

This is naturally a graph problem:

- detected corners are nodes,
- possible neighbor relations are edges,
- grid cells are quadrilaterals,
- the recovered board is a connected component with regular grid topology.

The topological approach starts by building a candidate graph from the detected points. This graph does not need to be perfect. It only needs to contain enough correct local connections so that invalid edges and false detections can be removed later.

## Delaunay triangulation as a candidate graph

[Shu, Brunton, and Fiala](atlas/shu-topological-grid) suggest starting with Delaunay triangulation of the detected corners.

:::definition[Delaunay triangulation]
Delaunay triangulation connects a set of points into triangles such that no point lies inside the circumcircle of any triangle.
:::

> "useful" is a wrong word here I think. It is not useful, it is the core of the approach

This is useful because Delaunay triangulation tends to connect nearby points. For a regular grid, it usually contains the true neighbor connections, plus one diagonal inside each grid cell. On the test image, this gives:

![](../images/02-topo-grid/GeminiChess1/03-delaunay-edge-kinds.png)

The method does not fit lines through the corner cloud - it only uses local connections between nearby points. This is what makes it usable when grid rows do not project to straight image lines.

:::illustration[delaunay-voronoi]{preset="compact"}
:::

# 3. From triangles to cells

Delaunay triangulation gives triangles, but a chessboard grid is made of quadrilateral cells. For each board square, the triangulation usually creates two triangles separated by one diagonal.

First step after triangulation is classification of edges in three categories: *grid*, `diagonal`, and `spurious`.

An edge is promoted to `grid` if it is aligned with both its endpoints withing tollerance $\sigma$. Default value is $15^{\circ}$.

After the first pass, diagonals are inferred per triangle. If triangle has exactly two `grid` edges, then the remaining edge is promoted to `diagonal`.

Edges not classified as `grid` or `diagonal` are assigned as `spurious`.

Only `mergable` triangles containing two `grid` and one `diagonal` edges take part in the grid formation. Two `mergable` triangles that share the same diagonal are merged into quadrilateral by removing the diagonal and enumerating the four vertices clockwise around their centroid, so that the top-left corner has index `0`.

The next overlay show all mergable triangle pairs. For the test image it gives the complete correct set of quadrilaterals.

![](../images/02-topo-grid/GeminiChess1/04-mergeable-triangles.png)

# 4. Filtering the quad mesh

After triangle merging, we have a set of quadrilateral cell candidates. In a clean image, this usually enough (as it is for our test image). In harder images, false corner detections, background texture, noise, or missing corners can create wrong cells.

The Shu, Brunton, and Fiala filter these candidates using topology before applying geometric checks.

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

## Geometry filters

After the topological filter, geometric checks can be applied.

**Opposing-edge ratio filter**. For each quad, compute lengths of its edges $l_{01}$, $l_{12}$, $l_{23}$, $l_{30}$ and compute

$$
r_1 = \max(l_{01}, l_{23}) / \min(l_{01}, l_{23}),
r_1 = \max(l_{12}, l_{30}) / \min(l_{12}, l_{30}),
r_{max} = \max(r_1, r_2).
$$

If $r_{max}$ is larger than a threshold $r^*$ (default value is $10$), then the quadrilateral is rejected. This does not require a cell to look like a square. The threshold is intentionally weak and only removes candidates with clearly unreasonable shape.

*Per-component cell-size filter*. At this point I build connected components from the remaining quadrilaterals. For each component median edge length and reject quads whose shortest or longest edge falls outside

$$
[quad_edge_min_rel, quad_edge_max_rel] * component_median
$$

with default values $quad_edge_min_rel = 0.0$ and $quad_edge_max_rel = 1.8$. This filter removes cells accidentally formed across missing corners.

It all looks (and is) a bit *ad hoc* and not systematic, but my experiments proved that it gives good results for practical detection. In summary:

* Edge degree filter rejects impossible grid connectivity;
* Edge-ratio and medial-size filters catch not plausible and skipped-cell quads.

![](../images/02-topo-grid/GeminiChess1/05-raw-quads.png)

# 5. Ordering the grid

After filtering, we have a mesh of quadrilateral cells. This is still not enough for calibration. We need to assign each detected corner a position in the board coordinate system: `(0, 0)`, `(1, 0)`, `(2, 0)`, and so on.

This can be done by walking through the quad mesh. Start from one cell, assign integer coordinates to its four corners, then visit neighboring cells through shared edges and propagate the coordinates.

The important point is that this step uses mesh connectivity, not straight image lines. The image of a row can be curved by lens distortion, but the next corner in the row is still the next node in the graph.

This gives us the final output of the detector: image points with consistent integer grid coordinates.

![](../images/02-topo-grid/GeminiChess1/09-final-recovered-grid.png)

# 6. Using the library

Below are minimal examples that can be used to reproduce discussed here results

```rust
use calib_targets::chessboard::{DetectorParams, GraphBuildAlgorithm};
use calib_targets::detect;
use image::ImageReader;

let img = ImageReader::open("image.png")?.decode()?.to_luma8();
let mut params = DetectorParams::default();
params.graph_build_algorithm = GraphBuildAlgorithm::Topological;

let detection = detect::detect_chessboard(&img, &params)
    .ok_or("no chessboard detected")?;
```

See [Detection](https://vitalyvorobyev.github.io/calib-targets-rs/api/calib_targets_chessboard/detector/struct.Detection.html) for 

Besides the discussed in ths post logic, the `detect_chessboard` function also merges nearby components, appends corners that are not part of quadrilateral, but are aligned with the grid, and applied additional validations. I omit these details to focus on the main idea of topological grid detection.

The python code is

```python
import numpy as np
from PIL import Image
import calib_targets as ct

image = np.asarray(Image.open(path).convert("L"), dtype=np.uint8)
params = ct.ChessboardParams.for_topological()
result = ct.detect_chessboard(image, params=params)
```

## Performance

The test image is `800x436` pixels. Detection on my M4 MacBook Pro takes `1.27ms`, where `1.14ms` takes X-junction detection and all following grid-related logic taked `0.13ms`. This can me speed-up by using image pyramid in X-junction detection.

# 7. More examples

Before concluding this post, I want to show a couple more examples

The first one is partially occluded chessboard:

![](../images/02-topo-grid/GeminiChess2/03-delaunay-edge-kinds.png)
![](../images/02-topo-grid/GeminiChess2/09-final-recovered-grid.png)

One detail here is that there are two connected components of quadrilaterals are initially detected. The algorithm has tools to merge different components. This goes beyond scope of this blog.

The second example is an image of [PuzzleBoard](atlas/puzzleboard).

![](../images/02-topo-grid/example2/03-delaunay-edge-kinds.png)
![](../images/02-topo-grid/example2/09-final-recovered-grid.png)

Note that in the bottom left corner the distortion are so strong that Delaunay triangulation doesn't reflect the board structure and some corners are lost.

# Summary

Simplisity and minimal geometry assumptions of the topological grid detector make it a very good practical tool. Its performance is suitable for online detection. It works in the condition of significant optical distortions.

This approach has clear limitations. It cannot be used for ChArUco targets. Marker interiors contain many extra corners, and some of them can form locally plausible cells.

Delaunay triangulation also has a geometric limit: it is not projective invariant. At very oblique viewing angles, it can connect points that are not real grid neighbors. In practice, these views are rare and usually not the best views for calibration.
