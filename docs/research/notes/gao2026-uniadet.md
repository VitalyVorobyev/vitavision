---
paper_id: gao2026-uniadet
title: "One Language-Free Foundation Model Is Enough for Universal Vision Anomaly Detection"
authors: ["B. Gao", "C. Wang"]
year: 2026
url: https://arxiv.org/pdf/2601.05552
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, clip, dinov2, dinov3, patchcore]
---

# Setting

"Universal" visual anomaly detection (AD): detect anomalous images and segment anomalous regions on novel categories and domains with no dataset-specific fine-tuning, in a zero-shot setting (no target-domain images) or a few-shot setting (k in {1, 2, 4} normal images per class) (Abstract; §3 "Problem Formulation"). Training uses a labelled auxiliary dataset $D_{base}=\{X_i,Y_i,y_i\}_{i=1}^N$ with image-level labels $y_i\in\{0,1\}$ and pixel masks $Y_i$ — i.e. it needs anomalous examples with masks at training time, from a different domain than the test set (§3). Protocol: train on VisA test data and evaluate on the other datasets; for VisA, train on MVTec test data (§4.1). Evaluation: six industrial benchmarks (MVTec AD, VisA, BTAD, DTD, KSDD, Real-IAD; zero- and few-shot) and eight medical benchmarks (HeadCT, BrainMRI, Br35H, ISIC, ColonDB, ClinicDB, Kvasir, Endo; zero-shot only) (§4.1, Supplementary §7). Outputs: image-level anomaly score and pixel-level anomaly map. Metrics: AUROC and AUPR (image and pixel); the paper stresses pixel AUPR for extreme class imbalance (§4.1).

# Core idea

Observation: in CLIP-based zero-shot AD, the text encoder's only job is to turn manual or learnable prompts into a two-class weight matrix $W\in\mathbb{R}^{d\times2}$ ("normal" vs "anomaly"), which is then compared by cosine similarity with patch tokens $F_q$ (pixel map, Eq. 3) and with the global image token $\vec{x}_q$ (image score, Eq. 4): $\hat Y_z=\mathrm{softmax}(\langle W,F_q\rangle/\tau)$, $\hat y_z=\mathrm{softmax}(\langle W,\vec x_q\rangle/\tau)$ (§3.1). Since prompts only produce $W$, UniADet learns $W$ directly ($W\leftarrow T_l$, Eq. 5), drops the text encoder, and freezes the visual encoder ($\vec x_q,F_q=\mathcal{F}(X_q)$, Eq. 6), so the only learnable parameters are classification/segmentation weight vectors on top of any frozen foundation model, including text-free ones (DINOv2 with registers, DINOv3) (§3.1, Abstract).

Two decouplings. (i) Classification vs segmentation: global tokens and patch tokens lie on different manifolds (t-SNE, Fig. 3 / Fig. 5), so one shared $W$ is replaced by $W_{cls}$ and $W_{seg}$: $\hat Y_z=\mathrm{softmax}(\langle W_{seg},F_q\rangle/\tau)$, $\hat y_z=\mathrm{softmax}(\langle W_{cls},\vec x_q\rangle/\tau)$ (Eq. 7, §3.2). (ii) Across hierarchy: every extracted block $l$ gets its own pair $W^l_{seg},W^l_{cls}$ (Eq. 8, §3.3). Features come from blocks {12, 15, 18, 21, 24} (Supplementary §7). Training follows AnomalyCLIP: cross-entropy for $\{W^l_{cls}\}$, Focal + Dice for $\{W^l_{seg}\}$ (§3.5), with a Class-Aware Augmentation (grid mosaic of same-class images, grid cropping) (§3.5; Supplementary §6).

Few-shot extension (§3.4), "inspired by the memory bank in PatchCore and the reference association in WinCLIP": store patch features of the $K$ normal images at each scale $l$ in a bank $M^l$ (size $K\,HW/P^2\times d$); few-shot map $\hat Y^l_f(i,j)=\min_{m\in M^l}(1-\langle F^l_q(i,j),m\rangle)$ (Eq. 9), averaged over scales $\hat Y_f=\frac{1}{|L|}\sum_l\hat Y^l_f$ (Eq. 10); fused with the zero-shot map $\hat Y_f\leftarrow(1-\lambda_f)\hat Y_z+\lambda_f\hat Y_f$ (Eq. 11); image score $\hat y_f\leftarrow(1-\lambda_p)\hat y_z+\lambda_p\max_{i,j}\hat Y_f(i,j)$ (Eq. 12). Defaults $\lambda_p=\lambda_f=0.5$ (§3.5). The memory bank is training-free: one-shot adds no parameters and little inference time (§4.2, Table 4).

