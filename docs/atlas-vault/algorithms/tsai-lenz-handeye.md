---
title: "Tsai-Lenz Hand-Eye Calibration"
type: algorithm
slug: tsai-lenz-handeye
---

> Generated stub — do not edit. Source: `content/algorithms/tsai-lenz-handeye.md`.

Recover the constant rigid transform from a robot gripper to a rigidly mounted camera by solving the AX=XB equation in two stages — modified Rodrigues rotation, then translation.

## Lineage

- **Alternative formulation of** — [[daniilidis-dual-quaternion-handeye]]
  > Daniilidis's dual-quaternion solver couples rotation and translation simultaneously; both methods remain in practitioner use.

## Sources

- Primary: [[tsai1989-handeye]]
- Reference: [[shiu1989-calibration]]
- Reference: [[tsai1987-versatile]]
