---
paper_id: zhang2025-superad
title: "SuperAD: A Training-free Anomaly Classification and Segmentation Method for CVPR 2025 VAND 3.0 Workshop Challenge Track 1: Adapt & Detect"
authors: ["H. Zhang", "H. Chen", "Y. Cheng", "S. Wu", "L. Sun", "L. Han", "Z. Shi", "L. Qi"]
year: 2025
url: https://arxiv.org/pdf/2505.19750
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, patchcore, efficientad, dinov2]
---

# Setting

Challenge technical report for VAND 3.0 (CVPR 2025 workshop) Track 1, "Adapt & Detect: Robust Anomaly Detection in Real-World Applications", run on the MVTec AD 2 dataset (Abstract, §1.2). Task: one-class (normal-only) image anomaly classification and pixel-level segmentation. Inputs: per category, normal training images only; test splits are `TEST_public` (labelled, used for threshold tuning), `TEST_priv` and `TEST_priv,mix` (server-scored, mixed lighting) (§2.2.2, §3.1, §3.2). MVTec AD 2 has eight categories (Can, Fabric, Fruit Jelly, Rice, Sheet Metal, Vial, Wallplugs, Walnuts) with at least four lighting conditions per scene (§1.2). Outputs: a pixel anomaly map, binarised at a threshold chosen on `TEST_public` to maximise pixel-level F1 (§2.2.2), plus an image-level classification scored by "ClassF1" (§3.1).

# Core idea

A PatchCore-style nearest-neighbour memory-bank detector in which the CNN backbone is replaced by a frozen DINOv2 ViT-L/14, with no training of any kind (§2.1.1–§2.1.3). Per category, 16 reference images are selected: DINOv2 CLS-token vectors of all training images are computed and "the same greedy coreset selection method as used in Patchcore is applied to group these feature vectors into 16 clusters" (§2.1.2) — i.e. coreset selection is applied to whole-image CLS vectors to pick reference *images*, not to patch features `?` (wording says "group into clusters"; the exact selection rule is not given). At test time, features from DINOv2 layers 6, 12, 18 and 24 are extracted; for each level, each test location is matched against the memory bank by similarity to retrieve its nearest neighbour; the four per-level anomaly maps are averaged and upsampled to image resolution (§2.1.2, §2.1.3). The shorter image side is resized to 672 px (448 px for Sheet Metal) so that the pipeline fits one 24 GB GPU (§2.1.3).

Two category-specific additions. (a) For Vial and Wallplugs, background features are suppressed with a PCA mask: the first principal component of DINOv2 features $\mathbf{PC}_1=\arg\max_{\|\mathbf{v}\|=1}\mathrm{Var}(\mathbf{Xv})$ (Eq. 1) is thresholded, $\mathcal{M}_{\text{init}}[i]=1$ if $\mathbf{PC}_1[i]>\tau$ else 0 (Eq. 2); the mask is inverted when the median per-channel variance of the masked features is lower than that of the unmasked features (Eq. 3, with $\mathrm{MD}(\cdot)$ the median of the per-channel variance vector); the mask is then cleaned as $\mathcal{M}_{\text{final}}=\mathrm{Closing}(\mathrm{Dil}(\mathcal{M}_{\text{init}}),\mathcal{K})$ (Eq. 4) (§2.2.1, §2.1.3). Fixed settings: 1 PCA component, $\tau=1.0$, $3\times3$ kernel (§2.2.1). (b) For Fabric and Walnuts, interiors of closed regions in the initial detection are filled as post-processing, because anomalies occur only at the edges (§2.1.3). Pixel F1 is $2\cdot\mathrm{Precision}\cdot\mathrm{Recall}/(\mathrm{Precision}+\mathrm{Recall})$ (Eq. 5, §2.2.2).

# Claimed contributions

No enumerated contribution list: this is a short challenge report with no "our contributions are" paragraph; the closest summaries are the Abstract and §5 (Conclusion). Stated, un-enumerated claims:

- C1: A "fully training-free anomaly detection and segmentation method" using DINOv2 features and nearest-neighbour matching to a small memory bank, "competitive results on both test sets of the MVTec AD 2 dataset" (Abstract; §5).
- C2: Reference-image selection by greedy coreset over DINOv2 CLS features rather than random sampling, said to reduce false positives on high-variability categories (Fruit Jelly, Vial, Wallplugs) (§2.1.2, §4.1).
- C3: "We innovatively propose an adaptive background mask generation technique based on PCA and morphological optimization" (§2.2.1) — the foreground/background decision by median-variance comparison (Eq. 3).
- C4: Outperforms listed baselines on `TEST_priv` and `TEST_priv,mix` (Table 2: mean F1 47.8 / 43.2 vs. best listed baseline MSFlow 21.8 / 9.0) (§3.2).

# Assumptions

