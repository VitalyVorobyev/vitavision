---
paper_id: zhang2026-logico
title: "LogiCo: A Unified Framework for Logical and Structural Anomaly Detection"
authors: ["X. Zhang", "M. Xu", "X. Zhou"]
year: 2026
url: https://arxiv.org/pdf/2606.28688
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, efficientad, patchcore, dinov3, attention-mechanism]
---

# Setting

Unsupervised (normal-only training) industrial anomaly detection and localisation covering both structural anomalies (scratches, breakage, stains: "unseen local visual patterns") and logical anomalies (missing components, wrong locations, wrong counts, wrong component types: "invalid configurations that deviate from production flows or assembly requirements") (§1, Fig. 1a). Input: an RGB image resized to 512x512 plus, per category, a handful of text prompts naming component types (e.g. "Peach", "Orange") used for open-vocabulary segmentation (§3.1, §4.1). Output: a pixel-level anomaly map and an image-level score (max of the map) (§3.4). Benchmarks: MVTec-LOCO (3,644 images, 5 categories), MVTec-AD (5,354 images, 15 products), VisA (10,821 images, 12 products) and Real-IAD (151,050 multi-view images, 30 products; single-view setting) (§4.1). Metrics: I-AUC, P-AUC, P-AP, PRO for MVTec-AD / VisA / Real-IAD; I-AUC and saturated PRO (sPRO) for MVTec-LOCO, with logical and structural subsets computed separately and averaged (§4.1).

# Core idea

Instead of a global branch that discards spatial layout, reconstruct features in a discretised component space that keeps layout (§1, Fig. 1b). Open-vocabulary segmentation with DINOv3 (patch-to-text cosine similarity, argmax over $K$ prompts) gives a component map $G(i,j)=\arg\max_k\cos(X_p(i,j),\mathcal{P}_k)$ (Eq. 1), lightly post-processed (small connected components removed; deliberately not a refined segmentation) (§3.1). Component prototypes are average-pooled features $\mathrm{f}_k=\frac{1}{|\Omega_k|}\sum_{(i,j)\in\Omega_k}X(i,j)$ (Eq. 2) and the discretised map is $X_c(i,j)=\mathrm{f}_{G(i,j)}$ (Eq. 3). During training, the segmentation map is edited by four logical-anomaly synthesisers — deletion (replace a component by neighbouring background), replacement (swap component types), addition (CutPaste a component elsewhere, raising its count), erasure (erode a single-region component or delete part of a multi-region one) — to build anomalous component features $X_c'$ (§3.1, Fig. 3). A Component-level Reconstruction Network (CRN, an autoencoder $\psi_c$ with a self-attention layer in each block) restores $X_c'$ not to the clean discretised map but to the original pre-trained features $X$: $\mathcal{L}_{Log}=1-\cos(X_L,X)$ with $X_L=\psi_c(X_c')$ (Eq. 4); the logical map $S_L$ is the patch-wise cosine distance (§3.1). Reconstructing to $X$ rather than $X_c$ gives a continuous target, avoids trivial solutions and tolerates segmentation noise (§3.1; Table S1).

Structural branch: a U-Net Structural Reconstruction Network (SRN) $\psi_s$ reconstructs fine-grained features, $\mathcal{L}_{Str}=1-\cos(X_s,X)$; to prevent an "identical shortcut", SRN layers cross-attend to the CRN's anomaly-free layer features — $Q_h=X_s^hW_Q^h$, $K_h=X_L^hW_K^h$, $V_h=X_L^hW_V^h$, $\hat X_s^h=\mathrm{FFN}(\mathrm{Attention}(Q_h,K_h,V_h))$ (Eq. 5), without the residual connection to avoid leaking anomalous information (§3.2). Segmentation Map Discriminator (SMD): a lightweight fully convolutional U-Net on the (synthetic) segmentation map predicting an anomaly mask $S_D=\psi_D(G)\in[0,1]^{h\times w}$, trained with binary focal loss $\mathcal{L}_{Dis}=\mathrm{Focal}(\psi_D(G'),\mathcal{M})$ (Eq. 6), aimed at count-related anomalies (§3.3). Joint training $\mathcal{L}=\mathcal{L}_{Log}+\mathcal{L}_{Str}+\mathcal{L}_{Dis}$ (Eq. 7); inference fuses the three maps after z-normalising each with validation-set mean and standard deviation, $\mathcal{S}=\max\{\frac{S_L-\mu(S_L)}{\sigma(S_L)},\frac{S_s-\mu(S_s)}{\sigma(S_s)},\frac{S_D-\mu(S_D)}{\sigma(S_D)}\}$ (Eq. 8), upsampled; image score = max (§3.4).

