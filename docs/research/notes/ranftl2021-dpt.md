---
paper_id: ranftl2021-dpt
title: "Vision Transformers for Dense Prediction"
authors: [René Ranftl, Alexey Bochkovskiy, Vladlen Koltun]
year: 2021
url: https://arxiv.org/pdf/2103.13413
created: 2026-09-23
relevant_atlas_pages: [midas, vit, deit, depth-anything, depth-anything-v2, depth-anything-3, dust3r, mast3r, vggt, dinov2, segformer, hrnet, deeplab-semantic-segmentation, fcn-semantic-segmentation, unet-segmentation, monocular-depth-estimation, transformer, attention-mechanism, positional-encoding]
---

# Setting

**Problem class**: general-purpose dense prediction — per-pixel regression (monocular depth)
and per-pixel classification (semantic segmentation) — from a single RGB image, using a
transformer as the encoder in place of a convolutional backbone.

**Inputs**: a single RGB image of size $H \times W$, divisible by the patch size $p$ (the
paper uses $p = 16$ throughout). No calibration or auxiliary sensor data required.

**Outputs**: for monocular depth, a dense **affine-invariant inverse-depth (disparity) map**
at half the input resolution before the final upsample — inherits MiDaS's scale/shift
ambiguity, not metric depth (§4.1, following [30]). For semantic segmentation, a per-pixel
class-logit map, also predicted at half resolution then bilinearly upsampled to full
resolution (§4.2).

**Preconditions**: the transformer backbone (ViT) is pretrained on a large image-classification
corpus (ImageNet, or ImageNet + billion-scale weakly-supervised data for the encoder used as
the original MiDaS baseline). The paper explicitly frames DPT as data-hungry: "transformers
are known to realize their full potential only when an abundance of training data is
available" (§1, Introduction).

# Core idea

DPT keeps the classical dense-prediction encoder–decoder split but replaces the convolutional
encoder with a **Vision Transformer (ViT) [11]** used as a bag-of-tokens backbone, and replaces
the decoder's usual convolutional downsample/upsample stack with a **Reassemble + RefineNet-style
Fusion** decoder that recovers image-like feature maps from the token sequence at several fixed
resolutions.

**Reassemble operation** (§3, unnumbered lead equation): reshapes $N_p$ transformer tokens back
into a spatial feature map at output resolution ratio $s$ and feature dimension $\hat D$:

$$\text{Reassemble}^{\hat D}_s(t) = (\text{Resample}_s \circ \text{Concatenate} \circ \text{Read})(t)$$

- **Read** (Eq. 1) maps the $N_p+1$ tokens (including the ViT readout/CLS token $t^0$) down to
  $N_p$ tokens, handling the readout token in one of three ways (Eqs. 2–4):
  $$\text{Read}_{\text{ignore}}(t) = \{t^1, \ldots, t^{N_p}\} \quad (2)$$
  $$\text{Read}_{\text{add}}(t) = \{t^1 + t^0, \ldots, t^{N_p} + t^0\} \quad (3)$$
  $$\text{Read}_{\text{proj}}(t) = \{\text{mlp}(\text{cat}(t^1, t^0)), \ldots\} \quad (4)$$
  (projection: concatenate with $t^0$, linear layer back to $D$, GELU). Table 7 shows
  `proj` is the best default (marginally), `ignore` close behind, `add` worst.
- **Concatenate** (Eq. 5) spatially places the $N_p$ tokens by their source-patch position into
  a $\frac{H}{p} \times \frac{W}{p} \times D$ feature map.
- **Resample$_s$** (Eq. 6) uses $1\times1$ convs to project to $\hat D$ channels, then a
  strided $3\times3$ conv ($s \ge p$) or strided $3\times3$ transpose conv ($s < p$) to
  down/upsample to the target resolution $\frac{H}{s} \times \frac{W}{s}$.