# Claimed contributions

- C1: "We rethink vision-language ADs and find that language prompts and encoders are unnecessary for zero-shot AD. This insight leads to an embarrassingly simple, parameter-efficient, and highly general language-free framework for universal anomaly detection." (§1, first bullet)
- C2: "We fully decouple global anomaly classification and local anomaly segmentation across multi-scale hierarchical features, effectively mitigating the learning conflict between different feature manifolds and substantially improving AD performance." (§1, second bullet)
- C3: "Comprehensive experiments covering 6 industrial and 8 medical benchmarks conclusively validate that our approach achieves state-of-the-art zero-shot and few-shot performance ... Notably, our few-shot UniADet is the first to outperform full-shot state-of-the-art." (§1, third bullet; Abstract: "surpassing ... even full-shot AD methods for the first time")
- C4: Parameter efficiency and generality: "only 0.002M learnable parameters", adaptable to "a variety of foundation models" (Abstract); 10,000x and 300x fewer learnable parameters than Bayes-PFL and AdaptCLIP, best inference time 15.7 / 22.4 ms with CLIP ViT-L/14@336 (§4.2, Table 4).

Calibration notes for page drafting: the "outperform full-shot" claim holds on Real-IAD only (UniADet 4-shot 90.3 vs Dinomaly 89.3 I-AUROC), while on MVTec Dinomaly is higher (99.6 vs 98.7) (§4.3). The learnable-parameter count appears as 0.002M (Abstract), about 0.001M (Fig. 1 caption) and 1.5e-3 / 2.0e-3 M (Table 4) — inconsistent.

# Assumptions

1. **(Hard)** A labelled auxiliary AD dataset with pixel masks from a different domain is available for training the decoupled weights (§3, §4.1); not an unsupervised method.
2. **(Hard)** The frozen foundation model's patch tokens already separate normal from anomalous semantics linearly (cosine similarity to a learned vector) at the chosen blocks (§3.1, Fig. 3); no adaptation of backbone parameters.
3. **(Hard, few-shot)** Reference normal images are aligned in appearance with the query category; some defects "are only defined relative to specific normal reference images (e.g., a missing battery cell)" (§3.4).
4. **(Soft)** Fusion weights $\lambda_p=\lambda_f=0.5$ and 15 epochs / lr 0.001 are fixed for all datasets (§3.5, Supplementary §7).
5. **(Soft)** The cross-dataset protocol trains on VisA and tests on the others (MVTec trained on VisA, VisA trained on MVTec); whether object categories overlap between auxiliary and test datasets is not discussed `?` (§4.1).

# Failure regime

No limitations section. From the tables: mean CLIP-based image AUROC on KSDD and Real-IAD is lower for the DINO-based variants on KSDD (UniADet‡ 91.6 / 59.5 vs UniADet† 96.3 / 83.4 I-AUROC / I-AUPR, Table 2) — backbone choice matters per dataset. On medical zero-shot, the CLIP-based variant beats the DINO-based one for image-level classification (UniADet† 96.7 / 96.7 vs ⋆ 93.3 / 94.5, Table 3) while DINOv3 wins pixel-level segmentation. Pixel AUPR remains low on several sets even when AUROC is high (e.g. Real-IAD zero-shot P-AUPR 33.6–43.1, Table 2). Hierarchical ablation: using only the last block drops zero-shot performance to 89.9 / 35.4 vs 92.4 / 42.8 with five blocks on MVTec (Table 8). Logical/count anomalies are not evaluated: MVTec LOCO is not used and the word "logical" does not occur.

# Numerical sensitivity

Resolution 518x518 for ViT-L/14-based and 512x512 for ViT-L/16-based backbones (Supplementary §7). Learnable parameters 1.5e-3 M (CLIP ViT-L/14@336) and 2.0e-3 M (DINOv3 ViT-L/16) on top of 342.9 M and 303.2 M frozen parameters (Table 4). Temperature $\tau>0$ in the softmax is a hyperparameter whose value is not stated in the main text `?`. Block-set ablation (Table 8): five blocks {12, 15, 18, 21, 24} best; shallow blocks (12, 15) matter for fine segmentation (§4.4). Class-aware augmentation helps while class-agnostic ("random") augmentation hurts (Table 7). Inference on one H20 GPU, batch 1 (§4.2). Variance across 1/2/4 shots reported as mean ± std in Tables 5, 10, 11.

# Applicability

