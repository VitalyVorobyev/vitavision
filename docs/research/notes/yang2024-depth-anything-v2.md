---
paper_id: yang2024-depth-anything-v2
title: "Depth Anything V2"
authors: [Lihe Yang, Bingyi Kang, Zilong Huang, Zhen Zhao, Xiaogang Xu, Jiashi Feng, Hengshuang Zhao]
year: 2024
url: https://arxiv.org/abs/2406.09414
created: 2026-06-27
relevant_atlas_pages: [vit, mae]
---

# Setting

**Problem class**: Zero-shot monocular depth estimation (MDE) — predict dense relative depth from a single RGB image with no per-domain fine-tuning. Same task as V1, but V2 specifically targets two known V1 weaknesses: coarse depth labels producing over-smoothed predictions, and poor robustness to transparent / reflective objects.

**Inputs**: single RGB image, arbitrary scene and domain. Shorter side resized to 518 during training; aspect ratio preserved, random-cropped to 518×518 for training. No camera intrinsics or scene scale assumptions required.

**Outputs**: dense affine-invariant inverse depth map (disparity space). A metric-depth variant is released separately (fine-tuned on Hypersim for indoor, VKITTI2 for outdoor). Base model provides no absolute scale guarantee.

**Core precondition**: outputs are in disparity space (d = 1/t) and normalized per image to remove scale/shift — same affine-invariant formulation inherited from MiDaS [56] and V1 [89].

# Core idea

The central thesis of V2 is that **the labeled data design, not the architecture, is responsible for coarse depth predictions in prior discriminative models**. V1 relied on ~1.5M labeled real images whose depth annotations contain three systematic failure modes: sensor noise on transparent surfaces, stereo-matching failures on repetitive patterns, and SfM instability around dynamic objects. These noisy labels propagate into the model as over-smoothed, imprecise depth predictions.

V2's fix operates in three steps (Figure 7):

1. **Synthetic-only teacher**: replace all labeled real images with 595K precise synthetic images (BlendedMVS, Hypersim, IRS, TartanAir, VKITTI2) and train the most capable model (DINOv2-Giant, 1.3B params). Synthetic depth labels are "truly GT" — all thin structures, transparent vases, and reflective mirrors are correctly annotated because they come from a graphics renderer, not a physical sensor.

2. **Pseudo-labeling at scale**: run the DINOv2-G teacher on 62M unlabeled real images drawn from 8 public datasets (BDD100K, Google Landmarks, ImageNet-21K, LSUN, Objects365, Open Images V7, Places365, SA-1B). The teacher's predictions serve as pseudo labels, bridging the domain gap from synthetic training to real-world distribution.

3. **Synthetic-free student training**: train smaller student models (ViT-S/B/L/G) **purely on the pseudo-labeled real images**, without any synthetic images in this final stage. The pseudo labels are both highly diverse (62M real images) and highly precise (teacher trained on exact synthetic GT). This outperforms training students on synthetic+real or real-labeled datasets.

The key insight is that a teacher with sufficient capacity (DINOv2-G) and precise training labels (synthetic) can generate pseudo labels that are more reliable than human-annotated real datasets — a claim backed by the quantitative comparison in Table 6, where pseudo labels outperform the DIML manual labels on every metric.

Two loss terms are used for optimization on labeled (synthetic) images: scale-and-shift-invariant loss L_ssi and gradient-matching loss L_gm, both inherited from MiDaS [56]. Weight ratio L_ssi : L_gm = 1:2. The gradient matching loss is found to be critical for sharpness specifically when training on synthetic data (it was ineffective on real data, presumably because real labels are too coarse to provide fine-grained supervision even with this regularization — §B.7). On pseudo-labeled images, the feature alignment loss from V1 is retained to preserve DINOv2 semantic priors.

# Assumptions

1. **Synthetic scene diversity is sufficient for a powerful teacher**: the teacher is trained purely on 595K synthetic images across five datasets. The five datasets cover indoor and outdoor scenes but miss domains like "crowded people" or diverse weather. This assumption is soft — the domain gap is precisely what the pseudo-labeling step mitigates, but failure cases remain for scene types absent from both synthetic data and the 62M real pseudo-labeled pool (§D: limitations).

2. **DINOv2-G bridges synthetic-to-real transfer**: empirically, only DINOv2-G (not BEiT-L, SAM-L, SynCLR-L, DINOv2-S/B/L) achieves satisfying synthetic-to-real transfer when trained purely on synthetic images (Figure 5, Table 13). This is a hard dependency on the specific model; other backbone families fail even when scaling up.

3. **DINOv2-G Reg is inferior to DINOv2-G** at ViT-Giant scale (Table 13: DINOv2-G Reg is substantially worse on Sintel and DIODE), contrary to smaller scales where register variants are often better. V2 chooses the non-register DINOv2-G.