Reassembly is applied at **four fixed stages/resolutions** — features from deeper transformer
layers are reassembled at lower resolution, features from earlier layers at higher resolution.
Default layer taps (§3): $l = \{5, 12, 18, 24\}$ for ViT-Large, $l = \{3, 6, 9, 12\}$ for
ViT-Base, $l = \{9, 12\}$ plus the first two ResNet50 stages ($R_0, R_1$) for ViT-Hybrid.

The four reassembled feature maps are progressively fused by **RefineNet-based [23] fusion
blocks** (residual conv units, upsample ×2 per stage) down to half input resolution, then a
task-specific head (3 conv layers for depth; a segmentation head with an auxiliary loss on the
penultimate fusion layer) produces the final prediction.

Three named architectures result from backbone choice: **DPT-Base** (ViT-Base, patch embed),
**DPT-Large** (ViT-Large, patch embed), **DPT-Hybrid** (ResNet50 stem + ViT, i.e. ViT-Hybrid).
Default readout handling is `proj`; default decoder feature dimension $\hat D = 256$.

Unlike convolutional nets, the transformer backbone keeps constant token-sequence resolution
and a global receptive field at *every* stage (no progressive downsampling in the encoder) —
the paper's stated mechanism for DPT's better global coherence and finer detail (§1, §4.3
"Inference resolution").

# Claimed contributions

*(No explicit numbered contribution list in the paper; claims below are the abstract's and
introduction's own framing, verbatim/paraphrase-anchored.)*

- C1: "We introduce dense vision transformers, an architecture that leverages vision
  transformers in place of convolutional networks as a backbone for dense prediction tasks."
  (Abstract)
- C2: "For monocular depth estimation, we observe an improvement of up to 28% in relative
  performance when compared to a state-of-the-art fully-convolutional network." (Abstract;
  quantified in §4.1 as the average relative improvement of DPT-Large over MiDaS on Table 1's
  zero-shot cross-dataset transfer protocol — "more than 23% for DPT-Hybrid and 28% for
  DPT-Large".)
- C3: "When applied to semantic segmentation, dense vision transformers set a new state of the
  art on ADE20K with 49.02% mIoU." (Abstract; Table 4, DPT-Hybrid.)
- C4: "We further show that the architecture can be fine-tuned on smaller datasets such as
  NYUv2, KITTI, and Pascal Context where it also sets the new state of the art." (Abstract;
  Tables 2, 3, 5.)
- C5: the transformer backbone "provide[s] finer-grained and more globally coherent
  predictions when compared to fully-convolutional networks" (Abstract) — attributed
  specifically to the constant-resolution, global-receptive-field property of ViT (§1, §4.3).

# Assumptions

1. **(Hard) Input size divisible by the patch stride.** DPT handles varying image sizes as
   long as the image is divisible by $p$ for embedding and by the decoder's stride (32 px) for
   the fusion path (§3, "Handling varying image sizes").
2. **(Soft) Large-scale pretraining / large training corpora needed to realize gains.**
   "Transformers are known to realize their full potential only when an abundance of training
   data is available" (§1). Confirmed empirically: DPT-Base only clearly beats the
   convolutional baseline once paired with better pretraining (DeiT-Base-Dist, Table 8).
3. **(Hard, inherited from MiDaS) Depth output is affine-invariant, not metric.** DPT reuses
   the scale-and-shift-invariant trimmed loss and disparity representation of Ranftl et al.
   [30] unmodified for the depth task (§4.1, "Experimental protocol").
4. **(Soft) Position-embedding interpolation is valid across resolutions.** Position
   embeddings are linearly interpolated on the fly for inputs that differ from the training
   resolution (§3, following [11]); this degrades gracefully but not losslessly (Figure 4).
5. **(Soft) Batch normalization is harmful in a regression decoder.** "We disable batch
   normalization in the decoder, as we found it to negatively influence results for regression
   tasks" (§4.1) — this holds for the depth head; the segmentation head does use batch
   normalization in the fusion layers (§4.2).

# Failure regime

