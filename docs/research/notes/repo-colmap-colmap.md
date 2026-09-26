---
source_id: repo-colmap-colmap
kind: repo
title: "COLMAP"
repo: https://github.com/colmap/colmap
commit: be5e29168d4aff238409d60424812df66aac919f
license: BSD-3-Clause
created: 2026-09-15
relevant_atlas_pages: [colmap]
---

# Repository scope

Open-source C++ structure-from-motion (SfM) and multi-view stereo (MVS)
pipeline. Implements the incremental-SfM improvements of Schönberger &
Frahm's "Structure-from-Motion Revisited" (CVPR 2016) — the paper this
repository accompanies (Abstract: "COMPILE reference implementation is
released as part of COLMAP" is the paper's own framing).

# Architecture

`src/colmap/controllers/incremental_pipeline.{h,cc}` implements the
incremental reconstruction loop (initialization, next-best-view
registration, triangulation, bundle adjustment, redundant-view mining)
described in the paper's §4. `src/colmap/controllers/bundle_adjustment.{h,cc}`
implements the BA controller referenced by the grouped-BA parameterization
(Eq. 7 of the paper).

# Failure regime

Not separately documented here; see the paper's own Failure regime notes
in `docs/research/notes/schonberger2016-colmap.md`.

# Maintenance signal

Actively maintained; tagged releases (e.g. `4.2.0`) exist well past the
2016 paper. Commit pinned to the `4.2.0` release tag
(`be5e29168d4aff238409d60424812df66aac919f`) rather than an unpinned branch
HEAD.

# Applicability

Reference implementation for the COLMAP algorithm page's `sources.impl`.
The automated `LICENSE` candidate list (`LICENSE`, `LICENSE.md`,
`LICENSE.txt`, `COPYING`) missed this repository's actual file, which is
named `COPYING.txt`. Fetched directly:
`https://raw.githubusercontent.com/colmap/colmap/be5e29168d4aff238409d60424812df66aac919f/COPYING.txt`.
Verbatim opening lines:

```
The COLMAP library is licensed under the new BSD license. Note that this text
refers only to the license for COLMAP itself, independent of its dependencies,
which are separately licensed. Building COLMAP with these dependencies may
affect the resulting COLMAP license.

    Copyright (c), ETH Zurich and UNC Chapel Hill.
    All rights reserved.
```

followed by the standard 3-clause BSD redistribution/warranty text —
confirms `license: BSD-3-Clause`.

# Connections

- Reference implementation for the primary source `schonberger2016-colmap`.

# Atlas update plan

Used as `sources.impl` (repo, commit `be5e29168d`, files
`src/colmap/controllers/incremental_pipeline.h`,
`src/colmap/controllers/incremental_pipeline.cc`) on
`content/algorithms/colmap.md`.

# Provenance

- Tag list fetched from `https://api.github.com/repos/colmap/colmap/tags`
  on 2026-09-15; `4.2.0` → `be5e29168d4aff238409d60424812df66aac919f`.
- License file located via
  `https://api.github.com/repos/colmap/colmap/contents/?ref=be5e29168d4aff238409d60424812df66aac919f`
  (file name `COPYING.txt`, not the script's default candidate list).