4. **Adding real labeled data to synthetic training hurts fine-grained predictions**: even 5% HRWSI mixed into the synthetic training set visually degrades output sharpness (Figure 12, §B.9). This is treated as an empirical hard rule — no mixing of real labels with synthetic for the teacher.

5. **Top-10% largest-loss pseudo-label regions are noisy and should be ignored**: the teacher may produce less reliable pseudo labels for specific pixels; these high-loss regions are dropped per training sample (§5.2). The 10% threshold is inherited from V1.

6. **Affine-invariant disparity output**: absolute depth requires a metric fine-tuning step; the base model only guarantees relative ordinal correctness per image.

# Failure regime

- **Remaining failure cases after pseudo-labeling**: the DINOv2-G teacher still makes incorrect predictions for scene patterns absent from synthetic data — sky (incorrectly given near depth) and human heads (inconsistent with body depth) remain failure cases when trained on synthetic only, even with DINOv2-G (Figure 6). The 62M pseudo-labeled real images largely resolve these, but edge cases persist (§D).

- **Conventional benchmarks do not reflect V2's improvements**: Table 2 shows V2 is only comparable to V1 on KITTI/NYU/Sintel/ETH3D/DIODE (AbsRel) despite visually obvious quality gains. The existing benchmarks contain noisy annotations (Figure 8 shows incorrect mirror and thin-structure depths in NYU-D) that penalise better models. This is the motivation for the DA-2K benchmark.

- **62M unlabeled images are necessary, not replaceable by more epochs on fewer images**: training solely on SA-1B (11M images) for the same number of iterations as the full 62M set falls short (Table 11), confirming that data diversity cannot be substituted by longer training.

- **Model scale limits efficiency for mobile/edge**: ViT-S at 25M params runs at 60ms on V100; ViT-L at 335M params runs at 213ms. ViT-G at 1.3B is the teacher only; practical deployment targets ViT-S or ViT-B.

- **Metric depth from synthetic fine-tuning inherits synthetic biases**: metric variants are fine-tuned on Hypersim (indoor) and VKITTI2 (outdoor), so they may generalise less well than the relative-depth base model to novel scenes.

# Numerical sensitivity

- **Affine-invariant representation**: same as MiDaS and V1. Depth values mapped to disparity (d = 1/t), then normalised per image by scale and shift before loss computation. This design removes ambiguity in the absolute depth scale across heterogeneous training datasets.

- **Loss weight ratio L_ssi : L_gm = 1:2** (§7.1). Gradient matching loss weight 2.0 chosen to balance metric performance against depth sharpness (ablated in Figure 10: weights from 0.5 → 4.0 monotonically improve sharpness; 2.0 selected as trade-off).

- **Training resolution 518×518** (patch size 14 from DINOv2; 518 = 37 × 14): same as V1. Images shorter-side-resized to 518, then random-cropped. Test-time resolution scaling works: 2× and 4× base resolution further improve sharpness with no retraining (Figure 11, §B.8) — a useful inference-time knob.

- **Teacher training**: batch size 64, 160K iterations (§7.1).

- **Student training**: batch size 192, 480K iterations, purely on pseudo-labeled real images (§7.1 and §5.2 / Table 5 footnote confirming removal of synthetic from student stage is beneficial for ViT-S and ViT-B).

- **Optimizer**: Adam. Encoder LR = 5e-6, decoder LR = 5e-5 (ratio 1:10), same as V1 (§7.1).

- **Top-10% largest loss pixels per sample ignored** to filter noisy pseudo labels (§5.2).

- **No dataset balancing**: training datasets concatenated without reweighting (§7.1).

# Applicability

- **Use when**: need fine-grained, robust relative depth on in-the-wild images — especially scenes with transparent objects, reflective surfaces, or fine thin structures (V2 handles all three, unlike V1). When initialising a metric-depth pipeline (replace V1 encoder with V2 encoder). When encoder must also transfer to semantic segmentation (Table 8: V2 ViT-L achieves 85.6 mIoU on Cityscapes, best of all methods tested).
- **Don't use when**: absolute metric depth required out-of-the-box without fine-tuning; real-time mobile inference at <30ms (ViT-S at 60ms on V100 is the fastest option); when license constraints preclude CC-BY-NC-4.0 (ViT-B/L/G weights — ? not confirmed in paper, see Provenance).
- **Compared against**: Marigold [31] (SD-based, fine-grained but slow at 5.2s and 948M params; DA-2K 86.8% vs DA-2K 97.1% for V2-L); Depth Anything V1 [89] (same architecture but trained on noisy real labels; V1 DA-2K 88.5%); DepthFM [25] (SD flow-matching, 2.1s, 85.8%); ZoeDepth [6] (metric depth using MiDaS encoder, superseded by V2 encoder in Table 4).