1. **(Hard)** A few (16) normal reference images cover the normal appearance manifold of the category; fixed at 16 for every category (§2.1.2, §2.1.3). High intra-class variability breaks this and is mitigated, not solved, by diverse coreset selection (§4.1).
2. **(Hard)** Normal regions have near neighbours in the reference bank; anomalies do not (§2.1.2). Violated by air bubbles, specular highlights and by missing-type anomalies (§4.3).
3. **(Hard)** The decision threshold is tuned on `TEST_public` labels (§2.2.2) — the method is "training-free" but not label-free at deployment `?`.
4. **(Soft)** DINOv2 features from shallow layers separate foreground from background by the first PC with $\tau=1$ (§4.1); applied only to Vial and Wallplugs, so it is category-hand-picked rather than automatic.
5. **(Soft)** For Fabric and Walnuts, anomalies lie only at object edges so filling closed regions is safe (§2.1.3); category-specific post-processing.

# Failure regime

Reported failure cases (§4.3, Fig. 2): false positives on air bubbles in Fruit Jelly (appearance diversity not covered by the fixed bank); misses of light-coloured reflections and blurred objects in Fruit Jelly; false positives on specular highlights in Vial and Can; misses of "missing-type" anomalies in Sheet Metal and Vial because the missing region resembles background. Worst per-category `TEST_public` F1: Can 0.18, Wallplugs 19.19 (Table 1); on `TEST_priv`, Can 17.3 and Wallplugs 13.7 (Table 2). Wallplugs still shows background false detections even with the PCA mask (§4.1). Robustness to the lighting shift is claimed but modest: mean F1 drops from 47.8 to 43.2 between `TEST_priv` and `TEST_priv,mix` (Table 2).

# Numerical sensitivity

Resolution is chosen for memory, not tuned: shorter side 672 px (448 px for Sheet Metal), runs on one 24 GB GPU such as an RTX 3090 (§2.1.3). Model: DINOv2-ViT-L/14, 24 layers, about 300 M parameters, features from layers 6/12/18/24 (§2.1.3). Evaluation metric choice is argued: pixel F1 rather than AU-ROC because AU-ROC "can be dominated by larger defects" (§2.2.2). Decision threshold is tuned on `TEST_public`; no sensitivity study is reported `?`. No ablations of layer choice, reference count (16), or coreset-vs-random are reported numerically; §4.1 gives only a qualitative claim.

# Applicability

- Use when: a quick, no-training baseline is needed on difficult industrial images (lighting shifts, tiny defects) and a handful of normal images per class is available; pairs naturally with a DINOv2 backbone and a PatchCore-style bank.
- Don't use when: the anomaly is a missing-type or logical defect (not discussed as such by the paper beyond §4.3's missing-type failures); when reflective/transparent geometry produces specular false positives; when real-time latency is required — no latency is reported `?`.
- Compared against (Table 2, numbers taken from the MVTec AD 2 dataset paper, not re-run by the authors): PatchCore, RD, RD+, EfficientAD, MSFlow, SimpleNet, DSR (§3.2).

# Stated relations

Challenge report: there is no Related Work section, but §2.1.1 ("Approach") and §3.2 ("Comparison") state positions toward prior work. Rows below are proposals only.

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| `patchcore` (`roth2022-patchcore`) | "the same greedy coreset selection method as used in Patchcore is applied to group these feature vectors into 16 clusters" (§2.1.2); "memory bank-based methods ... PatchCore introduces a greedy coreset selection mechanism" (§2.1.1) | `feeds_into` (authored on `patchcore`, target = a SuperAD page — no such page exists) | medium | PatchCore's memory bank + nearest-neighbour scoring + coreset is the named building block of SuperAD, chronology 2022 ≤ 2025. But SuperAD applies coreset to image-level CLS vectors, not patch features — a reuse, not the same step. Without a SuperAD page the edge cannot be recorded; carry as an `UPDATE` remark on `patchcore`/survey instead. |
| `dinov2` (`oquab2023-dinov2`) | "we propose a fully training-free ... method based on feature extraction using the DINOv2 model named SuperAD" (Abstract); "Our approach relies heavily on the powerful feature extraction capabilities of DINOv2" (§4.2) | none (backbone used as frozen component; no SuperAD page) | — | If a SuperAD page ever exists, `feeds_into` DINOv2 → SuperAD would follow the ResNet → DETR backbone precedent; here only a prerequisite-level reference. |
| `patchcore`, `efficientad` | "EfficientAD and PatchCore achieve average AU-PRO0.05 scores of only 58.7% and 53.8%, respectively" (§1.2); Table 2 lists both with SuperAD's 47.8 / 43.2 mean F1 vs 15.4 / 8.0 and 3.7 / 3.4 (§3.2) | none | — | Baselines in a challenge table, numbers copied from the MVTec AD 2 paper; not a positioning statement about the methods' relationship. A `compared_with` edge would rest on a challenge-leaderboard row scored with a different (pixel-F1, MVTec AD 2) protocol than PatchCore's own paper, and there is no SuperAD page to host it, so no edge. |
| `batzner2023-efficientad`, MSFlow, RD, RD+, SimpleNet, DSR (`liu2023-simplenet` registered) | "On both test sets, our method, SuperAD, consistently outperforms previous methods." (§3.2) | none | — | Benchmark claim only; baselines are reported by the dataset authors, not reproduced here. |
| DMAD (Hu et al. 2024), APRIL-GAN (Chen et al. 2023), PaDiM (Defard et al. 2021) | §2.1.1: DMAD "unifies two commonly encountered scenarios ... normal memory bank and an expandable anomaly memory bank"; APRIL-GAN "leverages CLIP's ... multimodal alignment ... layer-wise matching"; PaDiM models patch features "using a multivariate Gaussian" | none | — | Descriptive related-work sentences motivating multi-layer matching; no Atlas page or registered id for these `?`. |

