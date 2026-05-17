---
paper_id: crow1984-summed-area
title: "Summed-area tables for texture mapping"
authors: ["F. C. Crow"]
year: 1984
url: https://doi.org/10.1145/964965.808600
created: 2026-05-17
relevant_atlas_pages: [integral-image]
---

# Setting

**Problem class.** Texture-map antialiasing in computer-synthesised raster images. When a texture image is projected onto a 3-D surface and viewed in perspective, each output pixel covers a different — often very large — axis-aligned region of the texture. Nearest-pixel sampling produces aliasing; the correct answer is the average intensity over that region.

**Inputs.** A 2-D discrete texture image of arbitrary size; for each output pixel, the four texture-space coordinates that bound its footprint (xl, xr, yb, yt — left/right column and bottom/top row, respectively, in texture space).

**Outputs.** The average (or sum) of texture intensities over the specified axis-aligned rectangle, computed in O(1) table lookups regardless of region size.

**Preconditions.** The texture must be stored as a fixed, precomputed raster. The filter is box-only (uniform weighting within the rectangle); the table must be recomputed if the texture changes.

# Core idea

Build a single precomputed table $T$ where every entry $T[x, y]$ holds the sum of all texture intensities in the rectangle from the lower-left corner of the image to pixel $(x, y)$. Given this table, the sum of intensities over any axis-aligned rectangle bounded by columns $x_l$, $x_r$ and rows $y_b$, $y_t$ is recovered with exactly four table reads and three additions:

$$S = T[x_r, y_t] - T[x_r, y_b] - T[x_l, y_t] + T[x_l, y_b]$$

Dividing $S$ by the rectangle's area gives the average intensity. The subtraction removes the accumulated sums below and to the left of the rectangle; the final addition restores the doubly-subtracted lower-left corner. The table is built incrementally at a cost of two or three additions per entry (see §3.0). The method is pitched as a drop-in improvement over Williams' mip-map: it handles non-square (rectangular) filter footprints, which is important where texture is compressed asymmetrically along one axis (e.g., near the poles of a sphere).

# Assumptions

1. **Axis-aligned rectangle only (hard).** The filter region must be an axis-aligned bounding box in texture space. Rotated or arbitrarily shaped footprints cannot be evaluated from a single summed-area table; the paper explicitly notes "only a constant filter function is possible" because sums are precomputed (§2.1).
2. **Box filter only (hard).** Weighting within the rectangle is uniform. A spatially varying weight function (e.g., Gaussian) cannot be folded in at query time without additional tables. Crow acknowledges "the more accurate (and expensive) techniques of Blinn and Feibush et al." as the reference standard when smooth weighting is required (§2.1, §3.0).
3. **Static texture (hard).** The table must be recomputed whenever the underlying texture changes; there is no incremental update scheme described.
4. **Sufficient numerical precision (soft).** The table entries accumulate all pixel values to the lower-left; entries can therefore be as large as the sum of the entire image. For an 8-bit texture of 1024×1024 pixels the maximum entry requires approximately 28 bits (§3.0). In practice the table degrades gracefully as precision is reduced — rounding introduces a small additive error in each rectangular sum — but the error grows with region size.
5. **Texture coordinates computable per pixel (soft).** The paper assumes per-pixel texture-coordinate interpolation. If coordinates are unavailable or too coarse, the rectangle bounds cannot be determined.

# Failure regime