- **DPT-Base without stronger pretraining barely helps.** Table 8: ViT-Base backbone (0.0819
  mean ablation metric) performs about the same as ResNeXt101-WSL (0.0806); only when
  ViT-Base's pretraining recipe is upgraded to DeiT-Base-Dist (0.0796) does the transformer
  backbone pull ahead of the convolutional baseline at comparable capacity.
- **DPT-Large underperforms DPT-Hybrid on the small ADE20K fine-tune.** "DPT-Large performs
  slightly worse [than DPT-Hybrid on ADE20K], likely because of the significantly smaller
  dataset compared to our previous [depth] experiments" (§4.2) — DPT-Large: 47.63% mIoU vs.
  DPT-Hybrid: 49.02% mIoU (Table 4) despite DPT-Large having ~3× more parameters (Table 9).
- **Readout-token handling is architecture-sensitive but low-impact.** `add` degrades mean
  ablation error to 0.0831 vs. 0.0819 for `proj` (Table 7) — a real but small effect; the
  readout token "doesn't serve a clear purpose for the task of dense prediction" (§3).
- **KITTI fine-tuning cannot use the gradient-matching loss.** "We disable the
  gradient-matching loss for KITTI since this dataset only provides sparse ground truth"
  (§4.1, "Fine-tuning on small datasets") — a structural constraint of KITTI's LiDAR sparsity,
  not a DPT weakness per se.
- **Feature taps must mix shallow and deep layers.** Table 6 (top): tapping only late layers
  ($\{9,10,11,12\}$, mean 0.0828) is worse than mixing shallow+deep ($\{3,6,9,12\}$, mean
  0.0822); for ViT-Hybrid, using only transformer-stage taps (no ResNet low-level features,
  mean 0.0787) is worse than adding $R_0, R_1$ (mean 0.0733) — "it is not clear at which points
  in the backbone features should be tapped" without this ablation (§4.3).

# Numerical sensitivity

- **Skip-connection tap layers are backbone-specific and non-obvious**: because ViT holds
  constant spatial resolution throughout (no natural downsampling stages), tap-layer choice is
  a free hyperparameter tuned by ablation (Table 6) rather than dictated by architecture, unlike
  convolutional nets where stage boundaries are unambiguous.
- **DPT-Large is ~3× the parameter count of MiDaS/DPT-Hybrid but comparable latency**: 343M
  params vs. 105M (MiDaS) / 123M (DPT-Hybrid) (Table 9), yet 35 ms vs. 32 ms / 38 ms inference
  time — attributed to ViT-Large's "wide and comparatively shallow structure" exposing more
  parallelism (§4.3, "Inference speed").
- **Inference-resolution mismatch degrades DPT less than convolutional nets, but not zero**:
  Figure 4 plots relative performance loss from 416 px to 640 px inference (training at
  384×384) — DPT variants degrade "more gracefully" than the fully-convolutional baseline but
  are not resolution-invariant.
- **Segmentation vs. depth decoders differ in normalization**: batch norm is disabled in the
  depth decoder (regression) but enabled in the fusion layers for segmentation (§4.1 vs. §4.2)
  — task-dependent, not a fixed architectural choice.
- **Auxiliary loss weight and dropout are fixed, untested hyperparameters**: auxiliary loss
  weight 0.2, dropout 0.1 before the final classification layer (§4.2) — no ablation reported
  for these two values specifically (unlike the readout/skip/backbone choices, which are
  ablated in §4.3).

# Applicability

- **Use when**: a transformer-token backbone (ViT/ViT-Hybrid/DeiT) is already in hand or
  desired, large-scale training data is available (>1M images for the depth setting), and
  fine-grained, globally coherent dense predictions matter more than minimizing parameter
  count at fixed latency.
- **Don't use when**: training data is small (<~50K images) and no strong ViT pretraining
  (DeiT-Dist or better) is available — DPT-Base then offers little over a well-tuned
  convolutional baseline (Table 8); or when the deployment target cannot absorb ViT-Large's
  343M parameters even if latency is comparable.
