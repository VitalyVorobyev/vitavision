---
paper_id: bertoldo2024-aupimo
title: "AUPIMO: Redefining Visual Anomaly Detection Benchmarks with High Speed and Low Tolerance"
authors: ["J. P. C. Bertoldo", "D. Ameln", "A. Vaidya", "S. Akçay"]
year: 2024
url: https://arxiv.org/pdf/2401.01984
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, patchcore, efficientad]
---

# Setting

**Task**: evaluation of *anomaly localisation* (pixel-level anomaly score maps) for visual anomaly detection. Not a detector: a performance measure ("metric") plus a benchmarking protocol (Abstract; §1; footnote 2 of §1 notes "metric" means "performance measure").

**Inputs**: for each test image, an anomaly score map $a\in\mathbb{R}^M_+$ (higher = more anomalous) and a ground-truth mask $y\in\{0,1\}^M$; $M$ is the pixel count (Table 1, §3). Normal and anomalous test images must be distinguishable: normal images are used for validation (threshold range), anomalous images for evaluation (recall).

**Outputs**: one score in $[0,1]$ *per anomalous image* (AUPIMO), whose cross-image average or distribution summarises a model on a dataset (§3.2, §3.3).

**Datasets/models in the paper's benchmark**: 27 datasets (MVTec AD 15 + VisA 12; 22 object and 5 texture oriented, §1) and 8 models: PaDiM, PatchCore, SimpleNet, PyramidFlow, RevDist++, U-Flow, FastFlow, EfficientAD (§4).

# Core idea

AUROC and AUPRO are computed from *set-level* curves where all pixels in all images are pooled; at pixel level the normal class is overwhelmingly dominant, so both saturate near 100% on MVTec AD and VisA (§1, Fig. 1 left). AUPIMO changes three things (§3.3):

1. **Validation on normal images only.** The x-axis of the curve is the *shared FPR* $F_{sh}(t)=\frac{1}{|Y'|}\sum_{y\in Y'}F^y_i(t)$, the mean image-level false-positive rate over normal images $Y'$ only (§3.2). Anomalous images never influence which thresholds are considered.
2. **Per-image recall.** The y-axis is the *image-scoped* TPR $T_i(t)=|(a\ge t)\wedge y|/|y|$ (Eq. 2), giving one PIMO curve per anomalous image, $\mathrm{PIMO}^y:t\mapsto(\log F_{sh}(t),T^y_i(t))$ (§3.2).
3. **Low-tolerance integration range.** AUPIMO is the normalised area under each PIMO curve with log-scaled x-axis (Eq. 6): $\mathrm{AUPIMO}^y=\int_{\log L}^{\log U}T^y_i(F^{-1}_{sh}(z))\,\frac{d\log z}{\log(U/L)}$, default $L=10^{-5}$, $U=10^{-4}$ — only thresholds that yield near-zero false positives on normal images count (§3.2, §3.3). Interpretation: "average segmentation recall in an anomalous image given that the model (nearly) does not yield FP regions in normal images" (§3.3, "Low tolerance").

Precursors, as the paper defines them: $\mathrm{ROC}:t\mapsto(F_s(t),T_s(t))$ and $\mathrm{PRO}:t\mapsto(F_s(t),\overline{T}_r(t))$ with the set FPR $F_s$ (Eqs. 1, 4); $\mathrm{AUROC}=\int_0^1T_s(F_s^{-1}(z))dz$ and $\mathrm{AUPRO}=\frac1U\int_0^U\overline{T}_r(F_s^{-1}(z))dz$ with default $U=30\%$ (Eq. 5, §3.1).

# Claimed contributions

- C1: "A validation-evaluation framework based on strict low tolerance for FPs on normal images only, which avoids conditioning the model behavior on known anomalies, thus providing a recall measure consistent with AD's unsupervised nature (Sec. 3.3)". (§1, contribution 1)
- C2: "Per-image recall scoring, enabling the analysis of cross-image performance variance and high-speed execution at high resolution both on CPU and GPU (Sec. 5)". (§1, contribution 2)
- C3: "Empirical evidence suggesting that MVTec AD and VisA datasets have not been near-solved and that problem-specific model choice is advisable (Sec. 5)". (§1, contribution 3)
- C4 (from §4): a proposed evaluation standard to fix cross-paper comparison - full-resolution evaluation with bilinear resizing of score maps, no input cropping, publish per-image scores, ideally report the score distribution. (§4, last paragraph)

# Assumptions

1. Test normal images come from the same distribution as the training set ("can be reasonably assumed from the same distribution as the training set", §3.3) (soft; if normal test images are few, $F_{sh}$ at $10^{-5}$ is poorly resolved - not discussed in the paper ?).
2. The integration bounds match anomaly sizes: defaults suit MVTec AD (relative anomaly sizes mostly $10^{-3}$-$10^{-1}$) and VisA, but AUPIMO scores are "(near) FP-free recall" only because almost no MVTec AD anomaly is as small as $10^{-5}$ of the image (Appendix B). Bounds "can be adapted to application-specific needs" (§3.3) (hard: wrong bounds change what the metric measures).
3. Pixel-level ground truth exists for anomalous images (hard); annotation noise is tolerated better than by AUPRO but not eliminated (§5, Fig. 5b).
4. Image-level FPR is a usable proxy for the number of false-positive regions: inside the default range the mean number of FP regions "tends to 1" (Appendix A.1, Fig. 6) (soft; empirical, pooled over all models and datasets).
5. 2D images. Extensions to 3D, point clouds and video are asserted possible (a UCSD video proof of concept is in Appendix C.3); time-series "would require more careful adaptation" (Limitations in §6).

