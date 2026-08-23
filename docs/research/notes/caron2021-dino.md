---
paper_id: caron2021-dino
title: "Emerging Properties in Self-Supervised Vision Transformers"
authors: [Mathilde Caron, Hugo Touvron, Ishan Misra, Hervé Jégou, Julien Mairal, Piotr Bojanowski, Armand Joulin (Facebook AI Research / Inria / Sorbonne)]
year: 2021
url: https://arxiv.org/abs/2104.14294
created: 2026-08-23
relevant_atlas_pages: [dinov2, vit, mae, attention-mechanism]
---

# Setting

**Problem class**: Self-supervised pretraining of a Vision Transformer (ViT) backbone, framed explicitly as a form of knowledge distillation with no labels ("self-distillation with no labels", DINO).

**Inputs**: Arbitrary unlabeled images (ImageNet-1k for the main results, no annotations used). Two augmented "global" crops and several smaller "local" crops per image (multi-crop, §3.1).

**Outputs**: A frozen backbone `f` (ViT or ResNet-50) whose output — the `[CLS]` token for ViT, global-average-pooled features for ResNet — is evaluated with a linear probe or a k-NN classifier, without finetuning. A discardable projection head `h` (attached only during pretraining) produces the K-dimensional softmax distribution used by the loss.