# Claimed contributions

- C1: "We propose LogiCo, a unified framework for logical and structural anomaly detection. LogiCo captures local structural consistency and global logical constraints in a fine-grained discriminative space, effectively addressing the limitations of existing methods regarding detection scope and granularity." (§1, first bullet)
- C2: "We introduce a novel component-level feature reconstruction technique, which transforms the complex modeling of multiple logical constraints into a unified reconstruction paradigm. This allows for the precise detection and pixel-level localization of logical anomalies without compromising spatial structures." (§1, second bullet)
- C3: "LogiCo achieves SOTA logical and structural anomaly detection performance on four benchmarks: MVTec-LOCO, MVTec-AD, VisA, and Real-IAD" (§1, third bullet; Abstract).
- C4 (from §3.2, Abstract): cross-attentive structural reconstruction as "a novel method bridging logical and structural anomaly detection"; a segmentation-map discriminator that "extends the model's capability to identify quantitative inconsistencies" (Abstract).
- C5: Efficiency claim: no separate component-segmentation model needs to be trained, shortening training and giving "17.4 FPS at a resolution of 512x512" (§4.2).

Calibration notes: "SOTA on all four benchmarks" holds with caveats — on MVTec-AD the P-AP / PRO columns are marginally below Dinomaly (70.2 / 95.0 vs 71.2 / 95.5, Table 1), the paper says "on par with or even surpassing"; SALAD and Dinomaly appear faster in Table 3 (37.6 and 30.2 vs 17.4 images/s; column assignment inferred `?`); SAM-LAD (original-paper numbers) reports 83.2 average sPRO, above LogiCo's 72.9 and LogiCo+'s 80.4, though with only 90.7 average I-AUC (Table 2); most baselines are re-run by the authors under their protocol (§4.1) rather than copied.

# Assumptions

1. **(Hard)** A usable component segmentation can be obtained from text prompts naming the components (open-vocabulary DINOv3); for most categories "the image category name and a simple background description" suffice (Supp. B). Wrong segmentation is tolerated to a degree (§4.2, Fig. S1) but not quantified beyond two examples.
2. **(Hard)** Logical constraints of the product can be violated synthetically in segmentation-map space with the four manipulations; the discrete pixel space "facilitates straightforward customization tailored to the logical constraints of specific products" (§4.3). Anomaly types outside deletion/replacement/addition/erasure (e.g. fine geometric tolerances) are not synthesised.
3. **(Hard)** Count-related constraints are learnable from segmentation maps alone; SMD "may compromise anomaly localization" because it sees no appearance (§4.3).
4. **(Soft)** For MVTec-AD texture classes, a single component is assumed and synthesis + SMD are disabled; the same configuration is used for all other classes (§4.1).
5. **(Soft)** 20% of training images are held out to compute normalisation statistics for MVTec-AD, VisA and Real-IAD (§4.1); MVTec-LOCO uses its validation set `?` (not stated explicitly in the main text).

# Failure regime

Reported limitations are few; the conclusion says future work should provide "learnable anomaly synthesis strategies" (§5). Observed: SMD raises logical detection but lowers localisation (Table 4: CRN+SRN 89.43 logical I-AUC / 67.71 logical sPRO vs CRN+SRN+SMD without cross-attention 95.81 / 63.04). Segmentation noise: Juice Bottle where the segmenter cannot separate juice types still reaches 98.93% I-AUC and 82.67% sPRO (§4.2). Early layers hurt: layers {1..6} give 93.33 I-AUC / 67.15 sPRO on LOCO vs 96.28 / 72.90 for the final layer (Table 7). Fine-grained part-level segmentation helps other methods more on logical localisation: PSAD (few-shot annotated masks) reaches 97.7 logical I-AUC but only 91.3 structural, and LogiCo+ with SAM-refined maps rises to 96.7 average / 80.4 average sPRO (Table 2) — suggesting segmentation quality is a ceiling. Deletion alone is a weak synthesiser (85.70 logical I-AUC) whereas addition alone gives 93.41 (Table 5).