# Connections

- Builds on: [`yang2024-depth-anything`, `ranftl2019-midas`, `oquab2023-dinov2`] — V2 extends V1's pseudo-labeling framework with a synthetic-only teacher; inherits MiDaS affine-invariant loss + DPT decoder; uses DINOv2 encoders (all model scales, S through G).
- Enables / generalized by: [`lin2025-depth-anything-3`] — DA3 uses DA2 as teacher for monocular depth in its training pipeline and surpasses DA2 on standard monocular benchmarks with a multi-view architecture.

# Atlas update plan

## NEW: depth-anything-v2
Type: model
Domain: depth estimation
arch_family: vit
Primary source: this paper

- **Motivation**: V1 [yang2024-depth-anything] relied on large-scale labeled real images that contain systematic label noise (sensor failures on transparent objects, stereo failures on textures, SfM instability on dynamic objects) and coarse detail annotations. V2 addresses the root cause by substituting precise synthetic images for all labeled real data in the teacher-training stage.

- **Architecture**: DINOv2 ViT encoders (ViT-S 25M / ViT-B / ViT-L 335M / ViT-G 1.3B params) + DPT [55] depth decoder. Training resolution 518×518. Outputs affine-invariant inverse depth (disparity space, same as V1). Architecture is identical to V1; all improvement comes from data design.

- **Training — three-stage data recipe**:
  1. Teacher (DINOv2-G) trained **purely on 595K synthetic images** (BlendedMVS 115K, Hypersim 60K, IRS 103K, TartanAir 306K, VKITTI2 20K). Synthetic labels are complete and exact. Real labeled data is explicitly excluded.
  2. Teacher pseudo-labels **62M unlabeled real images** (BDD100K 8.2M, Google Landmarks 4.1M, ImageNet-21K 13.1M, LSUN 9.8M, Objects365 1.7M, Open Images V7 7.8M, Places365 6.5M, SA-1B 11.1M).
  3. Student models (ViT-S/B/L/G) trained **purely on pseudo-labeled real images**, omitting synthetic images in this stage (Table 5 shows removing synthetic at student stage slightly improves ViT-S/B).
  Losses: L_ssi + L_gm (MiDaS, ratio 1:2) on labeled synthetic; adds V1-style DINOv2 feature alignment on pseudo-labeled real. Top-10% highest-loss pixels per sample ignored as noisy pseudo labels.

- **Evaluation — DA-2K benchmark**: new benchmark introduced by the authors. 2K images, 2K sparse relative-depth pixel pair annotations, 8 scenario categories (Indoor, Outdoor, Non-real, Transparent/Reflective, Adverse style, Aerial, Underwater, Object). Annotation uses SAM [33] to generate candidate pixel pairs; four depth models vote; disagreed pairs sent to human annotators for triple-checked labels. More diverse, higher-resolution, and less noisy than NYU-D or KITTI.

- **Performance headline** (DA-2K benchmark, Table 3): V2 ViT-S 95.3%, ViT-B 97.0%, ViT-L 97.1%, ViT-G 97.4%. Compared to Marigold 86.8%, Geowizard 88.1%, DepthFM 85.8%, V1 88.5%.

- **Efficiency** (V100 latency, Figure 1): V2 ViT-S 60ms / 25M params; V2 ViT-L 213ms / 335M params. SD-based Marigold(LCM) 5.2s / 948M, DepthFM 2.1s / 891M. V2 is >10× faster than SD-based alternatives.

- **Implementations**: project page https://depth-anything-v2.github.io; code repo inferred as `DepthAnything/Depth-Anything-V2` (? not explicitly named in paper). Code license Apache-2.0 per project page; ViT-B/L/G checkpoint license CC-BY-NC-4.0 (? stated in repo README, not in paper — verify before use).

- **Assessment**: practical relative-depth foundation model as of mid-2024 for open-world monocular depth. Outperforms Marigold-class diffusion models in accuracy and by >10× in speed. Strong encoder for downstream transfer (semantic segmentation, metric depth). Superseded for multi-view settings by DA3 [lin2025-depth-anything-3], which uses DA2 as its teacher and surpasses it on monocular benchmarks with a multi-view architecture. V2 remains the default single-image depth model.

- **References**: arXiv 2406.09414 / NeurIPS 2024.

## UPDATE: vit
Section: Where it appears
- Add bullet: Depth Anything V2 uses DINOv2-pretrained ViT-S/B/L/G as the depth encoder + DPT decoder. Crucially, the choice of backbone determines whether synthetic-to-real transfer is feasible at all: among BEiT-L, SAM-L, SynCLR-L, DINOv2-S/B/L/G, only DINOv2-G achieves satisfying transfer when trained purely on synthetic depth data (Figure 5, Table 13). V2 also transfers the DINOv2 encoder to semantic segmentation, achieving 85.6 mIoU on Cityscapes (best reported in Table 8, exceeding DINOv2-based priors without Mapillary pretraining).

