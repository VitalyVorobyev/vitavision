---
source_id: repo-princeton-vl-raft
kind: repo
title: "RAFT (official implementation)"
repo: https://github.com/princeton-vl/RAFT
commit: 2888e15a51fa41140771d3f498ed8023cff098d1
license: BSD-3-Clause
created: 2026-09-15
relevant_atlas_pages: [raft]
---

# Repository scope

Official PyTorch implementation of "RAFT: Recurrent All-Pairs Field
Transforms for Optical Flow" (Teed & Deng, ECCV 2020), maintained by the
paper's authors' lab (Princeton Vision & Learning). Provides the model
definition (`core/raft.py`, feature/context encoders, correlation volume,
ConvGRU update block), training and evaluation scripts, and pretrained
checkpoint download instructions.

# Architecture

Mirrors the paper: `core/extractor.py` (feature + context encoders),
`core/corr.py` (all-pairs correlation volume + pyramid), `core/update.py`
(ConvGRU update operator + learned convex upsampling), `core/raft.py`
(top-level forward pass wiring the pieces together per Eqs. 1-7 of the
paper).

# Failure regime

Not separately documented in the repository beyond the paper's own ablations.

# Maintenance signal

Repository is effectively frozen (no active development beyond the
2020 release plus minor fixes); commit pinned at `2888e15a` (`master`
HEAD as of 2026-09-15).

# Applicability

Reference implementation for the RAFT model page. LICENSE file at the
pinned commit reads verbatim:

```
BSD 3-Clause License

Copyright (c) 2020, princeton-vl
All rights reserved.
```

followed by the standard 3-clause BSD redistribution/warranty text —
confirms `license: BSD-3-Clause` for both code and (per repository
convention) the linked pretrained checkpoints.

# Connections

- Reference implementation for the primary source `teed2020-raft`.

# Atlas update plan

Used as the `implementations[0]` entry (role: official, framework: pytorch,
license: BSD-3-Clause) on `content/models/raft.md`.

# Provenance

- LICENSE file fetched from
  `https://raw.githubusercontent.com/princeton-vl/RAFT/2888e15a51fa41140771d3f498ed8023cff098d1/LICENSE`
  on 2026-09-15; verbatim BSD-3-Clause header confirmed above.
