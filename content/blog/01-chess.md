---
title: "Implementing ChESS Corners in Rust"
date: 2026-03-20
summary: "A chessboard-specific detector, from sampling geometry to a practical multiscale implementation."
tags: ["computer-vision", "rust", "calibration", "feature-detection"]
author: "Vitaly Vorobyev"
draft: true
repoLinks: ["https://github.com/vitalyvorobyev/chess-corners-rs"]
relatedAlgorithms: ["chess-corners"]
---

Here’s a full outline you can actually write from, not just brainstorm from.

I’m assuming the target is a **technical foundation post** for Vitavision: strong enough to stand alone, but also positioned to anchor follow-up posts on calibration, multiscale refinement, and subpixel/ML refinement. The core factual spine below is aligned with the original ChESS paper and with the current structure and documented behavior of `chess-corners-rs`, including the lean `chess-corners-core` crate, the higher-level `chess-corners` facade, the canonical `R5`/`R10` ring setup, the pyramid-based coarse-to-fine path, and the current performance/ML caveats. ([arXiv][1])

# Working title

**Implementing ChESS Corners in Rust**

Subtitle option:

**A chessboard-specific detector, from sampling geometry to a practical multiscale implementation**

# Article goal

Show that ChESS is still worth implementing today because chessboard corners are not generic “corners,” but structured X-junctions; then show how that specialization becomes a clean, fast Rust implementation with a small core, a practical multiscale wrapper, and explicit tuning knobs. The repo’s documented emphasis is exactly that: a classical detector for chessboard X-junctions, with real-time performance paths, subpixel refinement, and an optional but clearly caveated ML-backed refiner. ([arXiv][1])

# Target size

Aim for **3,400–4,100 words** total. That is enough for a 24–28 minute technical read without bloating the piece.

# Recommended article flow

## 0. Opening hook — “Most corner detectors solve the wrong problem here”

**Target:** 220–320 words

### Purpose

Open with a concrete failure mode, not theory. The first paragraph should make the reader feel the problem immediately.

### What this section says

Start with a calibration image and a blunt observation:

* Harris or FAST will happily detect lots of “interesting” points.
* But calibration does not want “interesting” points.
* It wants one very specific structure: the intersection of four alternating quadrants.

Then pivot:

> That is the reason a detector like ChESS exists: it is not a general corner detector with better thresholds. It is a detector for one geometric pattern.

This matches the original paper’s framing and your repo/book framing of ChESS as a detector designed specifically for chessboard X-junctions rather than generic corners. ([arXiv][1])

### Suggested figure

**Figure 1 — Generic corners vs chessboard corners**

A side-by-side visual:

* left: Harris/FAST-style interest points on a checkerboard image
* right: only chessboard intersections highlighted

### Caption intent

“Generic detectors find many corners; ChESS asks a narrower question.”

### Writing note

Do not begin with history. Begin with pain.

### Transition out

> If the target geometry is special, the detector should encode that geometry directly.

---

## 1. Why a chessboard-specific detector exists

**Target:** 350–450 words

### Purpose

Frame ChESS against generic detectors without turning the article into a literature survey.

### Core points

Explain:

* A chessboard corner is an **X-junction**, not just a place with strong local gradient change.
* The detector can therefore assume an alternating black/white structure around the center.
* That prior buys selectivity: fewer responses to edges, blobs, and texture.

Keep comparisons minimal:

* Harris / Shi-Tomasi / FAST are useful baselines
* but they are not specialized to this target geometry

The ChESS paper explicitly positions the method as a detector designed to respond exclusively to chessboard vertices, with robustness to noise, lighting, and contrast issues, and notes applications in calibration and structured-light reconstruction. Your orientation chapter makes the same point in more implementation-friendly language. ([arXiv][1])

### Suggested figure

**Figure 2 — What counts as a positive for ChESS**

Mini panel with:

* edge
* blob
* random texture
* true chessboard X-junction

Mark only the X-junction as a positive.

### Code / source anchor

No code yet. Keep this conceptual.

### Transition out

> Once you accept that the target is an X-junction, the natural question becomes: what local measurement best distinguishes that pattern from everything else?

---

## 2. The ChESS response: from geometry to formula

**Target:** 700–900 words

### Purpose

This is the conceptual center of the article.

### Section structure

Break it into four subparts.

### 2.1 The 16-sample ring

Explain that ChESS samples a fixed ring around a candidate pixel and looks for the alternating intensity pattern expected from a chessboard intersection. Your book describes the detector as a 16-point ring test with a square term, a difference term, and a consistency term; the core internals chapter documents the canonical 16-sample ring and notes that the ordering is clockwise from the top. ([GitHub][2])

### 2.2 The square term

