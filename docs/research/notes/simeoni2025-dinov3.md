---
paper_id: simeoni2025-dinov3
title: "DINOv3"
authors: [Oriane Siméoni, Huy V. Vo, Maximilian Seitzer, Federico Baldassarre, Maxime Oquab, et al. (Meta AI Research)]
year: 2025
url: https://arxiv.org/abs/2508.10104
created: 2026-08-23
relevant_atlas_pages: [dinov2, vit, mae, attention-mechanism]
---

# Setting

**Problem class**: Self-supervised pretraining of a universal, frozen visual backbone at much larger scale (model and data) than DINOv2, specifically targeting the failure mode where dense (pixel-level) feature quality degrades over long training schedules even as global (image-level) feature quality keeps improving.

**Inputs**: Arbitrary RGB images, web-sourced (Instagram public posts) or domain-specific (satellite imagery). No annotations, no captions.

**Outputs**: A patch-level and CLS-token feature map from a frozen ViT (or, for smaller distilled variants, ConvNeXt). A companion text encoder (`dino.txt`) can be trained on top to add zero-shot text alignment.

**Precondition**: Backbone used frozen for essentially all reported results — object detection and segmentation adapters are trained on top of a completely frozen backbone (§6.3.1: "the first competitive detection model to use a frozen backbone").

# Core idea

DINOv3 keeps the DINOv2 recipe (image-level `DINO` loss + patch-level `iBOT` masked-modeling loss + `KoLeo` uniformity regularizer, with Sinkhorn-Knopp teacher centering) but changes three things: (1) it scales the teacher network to 7B parameters and the curated training set to ~1.7B images; (2) it removes cosine schedules in favor of constant hyperparameters trained to 1M iterations; (3) it adds a new **Gram anchoring** regularization phase that repairs the dense-feature degradation that scale and long training otherwise cause.