- Use when: zero- or few-shot AD on new categories/domains is required with minimal parameters and no language prompts; a strong ViT backbone (CLIP, DINOv2-R, DINOv3) is available; a masked auxiliary AD dataset exists for the one-off training of weights.
- Don't use when: anomalies are logical/compositional (not evaluated); no auxiliary labelled anomalous data exists; the target domain differs strongly from the backbone's pre-training and the backbone cannot be swapped.
- Compared against (Tables 2, 3, 5, 6): zero-shot WinCLIP, AdaCLIP, AnomalyCLIP, Bayes-PFL, AdaptCLIP; few-shot WinCLIP+, InCtrl, AnomalyCLIP+, AdaptCLIP, UniVAD, MetaUAS; full-shot Dinomaly, UniAD.

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| `clip` (`radford2021-clip`) | "when using the same foundation model (e.g., CLIP)" UniADet "substantially outperforms SOTA AdaptCLIP ... (91.6% vs. 89.6% I-AUROC)" (§4.2); backbone ViT-L/14@336px (Supp. §7) | none (backbone swapped in, model-agnostic) | — | CLIP is one of three interchangeable frozen backbones; a prerequisite-level link, not lineage. |
| `dinov2`, `dinov3` | "possible to implement universal anomaly detection using a language-free foundation model, like DINOv2 and DINOv3" (§1); "a seamless, cost-free switch to highly capable vision foundation models, such as DINOv2 and DINOv3" (§4.2) | none (model-agnostic backbone; prerequisite) | — | `feeds_into` would assert the DINO papers underlie UniADet's idea; the method is explicitly backbone-agnostic. Handle via `prerequisites`/prose. |
| `patchcore` | "Inspired by the memory bank in PatchCore [33] and the reference association in WinCLIP [18], we build a multi-scale normal memory to extend our framework to a few-shot setting." (§3.4) | `feeds_into` (authored on `patchcore`, target = a UniADet page) | medium | Named building block of the few-shot branch, chronological (2022 ≤ 2026). Only valid if a UniADet page is created; the memory bank here is unsubsampled (no coreset mentioned `?`). |
| WinCLIP (`jeong2023-winclip`, registered; no Atlas page) | "WinCLIP+ [18] pioneered the application of CLIP to few-shot AD by storing normal tokens in a memory bank, retrieving the nearest token ... " (§2); "reference association in WinCLIP" (§3.4) | none (no page) | — | Candidate for a future survey; both lineage and baseline. |
| AnomalyCLIP, AdaCLIP, Bayes-PFL, AA-CLIP, AdaptCLIP (no registered ids / pages) | "We contend that these additional modifications introduce unnecessary model complexity and potentially degrade the robust, inherent representational capabilities of the original CLIP model." (§2) | none (no pages) | — | Positioning against the CLIP-prompt family; training recipe follows AnomalyCLIP (§3.5). When those pages exist the relation is probably `compared_with` (peer choice, same paradigm) rather than any lineage type; not decidable now. |
| MetaUAS (Gao 2024), UniVAD (Gu 2025) | "MeatUAS demonstrated that a pure vision model trained on synthetic images can achieve strong one-shot performance ... Unfortunately, it cannot be extended to zero-shot scenarios." (§1); UniVAD "combines multiple pre-trained models ... In contrast, we aim to explore few-shot AD performance ... using only a single foundation model." (§2) | none (no pages / registered ids `?`) | — | Pure-vision and training-free few-shot comparators; Table 6 compares 1-shot. |
| Dinomaly (Guo 2025), UniAD (You 2022) | "our results are highly competitive with the current best fully-shot Dinomaly (98.7% vs. 99.6% in I-AUROC on MVTec). We exceed Dinomaly on the challenging Real-IAD (90.3% vs. 89.3%)" (§4.3) | none (full-shot multi-class paradigm; no pages) | — | Cross-paradigm benchmark comparison (few-shot vs full-shot); not a lineage claim. |

# Connections

- Builds on: [radford2021-clip, oquab2023-dinov2, simeoni2025-dinov3, roth2022-patchcore, jeong2023-winclip, zou2022-visa, bergmann2019-mvtec-ad]
- Enables: []
- Refutes / supersedes: []   # claims the text encoder is unnecessary in prior CLIP-based zero-shot AD (§1, §3.1) — a claim about a method family without Atlas pages, not a supersession of a single page

# Atlas update plan

Role: supplementary update, plus a borderline new-page candidate. The Atlas survey is explicitly one-class and has no zero-/few-shot treatment, so the paper does not anchor on any current page's sources; it extends the survey's scope.