Explain that opposite parts of the ring should agree in a checkerboard-like way when the center is on an X-junction.

The reader does not need a proof. They need intuition:

* alternating quadrants
* periodic structure on the ring
* strong positive response when the pattern matches

### 2.3 The difference term

Explain why an edge can also create strong contrast on a ring, and why you need a penalty for edge-like structures.

### 2.4 The local mean penalty

Explain the role of comparing the ring mean to a small center neighborhood. Your orientation chapter describes this as comparing the ring mean to a 5-pixel central cross to suppress isolated blobs and enforce local consistency. ([GitHub][2])

### Equation treatment

Show one clean final formula, visually decomposed rather than dumped.

Use a schematic like:

* **SR**: rewards checkerboard alternation
* **DR**: penalizes edge responses
* **mean penalty**: discourages blob-like or inconsistent structures

### Suggested figures

**Figure 3 — Ring sampling diagram**
The 16 ring points around the center pixel, with ordering and opposite-point groupings.

**Figure 4 — Response decomposition**
A visual formula card:
`R = SR - DR - 16|μ_ring - μ_local|`

**Figure 5 — Why edges fail**
One ring over an edge, one ring over a true corner.

### Caption intent

Show that the detector is not magic; it is explicitly encoding one local symmetry and two ways that symmetry can be faked.

### Code / source anchor

Still mostly math, but you can foreshadow:

* `crates/chess-corners-core/src/ring.rs`
* `crates/chess-corners-core/src/response.rs`

Those file names are explicitly referenced by the repo book. ([GitHub][3])

### Transition out

> The paper gives the detector idea. The engineering work starts when you decide how to turn that response into a stable, usable library.

---

## 3. What the Rust core actually implements

**Target:** 800–1,000 words

### Purpose

Move from detector theory into implementation.

### Section structure

### 3.1 Core crate boundary

Explain that `chess-corners-core` is the small numerical heart:

* ring definitions
* dense response computation
* border handling
* thresholding
* NMS
* candidate-to-descriptor path

Your core internals chapter says exactly that and emphasizes a small public API whose feature flags affect performance and observability, not numerical results. ([GitHub][3])

### 3.2 Canonical rings: `R5` and `R10`

Explain:

* `R5` is the canonical ring
* `R10` is a scaled version for heavier blur / larger footprint cases
* border margin and footprint increase when using `R10`

The repo book documents `RingOffsets`, `RING5`, `RING10`, and the `use_radius10` / `descriptor_use_radius10` controls. The repo README also surfaces `radius10` as a practical knob for heavy blur or very small boards. ([GitHub][3])

### 3.3 Dense response map

Explain the implementation strategy:

* compute response everywhere the ring fits
* zero the border where full sampling is impossible
* produce a dense response image first, not scattered ad hoc tests

Your book explicitly says `chess_response_u8` computes the ChESS response for each valid pixel center and sets unsupported border responses to zero. ([GitHub][3])

### 3.4 Thresholding, NMS, and cluster filtering

Explain why the raw response map is not the final answer:

* thresholding removes weak responses
* NMS enforces local uniqueness
* cluster filtering suppresses tiny junk groups

This matches your orientation chapter’s summary of thresholding, non-maximum suppression, and a small cluster filter after the response stage. The README exposes `threshold_rel`, `threshold_abs`, `nms_radius`, and `min_cluster_size` as real user-facing knobs. ([GitHub][2])

### 3.5 Subpixel refinement and descriptors

Explain that the response stage gives approximate candidates; then the crate refines location and returns richer descriptors including subpixel position, response, and orientation. The repo README documents pluggable refiners such as center-of-mass, Förstner, and saddle-point, and lists orientation as part of the corner descriptor. ([GitHub][4])

### Suggested figures

**Figure 6 — Detector pipeline**
`grayscale → response map → threshold → NMS → cluster filter → subpixel refine → descriptor`

**Figure 7 — Border handling**
Small diagram showing valid vs invalid sampling near image edges.

### Suggested code excerpts

Keep code snippets very short and explanatory:

* ring selection API
* response function signature
* config snippet with threshold and radius choices

### Exact files to cite in the article body

* `crates/chess-corners-core/src/ring.rs`
* `crates/chess-corners-core/src/response.rs`
* `crates/chess-corners-core/src/lib.rs`

Those are the safest concrete anchors from the repo docs. ([GitHub][3])

### Transition out

> A good detector core should stay small. The rest of the complexity belongs at the edges: image integration, pyramids, and user-facing ergonomics.

---

## 4. Why the crate is split the way it is

**Target:** 300–420 words

### Purpose

Explain the architectural decision, not just the repo layout.

### Core points

Explain the split as deliberate:

