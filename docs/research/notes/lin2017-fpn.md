---
paper_id: lin2017-fpn
title: "Feature Pyramid Networks for Object Detection"
authors: ["Tsung-Yi Lin", "Piotr Dollár", "Ross Girshick", "Kaiming He", "Bharath Hariharan", "Serge Belongie"]
year: 2017
url: https://arxiv.org/pdf/1612.03144
created: 2026-09-23
relevant_atlas_pages: [fpn, mask-rcnn, faster-rcnn, resnet, image-pyramid, unet-segmentation, fcn-semantic-segmentation, mask2former]
---

# Setting

Generic multi-scale feature extraction for ConvNet-based detectors. Input: a
single-scale RGB image of arbitrary size (no image pyramid at train or test
time). Output: a set of feature maps $\{P_2, P_3, P_4, P_5\}$ (plus $P_6$ for
RPN) at strides $\{4, 8, 16, 32, 64\}$ pixels relative to the input, each with
a fixed channel depth $d=256$ and, by construction, comparably strong
semantics at every level (§3). FPN is not itself a detector — it is a
backbone-output representation "of a generic nature and can be used in
various applications" (§1); the paper demonstrates it inside RPN
(bounding-box proposals), Fast R-CNN (object detection on those proposals),
and a DeepMask/SharpMask-style mask-proposal head (§6). It is architecture-
agnostic with respect to the backbone ("This process is independent of the
backbone convolutional architectures... in this paper we present results
using ResNets He2016", §3), though every reported result uses a ResNet-50/101
backbone.

# Core idea

A ConvNet's feedforward computation already produces a feature hierarchy of
decreasing spatial resolution and increasing semantic strength (the
"bottom-up pathway"). FPN adds a second, top-down pathway that upsamples the
coarsest, most-semantic map and fuses it via lateral connections with each
finer bottom-up map, so that **every** pyramid level ends up both
high-resolution *and* semantically strong — unlike (a) a single-scale featurized
image pyramid (accurate at all scales but slow: computing features
independently at each of several image resolutions), (b) a single feature map
from the top of the backbone (fast but weak at small objects), or (c) reusing
the backbone's own pyramidal hierarchy directly, SSD-style, without semantic
enrichment of the finer levels (Fig. 1, §1).

**Bottom-up pathway** (§3, "Bottom-up pathway"): the ordinary feedforward
backbone. Layers producing same-size output maps are grouped into "stages";
the last layer's output of each stage is kept as the pyramid's raw input set.
For ResNets, these are the last residual-block activations of each stage,
denoted $\{C_2, C_3, C_4, C_5\}$ (conv2–conv5 outputs), with strides
$\{4, 8, 16, 32\}$ px relative to the input. $C_1$ (stride 2) is excluded "due
to its large memory footprint."

**Top-down pathway and lateral connections** (§3, "Top-down pathway...";
Fig. 3): starting from a $1\times1$ conv on $C_5$ (producing the coarsest
pyramid map), each step (i) upsamples the current top-down map $2\times$ via
nearest-neighbor interpolation, (ii) reduces the channel dimension of the
matching bottom-up map $C_k$ with a $1\times1$ conv, (iii) merges the two by
element-wise addition, and (iv) applies a final $3\times3$ conv to the merged
map "to reduce the aliasing effect of upsampling." This yields
$\{P_2, P_3, P_4, P_5\}$ matching $\{C_2, C_3, C_4, C_5\}$ in spatial size.
All extra conv layers output $d=256$ channels ("we fix the feature dimension
... in all the feature maps"), and none of the extra layers has a
non-linearity ("empirically found to have minor impacts", §3).

**RPN on FPN** (§4.1): the original single-scale RPN head (one $3\times3$ conv
+ two sibling $1\times1$ convs for objectness/box-regression) is attached,
with shared weights, to every pyramid level. Because the head now slides over
multiple resolutions, each level gets a *single* anchor scale instead of
multiple: areas $\{32^2, 64^2, 128^2, 256^2, 512^2\}$ px on
$\{P_2, P_3, P_4, P_5, P_6\}$ respectively, each with 3 aspect ratios
$\{1{:}2, 1{:}1, 2{:}1\}$ — 15 anchors total over the pyramid (§4.1). $P_6$ is
introduced only to cover the $512^2$ anchor scale and is "simply a stride-two
subsampling of $P_5$"; it is not used by the Fast R-CNN head. Anchor
positive/negative labeling (IoU $\geq 0.7$ / $< 0.3$) follows Ren2015a
unchanged (§4.1).

**Fast R-CNN on FPN** (§4.2): RoIs of different scales must be assigned to
different pyramid levels. Treating the pyramid as if it were produced from an
image pyramid, an RoI of width $w$, height $h$ (on the input image) is
assigned to level $P_k$ by

$$k = \lfloor k_0 + \log_2(\sqrt{wh}/224) \rfloor \qquad (1)$$

where $224$ is the canonical ImageNet pre-training size and $k_0 = 4$ is set
"analogous to the ResNet-based Faster R-CNN system He2016 that uses $C_4$ as
the single-scale feature map" (§4.2, Eq. 1). RoI-pooled $7\times7$ features
from the assigned level feed a lightweight 2-fc (1024-d) head, replacing the
ResNet conv5 subnetwork used as the head in the single-scale ResNet Faster
R-CNN baseline, "since our method has already harnessed conv5 to construct
the feature pyramid" (§4.2).

# Claimed contributions

- C1: A generic in-network feature pyramid built "with marginal extra cost"
  from a ConvNet's own hierarchy, replacing the need to compute a true image
  pyramid ("Feature pyramids are a basic component... But recent deep
  learning object detectors have avoided pyramid representations, in part
  because they are compute and memory intensive... we exploit the inherent
  multi-scale, pyramidal hierarchy of deep convolutional networks", Abstract).
- C2: State-of-the-art single-model COCO detection result using FPN inside a
  "basic Faster R-CNN system," "surpassing all existing single-model entries
  including those from the COCO 2016 challenge winners" (Abstract; confirmed
  Table 4: test-dev AP 36.2 vs. prior best column-wise AP 35.7 and AP@0.5 59.1
  vs. prior best column-wise AP@0.5 55.7, §5.2.3).
- C3: Practical speed — "our method can run at 6 FPS on a GPU" (Abstract);
  mask-proposal variant runs at 6–7 FPS (§6.1).
- C4: Large ablation-measured gains over strong single-scale baselines: RPN
  Average Recall AR$^{1k}$ +8.0 points (Table 1, row a→c: 48.3→56.3, with
  AR$^{1k}_s$ +12.9); Faster R-CNN AP +2.3 points and PASCAL-style AP@0.5 +3.8
  points over "a strong single-scale baseline of Faster R-CNN on ResNets"
  (Abstract §1; Table 3, row a→c).
- C5: End-to-end trainable and usable identically at train and test time
  ("our pyramid structure can be trained end-to-end with all scales and is
  used consistently at train/test time, which would be memory-infeasible
  using image pyramids", §1) — removing the train/test inconsistency of prior
  methods that apply image pyramids only at test time (§1).
- C6: Generalizes beyond detection to instance-segmentation mask proposals
  (§6), outperforming DeepMask/SharpMask/InstanceFCN by "over 8.3 points AR"
  while running several times faster because it needs no image pyramid at
  inference (§6.1; Table 6: FPN 48.1 AR vs. SharpMask 39.8 vs. DeepMask 37.1).

# Assumptions

1. (Hard) The backbone must expose a multi-stage feedforward hierarchy with
   feature maps at successively halved spatial resolution ("a scaling step of
   2", §3, "Bottom-up pathway") — the bottom-up pathway is defined in terms of
   per-stage outputs, so a flat/non-hierarchical feature extractor cannot
   supply the pyramid.
2. (Soft) $C_1$ (stride-2 stage) is excluded from the pyramid purely "due to
   its large memory footprint" (§3) — an engineering choice, not a
   correctness requirement.
3. (Soft, standard practice) Backbones are ImageNet-1k-pretrained before
   fine-tuning on the detection dataset, "as is common practice" (§5.1) — the
   reported numbers assume this; FPN's own construction does not require it.
4. (Soft, empirically validated not architecturally forced) RPN/Fast-R-CNN
   head weights are shared across all pyramid levels; this is justified post
   hoc by "all levels of our pyramid share similar semantic levels" (§3) — the
   paper reports similar (not better) accuracy without sharing (§4.1), so
   sharing is a simplicity choice, not a hard dependency.
5. (Hard, by design) Both training and inference operate on a single input
   image scale — no image pyramid at either stage, "which would be
   memory-infeasible using image pyramids" (§1) if attempted with end-to-end
   training across scales.

# Failure regime

Ablations (Table 1, RPN; Table 3, Fast R-CNN — both show the equivalent
pattern) delimit which components are load-bearing:

- **Top-down pathway removed** (bottom-up pyramid with lateral $1\times1$ +
  $3\times3$ only, no upsample-and-merge): RPN AR$^{1k}$ drops from 56.3 to
  49.5 — "just on par with the RPN baseline," attributed to "large semantic
  gaps between different levels on the bottom-up pyramid, especially for very
  deep ResNets" (§5.1.1, Table 1 row d). The Fast R-CNN analogue shows the
  same degradation is "significant," implying "Fast R-CNN suffers from using
  the low-level features at the high-resolution maps" without top-down
  enrichment (§5.2.1, Table 3 row d).
- **Lateral connections removed** (top-down pathway alone, features
  repeatedly down/upsampled with no bottom-up injection): RPN AR$^{1k}$ drops
  to 46.1, "10 points" below full FPN — the paper attributes this to
  imprecise localization, since "these maps have been downsampled and
  upsampled several times" without a direct, finer-resolution signal
  (§5.1.1, Table 1 row e).
- **Pyramid replaced by finest single level $P_2$ alone**: RPN AR$^{1k}$ =
  51.3 despite 750k anchors (vs. 200k for the full pyramid) — "a larger
  number of anchors is not sufficient in itself to improve accuracy" (§5.1.1,
  Table 1 row f); the Fast R-CNN analogue (33.4 AP) is likewise "marginally
  worse" than the full pyramid (33.9 AP, §5.2.1, Table 3 row f).
- The paper does not report a dedicated qualitative failure-case analysis
  (no failure-image gallery); all failure evidence above is via ablation
  tables. ?

# Numerical sensitivity

- The lateral-merge element-wise addition combines a channel-reduced
  ($1\times1$ conv) bottom-up map and a nearest-neighbor-upsampled top-down
  map, both at $d=256$ channels; no explicit scale-balancing term between the
  two branches is stated beyond what the $1\times1$ conv learns implicitly.
  ? Not discussed as a numerical concern in the paper; inferred from the
  construction in §3 and Fig. 3.
- Zero non-linearities are used in the extra pyramid layers (lateral
  $1\times1$, output $3\times3$); the paper states this was "empirically
  found to have minor impacts" (§3) but gives no ablation numbers for this
  specific choice — an assertion, not a quantified sensitivity result. ?
- The $3\times3$ "smoothing" conv on each merged map exists specifically "to
  reduce the aliasing effect of upsampling" (§3) — a stated anti-aliasing
  measure tied to the choice of nearest-neighbor (not learned/deconv)
  upsampling.
- Eq. (1)'s level assignment is a hard `floor` of a $\log_2$ scale ratio
  anchored at $224$ px and $k_0=4$: RoIs exactly at a level boundary
  (scale $= 224 \cdot 2^{k-k_0}$) are assigned deterministically to one side
  with no soft blending across levels. $k_0=4$ is chosen "analogous to" the
  ResNet Faster R-CNN baseline's use of $C_4$ (§4.2) — an empirical/analogical
  choice, not derived from a stated optimality argument. ?
- Training hyperparameters given as fixed constants, not tuned per
  ablation: weight decay $0.0001$, momentum $0.9$, synchronized SGD on 8
  GPUs at 2 images/GPU (256 anchors/image for RPN), LR $0.02$ for the first
  30k mini-batches then $0.002$ for the next 10k (§5.1, "Implementation
  details"). Anchor boxes outside the image are *included* in RPN training
  losses, unlike Ren2015a, which "is unlike Ren2015a where these anchor boxes
  are ignored" (§5.1) — a stated deviation from the RPN baseline's training
  protocol.

# Applicability

- Use when: multi-scale object detection or region-proposal generation is
  needed from a single input image scale, especially to recover small-object
  recall/AP without paying image-pyramid compute/memory cost (§1; Table 1: AR
  on small objects up 12.9 points; Table 4: outstanding small-object AP "only
  achieved by high-resolution image inputs with previous methods," §5.2.3).
  Also applicable to instance-segmentation mask-proposal generation with the
  same backbone (§6).
- Don't use when: the backbone lacks a clean, factor-2, multi-stage
  hierarchy — the bottom-up pathway construction assumes discrete per-stage
  outputs (§3); the paper reports no results for non-hierarchical or
  single-resolution backbones.
- Compared against (paper's own baselines): single-scale $C_4$/$C_5$ feature
  maps (own ablations, Tables 1 and 3); the SSD-style reuse of an unmodified
  pyramidal hierarchy (Fig. 1(c), contrasted structurally in §1/§2);
  DeepMask, SharpMask, InstanceFCN for mask proposals (Table 6); COCO
  2015/2016 competition winners — Faster R-CNN+++, G-RMI, AttractioNet,
  Multipath, ION (Table 4).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| resnet (he2016-resnet) | "This process is independent of the backbone convolutional architectures... and in this paper we present results using ResNets He2016" and "Specifically, for ResNets He2016 we use the feature activations output by each stage's last residual block. We denote the output of these last residual blocks as $\{C_2,C_3,C_4,C_5\}$..." (§3, "Feature Pyramid Networks" opening; "Bottom-up pathway") | `feeds_into` (author on resnet.md: resnet → fpn) | high | Every reported FPN result instantiates the bottom-up pathway directly on ResNet's per-stage residual-block outputs; ResNet is incorporated as a named backbone component, not merely a compatible input. Chronology: resnet (2016) ≤ fpn (2017). Mirrors the existing `resnet → mask-rcnn` `feeds_into` edge already authored on resnet.md. |
| faster-rcnn (ren2015-faster) | "We adapt RPN by replacing the single-scale feature map with our FPN. We attach a head of the same design... to each level..." (§4.1) and "To demonstrate the simplicity and effectiveness of our method, we make minimal modifications to the original systems of Ren2015a; Girshick2015a when adapting them to our feature pyramid." (§4, opening) | `feeds_into` (author on faster-rcnn.md: faster-rcnn → fpn) | high | FPN's two demonstrated applications (RPN head, Fast R-CNN head) are Faster R-CNN's own named components, reused essentially unmodified and re-attached per pyramid level — genuine building-block incorporation, not incidental data-flow. Chronology: faster-rcnn (2015) ≤ fpn (2017). Caution: the practical combination ("Faster R-CNN on FPN", Table 4) is bidirectional in use, but `feeds_into` here captures the documented intellectual-lineage direction (FPN built its applications on Faster R-CNN's head design), consistent with the "not data-flow" carve-out only in the sense that this *is* genuine build-on, not mere pipelining. |
| mask-rcnn (he2017-maskrcnn) | "Recently, FPN has enabled new top results in all tracks of the COCO competition, including detection, instance segmentation, and keypoint estimation. See he2017mask for details." (§5.2.3 — sentence present in arXiv v2, 19 Apr 2017, i.e. after Mask R-CNN's initial submission) | `feeds_into` (author on fpn.md: fpn → mask-rcnn) | high | Direct first-party citation: FPN's own paper explicitly names Mask R-CNN as the downstream system built on FPN and points the reader there. `year` fields for both entries in docs/papers/index.yaml are 2017, so the build's chronology check (A's year ≤ B's year) passes. |
| unet-segmentation (ronneberger2015-unet) | "There are recent methods exploiting lateral/skip connections that associate low-level feature maps across resolutions and semantic levels, including U-Net ronneberger2015 and SharpMask Pinheiro2016 for segmentation..." followed by "Although these methods adopt architectures with pyramidal shapes, they are unlike featurized image pyramids... where predictions are made independently at all levels" (§2, "Methods using multiple layers") | none (Rule-B-like: omit) | n/a | FPN explicitly *contrasts* itself with U-Net's family (single fine-resolution output, one prediction) rather than reusing or building on U-Net as a component; also different problem framing (dense per-pixel segmentation map vs. independent per-level detection predictions). A related-work mention, not a lineage/practice edge under the CLAUDE.md vocabulary. |
| fcn-semantic-segmentation (long2015-fcn) | "FCN Long2015 sums partial scores for each category over multiple scales to compute semantic segmentations." (§2, "Methods using multiple layers") | none (omit) | n/a | Cited only as a related "methods using multiple layers" example, contrasted with (not built upon by) FPN's lateral+top-down design; no reuse or lineage claim in FPN's own text. |
| mask2former (cheng2022-mask2former) | No quote from FPN's own text is possible (FPN 2017 predates Mask2Former by 5 years). Only indirect evidence: the *existing* `cheng2022-mask2former.md` research note describes MaskFormer's pixel decoder as "FPN-like upsampling" (note's own architecture paraphrase, Setting/architecture section) — not a verbatim quote from the MaskFormer or Mask2Former paper's own Related Work. | `feeds_into` (fpn → mask2former, would be authored on fpn.md) — **speculative, not recommended for commit as-is** | low | The architectural resemblance (top-down + lateral upsampling to a per-pixel feature map) is plausible but the only supporting text is my own prior note's paraphrase, not a citation from MaskFormer/Mask2Former's Related Work positioning FPN specifically. Per the Extract contract's verbatim-anchored standard, this does not clear the bar. Recommend: orchestrator checks cheng2021-maskformer's Related Work directly for an explicit FPN citation before adding this edge; otherwise leave unedged. |
| detr (carion2020-detr) | Not addressed — DETR (2020) postdates FPN by 3 years; no textual link exists in either direction from FPN's own paper. | none | n/a | Chronologically and textually ungrounded; DETR's documented small-object AP gap relative to FPN-based detectors (already noted in detr.md's summary) is an editorial/empirical observation, not a citation-backed relation FPN's own note can support. No edge proposed. |

Not committed: fpn→mask2former — no verbatim citation from MaskFormer/Mask2Former's own Related Work positioning FPN specifically; only this note's own architecture paraphrase ("FPN-like upsampling") supports it, which does not clear the Extract contract's verbatim-anchored bar. Confirmed by user 2026-09-23.

# Connections

- Builds on: [he2016-resnet, ren2015-faster] — backbone (bottom-up pathway) and RPN/Fast R-CNN head designs, both adapted with "minimal modifications" (§3, §4).
- Also cited (Related Work, not built upon — see Stated relations rows 4–5 for the reasoning behind omitting edges): [ronneberger2015-unet, long2015-fcn, lowe2004-sift, dalal2005-hog, felzenszwalb2010-detection] (§2).
- Enables: [he2017-maskrcnn] — explicit forward citation added in FPN's own arXiv v2 (§5.2.3): "FPN has enabled new top results in all tracks of the COCO competition... See he2017mask for details."
- Refutes / supersedes: none claimed explicitly — FPN positions itself as removing the *need* for image pyramids in practice (§1, §7 Conclusion), not as superseding any single prior detector by name.

# Atlas update plan

## NEW: fpn
Type: model
Category: detection (secondary: instance-segmentation proposal generation, §6)
Primary source: this paper
Prerequisites: [image-pyramid, convolutional-neural-network] — image-pyramid because the entire motivation (Fig. 1, §1) is framed as an in-network replacement for featurized image pyramids; convolutional-neural-network for the bottom-up pathway.
Bullets per public-page section:
- Motivation: replace the compute/memory cost of a true featurized image pyramid ("compute and memory intensive", Abstract) with an in-network multi-scale feature pyramid built from a ConvNet's inherent hierarchy "with marginal extra cost" (§1, C1).
- Architecture: bottom-up pathway = backbone feedforward stages, $\{C_2,C_3,C_4,C_5\}$ for ResNet at strides $\{4,8,16,32\}$ (§3, "Bottom-up pathway"); top-down pathway = repeated 2× nearest-neighbor upsample (§3, "Top-down pathway"); lateral connections = $1\times1$ conv on the matching bottom-up map, merged by element-wise addition (Fig. 3); final $3\times3$ "smoothing" conv per merged map, anti-aliasing (§3); fixed channel width $d=256$ throughout, no non-linearities in the extra layers (§3); $P_6$ = stride-2 subsample of $P_5$, RPN-only, for the $512^2$ anchor scale (§4.1, footnote 1).
- RPN adaptation: single anchor scale per level, areas $\{32^2,64^2,128^2,256^2,512^2\}$ on $\{P_2,\dots,P_6\}$, 3 aspect ratios each = 15 anchors total, shared head weights across levels (§4.1).
- Fast R-CNN adaptation: RoI-to-level assignment $k=\lfloor k_0+\log_2(\sqrt{wh}/224)\rfloor$, $k_0=4$ (Eq. 1, §4.2); lightweight 2-fc (1024-d) head replacing the ResNet conv5 head (§4.2).
- Key results: RPN AR$^{1k}$ +8.0 pts (Table 1, 48.3→56.3); Faster R-CNN AP +2.3 / AP@0.5 +3.8 over a strong single-scale ResNet baseline (Table 3); COCO test-dev single-model SOTA AP 36.2 vs. prior best (column-wise) AP 35.7 (Table 4, §5.2.3); instance-segmentation mask-proposal AR 48.1 vs. DeepMask 37.1 / SharpMask 39.8 (Table 6); 6 FPS on GPU (Abstract).
- Remarks/ablations: both the top-down pathway and lateral connections are independently necessary — removing either costs ≥7–10 AR points (Table 1, rows d/e); a single finest-level map with 3.75× more anchors still underperforms the full pyramid (Table 1, row f) — anchor density alone does not substitute for the pyramid structure (§5.1.1).
- References: this paper (primary); he2016-resnet, ren2015-faster, he2017-maskrcnn (see Connections).

## UPDATE: mask-rcnn
Section: References / sources.references (content/models/mask-rcnn.md)
Bullets:
- Replace the hand-cite reference-list entry at content/models/mask-rcnn.md:137 — "T.-Y. Lin, P. Dollár, R. Girshick, K. He, B. Hariharan, S. Belongie. *Feature Pyramid Networks for Object Detection.* CVPR, 2017. [arXiv 1612.03144](https://arxiv.org/abs/1612.03144)" — with a reference to the now-registered source id `lin2017-fpn`, consistent with how entries #1/#2/#4/#5 in that list already cite registered ids.
- Consider adding `lin2017-fpn` to `sources.references` in mask-rcnn.md's frontmatter (currently `ren2015-faster`, `long2015-fcn`, `he2016-resnet`) since the FPN backbone variant is one of Mask R-CNN's two headline configurations (mask-rcnn.md's own notes: "ResNet-101-FPN 35.7, ResNeXt-101-FPN 37.1" mask AP).
- Do **not** add a `relations:` entry here — the proposed `fpn feeds_into mask-rcnn` edge (Stated relations row 3) is authored on `fpn.md`'s own forward relations per CLAUDE.md's "author one side only" rule; it will surface on mask-rcnn's page automatically as a `fedBy` reverse edge once `fpn.md` exists. Not committed in this note — orchestrator confirms.

## UPDATE: resnet
Section: relations (frontmatter, content/models/resnet.md)
Bullets:
- Propose adding, alongside resnet.md's existing `feeds_into` entries (to `mask-rcnn`, `deeplab-semantic-segmentation`, `loftr`, `efficientad`, `clip`):
  ```
  - type: feeds_into
    target: fpn
    confidence: high
  ```
  per Stated relations row 1. Not committed here — orchestrator confirms once `fpn.md` exists.

Relations:
- { type: feeds_into, target: fpn, confidence: high }
Confirmed by user 2026-09-23.

## UPDATE: faster-rcnn
Section: relations (frontmatter, content/models/faster-rcnn.md)
Bullets:
- Propose adding, alongside faster-rcnn.md's existing `relations:` list (which already has `extended_by → mask-rcnn`):
  ```
  - type: feeds_into
    target: fpn
    confidence: high
    caution: "FPN reuses RPN's and Fast R-CNN's head designs nearly unchanged, re-attached per pyramid level; the resulting 'Faster R-CNN on FPN' combination is FPN's own headline demonstrated system."
  ```
  per Stated relations row 2. Not committed here — orchestrator confirms once `fpn.md` exists.

Relations:
- { type: feeds_into, target: fpn, confidence: high }
Confirmed by user 2026-09-23.

## UPDATE: mask2former — tentative, do not commit without further check
Section: Connections / relations (docs/research/notes/cheng2022-mask2former.md, content/models/mask2former.md)
Bullets:
- Only if the orchestrator independently verifies (by reading cheng2021-maskformer's own Related Work, not yet checked here) that MaskFormer's pixel decoder is explicitly positioned as FPN-derived: add `fpn` to `cheng2022-mask2former.md`'s `Connections → Builds on` list, and consider a low/medium-confidence `feeds_into` (fpn → mask2former) row authored on `fpn.md`. As the mask2former note currently stands (only "FPN-like upsampling" paraphrase, no verbatim citation), this is **not** sufficiently grounded — see Stated relations row 6.

## detr — no update warranted
DETR (2020) postdates FPN by three years; its architecture explicitly avoids
a feature pyramid (single $H/32\times W/32$ map), and detr.md's summary
already documents the resulting small-object AP weakness. No citation-backed
link exists in either direction; no update proposed.

# Provenance

- Abstract: "compute and memory intensive" framing (C1); "6 FPS on a GPU" (C3);
  SOTA single-model claim surpassing COCO 2016 winners (C2).
- §1 (Introduction): Fig. 1 (a)-(d) taxonomy of pyramid strategies; SSD
  contrast (Fig. 1(c)); "4 times" inference-time cost of featurized image
  pyramids (citing Girshick2015a); RPN AR$^{1k}$ +8.0, Fast/Faster R-CNN AP
  +2.3 / AP@0.5 +3.8 ablation summary; train/test consistency claim (C5).
- §2 (Related Work): "Methods using multiple layers" paragraph — FCN, U-Net,
  SharpMask citations and the "unlike featurized image pyramids... predictions
  made independently at all levels" contrast (Stated relations rows 4–5).
- §3 (Feature Pyramid Networks): bottom-up pathway definition, $\{C_2..C_5\}$
  strides $\{4,8,16,32\}$; top-down pathway + lateral connection construction
  (Fig. 3); $d=256$; no non-linearities in extra layers; conv1 exclusion
  rationale.
- §4 (Applications), opening: "minimal modifications" framing (Stated
  relations row 2).
- §4.1 (RPN on FPN): anchor areas $\{32^2,...,512^2\}$ on
  $\{P_2,...,P_6\}$; 3 aspect ratios, 15 total anchors; $P_6$ definition
  (footnote 1); IoU 0.7/0.3 positive/negative thresholds; shared-weights
  ablation note.
- §4.2 (Fast R-CNN on FPN), Eq. (1): RoI-to-level assignment formula,
  $k_0=4$, canonical size 224; 2-fc 1024-d head replacing ResNet conv5 head.
- §5.1 ("Implementation details"): image resize to 800px shorter side; 8
  GPUs, 2 images/GPU, 256 anchors/image; weight decay 0.0001, momentum 0.9;
  LR 0.02→0.002 at 30k/10k mini-batches; anchor-boxes-outside-image deviation
  from Ren2015a; "8 hours on COCO" training time.
- §5.1.1 (Ablation Experiments): Table 1 rows (a) baseline $C_4$ AR$^{1k}$
  48.3, (b) baseline $C_5$ 44.9, (c) FPN 56.3 (AR$^{1k}_s$ 44.9), (d)
  bottom-up-only 49.5, (e) top-down-w/o-lateral 46.1, (f) $P_2$-only 51.3
  with 750k anchors.
- §5.2.1 (Fast R-CNN ablations): Table 2/3 rows (a) $C_4$/conv5 AP 31.9/31.6,
  (b) $C_5$/2fc AP 28.8/28.0, (c) FPN AP 33.9, (d)/(e) top-down/lateral
  removed, (f) $P_2$-only AP 33.4.
- §5.2.2/§5.2.3: Faster R-CNN Table 3 comparison — baseline (a) AP 31.6 /
  AP@0.5 53.1 → FPN (c) AP 33.9 / AP@0.5 56.9 (+2.3 / +3.8, matches Abstract
  claim); Table 4 test-dev/test-std comparison against G-RMI, AttractioNet,
  Faster R-CNN+++, Multipath, ION; "36.2 vs. 35.7" / "59.1 vs. 55.7"
  column-wise best-competitor comparison; the "Recently, FPN has enabled new
  top results... See he2017mask for details" sentence (Stated relations row
  3, mask-rcnn edge).
- §6 / §6.1 (Extensions: Segmentation Proposals): $d=128$ for the mask variant;
  $5\times5$ and $7\times7$ MLP heads (dual-MLP), $14\times14$ mask output
  doubled to $28\times28$; Table 6 — DeepMask 37.1 AR, SharpMask 39.8 AR,
  InstanceFCN 39.2 AR, FPN dual-MLP 45.7 AR → +2× mask res 46.7 → +2× train
  schedule 48.1 AR; "over 8.3 points AR" improvement claim; 6–7 FPS runtime.
- §7 (Conclusion): no new numbers; "still critical to explicitly address
  multi-scale problems using pyramid representations" summary claim.
- docs/papers/index.yaml `lin2017-fpn` entry: registered `cites` list
  (ronneberger2015-unet, long2015-fcn, lowe2004-sift, dalal2005-hog,
  felzenszwalb2010-detection, he2016-resnet, he2017-maskrcnn, ren2015-faster)
  used to confirm which Related-Work citations are already registered ids.