# Numerical sensitivity

DINOv3 ViT-B/16, features from the final (12th) layer, 512x512 input (§4.1); backbone and resolution trade accuracy against cost without a monotone trend (Table 6, LOCO I-AUC / sPRO, row-to-setting assignment from the extracted table `?`: DINOv2-R 224x224 94.42 / 69.48 and 448x448 95.67 / 71.85; ViT-B 512x512 96.28 / 72.90; ViT-L 512x512 95.80 / 73.88, i.e. lower I-AUC but higher sPRO than ViT-B). Single final layer beats multi-layer averages, which the authors ascribe to DINOv3's Gram Anchoring regularisation of the last layer (§4.3, Table 7). Normalisation of the three anomaly maps by validation mean and standard deviation before the max (Eq. 8) means threshold behaviour depends on the held-out 20% (§4.1). Hardware: single RTX 5090, batch size 1 for latency (§4.2). PatchCore reproduction at 256x256 with WRN-50 and 10% subsampling (Supp. A) — the baseline setting matters for the headline margins.

# Applicability

- Use when: products with component structure where logical constraints (presence, type, position, count) matter alongside surface defects; open-vocabulary text names for components are available; per-category training of a small autoencoder and U-Net is acceptable.
- Don't use when: millisecond-level latency is required (EfficientAD-class budgets); components cannot be segmented from text (texture-only classes reduce to the SRN branch); constraints need metric tolerances (e.g. a length a few millimetres off).
- Compared against (Tables 1-3): PatchCore, UniNet, INP-Former, Dinomaly (structural); GLCF, AnomalyMoE, CSAD, SALAD, PSAD, LogSAD, SAM-LAD, GCAD, EfficientAD (logical).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| `efficientad` (`batzner2023-efficientad`) | "EfficientAD [2] inherits the core idea of GCAD and identifies logical anomalies by comparing the reconstruction error between two reconstruction networks with different model capacities." (§2); Table 2: EfficientAD 86.8 logical / 94.7 structural / 90.7 average I-AUC vs LogiCo 96.5 / 96.0 / 96.3 (numbers marked as taken from the original paper) | `compared_with` (authored on `efficientad`, target = a LogiCo page) | medium | Peer practitioner choice for logical + structural AD on MVTec-LOCO, both alive; not Rule A (LogiCo is far slower and uses a segmenter; no strict generalisation). Requires a caution: EfficientAD sPRO is not reported in Table 2 ("-"), accuracy margin is not a latency-matched comparison. Hosting follows the older paper (EfficientAD 2023 <= LogiCo 2026). Confirm against `batzner2023-efficientad` note. |
| PUAD (`sugawara2024-puad`) | "Sugawara et al. [36] observed that EfficientAD remains ineffective at detecting certain types of logical anomalies, such as missing components or count-related anomalies. To address this, they introduced a global detection branch that disregards inter-component spatial relationships and instead models global semantic consistency using a Gaussian probability model" (§2); grouped with [14,18,21,31,36] "usually employ an additional global detection branch" (§1) | none | — | PUAD is positioned as part of the global-branch paradigm LogiCo departs from but is not a baseline in any table, so there is no head-to-head claim; a `compared_with` edge would be unsupported by the paper's own evidence. |
| `patchcore` (`roth2022-patchcore`) | "Deep feature embedding-based methods ... constructing memory banks [1, 8, 33] ... lack global perception capabilities, and thus often fail in detecting logical anomalies." (§2); Table 1: PatchCore 75.6 LOCO I-AUC, 34.4 sPRO (reproduced at 256x256, WRN-50) | none (benchmark row; possibly `compared_with`/low) | low | PatchCore is cited as a structural-AD baseline that the paper itself says was not designed for logical anomalies; a peer-choice edge would be weak. |
| `uninformed-students`, `knowledge-distillation` | "Knowledge distillation-based methods [2,6,11,17,38] train a student network to learn the normal feature distribution of the teacher." (§2) | none | — | Generic related-work categorisation. |
| `dinov3` (`simeoni2025-dinov3`) | "We employ DINOv3 for feature extraction and open-vocabulary semantic segmentation" (§3.1); final layer chosen because of "the Gram Anchoring technique employed by DINOv3" (§4.3); DINOv2-R also works (Table 6) | none (backbone; prerequisite) — or `feeds_into` (authored on `dinov3`, target = LogiCo page), low/medium, if the user adopts the ResNet -> DETR backbone-as-named-component precedent | low | Backbone swapped between DINOv2-R and DINOv3 with similar results, so the idea does not depend on DINOv3; policy question for the orchestrator (consistent with UniADet / AnomalyVFM treatment). |
| GCAD (`bergmann2022-mvtec-loco`; no model page), CSAD, SALAD, PSAD, LogSAD, SAM-LAD, AnomalyMoE, GLCF | "Recent works such as CSAD, SALAD, and PSAD have integrated global semantic modeling with component segmentation techniques ... However, due to the limited detection granularity of the global branch, these methods struggle with subtle structural anomalies" (§2) | none (no Atlas pages) | — | Positioning against the global-branch/segmentation family; candidate for a future logical-AD survey. |
| Dinomaly, INP-Former, UniNet (no pages) | "Current SOTA methods like Dinomaly and INP-Former excel on benchmarks focusing on structural anomalies ... However, they struggle to generalize to the logical anomalies present in the MVTec-LOCO dataset." (§4.2) | none (no pages) | — | Structural-AD baselines. |
| `attention-mechanism` | Cross-attention without residual connection between SRN and CRN (§3.2) | none (prerequisite-level) | — | Mechanism reuse. |