## UPDATE: visual-anomaly-detection
Section: Where it appears (add a short "paradigms outside the one-class framework" paragraph) and Definition
- State that zero-/few-shot "universal" AD relaxes the page's defining constraint: the detector is trained once on a labelled auxiliary AD dataset with masks (VisA test data for evaluation elsewhere, MVTec test data for VisA) and then applied to unseen categories with zero or 1-4 normal images (§3 "Problem Formulation", §4.1).
- Add the core mechanism in two lines: a frozen foundation model's global token and patch tokens scored by cosine similarity to learned per-layer normal/anomaly weight vectors, with separate vectors for classification and segmentation (Eq. 7–8), plus a PatchCore-style kNN memory bank fused at $\lambda=0.5$ for few-shot (Eq. 9–12).
- Metrics reminder: image/pixel AUROC and AUPR on MVTec, VisA, BTAD, DTD, KSDD, Real-IAD; the paper argues pixel AUPR is more informative under extreme imbalance (§4.1).

## UPDATE: patchcore
Section: Remarks / Assessment (follow-on work)
- One-sentence pointer: PatchCore's memory-bank/nearest-neighbour scoring recurs as the few-shot branch of a language-free foundation-model detector (UniADet §3.4, Eq. 9–10), without coreset subsampling `?`.

## NEW: uniadet
Type: model
Category: anomaly-detection (zero-/few-shot, foundation-model adapters)
Primary source: this paper
Status: borderline — meets the "clear novel method with a substantive technical contribution" test (language-free learned decision weights; per-task and per-layer decoupling), but it is an arXiv v1 preprint whose code was "will be available" at the time of writing (Abstract), so a non-draft model page would need `noPublicImpl: true` or a verified repo; and it would sit alone without a zero-/few-shot survey context. Recommend deferring until the code is verified and at least one comparable zero-shot method (e.g. WinCLIP, AnomalyVFM) has a page.
Bullets (if authored):
- Motivation: CLIP-based zero-shot AD needs prompt engineering, adapters and multi-stage training; the text encoder only produces the two-class weight $W$ (§1, §3.1).
- Architecture: frozen backbone (CLIP ViT-L/14@336, DINOv2-R ViT-L/14, or DINOv3 ViT-L/16), tokens from blocks 12/15/18/21/24, per-layer $W^l_{seg}$ and $W^l_{cls}$, cosine-softmax heads (Eq. 7–8); few-shot memory bank branch (Eq. 9–12); Class-Aware Augmentation; 15 epochs, lr 0.001 (Supp. §6–§7).
- Assessment: zero-shot mean image AUROC 91.6 (CLIP) / 91.3 (DINOv2-R) / 91.7 (DINOv3) vs AdaptCLIP 89.6 (Table 2); 1-shot DINOv3 95.6 I-AUROC / 98.5 P-AUROC (§4.3); 15.7 ms with CLIP, 41.9 ms with DINOv3 at zero shot (Table 4). Calibrate the "outperforms full-shot" claim (Real-IAD only).
- Limitations to record: needs masked auxiliary data; no logical-anomaly evaluation; parameter-count inconsistency across Abstract, Fig. 1 and Table 4.

# Provenance

- Problem formulation, $D_{base}$, $k\in\{1,2,4\}$: §3. Eq. 1–4 (VLM encoders, $W$, pixel and image softmax): §3.1; Eq. 5–6 (learn $W$ directly, frozen encoder): §3.1; Eq. 7 (decoupled classification/segmentation): §3.2; Eq. 8 (layer-wise): §3.3; Eq. 9–12 (memory bank, scale average, fusion, image score): §3.4. $\lambda_p=\lambda_f=0.5$, CE + Focal + Dice: §3.5.
- Contributions: §1 final bullets; Abstract. Related Work positioning: §2.
- Datasets, protocol, metrics: §4.1; Table 9 (Supp. §7). Zero-shot results: Table 2 (industrial), Table 3 (medical). Complexity: Table 4. One-shot: Table 5; 2-/4-shot: Tables 10, 11 (Supp.); few-/full-shot comparison: Table 6 (cell format "x / y" — first value stated as I-AUROC in §4.3 text; second presumably pixel AUPR `?`).
- Ablations: Table 7 (DCS 85.4 / 36.4 → 91.8 / 38.3 on MVTec; DHF → 92.2 / 40.7; CAA → 92.4 / 42.8; random augmentation 91.3 / 41.5; 1-shot 95.9 / 54.6), Table 8 (blocks).
- Implementation constants: Supp. §7 (blocks {12,15,18,21,24}, CAA probability 0.5, grids {2x2, 3x3}, 518x518 / 512x512, 15 epochs, lr 0.001, single H20 GPU). CAA definition: Supp. §6.
- Parameter-count inconsistency: Abstract 0.002M; Fig. 1 caption 0.001M; Table 4 1.5e-3 / 2.0e-3 M.
- Uncertain `?`: $\tau$ value; Table 6 second metric; whether the few-shot memory bank is coreset-subsampled.