# Connections

- Builds on: [roth2022-patchcore, oquab2023-dinov2, dosovitskiy2020-vit]
- Enables: []
- Refutes / supersedes: []

# Atlas update plan

Role: supplementary update (no existing page cites this paper; it adds a recent worked example to the survey and to `patchcore`). Does not meet the new-page criterion: a challenge report assembled from existing parts (PatchCore-style bank, DINOv2 features, coreset reference selection) whose only original element is a PCA foreground mask applied to two categories.

## UPDATE: visual-anomaly-detection
Section: Where it appears (and a short sentence in Numerical Concerns)
- Add a one-paragraph "backbone-swapped memory bank" example: SuperAD keeps the memory-bank/kNN scoring of the survey's second family but swaps the CNN features for frozen DINOv2 ViT-L/14 multi-layer features (layers 6/12/18/24), selects 16 reference images by greedy coreset over CLS vectors, and averages per-layer kNN maps (§2.1.2–§2.1.3).
- Add a benchmark-evolution remark: MVTec AD 2 targets transparent/reflective surfaces, tiny defects and lighting shifts; the paper reports EfficientAD and PatchCore at only 58.7% and 53.8% mean AU-PRO0.05 and below 30% on Can and Rice (§1.2). Cite as the paper's statement of the dataset paper's numbers, not as an independent measurement.
- Evaluation-metric caveat to carry over: the paper selects pixel F1 over AU-ROC because large defects dominate AU-ROC (§2.2.2).
- Do not state SuperAD's Table 2 means without the caveat that baseline numbers are copied from the dataset paper and the text quotes F1 of 47.18% / 42.51% for `TEST_priv` / `TEST_priv,mix` (§3.1) while Table 2 gives 47.8 / 43.2 (see Provenance).

## UPDATE: patchcore
Section: Remarks / Assessment (follow-on work)
- Note that PatchCore's greedy coreset has been reused outside patch-feature subsampling: SuperAD applies it to whole-image DINOv2 CLS vectors to pick 16 reference images per class (§2.1.2).
- Note that swapping the WideResNet backbone for DINOv2 in a PatchCore-style bank is one reported route to better results on MVTec AD 2 (§2.1.1, §3.2); the paper does not isolate the backbone's contribution from its other changes `?`.

# Provenance

- Setting, challenge, splits: Abstract; §1.2 "Challenge Description"; §2.2.2 "Evaluation Criteria"; §3.1.
- Memory bank, 16 references, CLS + greedy coreset, per-level kNN maps averaged: §2.1.2 "Architecture".
- DINOv2-ViT-L-14, 24 layers, ~300 M params, layers 6/12/18/24, 672 / 448 px, 24 GB GPU, no training, post-processing for Fabric/Walnuts: §2.1.3 "Training".
- Eq. 1–4 (PCA first component, threshold mask, variance-based inversion, dilation + closing), $\tau=1.0$, 1 component, $3\times3$ kernel: §2.2.1 "Dataset Utilization". Eq. 5 (F1): §2.2.2.
- Table 1: `TEST_public` AU-ROC0.05 mean 76.71 and F1 mean 39.42; per-class F1 Can 0.18 … Walnuts 75.05. Table 2: `TEST_priv` / `TEST_priv,mix` F1 per baseline; SuperAD mean 47.8 / 43.2; MSFlow 21.8 / 9.0; PatchCore 3.7 / 3.4; EfficientAD 15.4 / 8.0.
- §3.1 text: F1 47.18% and 42.51%; AucPro0.05 60.51% and 58.37%; ClassF1 70.2% and 74.4% (`TEST_priv`, `TEST_priv,mix`). Discrepancy: arithmetic mean of Table 2's per-class SuperAD `TEST_priv` entries (17.3, 77.4, 41.3, 60.9, 59.5, 42.8, 13.7, 69.1) is 47.75 and of the mix entries is 43.2, matching Table 2 (47.8 / 43.2) but not the §3.1 text (47.18 / 42.51) — cause unknown `?`.
- Baseline numbers quoted from the dataset paper: §1.2 (AU-PRO0.05 58.7% / 53.8%; MSFlow drop 51.1%) and §3.2 ("we compare ... with other approaches listed in the MVTec AD 2 dataset paper").
- Failure cases: §4.3, Fig. 2. Challenges and coreset rationale: §4.1, §4.2.
- Uncertain `?`: coreset "clusters" wording (§2.1.2); whether the threshold is per-class or global (§2.2.2); no latency, no ablation numbers anywhere in the report.