* `chess-corners-core` is the lean algorithm crate
* `chess-corners` is the ergonomic facade
* optional layers such as `image`, multiscale, CLI, Python bindings, and ML refinement should not bloat the detector core

The repo README explicitly describes the two-crate structure this way and lists optional integration layers such as multiscale, Python bindings, and the optional ML refiner. ([GitHub][4])

### Suggested figure

**Figure 8 — Workspace layering**
A simple stack:

* applications / bindings / CLI
* `chess-corners`
* `chess-corners-core`

### Caption intent

“Algorithmic core first; ergonomics and integrations on top.”

### Writing note

This section should feel like engineering taste, not crate-tourism.

### Transition out

> That split matters most when you add scale handling, because multiscale is where a neat detector often turns into a messy system.

---

## 5. Multiscale without hand-waving

**Target:** 650–850 words

### Purpose

Show how the implementation becomes practical.

### Section structure

### 5.1 Why single-scale is not enough

Describe the real failure cases:

* small boards in large images
* blur
* perspective-induced local scale change
* the cost of scanning full resolution aggressively

Your multiscale chapter opens from exactly this practical standpoint: scale and blur vary in real images, and a board may occupy only a small region of a larger frame. ([GitHub][5])

### 5.2 Pyramid design

Explain the pyramid simply:

* grayscale only
* fixed 2× downsampling
* minimal structure, not a general image-processing framework

The book says `crates/chess-corners/src/pyramid.rs` implements a minimal grayscale pyramid builder with fixed 2× downsampling and optional acceleration. ([GitHub][5])

### 5.3 Coarse-to-fine detection

This is the heart of the section:

* build pyramid
* detect seeds on a smaller level
* refine in ROIs back in the base image
* merge duplicates

The README and book describe the higher-level crate as a coarse-to-fine multiscale detector with refinement radius and merge radius controls. ([GitHub][5])

### 5.4 Why this is better than “run detector everywhere at every scale”

Make the engineering case:

* less work
* better robustness under blur
* cleaner candidate set

### Suggested figures

**Figure 9 — Pyramid overview**
Base image + two or three levels.

**Figure 10 — Coarse seed / ROI refine / merge**
A flow diagram focused on actual data movement.

### Suggested code / file anchor

* `crates/chess-corners/src/pyramid.rs`
* config fields: `pyramid.num_levels`, `min_size`, `refinement_radius`, `merge_radius`

These are explicitly documented in the README and book. ([GitHub][5])

### Transition out

> Once you expose multiscale, the detector stops being a paper implementation and becomes a system with real knobs.

---

## 6. Practical tuning and real tradeoffs

**Target:** 450–600 words

### Purpose

This is the most useful section for practitioners.

### Organize by knob, not by theory

### 6.1 `threshold_rel` vs `threshold_abs`

Say clearly:

* relative threshold is the normal starting point
* absolute threshold makes sense only in tightly controlled pipelines

The README explicitly recommends `threshold_rel` in most cases and treats `threshold_abs` as a more controlled override. ([GitHub][4])

### 6.2 `use_radius10`

Use when:

* blur is strong
* board cells are very small in the image
* you can afford larger footprint / border loss

This is the documented purpose of the larger ring in both the book and README. ([GitHub][3])

### 6.3 `nms_radius` and `min_cluster_size`

Explain what goes wrong if these are too loose or too strict:

* too loose: duplicates and junk
* too strict: missed legitimate corners

### 6.4 When multiscale helps

Good cases:

* large images
* unknown board scale
* blur
* practical runtime pressure

### 6.5 Refiner choice

Briefly mention:

* center-of-mass as simple baseline
* Förstner / saddle-point as alternatives
* keep discussion short to avoid article sprawl

### Suggested figure

**Figure 11 — Tuning cheat sheet**
A compact visual mapping:

* symptom
* likely knob
* likely direction of change

### Writing note

Ground this section in “what you change first when results are bad.”

### Transition out

> The point of these knobs is not endless tuning. It is to make the detector stable across the image regimes that calibration pipelines actually see.

---

## 7. Performance, comparison, and honest claims

**Target:** 450–600 words

### Purpose

Give evidence without turning the post into a benchmark paper.

### Core points

Use one compact performance snapshot and one compact comparison note.

The current repo docs report that on a MacBook Pro M4, the recommended 3-level multiscale pipeline is dramatically faster than single-scale across the provided example images, with best documented totals around 0.4–0.5 ms on smaller images and about 1.6 ms on the large image with `simd+rayon`. The README also reports mean nearest-neighbor distance below about 0.2 px to OpenCV `findChessboardCornersSB` on a public stereo chessboard dataset, while the ML refiner is explicitly described as mainly validated on synthetic data and significantly slower. ([GitHub][6])

### What to include

