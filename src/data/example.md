---
title: Camera Calibration and PnP
date: 2026-10-24
---

# Solving Perspective-n-Point

The **Perspective-n-Point (PnP)** problem is the problem of estimating the pose of a calibrated camera given a set of $n$ 3D points in the world and their corresponding 2D projections in the image. 

It has many applications, such as augmented reality, robotics, and computer vision.

## Mathematical Formulation

Given a set of $n$ 3D points $P_i$ and their corresponding 2D projections $p_i$, we want to find the rotation matrix $R$ and translation vector $t$ that minimizes the reprojection error:

$$
E = \sum_{i=1}^n \left\| p_i - \pi(R P_i + t) \right\|^2
$$

where $\pi(X)$ is the projection function mapping a 3D point $X$ to its 2D coordinates in the image plane according to the pinhole camera model.

```python
import cv2
import numpy as np

# Example PnP solver usage
success, rotation_vector, translation_vector = cv2.solvePnP(
    object_points, 
    image_points, 
    camera_matrix, 
    dist_coeffs
)
```

The error minimization is non-linear and generally solved via Levenberg-Marquardt optimization following a closed-form DLT (Direct Linear Transformation) initialization.