# Connections

- Builds on: [bergmann2022-mvtec-loco, batzner2023-efficientad, roth2022-patchcore, simeoni2025-dinov3, bergmann2019-mvtec-ad, zou2022-visa]
- Enables: []
- Refutes / supersedes: []   # claims global-branch designs (GCAD, EfficientAD, PUAD, CSAD, SALAD, PSAD) lack structural granularity; no single-page supersession

# Atlas update plan

Role: new page candidate (model), plus supplementary updates. Meets the model-page criterion: a clear novel method with several technical contributions not described on any existing page (component-level discretised-feature reconstruction toward continuous pre-trained targets; cross-attentive structural reconstruction guided by a logical branch; segmentation-map discriminator for counts), ECCV 2026, and the Atlas survey explicitly leaves logical anomalies as an open comparison axis. Code is stated to be at github.com/cnulab/LogiCo (Abstract) — pin a commit and verify the licence before authoring `implementations[]`.

## NEW: logico
Type: model
Category: anomaly-detection (logical + structural, component-level reconstruction)
Primary source: this paper
Bullets per public-page section:
- Motivation: global-local designs add a global branch that discards spatial layout, miss subtle structural defects, and yield image scores that do not match pixel maps (§1, Fig. 1b); LOCO-oriented methods trail structural SOTA on VisA and Real-IAD (§4.2).
- Architecture: DINOv3 ViT-B/16 final-layer features + text-prompted open-vocabulary segmentation (Eq. 1); component-prototype discretisation (Eq. 2-3); four map-space anomaly synthesisers; CRN autoencoder with self-attention reconstructing to pre-trained features (Eq. 4); U-Net SRN with residual-free cross-attention to CRN (Eq. 5); U-Net SMD on segmentation maps with focal loss (Eq. 6); loss sum (Eq. 7); max-of-z-normalised-maps fusion (Eq. 8).
- Implementations: official repo stated in the abstract (`cnulab/LogiCo`); verify commit and licence.
- Assessment: MVTec-LOCO 96.3 I-AUC / 72.9 sPRO (Table 1) vs EfficientAD 90.7 average I-AUC (Table 2, original paper), SALAD 93.2 / 63.3, CSAD 92.9 / 70.6; MVTec-AD I-AUC 99.6, P-AP 70.2, PRO 95.0 (comparable to Dinomaly); ablations Tables 4-7 and S1-S2 (SMD: breakfast-box count anomalies 90.08 -> 99.46 I-AUC, Table S2). Limitations: category-specific prompts and segmentation quality; SMD hurts localisation; not the fastest (17.4 FPS on an RTX 5090).
- Relations: none recorded here — see # Stated relations; await confirmation.