Keep this section disciplined:

* one chart: single-scale vs multiscale; scalar vs `simd` / `rayon`
* one paragraph on OpenCV comparison
* one short paragraph on ML refiner status

### What not to do

Do not dump methodology details.
Do not overclaim ML.
Do not make the article about beating OpenCV.

### Suggested figures

**Figure 12 — Runtime chart**
Single-scale and multiscale bars.

**Figure 13 — Compact comparison visual**
Detected corners on one image:

* OpenCV output
* your detector output

### Writing note

Phrase the claims like an engineer:

* “here is what the current implementation demonstrates”
* “here is what remains provisional”

### Transition out

> The result is not a universal corner detector. It is a deliberately narrow tool that becomes very effective when its assumptions match the target.

---

## 8. What this implementation proves, and what it does not

**Target:** 220–320 words

### Purpose

End with credibility.

### What to say

State plainly:

It proves that:

* a specialized classical detector still matters
* the implementation can stay small and fast
* multiscale turns the paper idea into a practical detector

It does not prove that:

* ChESS replaces generic feature detectors everywhere
* the optional ML refiner is universally better in real scenes
* every calibration board variant should be handled by the exact same tuning

The paper and repo both support the narrow-strong framing: ChESS is for chessboard vertices specifically, and your current ML story is intentionally limited in scope. ([arXiv][1])

### Suggested final paragraph

End by teeing up the next post:

> Detecting corners is only the first half of the calibration story. The next step is turning those corners into a consistent board model, ordering them, and feeding them into camera estimation.

---

## 9. CTA and series bridge

**Target:** 80–140 words

### Suggested CTA

Add two links at the end:

* repo
* interactive lab/demo

And one “next in series” link:

* calibration pipeline post
  or
* subpixel refinement deep dive

That will fit Vitavision better than a generic “thanks for reading.”

---

# Figure list with production intent

1. Generic corners vs chessboard corners
2. Positive/negative local structures for ChESS
3. 16-point ring sampling diagram
4. Response formula decomposition
5. Edge vs X-junction response intuition
6. Detector pipeline
7. Border handling / valid support region
8. Workspace split diagram
9. Pyramid levels overview
10. Coarse seed → ROI refine → duplicate merge
11. Tuning cheat sheet
12. Runtime chart
13. Compact comparison image

If you want to keep it lighter, cut 2, 7, and 13 first.

# Best code anchors to cite in the article

These are the cleanest repo references surfaced by the current repo docs:

* `crates/chess-corners-core/src/ring.rs`
* `crates/chess-corners-core/src/response.rs`
* `crates/chess-corners-core/src/lib.rs`
* `crates/chess-corners/src/pyramid.rs`

Those are explicitly called out in the book, and the README ties them to the public config surface and crate split. ([GitHub][3])

# Recommended omissions

Keep these out of the first article body:

* full benchmark methodology
* tracing internals
* Python binding details
* frontend/editor/backend integration
* deep ML training details
* broad corner detector survey

That keeps the post from losing its center.

# Best opening paragraph candidate

You could open almost like this:

> Most corner detectors are designed to answer a broad question: where is the image locally interesting?
> Calibration does not want broad answers. It wants a very specific structure repeated many times: the X-junction formed where four chessboard squares meet. ChESS is compelling for exactly that reason. It bakes the target geometry into the detector itself.

# Best closing paragraph candidate

> ChESS is a good reminder that not every vision problem benefits from more generality. When the target structure is known, specialization can buy both speed and reliability. In Rust, that specialization can live in a small, explicit core, with multiscale search and integration layers added only where they pay for themselves.

Next step that makes sense is turning this into a **writer-ready draft skeleton** with section headers, paragraph prompts, and callouts for where each figure should appear.

[1]: https://arxiv.org/abs/1301.5491 "[1301.5491] ChESS - Quick and Robust Detection of Chess-board Features"
[2]: https://raw.githubusercontent.com/VitalyVorobyev/chess-corners-rs/main/book/src/part-01-orientation.md "raw.githubusercontent.com"
[3]: https://raw.githubusercontent.com/VitalyVorobyev/chess-corners-rs/main/book/src/part-03-core-chess-internals.md "raw.githubusercontent.com"
[4]: https://github.com/VitalyVorobyev/chess-corners-rs?utm_source=chatgpt.com "VitalyVorobyev/chess-corners-rs"
[5]: https://raw.githubusercontent.com/VitalyVorobyev/chess-corners-rs/main/book/src/part-04-multiscale-and-pyramids.md "raw.githubusercontent.com"
[6]: https://raw.githubusercontent.com/VitalyVorobyev/chess-corners-rs/main/book/src/part-05-performance-and-integration.md "raw.githubusercontent.com"