# Failure regime

- Recall only: "the notion of segmentation quality is not covered by AUPIMO" (§6, Limitations); Appendix C.4 sketches an IoU-based variant on the same validation principle.
- Tiny anomalies below the lower bound: VisA contains regions down to $\sim10^{-6}$ relative size (a single pixel at 1000x1000), which are "meaningless" and often next to real defects (Appendix B, Fig. 9). Such regions sit below the integration range and are barely rewarded; AUPRO weights each such region equally with real ones, which AUPIMO's per-image averaging avoids (§5, "Robustness").
- Rank instability: AUPRO$_{5\%}$ and AUPIMO give different rankings, which the authors attribute to different weighting of small anomalies (§5, MVTec AD / Zipper discussion).
- Per-image score distributions are often left-skewed with images at 0% and 100% AUPIMO for the same model (§5, Fig. 3c), so the cross-image mean alone hides failures.
- Implementation sensitivity of AUPRO itself: CPU (OpenCV) and GPU (kornia) connected-component implementations produce slightly different AUPRO values, and kornia's iterative component labelling "may not converge in some cases" (§3.3 "Image-specific scores"; Appendix A.1). One reported discrepancy: PyramidFlow's code does not apply the 30% FPR cap, so its published AUPRO is inflated relative to the standard definition (footnote 6, §5).

# Numerical sensitivity

- The integration range spans one decade, $[10^{-5},10^{-4}]$ of FPR on log scale; the normalisation $1/\log(U/L)$ maps the score to $[0,1]$ (Eq. 6). Thresholds are chosen on the pooled normal-image score distribution; resolution at $10^{-5}$ FPR requires on the order of $10^5$ normal pixels (e.g. one 256x256 image has 65,536 pixels) ? (the paper states the FPR bounds but not a minimum pixel count; derived).
- Resolution: score maps should be evaluated at the annotation's full resolution using bilinear interpolation (§4 guideline 1). The paper's own models were trained on 256x256 inputs (bilinear downsample, no centre crop; §4). Appendix B defines "tiny" regions as relative size below $1/256^2$, i.e. a single pixel at 256x256 (the grey vertical line in Fig. 8). Derived, not stated: one pixel at 256x256 is $\approx1.5\times10^{-5}$ of the image, inside the default FPR range, so a one-pixel false positive is already at the scale AUPIMO tolerates ?.
- Cost: implementation uses numba; execution time on MVTec AD / Screw (1024x1024) is comparable to AUROC and far below AUPRO because it avoids connected-component analysis (§5, Fig. 5a; RTX 3090, Core i9-10980XE).
- Two AUPRO variants appear in the benchmark: $U=30\%$ (the standard) and $U=5\%$ (noted AUPRO$_{5\%}$), the latter added by the authors for a harder comparator (§3.1 footnote 3, §4).

# Applicability

- Use when: comparing localisation quality of anomaly detectors where false alarms on normal images are costly; diagnosing per-image failures; statistical testing between model variants (Appendix C.1 uses a Wilcoxon signed-rank test on per-image scores, e.g. EfficientAD ablation on MVTec AD / Capsule).
- Don't use when: the quantity of interest is segmentation overlap quality (IoU/Dice) rather than recall; there are too few normal test images to resolve $10^{-5}$ FPR; anomalies are expected to be smaller than ~$10^{-4}$ of the image (default bounds would ignore them) ?.
- Compared against: AUROC, AUPRO (30% and 5%), AUPR, F1-max, IAP (§2, §3.3).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| MVTec AD IJCV 2021 extension (Bergmann et al., ref [5]) - not registered; and `bergmann2019-mvtec-ad` | "AUROC [10] and AUPRO [5] ... have been used to evaluate anomaly localization, but ... the extreme class imbalance at pixel level inflates the scores" (§1); "Bergmann et al. [4] proposed a ROC-inspired curve called Per-Region Overlap (PRO) ... Notably, AUPRO excludes thresholds yielding FPR values above 30%" (§2) | none (metric vs. dataset paper; no vocabulary type fits) | - | Evidence for the survey page's attribution note: AUPIMO credits PRO to the 2019 CVPR paper [4] and the AUPRO/30% cap to the 2021 IJCV extension [5] (§2, §3.1). That IJCV paper is not registered; ingesting it would let the survey cite the definition directly. |
| Rafiei et al. 2023 (arXiv:2310.16435) - not registered | "Rafiei et al. [19] ... concluded that the area under the Precision-Recall (PR) curve is a more suitable metric for AD as it is conditioned on the positive class" (§2) | none (no page, no registered paper) | - | Peer metric critique; candidate for a future metrics concept page if >=3 sources exist. |
| DeSTSeg / IAP (Zhang et al. 2023) - not registered | "Zhang et al. [27] proposed the Instance Average Precision (IAP) ... This alternative recall metric is further used as a validation requirement" (§2) | none | - | Same. |
| `patchcore`, `efficientad` (benchmarked models) | "despite PatchCore's high performance in many problems, it performs poorly on VisA / Macaroni 2 ... Meanwhile, EfficientAD has a reasonable performance on this dataset" (§5) | none (benchmark data, not a relation between methods) | - | Useful as a Remarks fact (problem-specific model choice), not as an edge. |