# Provenance

All facts trace to the cached plain-text copy of arXiv 2406.09414v2 (20 Oct 2024), identified as the NeurIPS 2024 version.

- **§Abstract / Figure 1**: Three key practices named. Model scale range 25M–1.3B. "More than 10× faster" than SD-based models.
- **§2**: Two disadvantages of real labeled data articulated — label noise (Fig 3: sensors fail on transparent objects, stereo on repetitive patterns, SfM on dynamic objects) and ignored details (Fig 4a: coarse tree/chair boundaries).
- **§3**: Two limitations of synthetic data — distribution shift (style/color) and restricted scene coverage. Pilot study: only DINOv2-G achieves satisfying synthetic-to-real transfer out of BEiT, SAM, SynCLR, DINOv2 variants (Fig 5, Table 13).
- **§4**: Three benefits of large-scale unlabeled real pseudo-labeling — bridges domain gap, enhances scene coverage, transfers teacher knowledge to smaller students.
- **§5.1 (Overall Framework)**: Three-step pipeline stated (Fig 7). Four student models released (ViT-S/B/L/G).
- **§5.2 (Details)**: "five precise synthetic datasets (595K images) and eight large-scale pseudo-labeled real datasets (62M images)" — Table 7. Top-10% loss ignored. "affine-invariant inverse depth." L_ssi + L_gm both from MiDaS [56]. L_gm "super beneficial to depth sharpness when using synthetic images." Feature alignment loss from V1 added on pseudo-labeled images.
- **§7.1 (Implementation)**: DPT [55] decoder. Resolution 518×518. Teacher: batch 64, 160K iterations. Student: batch 192, 480K iterations. Adam optimizer, encoder LR 5e-6, decoder LR 5e-5. L_ssi : L_gm weight ratio = 1:2. No dataset balancing.
- **Table 5**: Student trained purely on pseudo-labeled (Du) without synthetic (Dl) achieves best results for ViT-S and ViT-B; comparable for ViT-L. Confirms removing synthetic from student stage.
- **Table 6**: Pseudo labels vs manual labels on DIML — pseudo labels win on every metric. Quantitative proof that pseudo labels are higher quality than real annotations.
- **Table 7**: Exact synthetic dataset sizes: BlendedMVS 115K, Hypersim 60K, IRS 103K, TartanAir 306K, VKITTI2 20K = 595K. Real datasets: BDD100K 8.2M, Google Landmarks 4.1M, ImageNet-21K 13.1M, LSUN 9.8M, Objects365 1.7M, Open Images V7 7.8M, Places365 6.5M, SA-1B 11.1M = 62M.
- **Table 3 / Figure 1**: DA-2K accuracy figures — V2 ViT-S 95.3%, ViT-B 97.0%, ViT-L 97.1%, ViT-G 97.4%; Marigold 86.8%, DepthFM 85.8%, V1 88.5%. Latency: ViT-S 60ms / 25M, ViT-L 213ms / 335M; Marigold(LCM) 5.2s / 948M, DepthFM 2.1s / 891M.
- **§B.7 / Figure 10**: Gradient matching loss L_gm ablation on synthetic data. Weight 0.5 → 4.0 monotonically improves sharpness; 2.0 selected as the trade-off point.
- **§B.8 / Figure 11**: Test-time resolution 2× and 4× further improves sharpness without retraining.
- **§B.9 / Figure 12**: Adding 5% HRWSI real labeled images to synthetic training visually degrades output sharpness — confirms real labeled data is harmful to fine-grained predictions.
- **Table 13**: Encoder comparison on purely synthetic-trained models — DINOv2-G [50] achieves best results (AbsRel 0.075 KITTI, 0.044 NYU, 0.530 Sintel). DINOv2-G Reg [16] substantially worse than non-register DINOv2-G on Sintel (0.753 vs 0.530).
- **§6 / Table 3 / Table 14**: DA-2K benchmark — 2K images, 2K pixel pairs, 8 scenarios; annotation pipeline uses SAM masks + four expert model votes + human triple-check for disagreements; high-resolution (~1500×2000).
- **Project page URL**: https://depth-anything-v2.github.io (line 15 of cache file).
- **License**: Paper text does not state license for model weights. Apache-2.0 for code and ViT-S/B/L/G split (ViT-S Apache-2.0, others CC-BY-NC-4.0) is stated in the GitHub repo README only — not in the paper — marked `?`. Verify from `DepthAnything/Depth-Anything-V2` README before using ViT-B/L/G weights commercially.