- **Asymmetric or rotated footprints.** Where texture is compressed along only one dimension, the axis-aligned bounding box overestimates the true footprint, producing unnecessary blurring. Crow notes this is already an improvement over mip-maps, which force a square region aligned to the axis of maximum compression and thus blur even more (§1.0, comparing with Williams' technique). No in-table remedy exists for rotated footprints.
- **Replication boundaries.** When a texture tiles across a surface, pixel footprints can straddle tile boundaries. Crow's §2.4 describes a correction: entries to the right or above a boundary must be incremented by the boundary's accumulated value, and multiple whole-image additions may be needed in extreme cases. Without this correction, tiling produces incorrect averages.
- **Floating-point or fixed-point overflow.** On hardware that cannot accumulate beyond 24–32 bits, either the texture must be restricted to 256×256 pixels, or a tiled variant with a separate per-tile offset table is required (§3.0 describes a 16×16-pixel tiling trick). Exceeding available precision silently corrupts every rectangle sum in the affected region.

# Numerical sensitivity

The central numerical concern is **dynamic-range accumulation**. Each entry $T[x,y]$ is the sum of $(x+1)(y+1)$ pixel values. For an 8-bit texture with intensity range $[0, 255]$ on a $W \times H$ image, the maximum entry is $255 \cdot W \cdot H$. Crow works out the concrete case: a 1024×1024 texture requires entries up to $255 \cdot 1024^2 \approx 2.67 \times 10^8$, which needs $\lceil \log_2(2.67 \times 10^8) \rceil = 28$ bits (§3.0).

Crow's storage/precision comparison (§3.0):

- **32-bit entries** — straightforward, no restriction on image size; standard word size on contemporary hardware, so no alignment penalty.
- **24-bit entries** — require restricting texture to 256×256 pixels to keep entries within 24 bits. Most machines handle 32-bit words more gracefully, making this restriction unattractive.
- **16-bit entries with tiling** — a 32-bit base value is stored per 16×16-pixel tile (covering its lower-left corner), and 16-bit residuals are stored within tiles. Effective precision is ~14 bits per entry after accounting for the 2-bit overhead of the per-tile word, making this approach unattractive on any architecture where 32-bit is native.

For the box-filter rectangle sum, the cancellation structure $T[x_r,y_t] - T[x_r,y_b] - T[x_l,y_t] + T[x_l,y_b]$ can suffer from **catastrophic cancellation** when the rectangle is small relative to the image: all four table entries are large numbers of similar magnitude, and the difference is small. This is the same issue that plagues integral-image-based Haar features at fine scales; Crow does not call it out explicitly, but the structure makes it unavoidable. Integer arithmetic avoids floating-point rounding here; 32-bit integers are exact for images up to $256^2$ pixels with 8-bit depth.

# Applicability

- **Use when:** the filter footprint can be approximated by an axis-aligned rectangle; the texture is static; constant-time queries over variable-size regions are needed; memory for a table $\sim2$–$4\times$ the source image size is available.
- **Don't use when:** filter footprints are rotated or anisotropically shaped beyond what a bounding-box approximation can tolerate; the texture is updated frequently; precision constraints limit entry width (e.g., 8-bit DSP); smooth (Gaussian or sinc) filtering is required.
- **Compared against:** Williams' multi-resolution mip map (pyramidal parametrics) — requires 1/3 more storage than the source image vs. 2–4× for the summed-area table, but is constrained to square filter regions and requires blending between two resolution levels; Blinn and Feibush et al.'s convolution-based filtering — more accurate, supports smooth weighting, but far more expensive per pixel (§1.0, §2.2, §4.0).

# Connections

- **Builds on:** Williams' pyramidal parametrics (mip map) [ref 10 in paper], Catmull's texture mapping [ref 3], Catmull & Smith's two-pass separable convolution [ref 4].
- **Enables:** Viola & Jones (2001) integral image for Haar-feature evaluation in face detection — the identical data structure, independently rediscovered and renamed for computer vision; any algorithm that needs O(1) rectangular-sum queries over a 2-D array.
- **Refutes / supersedes:** the claim that square filter regions (mip map) are necessary for constant-time texture filtering. Crow demonstrates that arbitrary-rectangle averaging is achievable in O(1) with comparable or lower computational cost.

# Atlas update plan

## UPDATE: integral-image

- **Frontmatter `sources.primary` — FACTUAL ERROR to correct.** The current `sources.primary: viola2001-detector` is incorrect. Viola & Jones (2001) reintroduced and renamed the summed-area table as the "integral image" for Haar-feature evaluation in face detection, but they did not originate the data structure. The originating paper is Crow (1984). Correct action: set `sources.primary: crow1984-summed-area` and move `viola2001-detector` into `sources.references[]`.

- **Section `Definition` — add accurate lineage paragraph.** The existing page already notes the structure is "also called a summed-area table"; this should be extended into a correct one-paragraph history: the structure was introduced by F. C. Crow (1984) under the name "summed-area table" for texture-map antialiasing in computer graphics, where it enabled arbitrary-rectangle averaging over texture images in constant time. Viola & Jones (2001) independently rediscovered and applied the same construction to 2-D image feature computation, coining the term "integral image". All downstream CV uses — Haar features, SURF, BRIEF descriptors, sliding-window detectors — trace to the Viola-Jones popularisation, but the mathematical origin is Crow 1984.

- **No `relations[]` change required.** The relationship between Crow 1984 and Viola-Jones 2001 is a `sources.primary` reassignment on `integral-image`, not a typed `relations[]` vocabulary entry between two separate concept/algorithm pages.

- **References list.** The existing page's prose References list already contains Crow 1984 as item 5 — only the frontmatter `sources` block and the Definition history sentence require correction.

# Provenance

All technical claims below are tied to the paper: F. C. Crow, "Summed-Area Tables for Texture Mapping", *ACM SIGGRAPH Computer Graphics*, Vol. 18, No. 3, July 1984, DOI 10.1145/964965.808600.

| Claim | Location in paper |
|---|---|
| Four-corner rectangle-sum formula $T[x_r,y_t]-T[x_r,y_b]-T[x_l,y_t]+T[x_l,y_b]$ | §2.1, Figure 2, p. 208; formula printed explicitly at top of p. 208 col. 1 |
| "only a constant filter function is possible" (box filter only) | §2.1, p. 208: "since the sums must be precomputed, only a constant filter function is possible" |
| Table-build cost of two or three adds per entry | §3.0, p. 209: "two adds per entry" (optimised scanline method); "three additive operations" (straightforward method) |
| 1024×1024, 8-bit texture requires 28-bit entries | §3.0, p. 209–210: "a 1024 by 1024 entry table could require entries as long as 28 bits" |
| 24-bit restriction: texture limited to 256×256 | §3.0, p. 210: "A table could be built with as little as 24 bits per entry by restricting texture images to 256 by 256 pixels" |
| 16×16 tiling trick; effective 14 bits per entry | §3.0, p. 250–258 (text): 32-bit quantity per 16-pixel-square region; "an overhead of 2 bits per entry, for an effective 14 bits per entry" |
| Mip-map storage increase: one-third; summed-area: factor 2–4 | §3.0, p. 210 (penultimate paragraph): "The number of bits per texture pixel is increased by only one-third … as opposed to a factor of from two to four for the summed area table" |
| Mip-map blurs asymmetrically compressed texture more than SAT | §1.0, p. 208: "mip mapped texture may appear fuzzier than would otherwise be necessary" |
| Arithmetic comparison: SAT requires 16 texture accesses, 14 multiplies, 27 adds vs. mip-map 8 accesses, 7 multiplies, 14 adds | §2.2, p. 209 |
| Replication boundary correction: multiple whole-image additions | §2.4, p. 209–210 |
| "the general notion of recovering the integral over a rectangular region of a function of two variables undoubtedly has broader application" | §4.0 (Conclusions), p. 210 — Crow himself anticipates future uses |
