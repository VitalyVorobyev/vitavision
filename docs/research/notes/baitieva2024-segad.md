---
paper_id: baitieva2024-segad
title: "Supervised Anomaly Detection for Complex Industrial Images"
authors: ["A. Baitieva", "D. Hurych", "V. Besnier", "O. Bernard"]
year: 2024
url: https://arxiv.org/pdf/2405.04953
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, patchcore, efficientad, sam]
---

# Setting

**Task**: image-level industrial anomaly classification (good vs defective part), using *both* good and defective training images ("supervised" AD in the paper's terminology; "one-class" methods are those trained on good images only, §2.2). The paper contributes a dataset (VAD) and a method (SegAD) that sits on top of existing pixel-level anomaly detectors.

**Inputs**: an RGB image $I\in\{0,\dots,255\}^{W\times H\times3}$ (resized to $W=H=256$ in all experiments, §5); $K$ pixel-wise anomaly detectors $f_k$ producing anomaly maps $\in\mathbb{R}^{W\times H}$; an optional supervised classifier $g$ returning a scalar score; and $L$ mutually exclusive binary *segment masks* $s_l\in\{0,1\}^{W\times H}$ (§4).

**Outputs**: a scalar score read as the probability of an anomaly (§4). Image-level labels only: no pixel-level labels of defects are needed (§1).

**Dataset VAD (Valeo Anomaly Dataset)**: one object class (a piezo element with two wires, two pins and two solder dots), 5000 images, 512x512 PNG, real production defects across "more than 20 subclasses", both structural and logical; train 1000 bad + 2000 good, test 1000 bad (165 with defect types unseen in training) + 1000 good; image-level labels only (Abstract; §1; §3).

# Core idea

SegAD turns each anomaly map into a short vector of per-segment statistics and lets a small boosted forest decide, instead of taking the map's global maximum (§1, §4). For each detector $k$ and each segment $l$ it computes four statistics over pixels where $s_l(x)=1$: the 99.5% quantile $q^L_k$, skewness $z^L_k$, kurtosis $c^L_k$ and mean $m^L_k$. The feature vector is $f=\big(g(I),[q^L_k]^K_{k=1},[z^L_k]^K_{k=1},[c^L_k]^K_{k=1},[m^L_k]^K_{k=1}\big)$ of length $K\cdot L\cdot4+1$ (§4). The final classifier is a Boosted Random Forest (BRF, Mishina et al. 2014) trained with XGBoost on these vectors (§4, §5, Appendix A.1).

Rationale stated by the authors: per-segment distribution parameters emphasise "relatively low scores in important areas while disregarding higher scores in noisy regions"; the exact position of the anomaly matters less than which segment it falls into (§1). Segments encode where false-high scores are normal (e.g. object borders).

Training uses two disjoint splits of the *good* training images: one trains the base detectors $f_k$, the other trains the BRF; the supervised classifier $g$ (Wide ResNet-50) is trained on 80% of the full training set (1600 good and 800 bad for VAD) so its data only partly overlaps with SegAD's (§4.1). For the one-class benchmark the missing bad images are replaced by synthetic disturbances applied to good images - Gaussian blur or a randomly placed thin rectangle of random grey shade, within randomly chosen segments (§5.1, Appendix A.2).

Segment maps: for VAD a *static* map with $L=7$ segments (background, outer half-circle, piezo border, solder-dot area, wire area, pin area, piezo centre), the same for every image because the object is always aligned (§5, Fig. 5). For VisA the maps come from SAM: a binary object/background mask for most classes, with static component masks added for pcb1-pcb4 (§5.4, Fig. 7).

# Claimed contributions

- C1: "We propose a supervised anomaly detection dataset with complex objects and a large variety of defects", plus three benchmarks: one-class, high-shot supervised (1000 bad training images), low-shot supervised (100 bad training images). "We share the dataset freely with the research community." (§1, first bullet; §3.1)
- C2: "We create a novel supervised anomaly detection method called SegAD ... performs noticeably better than recent anomaly detectors alone while retaining the ability to detect unknown defects." (§1, second bullet)
- C3: State-of-the-art on VAD and on a new supervised benchmark built from VisA: "+2.1% AUROC" on VAD and "+0.4% AUROC" on VisA (Abstract). (See Assumptions/uncertainty note: the +2.1 figure is not clearly traceable to a single table row.)
- C4: Needs no pixel-level labels and no extensive augmentation or long training, unlike the supervised methods of refs [33, 37], which "demand pixel-level labels for defective parts" (§1; §2.2 last sentence).
- C5: Code and models public (Abstract, footnote 1).

# Assumptions

1. A segmentation map is available for each image (hard). "Static maps can be used for objects like the product in VAD. Obtaining segmentation maps for unaligned objects can be more difficult, yet SAM or a specially trained segmentation model may be a solution" (§5.5, Limitations).
2. Defective training images exist (hard for the full method); in the one-class benchmark they are replaced by synthetic disturbances, which works for PatchCore/RD4AD/FastFlow but not EfficientAD (§5.1).
3. Anomaly maps behave similarly on training disturbances and on real defects (soft). EfficientAD+Ours is worse than EfficientAD alone on the one-class VAD benchmark because "anomaly maps produced by EfficientAD for the generated defects are too different from anomaly maps for real defects" (§5.1, Table 2).
4. Base detectors and the BRF must see different good images, which reduces the good data available to each (soft; §4.1). On VisA the split is 90%/10% for RD4AD; EfficientAD reuses its 10% validation split for SegAD (§5.4).
5. Images resized to 256x256 and processed without augmentation (§5). DRA at its native 448x448 reaches 92.8 classification AUROC on VAD (still below the top results), and the authors note higher resolution also helps some other models, so the fixed 256x256 setting is a deliberate fairness choice rather than each method's optimum (§5).

# Failure regime

- Gains shrink on simple objects: improvement on VisA (0.4 AUROC points for EfficientAD+Ours, 97.9 -> 98.3, Table 5) is much smaller than on VAD (§5.5 Limitations: "For less complex objects in VisA, improvement is lower than for VAD").
- Train/test shift in anomaly maps: acknowledged but "might be impossible to mitigate, because our task is to detect such differences" (§5.5).
- Supervised classifier alone cannot detect unseen defects: in Fig. 6 the Wide ResNet score distribution for unseen defects is shifted toward the good class, whereas SegAD's is not (§5.2).
- Low-shot regime: with 100 bad images the Wide ResNet falls to 78.7 classification AUROC (Table 4); the paper therefore drops $g$ from SegAD in this benchmark (§5.3).
- One-class benchmark remains hard even for the best base detector: EfficientAD 89.1 classification AUROC with FPR@95TPR 44.5 on VAD (Table 2).

# Numerical sensitivity

- BRF configuration, identical for all datasets (Appendix A.1): XGBoost, 10 estimators, 200 parallel trees, learning rate 0.3, objective binary:logitraw, max depth 5, colsample_bytree = colsample_bynode = subsample = 0.6, L1 regularisation 1. Ablation baselines: RF (lr 1.0, 1 estimator, 2000 trees), BT (2000 estimators, 1 tree).
- VAD results are means +- std over 5 seeds that also control the good-image split (§5). VisA supervised benchmark moves 10 randomly chosen bad test images into training, over 10 seeds (§5.4).
- Reference base-detector settings (Appendix B): PatchCore uses layers 2 and 3, coreset ratio 0.01, 9 neighbours; RD4AD layers 1-3, 200 epochs; FastFlow 200 epochs, lr 1e-3; EfficientAD medium, 70,000 iterations, 10% of train used for normalisation; all with WideResNet-50-2 features, no augmentation, no PatchCore centre crop.
- Metrics: image-level AUROC ("Cl. AUROC") and FPR at 95% TPR (§5).
- Ablation (Table 6, VAD high-shot, average over PatchCore/FastFlow/RD4AD/EfficientAD): plain detectors 87.3; features with one segment 88.6; per-segment maximum 89.4; BT 88.4; RF 89.8; full SegAD (BRF) 90.1 (Cl. AUROC). Text: BRF beats BT by 1.7 and RF by 0.3.

# Applicability

- Use when: a production line yields a few hundred labelled defective images in addition to good ones, parts are aligned or segmentable, and extra latency must stay negligible ("SegAD adds a negligible time", §4.1).
- Don't use when: no defective images can be obtained and synthetic disturbances do not mimic real anomaly maps (EfficientAD case); parts are unaligned and no reliable segmenter is available; classification must detect defect types never seen in supervised training and only the supervised classifier $g$ is relied on (§5.2).
- Compared against: PatchCore, FastFlow, RD4AD, EfficientAD (one-class); DevNet and DRA (supervised AD); Wide ResNet-50 classifier (Tables 2-5).

Headline numbers (Cl. AUROC, mean +- std): VAD one-class - EfficientAD 89.1, All AD + Ours 90.4 (Table 2); VAD high-shot - WRN 95.0, AllAD+WRN+Ours 96.5, EfficientAD+WRN+Ours ~96 with FPR@95TPR 19.4 (§5.2, Table 3); VAD low-shot - All AD + Ours 92.7 (Table 4); VisA supervised - EfficientAD 97.9, EfficientAD+Ours 98.3, All AD + Ours 98.4 (Table 5). Table 3/4 row order is partly garbled in the text extraction; row-to-method assignment for Tables 3 and 4 marked ?.

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| `patchcore` (roth2022-patchcore) | "PatchCore relies on a pretrained feature extractor ... memory bank ... coreset subsampling" (§2.2); used as base detector $f_k$ (§5) | none (data-flow, Rule C) | - | SegAD consumes PatchCore's anomaly map; it was not conceived building on PatchCore's idea. |
| `efficientad` (batzner2023-efficientad) | "EfficientAD introduces many innovations, including using an autoencoder to detect logical defects" (§2.2); base detector (§5) | none (data-flow, Rule C) | - | Same. Also records an EfficientAD-specific failure with synthetic defects (Table 2). |
| RD4AD (Deng and Li 2022), FastFlow (Yu et al. 2021) - not registered | base detectors (§2.2, §5) | none | - | No pages. |
| DevNet (Pang et al. 2021), DRA (Ding et al. 2022), Yao et al. 2023 (ref [33], semi-push-pull contrastive learning) - not registered | "some of them overfit to seen defects, and others require pixel masks for defects ... SegAD (ours) performs better than current SOTA methods, even on complex problems without pixel-level labels, extensive augmentation, and long training" (§2.2) | compared_with (medium) | medium | Supervised-AD peers; no pages or registered papers. |
| `sam` (kirillov2023-sam) | "The segmentation maps for this dataset were created with the Segment Anything Model (SAM)" (§5.4) | none (tool use, Rule C) | - | SAM supplies masks off the shelf; SegAD is not built on SAM's idea. |
| `visual-anomaly-detection` datasets: MVTec AD (`bergmann2019-mvtec-ad`), MVTec LOCO (`bergmann2022-mvtec-loco`), VisA (`zou2022-visa`) | "Existing datasets often contain simulated defects [3, 4, 38], creating a domain gap"; "VisA ... incorporating diverse objects with complex structures" (§2.1) | none | - | Dataset-versus-dataset positioning; relations vocabulary is for methods/pages and VAD has no page. |

# Connections

- Builds on: [roth2022-patchcore, batzner2023-efficientad, zou2022-visa, bergmann2019-mvtec-ad, bergmann2022-mvtec-loco, kirillov2023-sam] plus unregistered RD4AD, FastFlow, DevNet, DRA, Boosted Random Forest, XGBoost.
- Enables: supervised/semi-supervised industrial AD benchmarks on VAD and VisA (supervised protocol with 10 bad training images).
- Refutes / supersedes: none claimed.

# Atlas update plan

Role: supplementary update. The paper is not in any page's `sources`. A standalone model page is not warranted: SegAD is a small post-processing classifier (segment statistics + XGBoost) over other detectors' maps, its novelty is modest and bounded, and its comparison counterparts (DevNet, DRA) have no pages. Revisit if supervised AD accumulates >=3 noted papers.

## UPDATE: visual-anomaly-detection
Section: Definition (scope) and Where it appears
- Add a short scope note that the survey is about the one-class setting; the supervised setting (training with some defective images, 100-1000 of them) is a distinct regime, and cite this paper's finding that a supervised classifier cannot detect unseen defects while a combination with one-class anomaly maps can (Fig. 6; Tables 3-4).
- Mention VAD as a real-defect, aligned-object benchmark with both structural and logical defects and 165 unseen-defect test images; contrast with the survey's synthetic-logical-anomaly examples. State its numbers cautiously: strongest one-class base detector reaches 89.1 classification AUROC and FPR@95TPR 44.5 (EfficientAD, Table 2).
- Numerical Concerns bullet: anomaly-map behaviour under synthetic defects can differ from real defects (EfficientAD case, §5.1), a reason not to assume that one-class detectors are interchangeable inputs to downstream classifiers.
- Add to References: Baitieva, Hurych, Besnier, Bernard, Supervised Anomaly Detection for Complex Industrial Images, CVPR 2024, arXiv:2405.04953.

## UPDATE: efficientad
Section: Remarks / Assessment (optional)
- One bullet: independent third-party observation that EfficientAD's anomaly maps on synthetic defects differ strongly from those on real defects (SegAD §5.1), while its one-class VAD result (89.1) is the best of four single detectors tested (Table 2). Third-party, single dataset: label as such.

# Provenance

1. Dataset size, split, 165 unseen defect parts, 512x512, image-level labels - Abstract; §1; §3.
2. Defect typology (logical vs structural), good-part description, Figs. 2-4 - §3.
3. Benchmarks (one-class, high-shot 1000, low-shot 100 with 5 seeds) - §3.1.
4. Notation, feature vector $f$, length $K\cdot L\cdot4+1$, 99.5% quantile, skew, kurtosis, mean - §4.
5. Training procedure (two splits, 80% subset for $g$) - §4.1; setups (single detector, All AD, + supervised classifier) - §4.2.
6. Metrics, 256x256 resize, no augmentation, DRA 448x448 note, 5 seeds, 1000/1000 split of good images - §5.
7. Static 7-segment map for VAD - §5, Fig. 5; SAM maps for VisA - §5.4, Fig. 7.
8. One-class benchmark and synthetic-defect failure of EfficientAD - §5.1, Table 2; Appendix A.2, Fig. 8.
9. High-shot results and unseen-defect histograms - §5.2, Table 3, Fig. 6; low-shot - §5.3, Table 4; VisA - §5.4, Table 5.
10. Ablation numbers - §5.5, Table 6; limitations paragraph - §5.5.
11. BRF/RF/BT hyper-parameters - Appendix A.1; baseline settings - Appendix B.
12. Related-work positioning - §2.1, §2.2.
13. Possible inconsistency: Abstract "+2.1% AUROC on VAD". In the text "improvement in 2.1 Cl. AUROC" refers to the Table 6 "Max." row versus the plain-detector baseline (89.4 vs 87.3), not obviously to the Table 3 headline (96.5 vs WRN 95.0 = +1.5) ? - treat the Abstract number with care when quoting.