- **Compared against** (§4.1–4.3): MiDaS [30] fully-convolutional network (primary depth
  baseline, same training protocol); DORN [13], VNL [48], BTS [20] (NYUv2/KITTI fine-tuned
  depth SOTA, Tables 2–3); OCNet, ACNet, DeeplabV3(+ResNeSt-101/200), HRNet-based OCNet
  (ADE20K/Pascal-Context segmentation SOTA, Tables 4–5); DeiT [38] and ResNet50 /
  ResNeXt101-WSL (backbone ablation, Table 8).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| `dosovitskiy2020-vit` / slug `vit` | "we use the recently proposed vision transformer (ViT) [11] as a backbone architecture" (§1 Introduction) | `feeds_into` (author on `vit` page, target `dpt`) | high | ViT is the literal, named encoder component of all three DPT variants; chronology holds (ViT 2020 ≤ DPT 2021 arXiv). Matches CLAUDE.md's `feeds_into` example pattern (A's paper predates B's, A is a named building block). |
| `ranftl2019-midas` / slug `midas` | "We closely follow the protocol of Ranftl et al. [30]. We learn a monocular depth prediction network using a scale- and shift-invariant trimmed loss... We construct a meta-dataset that includes the original datasets that were used in [30] (referred to as MIX 5 in that work) and extend it" (§4.1); "Relative performance is computed with respect to the original MiDaS model [30]" (Table 1 caption) | `feeds_into` (author on `midas` page, target `dpt`) | high | **Argued below** — DPT is a *different* method (transformer encoder + Reassemble/Fusion decoder vs. MiDaS's fully-convolutional encoder-decoder) that incorporates MiDaS's affine-invariant loss, dataset-mixing recipe (MIX 5 → MIX 6), and zero-shot evaluation protocol wholesale as a named component, without extending MiDaS's own architecture. This is `feeds_into` (different method, A's idea as building block), not `extended_by` (which CLAUDE.md reserves for "B is the *same* method improved" — DPT is architecturally unrelated to MiDaS's network, only the training recipe is shared). Not proposing `generalized_by`/historical: Table 1 shows DPT strictly dominating a MiDaS-architecture retrained on the same MIX 6 data, but MiDaS's own encoder-decoder family remains a live citation subject in 2025 work (`lin2025-depth-anything-3`'s note lists "MiDaS [ranftl2020-midas]" as a still-current baseline), so a strong supersession claim (`quality: historical`) is not evidenced here — orchestrator's call. |
| `yang2024-depth-anything` | Depth Anything page body (`content/models/depth-anything.md` line 36): "The decoder is the Dense Prediction Transformer (DPT) from MiDaS." Depth Anything's own research note (`docs/research/notes/yang2024-depth-anything.md` line 100): "DPT decoder [47=Ranftl 2021]" | `feeds_into` (author on `dpt` page, target `depth-anything`) | high | DPT decoder used unmodified as Depth Anything's dense-prediction head; confirmed in both the public page and the counterpart's research note. |
| `yang2024-depth-anything-v2` | `content/models/depth-anything-v2.md` line 40: "The DPT decoder fuses multi-scale encoder features into a dense prediction head." Counterpart note line 102: "DPT [55] depth decoder." | `feeds_into` (author on `dpt` page, target `depth-anything-v2`) | high | Same DPT decoder, unmodified from V1 per the page's own text ("Architecture is identical to V1"). |
| `lin2025-depth-anything-3` | `content/models/depth-anything-3.md` line 50: "Dual-DPT head. Shared DPT reassembly modules feed into two separate sets of fusion layers, one branch predicting depth $\hat D$ and the other predicting ray map $\hat M$." Counterpart note lines 93/97: "Dual-DPT head: shared reassembly modules → two branch sets of fusion layers..." | `feeds_into` (author on `dpt` page, target `depth-anything-3`) | high | DA3 names its head "Dual-DPT" and explicitly reuses DPT's Reassemble+Fusion structure, duplicated into two output branches. Ablation in DA3's own note shows removing the dual-DPT head collapses pose accuracy 86% — a load-bearing, named component. |
| `wang2023-dust3r` | `content/models/dust3r.md` line 54: "DPT-style regression heads. One Dense Prediction Transformer head per view converts the final decoder tokens to a full-resolution pointmap..." Counterpart note line 84: "Builds on: ... DPT (regression head architecture, ref [91])." | `feeds_into` (author on `dpt` page, target `dust3r`) | high | DUSt3R's own paper cites DPT [91] directly as the source of its regression-head architecture (per its research note); two per-view DPT-style heads replace DPT's single dense head. |
| `wang2025-vggt` | `content/models/vggt.md` line 55: "Dense head. Output image tokens $\hat t^I_i$ are decoded by a DPT upsampler (fed intermediate tokens from DINOv2 blocks 4, 11, 17, and 23)..." Counterpart note line 41: "DPT upsampling [87]." | `feeds_into` (author on `dpt` page, target `vggt`) | high | VGGT cites DPT [87] directly (per its research note) as the dense-head decoder, fed multi-block DINOv2 tokens analogous to DPT's multi-layer ViT taps. |
| `xie2021-segformer` | — no quote available | `compared_with` — **editorial only, not paper-stated** | low | Checked both directions: `ranftl2021-dpt.txt` has zero occurrences of "SegFormer"; `xie2021-segformer.md`'s own note (and by extension its Related Work) has zero occurrences of "DPT"/"Ranftl". DPT's arXiv posting (24 Mar 2021) predates SegFormer's (31 May 2021) by ~2 months — too close for either to cite the other, and neither did. Both are 2021 transformer dense-prediction architectures with overlapping task scope (DPT: depth + semantic segmentation; SegFormer: semantic segmentation only), making a reader-facing `compared_with` plausible on editorial grounds, but there is no textual evidence to cite — orchestrator should decide whether an uncited peer-comparison edge is wanted at all, and if so keep `confidence: low`. |
| `touvron2020-deit` / slug `deit` | "We finally compare to a recent variant of ViT called DeIT [38]... We observe that DeIT-Base-Dist indeed improves performance when compared to ViT-Base. This indicates that similarly to convolutional architectures, improvements in pretraining procedures for image classification can benefit dense prediction tasks." (§4.3 Ablations, Table 8) | `none` (Rule-consistent editorial omission) | — | DeiT-Base-Dist is tested only as an ablation backbone swap (Table 8) to probe pretraining quality; it is not adopted into any of the three canonical DPT-Base/Large/Hybrid variants, so there is no structural build-on to encode as `feeds_into`, and DPT is not "the same method [as DeiT] improved" so `extended_by` doesn't fit either. Recorded here for completeness per the template's positioning-statement rule, but no edge proposed. |

Not committed: dpt↔segformer — no textual evidence of citation between DPT and SegFormer in either direction despite topical/temporal overlap; editorial-only comparison, left unauthored. Confirmed by user 2026-09-23.

# Connections

- Builds on:
  - `dosovitskiy2020-vit` — ViT backbone used verbatim (Base/Large variants) and as the ViT-Hybrid
    variant (ResNet50 stem + ViT stages).
  - `ranftl2019-midas` — training protocol, affine-invariant loss, dataset-mixing methodology
    (MIX 5 → MIX 6), and zero-shot cross-dataset evaluation protocol, reused wholesale.
  - Lin et al., RefineNet [23] (CVPR 2017) — fusion-block design ("RefineNet-based feature
    fusion", §3). Not a registered Atlas source/slug at time of writing; no `feeds_into` edge
    proposed since RefineNet has no on-disk page.
  - Sener & Koltun [32], multi-task/multi-objective optimization — reused for MIX 6
    multi-dataset training, inherited transitively via the MiDaS protocol (same citation [32]
    MiDaS itself uses, per `ranftl2019-midas.md` Connections).
  - Touvron et al., DeiT [38] (2020) — used only in the backbone ablation (Table 8), not a
    named architectural component of any canonical DPT variant.
- Enables:
  - `yang2024-depth-anything`, `yang2024-depth-anything-v2` — DPT decoder reused unmodified as
    the dense-prediction head.
  - `lin2025-depth-anything-3` — "Dual-DPT" head, a duplicated DPT Reassemble+Fusion decoder.
  - `wang2023-dust3r` — DPT-style per-view regression heads for pointmap regression.
  - `wang2025-vggt` — DPT upsampler as the dense (depth/point/tracking) head.

# Atlas update plan

## NEW: dpt
Type: model
Domain: dense-prediction (depth + semantic segmentation)
arch_family: transformer-encoder + convolutional-decoder hybrid
Primary source: this paper

**Motivation**: prior dense-prediction architectures are uniformly convolutional
encoder-decoders; downsampling in the encoder is necessary for a large receptive field and
tractable compute, but it discards feature resolution/granularity that a decoder cannot fully
recover. DPT asks whether a Vision Transformer backbone — constant spatial resolution and
global receptive field at every stage — removes this bottleneck for dense (per-pixel) tasks.

**Architecture**: ViT backbone (Base/Large/Hybrid) tokenizes the image; a three-stage
Reassemble operation (Read → Concatenate → Resample, Eqs. 1–6) recovers image-like feature
maps at four fixed resolutions from four fixed transformer-layer taps; RefineNet-style [23]
Fusion blocks progressively combine and upsample these to half input resolution; a
task-specific head (3-conv regression head for depth; auxiliary-loss segmentation head)
produces the final dense prediction. Three named variants: DPT-Base (ViT-Base, 112M params),
DPT-Large (ViT-Large, 343M params), DPT-Hybrid (ViT-Hybrid/ResNet50 stem, 123M params) —
vs. MiDaS's 105M-parameter fully-convolutional baseline (Table 9).

**Training**: depth — scale/shift-invariant trimmed loss + gradient-matching loss from MiDaS
[30], Adam (backbone LR 1e-5, decoder LR 1e-4), 60 epochs × 72,000 steps, batch 16, 384×384
crops, MIX 6 meta-dataset (~1.4M images, MIX 5 + 5 additional datasets). Segmentation —
cross-entropy + 0.2-weighted auxiliary loss, SGD momentum 0.9, poly LR decay (factor 0.9),
batch 48, 520 px resize / 480 px crops, ADE20K (240 epochs) and Pascal Context (50-epoch
fine-tune) fine-tuning.

**Key results**: zero-shot cross-dataset depth transfer — DPT-Large/MIX 6 improves 23–65%
over MiDaS/MIX 5 depending on dataset (Table 1; e.g. KITTI δ>1.25 error 23.90 → 8.46, a 64.6%
relative reduction); ADE20K semantic segmentation 49.02% mIoU (DPT-Hybrid, new SOTA at
publication, Table 4); NYUv2/KITTI fine-tuned depth matches/exceeds DORN/VNL/BTS (Tables 2–3);
Pascal Context fine-tune 60.46% mIoU (Table 5).

**Implementations**: official — https://github.com/intel-isl/DPT (per paper's Abstract link;
license/current org to verify at draft time, repo may have moved to isl-org).

**Assessment**: established the transformer-backbone dense-prediction template (tokenize →
reassemble multi-scale → convolutional fusion decoder) that Depth Anything, Depth Anything V2,
Depth Anything 3, DUSt3R, and VGGT all reuse or directly derive their dense/regression heads
from. Core limitation: DPT-Base needs strong ViT pretraining (DeiT-distillation-level or
better) to clearly beat a convolutional baseline at comparable capacity (Table 8); DPT-Large
underperforms DPT-Hybrid on small fine-tuning datasets (ADE20K, §4.2) despite ~3× the
parameters.

Relations:
- { type: feeds_into, target: dpt, confidence: high } — authored on vit.md
- { type: feeds_into, target: dpt, confidence: high, caution: "DPT reuses MiDaS's scale-and-shift-invariant loss and dataset mixing with a ViT encoder; later MiDaS releases (v3) ship DPT." } — authored on midas.md
Confirmed by user 2026-09-23.

## UPDATE: midas
Section: sources.references, Relations, Architecture/Remarks
Bullets:
- Currently `content/models/midas.md` frontmatter has no `sources.references` entry and no
  mention of DPT anywhere in the page body (verified: zero "DPT" hits). Add
  `ranftl2021-dpt` to `sources.references[]`.
- The `ranftl2019-midas.md` research note (Architecture paragraph) already states: "DPT (Dense
  Prediction Transformer) encoder variant is a later addition (MiDaS v3, not in this paper)" —
  this is a good anchor for a one-line Remarks addition noting that later MiDaS releases (v3+)
  adopted a DPT-style ViT encoder, without overstating scope beyond what this 2019 paper covers.
- Relations — confirmed by user 2026-09-23 and committed to `content/models/midas.md`:
  `{ type: feeds_into, target: dpt, confidence: high, caution: "DPT reuses MiDaS's scale-and-shift-invariant loss and dataset mixing with a ViT encoder; later MiDaS releases (v3) ship DPT." }` —
  see Stated relations table above for full argument (feeds_into, not extended_by).

## UPDATE: depth-anything
Section: sources.references
Bullets:
- `content/models/depth-anything.md` frontmatter currently lists `sources.references: [ranftl2019-midas, oquab2023-dinov2]` but not `ranftl2021-dpt`, despite the body explicitly naming "the Dense Prediction Transformer (DPT) from MiDaS" as the decoder (line 36) and describing it again in the Blocks paragraph (line 38). Add `ranftl2021-dpt` to `sources.references[]`.

## UPDATE: depth-anything-v2
Section: sources.references
Bullets:
- `content/models/depth-anything-v2.md` frontmatter lists `references: [yang2024-depth-anything, ranftl2019-midas, oquab2023-dinov2]`, missing `ranftl2021-dpt`, despite the body stating "coupled to a DPT depth decoder inherited from V1" (line 38) and "The DPT decoder fuses multi-scale encoder features into a dense prediction head" (line 40). Add `ranftl2021-dpt` to `sources.references[]`.

## UPDATE: depth-anything-3
Section: sources.references
Bullets:
- `content/models/depth-anything-3.md` frontmatter lists `references: [yang2024-depth-anything-v2, oquab2023-dinov2, wang2025-vggt, wang2023-dust3r]`, missing `ranftl2021-dpt`, despite the body's "Dual-DPT head" description (line 50) naming "Shared DPT reassembly modules". Add `ranftl2021-dpt` to `sources.references[]`.

## UPDATE: dust3r
Section: sources.references
Bullets:
- `content/models/dust3r.md` frontmatter has no `sources.references[]` at all (only `sources.primary: wang2023-dust3r`), despite the body naming "DPT-style regression heads. One Dense Prediction Transformer head per view..." (line 54) and citing DPT again at line 95 and 113. Add `sources.references: [ranftl2021-dpt]` (plus any others already planned by the DUSt3R note owner — do not remove/reorder anything not related to this addition).

## UPDATE: vggt
Section: sources.references
Bullets:
- `content/models/vggt.md` frontmatter lists `references: [wang2023-dust3r, leroy2024-mast3r, oquab2023-dinov2, darcet2023-registers]`, missing `ranftl2021-dpt`, despite the body's "Dense head" bullet: "Output image tokens... are decoded by a DPT upsampler" (line 55, also lines 76, 99). Add `ranftl2021-dpt` to `sources.references[]`.

# Provenance

- **Abstract, p.1**: core claims — "leverages vision transformers in place of convolutional
  networks", "improvement of up to 28%", "49.02% mIoU" ADE20K, "fine-tuned on smaller datasets
  such as NYUv2, KITTI, and Pascal Context", official repo link `intel-isl/DPT`.
- **§1 Introduction**: motivation (encoder downsampling loses feature resolution/granularity),
  "transformers are known to realize their full potential only when an abundance of training
  data is available", DPT summary paragraph ("we reassemble the bag-of-words representation...").
- **§3 Architecture, unnumbered Reassemble equation and Eqs. 1–6**: Read/Readignore/Readadd/
  Readproj, Concatenate, Resample_s definitions; readout-token discussion; layer taps
  $l=\{5,12,18,24\}$ (Large), $\{3,6,9,12\}$ (Base), $\{9,12\}+R_0,R_1$ (Hybrid); default
  $\hat D = 256$; RefineNet-based fusion [23]; "Handling varying image sizes" paragraph (stride
  32 constraint).
- **§4.1 Monocular Depth Estimation**: experimental protocol ("We closely follow the protocol
  of Ranftl et al. [30]"), MIX 5 → MIX 6 dataset construction, training hyperparameters (LR
  1e-5/1e-4, batch 16, 60 epochs × 72,000 steps, 384×384 crops), Table 1 (zero-shot
  cross-dataset numbers, "more than 23% for DPT-Hybrid and 28% for DPT-Large"), Table 2 (NYUv2
  fine-tune), Table 3 (KITTI fine-tune), Table 9 (params/latency: MiDaS 105M/32ms, DPT-Base
  112M/17ms, DPT-Hybrid 123M/38ms, DPT-Large 343M/35ms).
- **§4.2 Semantic Segmentation**: protocol (following Zhang et al. [51]), auxiliary loss weight
  0.2, dropout 0.1, SGD momentum 0.9, poly LR decay 0.9, batch 48, train crop 480, inference
  resize 520, Table 4 (ADE20K, DPT-Hybrid 49.02% mIoU / DPT-Large 47.63%), Table 5 (Pascal
  Context fine-tune, DPT-Hybrid 60.46% mIoU).
- **§4.3 Ablations**: Table 6 (skip-connection tap-layer ablation, Base and Hybrid), Table 7
  (readout-token handling: ignore 0.0822 / add 0.0831 / proj 0.0819 mean), Table 8 (backbone
  ablation: ResNet50 0.0935, ResNeXt101-WSL 0.0806, DeiT-Base 0.0842, DeiT-Base-Dist 0.0796,
  ViT-Base 0.0819, ViT-Large 0.0778, ViT-Hybrid 0.0783), Figure 4 (inference-resolution
  degradation curve), "the original MiDaS architecture" identification (ResNeXt101-WSL
  backbone).
- **§5 Conclusion**: summary claim restated ("more fine-grained and globally coherent
  predictions... DPT unfolds its full potential when trained on large-scale datasets").
- **References**: [11] Dosovitskiy et al., ViT; [23]/[58] Lin et al., RefineNet (CVPR 2017);
  [30] Ranftl et al., MiDaS (cited repeatedly through §4.1 for protocol/loss/dataset); [32]
  Sener & Koltun, multi-task learning; [38] Touvron et al., DeiT; [17] Hendrycks & Gimpel, GELU.
- **Cross-checked against counterpart pages/notes** (read-only, no cache files): confirmed DPT
  mentioned in body text of `content/models/depth-anything.md` (lines 36, 38),
  `depth-anything-v2.md` (lines 38, 40), `depth-anything-3.md` (lines 50, 66),
  `dust3r.md` (lines 54, 91, 95, 113), `vggt.md` (lines 55, 76, 99); confirmed absent from
  `content/models/midas.md` (zero "DPT" hits) and from each of these five pages'
  `sources.references[]` frontmatter (checked directly, 2026-09-23). Confirmed zero
  cross-mentions between `ranftl2021-dpt.txt` and `xie2021-segformer.md`/SegFormer's own
  Related Work in either direction.