## UPDATE: visual-anomaly-detection
Section: Definition (structural vs logical) and Where it appears
- Add that, beyond global-local two-branch designs (GCAD, EfficientAD, PUAD-style pooled heads), 2025-2026 logical-AD methods use explicit component segmentation (CSAD, SALAD, PSAD; LogiCo with open-vocabulary DINOv3 segmentation) (LogiCo §1, §2).
- Add the evaluation convention: MVTec-LOCO scores are reported separately for logical and structural subsets and averaged; I-AUC and sPRO (LogiCo §4.1). Note that LogiCo reproduces most baselines on its own protocol, so cross-paper numbers are not interchangeable.
- Add a one-line example of cross-structural/logical trade-off: methods strong on logical anomalies (CSAD, SALAD, AnomalyMoE) lag on VisA / Real-IAD, while structural SOTA (Dinomaly, INP-Former) is weak on MVTec-LOCO (LogiCo §4.2, Table 1).

## UPDATE: efficientad
Section: Remarks / Assessment (later comparisons)
- Add a bullet that a 2026 component-level reconstruction method reports EfficientAD (original-paper numbers) at 86.8 logical / 94.7 structural / 90.7 average I-AUC on MVTec-LOCO versus 96.5 / 96.0 / 96.3 for LogiCo (LogiCo Table 2), while LogiCo needs an open-vocabulary segmenter and runs at 17.4 FPS on an RTX 5090 versus EfficientAD's millisecond-level latency; the two are therefore not a like-for-like speed/accuracy comparison.
- No `Relations:` entry recorded here (proposal only).

## UPDATE: dinov3
Section: Remarks / Applications
- Add a downstream-use bullet: LogiCo uses DINOv3 both as the feature extractor (final layer, ViT-B/16, 512x512) and, through its text-aligned embedding space, for open-vocabulary component segmentation; the authors credit Gram Anchoring for the final-layer features outperforming multi-layer averages (LogiCo §3.1, §4.3, Table 7).

# Provenance

- Setting, benchmarks, metrics, implementation: §1; §4.1 (datasets, 512x512, DINOv3 ViT-B/16, final layer, 20% hold-out, texture handling, metrics, baselines list); Supp. A (reproduction protocols).
- Method: §3 (overview), §3.1 (Eq. 1-4, synthesis strategies, Fig. 3), §3.2 (Eq. 5, SRN, "identical shortcut"), §3.3 (SMD, Eq. 6), §3.4 (Eq. 7-8, fusion).
- Contributions: Abstract; §1 (three bullets).
- Related work positioning: §1; §2 ("Structural Anomaly Detection", "Logical Anomaly Detection").
- Results: Table 1 (MVTec-LOCO I-AUC / sPRO: PatchCore 75.6 / 34.4, UniNet 83.0 / 65.5, INP-Former 79.3 / 63.0, Dinomaly 83.4 / 64.8, GLCF 78.1 / 63.7, AnomalyMoE 88.2 / 63.6, CSAD 92.9 / 70.6, SALAD 93.2 / 63.3, LogiCo 96.3 / 72.9; MVTec-AD LogiCo I-AUC 99.6, P-AUC 98.7, P-AP 70.2, PRO 95.0; VisA and Real-IAD columns are partly truncated in the extracted text `?`). Table 2 (logical / structural / average I-AUC and sPRO; EfficientAD 86.8 / 94.7 / 90.7; LogiCo 96.5 / 96.0 / 96.3; PSAD 97.7 / 91.3 / 94.5; LogiCo+ 97.1 / 96.2 / 96.7). Table 3 (efficiency; column assignment of training hours vs images/s inferred from the 17.4 FPS statement in §4.2 `?`). Table 4 (component ablation), Table 5 (synthesis), Table 6 (backbone / image size), Table 7 (layers), Tables S1-S2 (reconstruction target; SMD on count/misplacement anomalies).
- Qualitative: Figs. 4-6; Fig. S1 (segmentation noise).
- Uncertain `?`: validation statistics for MVTec-LOCO; text-prompt wording per category; DINOv3 "text encoder" details (a DINOv3 text-alignment variant, per §3.1; the paper does not name it); licence/availability of code.