**Precondition**: The backbone is used frozen for evaluation (the paper's headline numbers are linear-probe / k-NN on frozen features); finetuning is reported separately (Table 6) and also improves on supervised pretraining.

# Core idea

DINO trains a **student** network $g_{\theta_s}$ to match the output of a **teacher** network $g_{\theta_t}$ that has the *same architecture* but different parameters, via a standard cross-entropy loss between their softmax-normalized outputs (§3.1, Fig. 2, Algorithm 1). Both networks output a $K$-dimensional feature, normalized with a temperature softmax:

$$P_s(x)^{(i)} = \frac{\exp(g_{\theta_s}(x)^{(i)}/\tau_s)}{\sum_{k=1}^K \exp(g_{\theta_s}(x)^{(k)}/\tau_s)} \quad (\text{Eq. 1})$$

with $\tau_s > 0$ a temperature controlling sharpness; an analogous $P_t$ with temperature $\tau_t$ is defined for the teacher. Given a fixed teacher, the student is trained by minimizing cross-entropy w.r.t. $\theta_s$:

$$\min_{\theta_s} H(P_t(x), P_s(x)), \quad H(a,b) = -a\log b \quad (\text{Eq. 2})$$

**Multi-crop** (§3.1): from one image, a set $V$ of views is generated — 2 "global" crops $x_1^g, x_2^g$ at $224^2$ resolution (covering, e.g., >50% of the image area) and several "local" crops at $96^2$ resolution (covering <50%). **All crops pass through the student; only the two global crops pass through the teacher**, encouraging "local-to-global" correspondences. The full loss sums cross-entropy over all student-view / teacher-view pairs excluding self-pairs:

$$\min_{\theta_s} \sum_{x \in \{x_1^g, x_2^g\}} \sum_{\substack{x' \in V \\ x' \neq x}} H(P_t(x), P_s(x')) \quad (\text{Eq. 3})$$

The "basic parametrization" of DINO uses 2 global views ($224^2$) + 6 local views ($96^2$) unless stated otherwise (confirmed against Table 8/9 default).

**Teacher construction — momentum encoder + stop-gradient**: the teacher is not given a priori; it is built from *past iterations of the student*. The paper studies several update rules (§5.2) and finds an exponential moving average (EMA) — i.e., a momentum encoder — works best:

$$\theta_t \leftarrow \lambda \theta_t + (1-\lambda)\theta_s$$

with $\lambda$ following a **cosine schedule from 0.996 to 1** during training (§3.1, citing the BYOL schedule design). A stop-gradient (`sg`) operator is applied on the teacher branch (Fig. 2, Algorithm 1) — gradients flow only through the student; the teacher is never trained by backprop, only by the EMA update.

**Avoiding collapse — centering + sharpening (no negatives, no clustering, no predictor)**: DINO avoids representation collapse using only two operations on the *teacher* output — centering and sharpening — no contrastive negatives, no online clustering (Sinkhorn-Knopp), no predictor network (§3.1, §5.3). Centering is implemented as an additive bias term $c$ on the teacher output ($g_t(x) \leftarrow g_t(x) + c$), updated by EMA over the batch mean:

$$c \leftarrow mc + (1-m)\frac{1}{B}\sum_{i=1}^B g_{\theta_t}(x_i) \quad (\text{Eq. 4})$$

with $m > 0$ a rate parameter and $B$ the batch size. Sharpening is obtained by using a **low temperature $\tau_t$** in the teacher softmax (Eq. 1 analogue). Centering alone prevents one dimension from dominating but *pushes toward the uniform distribution* (a different collapse mode); sharpening alone has the opposite effect. Applying both balances the two failure modes (§3.1, §5.3). This is formalized by decomposing the cross-entropy into entropy + KL divergence:

$$H(P_t, P_s) = h(P_t) + D_{KL}(P_t \,\|\, P_s) \quad (\text{Eq. 5})$$

A KL of zero indicates collapse (constant output); the entropy $h$ converges to 0 with no centering, or to $-\log(1/K)$ with no sharpening — two distinct collapse signatures (§5.3, Fig. 7).

**Values used in the default recipe** (§3.2 Implementation details): $\tau_s = 0.1$ (fixed); $\tau_t$ linearly warmed up from 0.04 to 0.07 during the first 30 epochs (then held at 0.07). AdamW optimizer, batch size 1024 (16 GPUs for ViT-S/16), $\text{lr} = 0.0005 \times \text{batchsize}/256$ linearly warmed up over the first 10 epochs then cosine-decayed; weight decay follows a cosine schedule 0.04 → 0.4. Data augmentations follow BYOL (color jittering, Gaussian blur, solarization) plus multi-crop.

# Architecture / configuration

**Network** $g = h \circ f$: backbone $f$ (ViT or ResNet-50) + projection head $h$; downstream tasks use only $f$'s output (§3.1 "Network architecture").

**Projection head** (§3.1, Appendix C): a 3-layer MLP with hidden dimension 2048, GELU activations (last MLP layer has no GELU), followed by $\ell_2$-normalization and a weight-normalized fully-connected layer with $K$ output dimensions ("prototype layer", design borrowed from SwAV). Default total linear layers = 4 (3 in MLP + 1 after the $\ell_2$ bottleneck). **Default output dimension $K = 65536$**, with bottleneck dimension $d = 256$ (Appendix C, "Output dimension" ablation: $K \in \{1024, 4096, 16384, 65536, 262144\}$, k-NN top-1 = 67.8 / 69.3 / 69.2 / **69.7** / 69.1 — larger $K$ helps up to a point). The $\ell_2$-bottleneck is necessary for training stability with a deep head — without it, training collapses (0.1 k-NN) once the head has ≥3 layers (Appendix C table).

**No batch normalization anywhere** (§3.1 "Network architecture", Appendix C "BN-free system"): standard ViT has no BN by default; DINO additionally omits BN from the projection head when applied to ViT, making the whole ViT + head system BN-free. Ablation: heads w/o BN = 69.7 k-NN vs w/ BN = 68.6 — BN provides no benefit and is dropped for simplicity/decoupling from batch statistics across GPUs.

**Backbones and patch sizes** — Table 1 configuration (blocks / channel dim / heads / #tokens at $224^2$ / #params, backbone only, no head):

| model | blocks | dim | heads | #tokens | #params | im/s (V100, bs=128) |
|---|---|---|---|---|---|---|
| ResNet-50 | – | 2048 | – | – | 23M | 1237 |
| ViT-S/16 | 12 | 384 | 6 | 197 | 21M | 1007 |
| ViT-S/8 | 12 | 384 | 6 | 785 | 21M | 180 |
| ViT-B/16 | 12 | 768 | 12 | 197 | 85M | 312 |
| ViT-B/8 | 12 | 768 | 12 | 785 | 85M | 63 |

ViT-S follows the DeiT-S design (Touvron et al.); ViT implementation follows the pre-norm layer-normalization Transformer, `[CLS]` token added to the patch-embedding sequence, position embeddings bicubic-interpolated across resolutions. Patch sizes explored: **16 and 8** (also 5×5 in the patch-size ablation, Fig. 5). Reducing patch size (e.g. `/16` → `/8`) improves accuracy substantially without adding parameters, at a large throughput cost (ViT-S/8 = 180 im/s vs ViT-S/16 = 1007 im/s; 5×5 patches drop to 44 im/s).

# Headline results

**ImageNet linear / k-NN top-1, same-architecture comparison (Table 2)**:

| Method | Arch. | Linear | k-NN |
|---|---|---|---|
| Supervised | RN50 | 79.3 | 79.3 |
| SimCLR | RN50 | 69.1 | 60.7 |
| MoCo-v2 | RN50 | 71.1 | 61.9 |
| BYOL | RN50 | 74.4 | 64.8 |
| SwAV | RN50 | 75.3 | 65.7 |
| **DINO** | **RN50** | **75.3** | **67.5** |
| Supervised | ViT-S | 79.8 | 79.8 |
| BYOL\* | ViT-S | 71.4 | 66.6 |
| MoCo-v2\* | ViT-S | 72.7 | 64.4 |
| SwAV\* | ViT-S | 73.5 | 66.3 |
| **DINO** | **ViT-S** | **77.0** | **74.5** |

(\* = re-run by the authors under the same protocol). On ViT-S, DINO beats BYOL/MoCo-v2/SwAV by +3.5% linear and +7.9% k-NN, and k-NN is nearly on par with linear (74.5 vs 77.0) — a property the paper says emerges only with DINO+ViT, not with other SSL methods or with ResNet-50.

**Across-architecture comparison (Table 2, bottom)**: DINO ViT-B/16 = 78.2 linear / 76.1 k-NN; **DINO ViT-B/8 = 80.1 linear / 77.4 k-NN** (headline abstract number, 10× fewer params and 1.4× faster than the then-SOTA SCLRv2 RN152w3+SK at 79.8); DINO ViT-S/8 = 79.7 linear / **78.3 k-NN** (the abstract's "78.3% top-1 on ImageNet" k-NN claim, achieved with a *small* ViT).

**Image retrieval (Table 3)**, revisited Oxford/Paris mAP: DINO ViT-S/16 trained on ImageNet: ROx-M 41.8, RPar-M 63.1 — beats supervised ViT-S/16 (33.5 / 63.0). Trained on Google Landmarks v2 (GLDv2) instead: ROx-M 51.5, RPar-M 75.3 (best results, unsupervised pretraining benefits from a domain-matched unlabeled dataset).

**Copy detection (Table 4)**, mAP on Copydays "strong": DINO ViT-B/16 = 81.7 (vs supervised ViT-B/16 = 76.4); DINO ViT-B/8 = 85.5.

**DAVIS-2017 video object segmentation (Table 5)**, $(J\&F)_m$: DINO ViT-S/16 = 61.8; ViT-B/16 = 62.3; ViT-S/8 = 69.9; ViT-B/8 = **71.4** (small patches give +9.1% $(J\&F)_m$ for ViT-B, /8 vs /16). Supervised ViT-S/8 = 66.0 (weaker than self-supervised /8 variants despite matched architecture). No finetuning is used for this task — it's a nearest-neighbor label propagation between consecutive frames on frozen patch tokens.

**Transfer learning by finetuning (Table 6)**: DINO ViT-S/16 outperforms supervised ViT-S/16 pretraining on every one of Cifar10/Cifar100/iNat18/iNat19/Flowers/Cars/ImageNet (e.g. iNat18 72.0 vs 70.7, ImageNet 81.5 vs 79.9); same pattern for ViT-B/16.

# Emergent properties

**Self-attention maps as unsupervised segmentation** (§4.2.2, Fig. 1, Fig. 4): thresholding the `[CLS]` token's last-layer self-attention map to retain 60% of the attention mass produces masks. Jaccard similarity vs ground truth on PASCAL VOC12 validation images (ViT-S/16): Random weights = 22.0, Supervised = 27.3, **DINO = 45.9** — supervised training does *not* produce this property to nearly the same degree; the gap is attributed specifically to the self-supervised objective, not the ViT architecture alone. (ViT-S/8: Random 21.8, Supervised 23.7, DINO 44.7.) Appendix D reports (at 80%-mass threshold, comparing SSL frameworks head-to-head on ViT-S): DINO 45.9, DINO w/o multicrop 45.1, MoCo-v2 46.3, BYOL 47.8, SwAV 46.8 — i.e. the segmentation-quality property is shared across several SSL frameworks on ViT (not unique to DINO among SSL methods), but is much weaker for supervised training (27.3) or random init (22.0). Different attention heads attend to different semantic parts even under occlusion or small scale (Fig. 3).

**k-NN retrieval quality**: the headline claim is that a frozen k-NN classifier (no linear layer, no finetuning, no data augmentation) reaches 78.3% top-1 on ImageNet with ViT-S/8 — "almost on par" with the linear-probe number (79.7%) for the same model, a property specific to DINO+ViT among the compared methods/architectures.

**These properties are stronger than in supervised ViTs**: repeatedly demonstrated — segmentation Jaccard (45.9 DINO vs 27.3 supervised, ViT-S/16), and k-NN accuracy nearly matching linear accuracy only for DINO+ViT.

# Ablations that matter

**Table 7 — component ablation (ViT-S/16, 300 epochs, k-NN / linear)**:

| row | Mom. | SK | MC | Loss | Pred. | k-NN | Lin. |
|---|---|---|---|---|---|---|---|
| 1 (DINO default) | ✓ | ✗ | ✓ | CE | ✗ | 72.8 | 76.1 |
| 2 (no momentum, no SK) | ✗ | ✗ | ✓ | CE | ✗ | **0.1** | **0.1** |
| 3 (momentum + SK) | ✓ | ✓ | ✓ | CE | ✗ | 72.2 | 76.0 |
| 4 (no multi-crop) | ✓ | ✗ | ✗ | CE | ✗ | 67.9 | 72.5 |
| 5 (MSE instead of CE) | ✓ | ✗ | ✓ | MSE | ✗ | 52.6 | 62.4 |
| 6 (+ predictor) | ✓ | ✗ | ✓ | CE | ✓ | 71.8 | 75.6 |
| 7 (BYOL) | ✓ | ✗ | ✗ | MSE | ✓ | 66.6 | 71.4 |
| 8 (MoCo-v2) | ✓ | ✗ | ✗ | InfoNCE | ✗ | 62.0 | 71.6 |
| 9 (SwAV) | ✗ | ✓ | ✓ | CE | ✗ | 64.7 | 71.8 |

**Momentum teacher is necessary**: without it (row 2), DINO collapses completely (0.1/0.1) — the framework "does not work" without a momentum encoder unless a more advanced anti-collapse mechanism like Sinkhorn-Knopp is added (row 9, SwAV-style, 64.7/71.8, clearly below DINO's momentum-based 72.8/76.1). With momentum present, adding SK on top has little further effect (row 1 vs row 3: 72.8/76.1 vs 72.2/76.0).

**Multi-crop is a major contributor**: removing it (row 4) drops k-NN 72.8→67.9 and linear 76.1→72.5. Table 8 (compute/accuracy tradeoff, 300 epochs) reinforces this: 2×224² alone = 72.5% linear in 45.9h; 2×224²+10×96² = 76.1% in 72.6h; but the *2×224²-only* setting cannot catch up even with much longer training — multi-crop's "local-to-global" correspondence is not simply more compute. Appendix E cross-framework comparison (ViT-S/16, 300 ep): DINO benefits most from multi-crop among the compared methods (+3.4% linear, 72.5→75.9 k-NN eval going 2-crop→2+6-crop) while BYOL's transfer performance actually *degrades* with multi-crop added (71.4→64.8 linear) — multi-crop is not a universal "add-on" and combines specifically well with DINO's CE self-distillation loss.

**Centering vs sharpening alone → collapse** (§5.3, Fig. 7, confirmed via Eq. 5 decomposition): removing either operation leads to a distinct collapse signature — KL divergence between teacher/student goes to 0 in both cases, but entropy $h(P_t) \to 0$ with *no centering* (dominant-dimension collapse) vs $h(P_t) \to -\log(1/K)$ with *no sharpening* (uniform-output collapse). Both together are required and sufficient to avoid collapse with a momentum teacher.

**Centering rate $m$** (Appendix D): $m \in \{0, 0.9, 0.99, 0.999\}$ → k-NN top-1 = 69.1 / 69.7 / 69.4 / **0.1 (collapse)**. Robust across a wide range, but collapses when the update is too slow ($m=0.999$).

**Sharpening temperature $\tau_t$** (Appendix D): $\tau_t \in \{0, 0.02, 0.04, 0.06, 0.08\}$ (fixed, not warmed-up) → k-NN = 43.9 / 66.7 / 69.6 / 68.7 / **collapse (0.1)**. A temperature > 0.06 collapses if applied from the start of training; but the paper's linear warm-up from 0.04 → 0.07 over the first 30 epochs avoids this and reaches 69.7 — i.e. the warmup schedule is load-bearing, not just the final value.

**Teacher-construction alternatives** (§5.2, Fig. 6-right): student copy → 0.1 (fails / collapses); previous-iteration student → does not converge; previous-*epoch* student (no momentum) → 66.6 k-NN (works, but clearly below momentum's 72.8); momentum EMA → **72.8** (best). The momentum teacher *consistently outperforms the student throughout training* (Fig. 6-left) — a dynamic not observed in prior momentum-based frameworks (MoCo, BYOL) nor with the epoch-teacher variant — interpreted as Polyak-Ruppert averaging providing a form of free model-ensembling that in turn improves the training target.

**Batch size** (Table 9, 100 epochs, no multi-crop): bs 128/256/512/1024 → k-NN 57.9/59.1/59.6/59.9 — DINO degrades only mildly at small batch size (no negatives/contrastive terms needed at scale); an extreme run at bs=8 (1 image/GPU) reached 35.2% after 50 epochs, "showing the potential for training large models that barely fit an image per GPU."

**Multi-crop scale range** (Appendix E): global-view scale range $(s, 1)$ with local range $(0.05, s)$; sweeping $s \in \{0.08, 0.16, 0.24, 0.32, 0.48\}$ gives k-NN 65.6/68.0/69.7/69.8/69.5 — optimum around $s \approx 0.3$, higher than SwAV's $s=0.14$.

**Number of attention heads** (Appendix D, ViT-S, dim=384 fixed): 6/8/12/16 heads → k-NN 72.8/73.1/73.7/73.8, im/s 1007/971/927/860 — more heads help slightly at a throughput cost; the paper's default (DeiT-S) uses 6 heads.

**Longer training** (Appendix D): DINO ViT-S k-NN improves 100-ep=70.9 → 300-ep=72.8 → 800-ep=74.5.

**GELU vs ReLU in the head** (Appendix C): 69.7 vs 68.9 k-NN — small effect; GELU kept for architectural consistency with ViT.

# Assumptions

1. **Same architecture for student and teacher.** Unlike generic knowledge distillation (a fixed, usually larger, pretrained teacher), DINO's teacher has the *same* architecture as the student and is built dynamically from it — this is what makes it self-distillation rather than distillation from an external model.
2. **Momentum teacher is required for the centering+sharpening anti-collapse scheme to work** (Table 7 rows 1 vs 2; Table 7 row 9 shows SK can substitute for momentum but performs worse).
3. **Multi-crop's local-to-global correspondence assumes crops of the same underlying image share high-level semantic content** even at very different scales/coverage (96² local vs 224² global).
4. **BN-free assumption specific to ViT**: the paper explicitly notes it "does not use any BN also in the projection heads" because ViT itself has no BN by default; this design choice is validated (Appendix C) but is not necessarily transferable to architectures that do use BN internally (ResNet-50 experiments retain their native BN).
5. **k-NN evaluation protocol assumptions** (Appendix F.1): frozen features, $k=20$ nearest neighbors (swept and found consistently best), weighted vote with $\alpha_i = \exp(T_i x/\tau)$, $\tau = 0.07$ (borrowed from Wu et al., not tuned).

# Failure regime

- **Collapse without momentum + anti-collapse ops**: removing the momentum teacher without substituting SK collapses completely to 0.1/0.1 (Table 7 row 2) — the training loss converges to $\ln(K)$ (uniform-output collapse, confirmed by the entropy-decomposition argument in §5.3/Appendix D).
- **Teacher-momentum update too slow**: $m = 0.999$ for the *centering* rate collapses (0.1 k-NN, Appendix D) — the smoothing must be fast enough relative to training dynamics.
- **Sharpening temperature too high without warmup**: fixed $\tau_t \geq 0.08$ (i.e. skipping the 0.04→0.07 warmup) collapses (Appendix D table).
- **Multi-crop does not combine with BYOL**: adding multi-crop to BYOL *degrades* transfer performance over training (Appendix E) — the paper explicitly flags this as an open question, not resolved in this work.
- **Naive teacher construction fails to converge**: using the student from the immediately preceding iteration (rather than an EMA or an epoch-lagged copy) as teacher does not converge (§5.2).
- **Domain generality untested at this scale**: DINO in this paper is trained/evaluated on ImageNet-1k (curated, class-balanced); its extension to a much larger uncurated web corpus is flagged as *future work* (§6, referencing Goyal et al. [28]) — the paper does not itself validate that regime. (DINOv2, oquab2023-dinov2, is the follow-up work that does.)

# Numerical sensitivity

- **Output dimension $K$**: larger is better but with diminishing/non-monotone returns (65536 default; 262144 is *worse* than 65536 — 69.1 vs 69.7 k-NN, Appendix C table) — the $\ell_2$-bottleneck (d=256) is what makes a large $K$ affordable without a parameter explosion.
- **Projection-head depth requires the $\ell_2$-normalization bottleneck for stability**: without it, ≥3-layer heads collapse to 0.1 k-NN (Appendix C table); with the bottleneck, depth up to 4 total linear layers monotonically helps (61.6→62.9→68.0→69.3 without bottleneck up to 2 layers only, 62.2→68.0→69.3 with bottleneck at 2/3/4 layers).
- **Centering rate $m$ and sharpening temperature $\tau_t$ both have narrow collapse boundaries** at their slow/high extremes respectively (see Ablations above) — these are the two knobs directly controlling the entropy-vs-KL balance in Eq. 5.
- **Small-batch robustness**: unlike contrastive SSL methods that need large batches (many negatives) or memory banks, DINO degrades only ~2 points of k-NN from bs=1024 to bs=128 (Table 9) since there is no negative-pair term — floating-point/precision considerations are not discussed explicitly in the paper beyond standard AdamW training.

# Applicability

- **Use when**: training a ViT (or ResNet) backbone with no labels and wanting features that transfer well to both linear-probe classification and nearest-neighbor / attention-based dense tasks (retrieval, video-object-segmentation via patch-token propagation) without finetuning.
- **Don't use when**: compute is severely constrained *and* multi-crop cannot be afforded — Table 7 shows the framework degrades noticeably without it (though it still functions, unlike removing the momentum teacher, which is fatal).
- **Compared against**: BYOL, MoCo-v2, SimCLR, SwAV (Table 2, Table 7, Appendix E) — all evaluated on matched ResNet-50 or ViT-S architectures under the authors' own re-implementation for ViT-S.

# Connections

- **BYOL (Grill et al. 2020)**: DINO explicitly "takes its inspiration from BYOL" (§2) — same momentum-teacher / stop-gradient skeleton, no negative pairs, no explicit contrastive term. Key differences: DINO uses a **cross-entropy loss on softmax outputs** (with centering+sharpening for anti-collapse) rather than BYOL's MSE loss on L2-normalized predictions; DINO uses the **exact same architecture for student and teacher** (no separate predictor head — Table 7 row 6 shows a predictor adds little and BYOL needs it specifically to avoid collapse, §2, §5.1); Appendix E shows BYOL and DINO respond oppositely to multi-crop training (DINO benefits most, BYOL degrades) — the loss/architecture choice interacts with data-augmentation strategy in a way that is framework-specific, not universal.
- **MoCo-v2 (He et al. 2020) / SimCLR (Chen et al. 2020)**: both are contrastive, requiring explicit negative pairs and (for MoCo) a memory queue; DINO needs neither — its momentum encoder plays a different structural role here (guiding a self-distillation target, not supplying negatives for a queue, §3.1 "Teacher network"). DINO outperforms both at matched ResNet-50/ViT-S scale (Table 2, Table 7 rows 5/8).
- **Knowledge distillation (Hinton et al. 2015, ref [35])**: DINO is presented explicitly as "a form of knowledge distillation with no labels" (Abstract, §1). Standard KD trains a small *fixed*, externally pretrained teacher to compress a large model; DINO instead builds its teacher *dynamically* from the student during training (via EMA) — casting distillation as a self-supervised training objective rather than a post-hoc compression step (§2 "Self-training and knowledge distillation").
- **Mean Teacher (Tarvainen & Valpola 2017, ref [65])**: the paper interprets its momentum teacher as closer to Mean Teacher's semi-supervised weight-averaging than to MoCo's queue-substitute role, since DINO has neither a queue nor a contrastive loss (§3.1 "Teacher network", §5.2).
- **SwAV (Caron et al. 2020)**: source of the projection-head "prototype layer" design (weight-normalized FC + $\ell_2$-bottleneck) and of multi-crop training itself (both cited as [10] throughout §3).
- **DeiT (Touvron et al. 2020)**: DINO's ViT-S configuration follows the DeiT-S design (Table 1 caption, §4.1).

# Atlas update plan

## NEW: dino
Type: model
Domain: features
arch_family: vit
Primary source: this paper

**Motivation**: Question whether ViT's muted advantage over convnets (as of 2021) stems from supervised pretraining specifically; introduce a simple self-supervised framework (self-distillation with no labels) and show it unlocks properties — explicit unsupervised object segmentation in attention maps, strong k-NN classifiers — that neither supervised ViTs nor convnets exhibit as clearly.

**Architecture**: backbone $f$ (ViT-S/16, ViT-S/8, ViT-B/16, ViT-B/8, or ResNet-50) + discardable projection head $h$ (3-layer MLP, hidden dim 2048, GELU, $\ell_2$-norm bottleneck (d=256), weight-normalized FC to $K=65536$ dims; no BN anywhere). Student/teacher share architecture; teacher = EMA of student (momentum $\lambda$: cosine 0.996→1). No predictor network (unlike BYOL).

**Training**: self-distillation loss (Eq. 1–3) — cross-entropy between softmax(student/$\tau_s{=}0.1$) and softmax(centered teacher/$\tau_t$: linear warmup 0.04→0.07 over 30 epochs); centering EMA (Eq. 4) with rate $m$; multi-crop (2×224² global + 6×96² local by default, all crops→student, global-only→teacher); AdamW, batch 1024, lr $0.0005 \times \text{bs}/256$, cosine schedule, weight decay 0.04→0.4 cosine; BYOL-style augmentations (color jitter, blur, solarization).

**Key results**: ImageNet linear/k-NN — ViT-S/16 77.0/74.5, ViT-B/16 78.2/76.1, ViT-S/8 79.7/78.3, ViT-B/8 80.1/77.4 (headline abstract numbers); ResNet-50 75.3/67.5 (SOTA-matching for convnets at the time). Beats BYOL/MoCo-v2/SwAV by +3.5% linear / +7.9% k-NN on matched ViT-S. PASCAL VOC12 unsupervised-segmentation Jaccard 45.9 (ViT-S/16) vs 27.3 supervised. DAVIS video-segmentation $(J\&F)_m$ up to 71.4 (ViT-B/8), competitive with dedicated video methods despite no task-specific training.

**Assessment**: momentum teacher + centering/sharpening + multi-crop are jointly load-bearing (Table 7 ablation: removing momentum → total collapse; removing multi-crop → -4.9 k-NN / -3.6 linear). This is the v1 architecture and training recipe that DINOv2 (oquab2023-dinov2) extends with iBOT patch-level masking, KoLeo regularization, Sinkhorn-Knopp centering, and vastly larger curated data (LVD-142M) — see UPDATE below.

**Relations**: `{ type: extended_by, target: dinov2, confidence: high }`

Per approved plan (docs/atlas/roadmap.md): dino —extended_by→ dinov2 —extended_by→ dinov3; none historical.

## UPDATE: dinov2
Section: Remarks / Architecture (v1→v2 delta)
- DINOv2 keeps DINO's image-level self-distillation loss (student/teacher CE, EMA momentum teacher) as one of *two* losses, adding a patch-level iBOT masked-image-modeling loss for dense-task quality (dinov2 note §"Core idea", Assumption 2).
- Teacher momentum schedule changes: DINO uses cosine 0.996→1 (this paper, §3.1); DINOv2 uses cosine 0.994→1.0 over 625k iterations (oquab2023-dinov2 note, Provenance §4/App. B.1) — lower initial momentum, likely tuned for the iBOT-augmented loss and much larger scale.
- Centering mechanism changes: DINO uses EMA centering (Eq. 4 here) alone; DINOv2 replaces it with 3 iterations of Sinkhorn-Knopp batch normalization (from SwAV) applied to the teacher branch only, citing large-scale stability as the reason (dinov2 note, ablation: SK vs EMA-centering "gave same kNN/linear numbers at the ablation scale" but SK stabilizes training at production scale — directly consistent with this paper's own Table 7 row 3 finding that SK-on-top-of-momentum barely changes small-scale results, 72.2/76.0 vs 72.8/76.1).
- Scale: DINO trains on ImageNet-1k (~1.28M images) with ViT-S/B backbones up to 21M/85M params; DINOv2 trains on LVD-142M (142M curated images) with backbones up to ViT-g/14 at 1.1B params, and distills smaller S/B/L variants from the frozen ViT-g teacher rather than training them from scratch.
- Patch size: DINO explores patch 16/8/(5); DINOv2 standardizes on patch 14 for all release sizes (dinov2 note, Assumption 4).
- New regularizer not present in DINO v1: KoLeo entropy term on CLS tokens (weight 0.1), absent from this paper.

# Provenance

- **Abstract**: "78.3% top-1 on ImageNet" (k-NN, small ViT); "80.1% top-1 on ImageNet in linear evaluation with ViT-Base"; "self-distillation with no labels"
- **§2 "Related work"**: BYOL description ("metric-learning formulation... matching them to representations obtained with a momentum encoder"); DINO "takes its inspiration from BYOL but operates with a different similarity matching loss and uses the exact same architecture for student and teacher"; "our work builds on this relation and extends knowledge distillation to the case where no labels are available"; codistillation comparison
- **§3.1 Eq. 1**: $P_s(x)^{(i)} = \exp(g_{\theta_s}(x)^{(i)}/\tau_s) / \sum_k \exp(g_{\theta_s}(x)^{(k)}/\tau_s)$
- **§3.1 Eq. 2**: $\min_{\theta_s} H(P_t(x), P_s(x))$, $H(a,b) = -a\log b$
- **§3.1**: multi-crop description — "2 global views $x_1^g, x_2^g$... several local views... All crops are passed through the student while only the global views are passed through the teacher"
- **§3.1 Eq. 3**: multi-crop loss sum over global-teacher / all-student view pairs excluding self
- **§3.1**: "we follow the standard setting for multi-crop by using 2 global views at resolution $224^2$... and several local views of resolution $96^2$"
- **§3.1 "Teacher network"**: "$\theta_t \leftarrow \lambda\theta_t + (1-\lambda)\theta_s$, with $\lambda$ following a cosine schedule from 0.996 to 1 during training"; "freezing the teacher network over an epoch works surprisingly well... copying the student weight for the teacher fails to converge"
- **§3.1 "Network architecture"**: "projection head consists of a 3-layer MLP with hidden dimension 2048 followed by $\ell_2$ normalization and a weight normalized fully connected layer with K dimensions... we do not use any BN also in the projection heads"
- **§3.1 "Avoiding collapse" / Eq. 4**: $c \leftarrow mc + (1-m)\frac{1}{B}\sum_{i=1}^B g_{\theta_t}(x_i)$; "centering prevents one dimension to dominate but encourages collapse to the uniform distribution, while the sharpening has the opposite effect"; "Output sharpening is obtained by using a low value for the temperature $\tau_t$"
- **§3.2 "Implementation details"**: AdamW, batch size 1024 (16 GPUs, ViT-S/16); "lr = 0.0005 * batchsize/256"; warmup 10 epochs, cosine decay; "weight decay also follows a cosine schedule from 0.04 to 0.4"; "The temperature $\tau_s$ is set to 0.1 while we use a linear warm-up for $\tau_t$ from 0.04 to 0.07 during the first 30 epochs"; data augmentations follow BYOL + multi-crop
- **§3.2 "Evaluation protocols"**: k-NN protocol description, "20 NN is consistently working the best"
- **Table 1**: backbone configs (blocks/dim/heads/#tokens/#params/im-s) for RN50, ViT-S/16, ViT-S/8, ViT-B/16, ViT-B/8
- **Table 2**: linear/k-NN comparison table, same-architecture and cross-architecture panels
- **§4.1**: "outperforms BYOL, MoCov2 and SwAV by +3.5% with linear classification and by +7.9% with k-NN evaluation"; "base ViT with 8×8 patches trained with DINO achieves 80.1% top-1... and 77.4% with a k-NN classifier with 10× less parameters and 1.4× faster run time than previous state of the art"
- **Table 3**: retrieval mAP, Oxford/Paris, ImageNet vs GLDv2 pretraining
- **Table 4**: copy-detection mAP, Copydays "strong" subset
- **§4.2.1**: copy-detection feature construction (CLS + GeM-pooled patch tokens, 1536d for ViT-B)
- **Table 5 / §4.2.1 "Video instance segmentation"**: DAVIS-2017 $(J\&F)_m$ numbers; "the variants with small patches ('/8') perform much better (+9.1% $(J\&F)_m$ for ViT-B)"
- **§4.2.2 / Fig. 4 table**: PASCAL VOC12 Jaccard similarity (Random/Supervised/DINO) at 60%-mass threshold for ViT-S/16 and ViT-S/8; "thresholding the self-attention map to keep 60% of the mass"
- **Table 6**: transfer-learning-by-finetuning results, Cifar10/100, iNat18/19, Flowers, Cars, ImageNet
- **§5.1 / Table 7**: component ablation table (Mom./SK/MC/Loss/Pred. → k-NN/Lin.), rows 1–9; "in the absence of momentum, our framework does not work (row 2)"; "multi-crop training and the cross-entropy loss in DINO are important components"
- **§5.2 / Fig. 6**: teacher-construction ablation (student copy=0.1, previous iter=fails to converge, previous epoch=66.6, momentum=72.8); "the momentum teacher constantly outperforms the student"; Polyak-Ruppert averaging interpretation
- **§5.3 Eq. 5**: $H(P_t,P_s) = h(P_t) + D_{KL}(P_t\|P_s)$; Fig. 7 entropy/KL collapse-mode analysis
- **§5.4 / Table 8**: compute/accuracy tradeoff across multi-crop settings, 100/300 epochs, time and memory
- **§5.5 / Table 9**: batch-size ablation (128/256/512/1024 → 57.9/59.1/59.6/59.9); "batch size of 8, reaching 35.2% after 50 epochs"
- **Appendix C**: projection-head design — GELU, $\ell_2$-bottleneck ablation table (# layers × w/wo bottleneck), output-dimension $K$ ablation table (1024/4096/16384/65536/262144 → 67.8/69.3/69.2/69.7/69.1), "Our default is to use K equals to 65536 and d = 256 for the bottleneck"; BN ablation (w/o BN 69.7 vs w/ BN 68.6); GELU vs ReLU (69.7 vs 68.9)
- **Appendix D**: online-centering rate $m$ ablation (0/0.9/0.99/0.999 → 69.1/69.7/69.4/0.1); sharpening $\tau_t$ ablation (0/0.02/0.04/0.06/0.08/warmup → 43.9/66.7/69.6/68.7/collapse/69.7), "$\tau \to 0$ (extreme sharpening) correspond to the argmax operation"; longer-training table (100/300/800 ep → 70.9/72.8/74.5); heads-in-ViT-S ablation (6/8/12/16 heads → 72.8/73.1/73.7/73.8 k-NN); PASCAL VOC Jaccard cross-framework table at 80%-mass (DINO 45.9, DINO w/o multicrop 45.1, MoCo-v2 46.3, BYOL 47.8, SwAV 46.8)
- **Appendix E**: multi-crop scale-range ablation ($s \in \{0.08,...,0.48\}$ → k-NN 65.6/68.0/69.7/69.8/69.5, optimum $s\approx 0.3$ vs SwAV's 0.14); cross-framework multi-crop comparison table (BYOL/SwAV/MoCo-v2/DINO, 2-crop vs 2+6-crop, k-NN/linear); "BYOL... transfer performance is higher... for the first training epochs... but... declines"
- **Appendix F.1**: k-NN classifier definition, weighted voting $\alpha_i = \exp(T_i x/\tau)$, $\tau=0.07$, $k=20$; representation dimensionality $d=384$ (ViT-S) / $d=768$ (ViT-B)
- **References**: [35] Hinton, Vinyals, Dean 2015 "Distilling the Knowledge in a Neural Network" (knowledge distillation); [30] Grill et al. 2020 "Bootstrap your own latent" (BYOL); [33] He et al. 2020 "Momentum contrast..." (MoCo); [15] Chen et al. 2020 "Improved baselines with momentum contrastive learning" (MoCo-v2); [12]/[13] Chen et al. SimCLR / SimCLRv2; [10] Caron et al. 2020 "Unsupervised learning of visual features by contrasting cluster assignments" (SwAV, source of multi-crop and projection-head design); [65] Tarvainen & Valpola 2017 "Mean teachers are better role models"; [19] Dosovitskiy et al. ViT; [69] Touvron et al. DeiT

**Uncertain / not confirmed** (?):
- Exact wording of whether the "several local views" default count is always 6 outside the specific tables cited (Table 7/8/9, Appendix E) all use 6×96² as the multi-crop default; the paper states this is "the standard setting" but doesn't give one single canonical sentence fixing the count outside these tables — treated as confirmed via convergent table evidence, not a single explicit statement.
- ResNet-50 dynamic-teacher-outperforms-student behavior is stated to hold ("Appendix D") but the specific figure/table number for the ResNet-50 version of Fig. 6 was not independently located in the extracted text (referenced only as "we observe the same behavior when training with a ResNet-50 (Appendix D)" in §5.2 body text).
