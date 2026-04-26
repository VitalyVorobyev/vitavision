---
title: "Delaunay Triangulation & Voronoi Diagrams"
date: 2026-04-26
summary: "Interactive construction of Delaunay triangulations and dual Voronoi diagrams, with a draggable projective grid to explore how calibration patterns deform under perspective."
tags: ["computer-vision", "geometry", "interactive"]
author: "Vitaly Vorobyev"
category: "interactive-figure"
componentId: "delaunay-voronoi"
relatedAlgorithms: []
relatedPosts: []
---

Given a set of points in the plane, the **Delaunay triangulation** connects them into triangles such that no point lies inside the circumcircle of any triangle. This *empty-circle property* maximises the minimum angle across all triangles, producing a mesh that avoids the thin, degenerate slivers that plague naive triangulations. The algorithm underpins mesh generation, surface reconstruction, and proximity queries throughout computational geometry.

The **Voronoi diagram** is the Delaunay dual: each Voronoi cell collects every location in the plane that is closer to one seed point than to any other. Every Delaunay edge separates exactly two Voronoi cells, and every Voronoi vertex is the circumcentre of a Delaunay triangle. Toggling both overlays simultaneously reveals this duality directly in the figure.

The projective grid overlay adds a calibration-relevant dimension. Real checkerboard or ring-grid targets are photographed at an angle, so their regular lattice arrives at the camera as a perspective-distorted quadrilateral. Dragging the four corner handles reprojects the grid via a homography, showing how an evenly-spaced grid warps under a projective transform. The deformed grid points participate in the triangulation alongside any manually placed points, illustrating how detection algorithms must reason about point configurations that are geometrically structured yet perspectively distorted.

Click an empty area to add a point. Drag any point to move it. Select a point and press Delete to remove it.