**Phase 1 loss** (§3.2, unchanged in form from DINOv2 apart from a dedicated layer-norm on backbone outputs and Sinkhorn-Knopp replacing DINO's original centering):

$$\mathcal{L}_{\mathrm{Pre}} = \mathcal{L}_{\mathrm{DINO}} + \mathcal{L}_{\mathrm{iBOT}} + 0.1 \cdot \mathcal{L}_{\mathrm{DKoleo}} \tag{1}$$

**The problem this note is anchored on — dense-feature collapse.** During phase-1 training, ImageNet-1k linear classification accuracy improves monotonically through 1M iterations, but linear segmentation on Pascal VOC *peaks around 200k iterations and then declines*, falling below its early level by 1M iterations for the 7B model (Fig. 5b/5c, §4.1). Visualizing cosine similarity between a reference patch and all other patches (Fig. 6) shows the similarity map is smooth and well-localized at 200k iterations but "degrade[s] substantially" by 600k+, with an increasing number of spatially distant, semantically irrelevant patches showing high similarity to the reference patch. The authors link this to the CLS token's cosine similarity with patch outputs gradually rising over training — patch features are losing their locality as the model over-indexes on global (image-level) discrimination. This is explicitly distinguished from the *high-norm outlier* patch artifact fixed by register tokens (Darcet et al., 2024) — patch norms stay stable throughout; this is a distinct locality/consistency failure.

**Gram anchoring mechanism** (§4.2, exact mechanism): the Gram matrix of an image's patch features is the $P \times P$ matrix of all pairwise dot products of the $P$ L2-normalized local (patch) features (equivalently $X X^\top$ for the $P \times d$ feature matrix $X$). Let $X_S$ be the student's L2-normalized patch-feature matrix for an image, and $X_G$ the same for an earlier **Gram teacher** checkpoint (an EMA-teacher snapshot from early training, selected because it "exhibits superior dense properties" — before the degradation sets in). The loss pushes the student's pairwise-similarity structure toward the Gram teacher's, without constraining the features themselves:

$$\mathcal{L}_{\mathrm{Gram}} = \left\| X_S \cdot X_S^\top - X_G \cdot X_G^\top \right\|_F^2 \tag{2}$$

Because the loss operates on the Gram matrix (pairwise similarity structure) rather than directly matching feature vectors, "local features are free to move, provided the structure of similarities remains the same" — this is why it can be applied late, after global features are already fully formed, without destroying them. It is computed on global crops only.

**When it kicks in**: applied only in a second training phase ("refinement step"), starting after the 1M-iteration phase-1 training. The paper notes it "can be applied early on during training" but for efficiency they "start only after 1M iterations", and observe that even this late application "manages to 'repair' very degraded local features." The Gram teacher itself is refreshed every 10k iterations — at each refresh it is reset to be identical to the current main EMA teacher — for a maximum of three updates (App. C: "update the Gram teacher every 10k steps for a maximum of three updates"), i.e. a ~30k-iteration refinement phase total. The refinement objective:

$$\mathcal{L}_{\mathrm{Ref}} = w_D \mathcal{L}_{\mathrm{DINO}} + \mathcal{L}_{\mathrm{iBOT}} + w_{DK} \mathcal{L}_{\mathrm{DKoleo}} + w_{\mathrm{Gram}} \mathcal{L}_{\mathrm{Gram}} \tag{3}$$

with $w_{\mathrm{Gram}} = 2$ (App. C, §D). The weights $w_D$ and $w_{DK}$ are left as symbols in the paper's main-text equation and their numeric values are **not** stated in the accessible text (only referenced as being in the released config files) — marked `?` below.

**Quantitative effect** (§4.2, Fig. 8, Table showing the Gram teacher/resolution ablation in §4.3): applying $\mathcal{L}_{\mathrm{Ref}}$ produces "significant improvements on dense tasks within the first 10k iterations." The paper's own ablation table (§4.3, unnumbered table next to Fig. 9) reports, relative to a `Baseline` (no Gram anchoring, IN1k linear 88.2, ADE20k mIoU 50.3, NYU RMSE 0.307): a Gram-anchored model with teacher from 200k iterations and ×1 (no upsampling) reaches ADE20k mIoU 53.6 / NYU RMSE 0.285 (IN1k linear roughly unchanged at 88.0); with the higher-resolution Gram-teacher variant (teacher inputs at 2× resolution, features 2× downsampled before computing the Gram matrix — see below) at the same 200k teacher, ADE20k rises further to 55.7 mIoU / 0.281 RMSE. A much later Gram teacher (1M iterations) is worse (54.9 mIoU / 0.290 RMSE) "because the patch-level consistency of such a teacher is inferior" — confirming the mechanism specifically needs an *early*, dense-consistent teacher, not just any EMA snapshot. Gram anchoring "significantly influences the iBOT loss, causing it to decrease more rapidly" while having little effect on the DINO loss — i.e. Gram and iBOT act on the same locality-oriented aspect of the representation, distinct from the DINO/CLS-level objective (§4.2, Fig. 7).

**High-resolution Gram refinement** ($\mathcal{L}_{\mathrm{HRef}}$, §4.3): to get an even better Gram teacher, images are fed to the Gram teacher at 2× the normal resolution, then the resulting feature map is 2×-downsampled with bicubic interpolation to match the student's spatial size before computing $X_G$ — this preserves the superior patch-level consistency of higher-resolution features while matching output size. This raises ADE20k mIoU by a further +2 points on top of the plain $\mathcal{L}_{\mathrm{Ref}}$ gain.

**High-resolution adaptation is a separate, later post-training step** (§5.1) that also uses Gram anchoring (with the 7B teacher itself as Gram teacher this time) — the paper states this component is "essential: without it, the model performance on dense prediction tasks degrades significantly" at the higher resolutions used in this phase.

**Sinkhorn-Knopp / architecture changes carried from DINOv2**: centering replaced with Sinkhorn-Knopp (from SwAV) in both DINO and iBOT heads; dedicated LayerNorm on backbone outputs before loss computation (+0.2 IN1k kNN accuracy late in training, +1 mIoU ADE20k, −0.02 RMSE NYUv2 — §3.2).

**RoPE and RoPE-box jittering** (§3.2): DINOv3 replaces DINOv2's learnable absolute position embeddings with a custom axial RoPE variant — patch coordinates are assigned in a normalized $[-1,1]$ box, and a bias depending on relative patch position is applied inside multi-head attention. To improve robustness to resolution/scale/aspect-ratio changes, the box is randomly rescaled to $[-s, s]$ with $s \in [0.5, 2]$ per training step ("RoPE-box jittering").

# Claimed contributions

- C1 (data scaling): "We build upon recent advances in automatic data curation (Vo et al., 2024) to obtain a large 'background' training dataset that we carefully mix with a bit of specialized data (ImageNet-1k)... This contribution (i) around data scaling will be described in Sec. 3.1." (Overview of Contributions, p.4)
- C2 (architecture/training at scale): "We increase our main model size to 7B parameters by defining a custom variant of the ViT architecture. We include modern position embeddings (axial RoPE) and develop a regularization technique to avoid positional artifacts. Departing from the multiple cosine schedules in DINOv2, we train with constant hyperparameter schedules for 1M iterations." (p.4)
- C3 (Gram anchoring): "We propose a core improvement of the pipeline with a Gram anchoring training phase. This cleans the noise in the feature maps, leading to impressive similarity maps, and drastically improving the performance on both parametric and non-parametric dense tasks." (p.4)
- C4 (post-training pipeline): "The last steps of our pipeline consist of a high-resolution post-training phase and distillation into a series of high-performance models of various sizes. For the latter, we develop a novel and efficient single-teacher multiple-students distillation procedure." (p.4–5)
- C5 (headline results, Abstract/§1): "we achieve state-of-the-art performance on longstanding computer vision problems such as object detection (COCO detection, mAP 66.1) and image segmentation (ADE20k, mIoU 63.0), outperforming specialized fine-tuned pipelines," with a frozen backbone and no fine-tuning of the encoder; the paper also claims generality by applying "the DINOv3 algorithm to satellite imagery... surpassing all prior approaches" (§8).

# Assumptions

1. **An earlier training checkpoint has better dense-feature locality than a later one.** The whole Gram-anchoring mechanism assumes the *dense-feature quality curve* (Fig. 5b/5c) is non-monotonic — peaking early and declining — while the *global-feature quality curve* keeps improving. If this decoupling didn't hold, choosing an "earlier, better" Gram teacher would be meaningless.
2. **Gram-matrix structure carries the locality signal, not the feature values themselves.** The method explicitly claims that regularizing pairwise similarity (rather than matching features directly, e.g. via an L2 or cosine feature-matching loss) lets global features keep improving while local consistency is restored — an implicit assumption that dense-feature quality is fully captured by pairwise patch similarity structure, not absolute feature identity.
3. **(Soft) Curated, diverse data is necessary** (inherited from DINOv2; reconfirmed in the paper's own data ablation, Table 1: the full mixed curation pipeline (LVD-1689M) beats raw, clustering-only, and retrieval-only curation on every reported metric at a 200k-iteration ablation schedule).
4. **RoPE removes the need for fixed training resolution.** The paper explicitly credits RoPE for the model's ability to "seamlessly process images at varying resolutions without requiring adaptation" (§4.3) — this underlies both the high-res Gram teacher trick and the later resolution-scaling post-training step.
5. **(Hard) Distillation targets require Gram-anchoring only for the teacher, not the students.** Distilled ViT-S/S+/B/L/H+ and ConvNeXt models are trained against a *fixed* 7B teacher (not an EMA) and the paper states "we do not observe patch-level consistency issues and therefore do not apply the Gram anchoring technique" during distillation (§5.2) — the fixed-teacher setup itself avoids the degradation the EMA/long-schedule setup produces.

# Failure regime

- **Dense-feature collapse without Gram anchoring**: the core failure mode this paper targets — segmentation mIoU on VOC declines past ~200k iterations of phase-1 training and falls below its early value by 1M iterations for the 7B model (§4.1, Fig. 5). "This phenomenon appears in longer training runs with models above ViT-Large size (300M parameters)" per DINOv2-scale precedent (§1) — i.e. it worsens with model size, "reducing the usefulness of scaling DINOv2."
- **A too-late Gram teacher is detrimental**: choosing the Gram teacher from a later iteration (1M) rather than early (100k/200k) is worse (mIoU 54.9 vs 55.7, RMSE 0.290 vs 0.281 — §4.3 ablation table), "because the patch-level consistency of such a teacher is inferior" — the Gram-teacher choice is not free; it must come from before the degradation onset.
- **Weakly-supervised (CLIP-style) baselines lack 3D/geometric awareness**: SigLIP 2 and PEcore score far below SSL and even agglomerative models on geometric/semantic correspondence (NAVI 49.4/39.9, SPair 42.6/23.1 vs DINOv3's 64.4/58.7 — Table 4, §6.1.3), and Table 5/tracking shows the same pattern for video segmentation propagation.
- **Agglomerative (SAM-distilled) models underperform pure SSL on non-parametric dense tasks despite supervised-mask distillation**: PEspatial (distilled from SAM2) lags DINOv2 by −11.6% recall on NAVI geometric correspondence and even falls behind Franca, "suggest[ing] that self-supervised learning is a key component for strong performance on this task" (§6.1.3).
- **Video temporal reasoning is not where DINOv3 shines**: on Something-Something V2 (motion-dependent), the dedicated video model V-JEPA 2 clearly outperforms DINOv3 (single-clip 73.8 vs 70.1 top-1, Table 6) — DINOv3's advantage narrows or reverses on tasks requiring temporal/motion understanding rather than appearance.
- **Text-alignment (`dino.txt`) trails the best weakly-supervised models on global tasks**: DINOv3's text-aligned ViT-L is behind SigLIP 2 and PE on IN1k zero-shot classification (82.3 vs 83.1/83.5) and retrieval, though it clearly leads on dense/open-vocabulary segmentation alignment (ADE20k 24.7 vs SigLIP2's 10.8, PE's 17.6 — Table 16).

# Numerical sensitivity

- **$w_{\mathrm{Gram}} = 2$** is the only refinement-loss weight given a numeric value in the accessible text (App. C, §D); $w_D$ and $w_{DK}$ in Eq. 3 are left symbolic in the main text with numeric values only in the released config files (`?` — not directly confirmed in the paper text available here).
- **Gram teacher refresh cadence**: every 10k iterations, for a maximum of 3 updates (≈30k-iteration refinement phase total) — after which "the Gram teacher becomes identical to the main EMA teacher" (§4.2).
- **Gram loss starts at 1M iterations** (i.e. only after the full phase-1 schedule) purely "for efficiency" — the paper notes the mechanism itself "can be applied early on during the training" and would presumably work similarly, but this was not the production configuration.
- **High-resolution Gram teacher**: 2× input resolution, then bicubic 2× downsample of the resulting feature map to match the student's spatial size (§4.3) — the paper explicitly checks that patch-level consistency survives this downsampling (Fig. 9a).
- **Constant optimization schedule** (§3.2, App. C): learning rate 0.0004 (constant, with linear warmup over 100k iterations), weight decay 0.04, per-layer LR decay factor 0.98, stochastic depth 0.4, EMA teacher momentum 0.999 — all held constant rather than annealed, a deliberate departure from DINOv2's cosine schedules "because the interplay between model capacity and training data complexity is hard to assess a priori."
- **Batch/sequence composition**: total batch size 4096 across 256 GPUs; 2 global crops (256px) + 8 local crops (112px) per image; total sequence length 3.7M tokens per batch — matched to DINOv2's effective sequence length despite the larger patch size (16 vs 14) by adjusting crop sizes (§3.2).
- **High-resolution post-training crop mix** (App. C): global/local/Gram-teacher crop-resolution triples sampled with probabilities (512,112,768)@0.3, (768,112,1152)@0.3, (768,168,1152)@0.3, (768,224,1152)@0.05, (768,336,1152)@0.05 — "obtained empirically," over 10k additional iterations.
- **Data mix**: 10% of training batches are homogeneous ImageNet-1k-only batches; the rest are heterogeneous mixes of the curated/retrieval/raw components (§3.1) — following Charton & Kempe (2024)'s finding that homogeneous high-quality batches help even when most training is heterogeneous.

# Applicability

- **Use when**: you need a single frozen backbone that is simultaneously strong on dense geometric/semantic tasks (segmentation, depth, 3D correspondence, tracking) *and* competitive on global classification/retrieval, without any task-specific fine-tuning; especially when your workload needs stable features across a wide range of input resolutions (native up to ~4096px demonstrated qualitatively) or needs to scale to non-web imagery (the paper explicitly validates the same recipe on satellite/aerial data, §8).
- **Don't use when**: (a) you need the best possible global zero-shot text-image alignment — SigLIP 2 / Perception Encoder still edge out `dino.txt` on pure classification/retrieval; (b) your task is fundamentally about motion/temporal reasoning — dedicated video SSL (V-JEPA 2) wins on SSv2; (c) you cannot afford the 7B-parameter teacher and need something smaller than ViT-S (21M) — though the family's low end already targets resource-constrained deployment.
- **Compared against** (paper's own baseline sets, §6): DINOv2 (predecessor, "self-supervised backbones"), Web-DINO (Fan et al. 2025, DINO scaled without curation), Franca (Venkataramanan et al. 2025, best open-data SSL); weakly-supervised SigLIP 2 and Perception Encoder (PEcore/PEspatial); agglomerative/distilled AM-RADIOv2.5 and PEspatial (distilled from SAM/SAM2 + CLIP + DINOv2).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| oquab2023-dinov2 / dinov2 | "DINOv2... exemplifies these strengths" (§1); Table 2 gives a head-to-head teacher-architecture comparison (ViT-giant 1.1B → ViT-7B 6.7B, patch 14→16, learnable pos.emb.→RoPE, DINO prototypes 128k→256k); "we aim to scale up the model and data, and obtain even more powerful visual representations" (§3.2) | extended_by | high | **Plan-confirmed**: authored on dinov2 as `{ type: extended_by, target: dinov3, confidence: high }`; `quality:` not set to historical on dinov2 (per approved plan, none historical) — DINOv2 remains the smaller/cheaper practical option, DINOv3 does not strictly dominate on all axes (e.g. simpler weaker infra requirements). |
| caron2021-dino | "we use an image-level objective (Caron et al., 2021) $\mathcal{L}_{\mathrm{DINO}}$" (§3.2); listed among "self clustering-based strategies" in Related Work §2 | feeds_into | medium | DINO's loss is a named, still-verbatim component of DINOv3's total loss (Eq. 1/3), same as it was for DINOv2. Chronology OK (2021 ≤ 2025). Likely redundant with an existing `caron2021-dino → dinov2` edge if one exists — orchestrator should check whether to add on dinov3 directly or let it inherit via the dinov2 `extended_by` chain. No dedicated `content/models/dino.md` page exists yet, so `target` would need to stay the paper-id. |
| dosovitskiy2020-vit / vit | "we increase our main model size to 7B parameters by defining a custom variant of the ViT architecture" (§3.2, Overview of Contributions); Table 2 details architecture hyperparameters as a ViT variant | none | — | This is an architecture prerequisite (ViT is the base building block), not a `relations[]` category per CLAUDE.md — better expressed via `prerequisites: [vit]` on the new `dinov3` page than a typed relation. |
| grill2020-byol | Cited only as part of a historical list: "contrastive objectives and information-theoretic criteria (Hénaff et al., 2019; He et al., 2020; Chen and He, 2020; Chen et al., 2020a; Grill et al., 2020; Bardes et al., 2021)" (§2, Related Work) | none | low | No specific comparative or lineage claim toward DINOv3 itself — background history of the discriminative-SSL line DINO belongs to, two hops removed. No relations[] edge warranted. |
| he2019-moco | Same list as above ("He et al., 2020" — note: this citation key in the paper's bibliography is the MoCo v2 paper, not necessarily he2019-moco's exact year; treat as the MoCo lineage citation) (§2) | none | low | Same as BYOL row — pure background lineage, no direct claim about DINOv3. |
| chen2020-simclr | Same list ("Chen et al., 2020a") (§2, Related Work) | none | low | Same as above — background lineage only. |

# Connections

- Builds on: [oquab2023-dinov2, caron2021-dino, dosovitskiy2020-vit] — direct algorithmic continuation of DINOv2's DINO+iBOT+KoLeo recipe (Eq. 1) at larger scale; DINO's image-level loss and ViT's architecture are named components. iBOT (Zhou et al., 2021) supplies the patch-level masked-modeling loss but is not yet a registered Atlas source (same gap noted in the DINOv2 note).
- Enables (downstream, per Related Work's framing of dense-transformer-feature consumers, §2): multi-modal models, 3D understanding, robotics, video understanding are named generically as consumer domains of dense transformer features (§2, "Dense Transformer Features") but no specific downstream paper is named the way DINOv2's note names Depth Anything/VGGT — treat any such downstream slug as inferred, not paper-confirmed.
- Refutes / supersedes: none stated as supersession of DINOv2 in the strong sense — DINOv2 is positioned as the immediate predecessor whose known weakness (dense-feature degradation at scale) DINOv3 fixes, not as an obsolete method.

# Atlas update plan

## NEW: dinov3
Type: model
Domain: representation-learning
arch_family: vit (primary teacher and S/S+/B/L/H+ variants); convnext (distilled CNX-T/S/B/L variants)
Primary source: this paper

**What v3 introduced (delta from DINOv2)**:
- Scale: teacher grows from ViT-giant (1.1B params, DINOv2) to a custom ViT-7B (6.7B params) — same 40 blocks, but embed dim 1536→4096, patch size 14→16, learnable position embeddings → axial RoPE with box-jittering, DINO prototypes 128k→256k (Table 2).
- Training-schedule philosophy: DINOv2's multi-stage cosine schedules replaced with constant hyperparameters trained to 1M iterations, motivated by not needing to know the optimization horizon a priori.
- New failure mode fixed: dense-feature (patch-locality) degradation over long training/large models — absent in the small-model DINOv2 regime but explicit and measured at scale here (§4.1, Fig. 5).
- New mechanism: Gram anchoring (Eq. 2/3) — a second post-training phase that regularizes the student's patch-pairwise-similarity (Gram) matrix toward that of an earlier, dense-consistency-superior "Gram teacher" checkpoint, refreshed every 10k iterations for up to 3 updates, with an optional high-resolution variant ($\mathcal{L}_{\mathrm{HRef}}$) that computes the Gram teacher's features at 2× resolution then downsamples.
- New post-training stages: resolution-scaling adaptation (10k iterations, mixed 512–768px global crops, Gram anchoring against the frozen 7B teacher — "essential" per the paper); efficient single-teacher multi-student distillation (parallel training of ViT-S/S+/B/L/H+ and ConvNeXt-T/S/B/L against a single fixed 7B teacher, sharing teacher-inference cost across students, §5.2); text alignment via `dino.txt` (Jose et al. 2025 recipe, LiT-style contrastive text encoder on top of a frozen ViT-L, concatenating mean-pooled patch embeddings with the CLS token before text matching).
- Data: LVD-1689M (1.689B images), curated via 5-level hierarchical k-means clustering (200M→8M→800k→100k→25k clusters) plus retrieval-based curation plus raw ImageNet-1k/22k/Mapillary, from an initial ~17B-image Instagram pool (§3.1).

**Family**: ViT-S (21M), ViT-S+ (29M, custom), ViT-B (86M), ViT-L (0.3B), ViT-H+ (0.84B, custom, closes gap to 7B teacher), ViT-7B (6.716B, flagship); ConvNeXt-Tiny (29M), -Small (50M), -Base (89M), -Large (198M) (Fig. 16a). All distilled from the single ViT-7B teacher.

**Key results (frozen backbone, vs DINOv2/weakly-supervised)**:
- COCO object detection with a fully frozen backbone + lightweight Plain-DETR decoder (100M trainable params): mAP 66.1 (simple) / 66.4 with TTA — new SOTA over EVA-02+Co-DETR (65.4/65.9, 300M trainable) and PEspatial+DETA (65.3/66.0, 2B trainable) (Table 10).
- ADE20k segmentation, frozen backbone + Mask2Former/ViT-Adapter decoder: mIoU 62.6 (simple) / 63.0 (TTA), matching SOTA ONE-PEACE (63.0) and beating BEiT-3 (62.8) and InternImage-H (62.9) (Table 11).
- Dense linear probing (Table 3, ViT-7B): ADE20k mIoU 55.9 (vs DINOv2 49.5, SigLIP2 42.7, PEspatial 49.3); NYUv2 depth RMSE 0.309 (vs DINOv2 0.372, SigLIP2 0.494).
- 3D geometric correspondence (Table 4, NAVI dataset): recall 64.4, +4.3 points over DINOv2 (60.1) and clearly ahead of weakly-supervised SigLIP2 (49.4)/PEcore (39.9).
- ImageNet-1k linear probe (Table 7, ViT-7B): 88.4 val (vs DINOv2 87.3), best-in-class corruption robustness (ImageNet-C 19.6, lowest/best), though 0.7–0.9 points behind SigLIP2/PE on raw val accuracy.
- `dino.txt` zero-shot (Table 16, ViT-L): IN1k zero-shot 82.3 (behind PE 83.5, SigLIP2 83.1) but ADE20k open-vocab segmentation mIoU 24.7, well ahead of SigLIP2 (10.8) and PE (17.6) — the dense/open-vocab gain the local-feature quality directly buys.
- Distillation fidelity: ViT-H+ (840M, ~1/8 the teacher's params) reaches performance close to the 6.7B teacher across IN1k/ObjectNet/ReaL/ADE20k/Cityscapes (Fig. 16b).

**License / weights availability**: not stated in the accessible paper text (Abstract/§1/§10 discuss releasing "the DINOv3 suite of vision models" but no explicit SPDX license or repository URL was found in the parsed text) — mark `?`; verify against the official `facebookresearch/dinov3` GitHub repo / model card before setting `implementations[].license` or `weights_license` on the public page.

**Relations per approved plan**: authored on `dinov2` as `{ type: extended_by, target: dinov3, confidence: high }`; none historical (DINOv2 keeps its normal `quality:` — omitted, not `"historical"`).

**Prerequisites (candidate for the new page)**: `[dinov2, vit, attention-mechanism]` — mirrors DINOv2's own prerequisite list since DINOv3 is a direct continuation; `mae` is a plausible fourth (contrastive-vs-reconstruction contrast used throughout DINOv2's note) but this paper does not itself discuss MAE, so treat as optional.

# Provenance

- **Abstract**: "This technical report introduces DINOv3... we introduce a new method called Gram anchoring, which effectively addresses the known yet unsolved issue of dense feature maps degrading during long training schedules."
- **§1 / p.4**: "object detection (COCO detection, mAP 66.1) and image segmentation (ADE20k, mIoU 63.0), outperforming specialized fine-tuned pipelines"
- **§1 / Overview of Contributions, p.4–5**: four numbered contributions (i) data scaling §3.1, (ii) architecture+training §3.2, (iii) Gram anchoring §4, (iv) post-training (high-res + multi-student distillation) §5.2 — quoted under Claimed contributions above.
- **§3.1**: "an initial data pool of approximately 17 billions of images"; hierarchical k-means "5 levels of clustering with the number of clusters from the lowest to highest levels being 200M, 8M, 800k, 100k, and 25k"; "a curated subset of 1,689 million images (named LVD-1689M)"; Table 1 data-ablation numbers (Raw / Clustering / Retrieval / LVD-1689M rows).
- **§3.2**: Eq. 1 $\mathcal{L}_{\mathrm{Pre}} = \mathcal{L}_{\mathrm{DINO}} + \mathcal{L}_{\mathrm{iBOT}} + 0.1 \cdot \mathcal{L}_{\mathrm{DKoleo}}$; Table 2 (DINOv2 vs DINOv3 teacher architecture: params 1.1B→6.7B, patch 14→16, pos.emb. Learnable→RoPE, embed dim 1536→4096, FFN hidden 4096→8192, attn heads 24→32, attn head dim 64→128, DINO prototypes 128k→256k, iBOT prototypes 128k→96k); "custom variant of RoPE... RoPE-box jittering... $s \in [0.5, 2]$"; "total batch size to 4096 images split across 256 GPUs... 2 global crops and 8 local crops... total sequence length of 3.7M tokens per batch"; dedicated LayerNorm ablation numbers (+0.2 kNN, +1 mIoU ADE20k, −0.02 RMSE NYUv2).
- **§4.1**: "This phenomenon appears in longer training runs with models above ViT-Large size (300M parameters)" (also §1); Fig. 5/Fig. 6 description of VOC mIoU decline and cosine-similarity-map degradation.
- **§4.2**: Eq. 2 $\mathcal{L}_{\mathrm{Gram}} = \|X_S X_S^\top - X_G X_G^\top\|_F^2$; Eq. 3 $\mathcal{L}_{\mathrm{Ref}} = w_D \mathcal{L}_{\mathrm{DINO}} + \mathcal{L}_{\mathrm{iBOT}} + w_{DK}\mathcal{L}_{\mathrm{DKoleo}} + w_{\mathrm{Gram}}\mathcal{L}_{\mathrm{Gram}}$; "we start only after 1M iterations"; "update the Gram teacher every 10k iterations at which the Gram teacher becomes identical to the main EMA teacher"; Fig. 7 (iBOT loss drops faster under $\mathcal{L}_{\mathrm{Ref}}$; DINO loss largely unaffected).
- **§4.3**: high-resolution Gram teacher construction (2× input res, bicubic 2× downsample); ablation table with Baseline / GRAM(200k,×1) / GRAM(200k,×2) / GRAM(100k,×2) / GRAM(1M,×2) rows (IN1k Linear / ADE mIoU / NYU RMSE: 88.2/50.3/0.307; 88.0/53.6/0.285; 88.0/55.7/0.281; 87.9/55.7/0.284; 88.1/54.9/0.290); "+2 mIoU on ADE20k" from $\mathcal{L}_{\mathrm{HRef}}$ over $\mathcal{L}_{\mathrm{Ref}}$.
- **§5.1**: high-resolution adaptation: "global crop sizes from {512, 768} and local crop sizes from {112, 168, 224, 336}... 10k additional iterations"; "a key component of this high-resolution adaptation phase is the addition of Gram anchoring, using the 7B teacher as Gram teacher. We found this component to be essential."
- **§5.2**: distilled model sizes "the standard ViT-S (21M params), B (86M), L (0.3B), along with a custom ViT-S+ (29M) and a custom ViT-H+ (0.8B)"; "We do not observe patch-level consistency issues and therefore do not apply the Gram anchoring technique" during distillation; "train the models for 1M iterations then perform 250k iterations of learning-rate cooldown... before applying the high-resolution phase... without Gram anchoring"; multi-student distillation compute argument (Fig. 12).
- **§5.3**: `dino.txt` recipe: "adopting the training strategy previously proposed in Jose et al. (2025)... follows the LiT training paradigm (Zhai et al., 2022b)... two transformer layers are introduced on top of the frozen visual backbone... concatenation of the mean-pooled patch embeddings with the output CLS token before matching to the text embeddings."
- **§6.1.2 / Table 3**: dense linear-probing numbers (ADE20k/Cityscapes/VOC mIoU, NYUv2/KITTI RMSE) for AM-RADIOv2.5, PEspatial, SigLIP2, PEcore, Franca, DINOv2, Web-DINO, DINOv3 (7B/16: 55.9/81.1/86.6 mIoU, 0.309/2.346 RMSE).
- **§6.1.3 / Table 4**: geometric (NAVI) / semantic (SPair) correspondence recall — DINOv3 64.4/58.7, DINOv2 60.1/56.1, "+4.3% recall" over DINOv2 stated in prose.
- **§6.1.4 / Fig. 14**: TokenCut CorLoc unsupervised object discovery, VOC07/VOC12/COCO — DINOv3 66.1/69.5/55.1, "5.9 CorLoc improvement on VOC 2007" over predecessors stated in prose.
- **§6.1.5 / Table 5**: DAVIS/YouTube-VOS/MOSE tracking J&F-mean at S/M/L resolutions.
- **§6.1.6 / Table 6**: UCF101/SSv2/K400 attentive-probe top-1, including V-JEPA 2 baseline (SSv2 73.8/75.4 vs DINOv3 70.1/70.8).
- **§6.2.1 / Table 7**: ImageNet-1k linear probe domain-generalization numbers (Val/V2/ReaL/R/S/A/C/Obj.) including supervised JFT references (Zhai 2022a, Chen 2023, Dehghani 2023) and DINOv3's own row (88.4/81.4/90.4/91.1/71.3/86.9/19.6/79.0); "+10% on ImageNet-R, +6% on -Sketch, +13% on ObjectNet over... DINOv2."
- **§6.3.1 / Table 10**: COCO detection mAP/ER comparison (DINOv3 Plain-DETR 65.6/66.1 simple/TTA COCO mAP, 66.4 COCO-O mAP, 36.8 ER) vs EVA-02, InternImage-G, PEspatial+DETA.
- **§6.3.2 / Table 11**: ADE20k SOTA comparison (DINOv3 62.6/63.0 vs BEiT-3 62.0/62.8, InternImage-H 62.5/62.9, ONE-PEACE 62.0/63.0).
- **§7.1 / Fig. 16a**: family parameter counts and inference GFLOPs at 256/512 resolution for all CNX-T/S/B/L and ViT-S/S+/B/L/H+/7B variants.
- **§7.1 / Table 14**: full-family comparison table (IN-ReaL, IN-R, ObjectNet, Oxford-H, ADE20k, NYU, DAVIS, NAVI, SPair) across DINOv2/PEcore/SigLIP2/DINOv3 at S/B/L/H+ sizes.
- **§7.2 / Table 15 (heading only reached)**: ConvNeXt distillation evaluation section, "distill CNX architectures of size T, S, B, and L."
- **§7.3 / Table 16**: `dino.txt` zero-shot classification/retrieval/segmentation comparison table (CLIP, EVA-02-CLIP, `dino.txt` on DINOv2, SigLIP2, PE, DINOv3 `dino.txt`).
- **§8.1**: satellite model "pre-trained on SAT-493M, a dataset of 493 millions of 512×512 images sampled randomly from Maxar RGB ortho-rectified imagery at 0.6 meter resolution"; training schedule "100k iterations of initial pre-training... followed by 10k iterations using Gram regularization, and finalized with 8k steps of high resolution fine-tuning at resolution 512."
- **App. C / §D (hyperparameters)**: "constant learning rate of 0.0004 with a warmup of 100k iterations, a weight decay of 0.04, a learning rate decay factor of 0.98 per layer, a stochastic depth (layer dropout) value of 0.4 and an EMA factor of 0.999 for the teacher"; "loss weight of $w_{\mathrm{Gram}}=2$ and update the Gram teacher every 10k steps for a maximum of three updates"; high-resolution crop-resolution-triple sampling probabilities.
- **§10 / Conclusion**: "The introduction of the Gram anchoring method effectively mitigates the degradation of dense feature maps over extended training periods, ensuring robust and reliable performance."

**Uncertain / not confirmed** (`?`):
- Numeric values of $w_D$ and $w_{DK}$ in Eq. 3 — left symbolic in the accessible main text; presumably specified in the released training config files, not reproduced in the paper body itself.
- License / weights-availability statement for the DINOv3 model release — not found in the parsed paper text (no SPDX license string, no explicit repo URL located in Abstract/§1/§10); needs verification against the official release before use in `implementations[]`/`weights_license` on the public page.
- Whether a `caron2021-dino → dinov3` `feeds_into` edge should be authored directly on the new page or left implicit via the `dinov2 → dinov3 (extended_by)` chain — flagged in the Stated relations table, not resolved here.
- The bibliography citation key "He et al., 2020" in §2's discriminative-SSL lineage list is presumed to be the MoCo v2 paper; exact correspondence to the registered `he2019-moco` id (a different year) was not independently verified against the paper's own reference list entry.