# Connections

- Builds on: [bergmann2019-mvtec-ad (PRO), zou2022-visa, batzner2023-efficientad, roth2022-patchcore] as benchmark datasets/models; the metric lineage cites unregistered Bergmann 2021 (IJCV), Rafiei 2023, Zhang 2023 (DeSTSeg).
- Enables: per-image analysis of anomaly localisation; integrated into the anomalib library (footnote 1, §1).
- Refutes / supersedes: argues AUROC and AUPRO are no longer discriminative on MVTec AD / VisA and that these datasets are "not near-solved" (Abstract); it does not claim to supersede AUPRO for all uses ("high AUPRO ... does not always reflect qualitative performance", Abstract).

# Atlas update plan

Role: supplementary update of an existing page that does not yet cite this paper. No new page: a single metric paper is not a concept page (the concept criterion needs >=3 distinct sources and >=500 words of standalone content), and it is not an algorithm.

## UPDATE: visual-anomaly-detection
Section: Mathematical Description > Evaluation metrics (and Numerical Concerns, References)
- Add an AUPIMO paragraph after the sPRO/AU-PRO discussion: pooled pixel-level AUROC/AUPRO saturate near 100% on MVTec AD and VisA (§1, Fig. 1); AUPIMO instead takes a per-anomalous-image recall (Eq. 2) integrated over the shared FPR measured on *normal images only* (log scale, $[10^{-5},10^{-4}]$ default, Eq. 6), reporting one score per image.
- Fold in the attribution evidence the page notes already flag as missing: this paper cites the AUPRO definition and its 30% FPR cap to the IJCV 2021 MVTec AD extension (ref [5]) and PRO to the 2019 CVPR paper (§2, §3.1). Check against the page's existing statement that "the AU-PRO definition lives in the 2021 IJCV MVTec AD extension" - consistent.
- Add a caveat to any "typical accuracy" claims: this paper shows models near 100% AUROC/AUPRO can still have low per-image recall at near-zero FPR, so the survey's accuracy figures are saturated indicators (§1, §5). Review the decision table's "Typical accuracy" column for wording.
- Add a Numerical Concerns bullet: AUPRO values depend on the connected-component implementation (CPU vs GPU differences, §3.3) and on whether the 30% FPR cap is applied (PyramidFlow footnote, §5); evaluation-protocol guidelines (full-resolution scoring, no crop, publish per-image scores, §4).
- Add to References: Bertoldo, Ameln, Vaidya, Akçay, AUPIMO, BMVC 2024, arXiv:2401.01984; register in `sources.references`.

# Provenance

1. Problem and contributions - Abstract; §1 (numbered contribution list).
2. Notation (M, a, y, r, t, L, U, A/Y/R) - Table 1, §3.
3. Set-, image- and region-scoped FPR/TPR - Eqs. (1)-(3), §3.
4. ROC and PRO curves; AUROC and AUPRO integrals; default $U=30\%$ - Eqs. (4)-(5), §3.1; AUPRO$_{5\%}$ - footnote 3.
5. Shared FPR over normal images, PIMO, AUPIMO and default $L=10^{-5}$, $U=10^{-4}$ - §3.2, Eq. (6); Fig. 3.
6. Bias-free validation, anomaly-dependent metrics, low tolerance, image-scoped metrics, image-specific scores - §3.3.
7. Benchmark: 27 datasets, 8 models, 256x256 training, hyper-parameters from original papers, guidelines (1)-(4) - §4.
8. Results: Zipper example, cross-dataset analysis, PatchCore on VisA Macaroni 2, execution time (1024x1024; RTX 3090 / i9-10980XE), robustness experiment - §5, Figs. 3c, 4, 5.
9. Limitations (2D focus, recall-only) - §6.
10. FPR vs number of FP regions (proxy, "tends to 1") - Appendix A.1, Fig. 6; visual FP-level intuition - Appendix A.2.
11. Anomaly size distributions, tiny regions in VisA - Appendix B, Figs. 8-9.
12. Wilcoxon signed-rank ablation on EfficientAD - Appendix C.1, Table 3; video proof of concept - Appendix C.3; IoU variant - Appendix C.4.
13. Related-work positioning (AUROC, PRO, AUPR, F1-max, IAP) - §2; reference list entries [4], [5], [19], [27].
