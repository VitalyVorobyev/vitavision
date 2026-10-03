---
paper_id: sugawara2024-puad
title: "PUAD: Frustratingly Simple Method for Robust Anomaly Detection"
authors: ["S. Sugawara", "R. Imamura"]
year: 2024
url: https://arxiv.org/pdf/2402.15143
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, efficientad, uninformed-students, patchcore]
---

# Setting

Image-level and (via EfficientAD) pixel-level anomaly detection on MVTec LOCO AD, which contains structural and logical anomalies, under normal-only training and with a strong constraint on inference time (Abstract; §1). Input: an RGB image; output: a scalar image-level anomaly score (the evaluation metric is image-level AUROC, §4). The target gap: EfficientAD, the previous state of the art on MVTec LOCO, "completely fails to output the anomalous location on the anomaly map" for some logical anomalies (§1).

# Core idea

Split anomalies into two classes by whether an anomaly map can display them. **Picturable** anomalies have a locatable position on an anomaly map; **unpicturable** anomalies (e.g. a missing screw in a bag, a wrong count of oranges in a breakfast box) do not have a unique location, so the ground truth marks all candidate regions (§1, §3.1, Figs. 1-2). All structural anomalies in MVTec LOCO are picturable; logical anomalies include both (§1). Map-based (reconstruction/student-teacher) scoring is expected to fail on unpicturable anomalies, so PUAD pairs EfficientAD with a feature-space out-of-distribution score computed on spatially aggregated features (Abstract; §1; Fig. 3).

Mechanism (§3). Picturable score: EfficientAD unchanged (teacher, student, autoencoder; the student's output has twice the channels and is split into a former half, trained to match the teacher, and a latter half, trained to match the autoencoder); local map = difference of channel-averaged teacher and student-former-half; global map = difference of student-latter-half and autoencoder; merged by EfficientAD's rule; picturable score = max of the merged map (§3.2). Unpicturable score: global-average-pool a network output $\mathbf{y}\in\mathbb{R}^{H_{out}\times W_{out}\times C_{out}}$ to a vector, $\mathbf{y}'_c=\frac{1}{H_{out}W_{out}}\sum_h\sum_w\mathbf{y}_{c,h,w}$ (Eq. 1), fit a mean $\boldsymbol\mu$ and covariance $\boldsymbol\Sigma$ over training images, and score by Mahalanobis distance $M(\mathbf{y}')=\sqrt{(\mathbf{y}'-\boldsymbol\mu)^\top\boldsymbol\Sigma^{-1}(\mathbf{y}'-\boldsymbol\mu)}$ (Eq. 2), following GaussianAD / Hotelling's $T^2$ (§3.3). The autoencoder output and the student's latter half are deliberately not used because they lose logical information (Fig. 4, §3.3); the teacher output or the student's former half are used instead. Final score: both scores z-normalised separately with mean and standard deviation estimated on the validation subset, $x_z=(x-\mu)/\sigma$, then summed (§3.4).

# Claimed contributions

- C1: "We analyzed the types of anomalies that existing state-of-the-art anomaly detection methods cannot detect and proposed to classify anomalies into picturable anomalies, which are easy to detect by existing methods, and unpicturable anomalies, which are difficult to detect." (§1, first bullet)
- C2: "We proposed a new method that ensembles a feature-based method for unpicturable anomalies and a reconstruction-based method for picturable anomalies." (§1, second bullet)
- C3: "We succeeded in improving the state-of-the-art for the MVTec LOCO dataset with rapid inference time." (§1, third bullet); "performance 4.1 points higher than the baseline method, our implementation of EfficientAD" and "only about 0.12 ms, or roughly 5%, slower than EfficientAD" (§1, §4, §5).
- C4: The idea generalises: "applicable to reconstruction-based methods other than EfficientAD", and the feature-based component "can be replaced with a more accurate one" (§1, §3.2) — asserted, not tested.

# Assumptions

1. **(Hard)** Logical anomalies that map-based scoring misses are detectable from spatially pooled features of the teacher or student network; the pooled vector must carry count/composition information (§3.3, Table 1).
2. **(Hard)** The pooled-feature distribution of normal images is Gaussian enough for a single Mahalanobis distance (§3.3); no test of this is reported `?`.
3. **(Hard)** Validation subset is anomaly-free and large enough to estimate means and standard deviations of both scores for normalisation (§3.4).
4. **(Soft)** The two score ranges are comparable after z-normalisation and equal-weight addition (§3.4); no weighting study.
5. **(Soft)** EfficientAD is reproduced with the original hyperparameters (§4); results are reported relative to the authors' own re-implementation.

# Failure regime

Gains concentrate where unpicturable anomalies are frequent: screw bag 69.36 -> 81.07 and breakfast box 84.64 -> 87.07 image-AUROC; other categories change little (juice bottle 97.89 -> 99.68, pushpins 96.84 -> 98.02, splicing connectors 96.33 -> 96.76) (Table 3, §4). Using the teacher output instead of the student's former half lowers logical AUROC and raises structural (S: 92.01 logical / 94.12 structural with student-former; 91.09 / 94.65 with teacher; M: 90.30 / 95.35 and 89.44 / 95.49) (Table 1). Larger EfficientAD (M) gives higher structural, lower logical AUROC (§4). The authors observe the student is trained to push outputs toward zero for non-normal inputs, which they presume "counterproductive" for Mahalanobis scoring (§4). The classification of an anomaly as picturable/unpicturable is by qualitative inspection of EfficientAD maps in a few examples (Fig. 2), with no quantitative split of the test set `?`. No pixel-level evaluation is reported for the combined score `?` (the pooled score has no spatial map).

# Numerical sensitivity

Covariance inversion of $\boldsymbol\Sigma\in\mathbb{R}^{C_{out}\times C_{out}}$ (Eq. 2) needs more training images than channels or regularisation; channel count and any shrinkage/ridge term are not stated `?`. Score fusion depends on validation-set mean/std (§3.4). Latency: 2.88 ms (EfficientAD) vs 3.00 ms (PUAD) per image, measured from network input to anomaly score; GPU and image size not stated in the extracted text `?` (Table 3). All results are single-run AUROC without variance or seeds reported `?`.

# Applicability

- Use when: an EfficientAD deployment misses count/composition-type logical anomalies and the latency budget barely allows an extra pooled-feature Gaussian (+0.12 ms).
- Don't use when: pixel-level localisation of logical anomalies is required (the unpicturable score has no map); the target has few normal training images relative to feature channels; anomaly types needing explicit part segmentation (ComAD-style) are the main issue.
- Compared against (Table 2): GCAD, ComAD, ComAD + PatchCore, SINBAD, EfficientAD (S/M) — values from original papers except PUAD and the authors' EfficientAD re-implementation.

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| `efficientad` (`batzner2023-efficientad`) | "Our proposed method extends EfficientAD by introducing a feature-based method for detecting unpicturable anomalies." (§5); "we propose a model that incorporates a simple feature-based detection method into EfficientAD" (§1); "The structure, training method, and anomaly calculation method of EfficientAD in this method follow the original paper." (§3.2) | `extended_by` (authored on `efficientad`, target = a PUAD page — none exists) | medium | PUAD keeps EfficientAD intact and adds one scoring head; alternative reading is `feeds_into` (EfficientAD as a named internal component of a different method). Chronology fine (2023 <= 2024). Not recordable without a PUAD page; otherwise record as UPDATE bullets on `efficientad`. The paper also identifies a limitation of EfficientAD (misses unpicturable anomalies), a promotional framing to confirm against the EfficientAD note. |
| `efficientad` | "EfficientAD completely fails to output the anomalous location on the anomaly map even though it is capable of detecting most of the anomaly types" (§1); Table 3 per-category gains | none (not supersession) | — | Rule A does not apply: PUAD includes EfficientAD; it neither generalises nor replaces it. |
| `uninformed-students` (`bergmann2020-uninformed-students`) | "The networks used in this method have a restricted receptive field, limiting their ability to detect global inconsistencies" (§2.2) | none | — | Descriptive related work; no relationship to PUAD's method beyond EfficientAD's lineage. |
| GCAD (`bergmann2022-mvtec-loco`; no model page) | "EfficientAD ... inherits the idea of GCAD that combining two separate CNN network modules for local anomalies and logical anomalies" (§2.2); GCAD 83.3 in Table 2 | none (no page) | — | Baseline row copied from the LOCO paper; PUAD is not derived from GCAD directly. |
| `patchcore` (`roth2022-patchcore`) | "searching for nearest neighbors using kNN during inference is very time-consuming" (§2.2); "ComAD + PatchCore 90.1" (Table 2) | none | — | Used as a comparator in an ensemble baseline; PUAD argues against naive ensembling for latency (§1). |
| GaussianAD (Rippel et al. 2021; no id / page) | "We select GaussianAD as a feature-based method to integrate with EfficientAD because it is a very fast and simple feature-based method." (§3.3) | none now (no page); would be `feeds_into` GaussianAD -> PUAD | — | Named component (Mahalanobis on pooled features), chronology 2021 <= 2024. |
| SINBAD (Cohen 2023), ComAD (Liu 2023) | SINBAD "performs well on the MVTec LOCO dataset, suggesting that GaussianAD is also applicable to logical anomaly detection" (§2.2); ComAD "specializes in logical anomalies ... not able to address ... wrong placements and separators coming off" (§1) | none (no pages) | — | Context for choosing a Gaussian feature model. |

# Connections

- Builds on: [batzner2023-efficientad, bergmann2022-mvtec-loco, bergmann2020-uninformed-students]   # GaussianAD (Rippel 2021) has no registered id
- Enables: []   # zhang2026-logico cites PUAD in its Related Work as a global-detection-branch method (§2), not as a build-on
- Refutes / supersedes: []

# Atlas update plan

Role: supplementary update of two existing pages (it is not in any page's `sources.references[]`). It does not meet the new-page criterion: an ICIP 2024 paper whose method is EfficientAD plus a pooled-feature Gaussian head; its conceptual contribution (picturable vs unpicturable anomalies) fits as a refinement of the survey's structural/logical distinction and an Assessment bullet on EfficientAD.

## UPDATE: efficientad
Section: Remarks / Assessment (follow-on and limitations)
- Add that follow-up analysis on MVTec LOCO finds EfficientAD detects most anomaly types but outputs no useful anomaly map for count/composition-type logical anomalies; the authors call these unpicturable (e.g. the missing screw in screw bag), for which the ground truth marks all possible regions (PUAD §1, §3.1, Figs. 1-2).
- Add the reported remedy and its cost: an unchanged EfficientAD-S plus a Mahalanobis score on the global-average-pooled student-former-half output raises image-level AUROC on MVTec LOCO from 89.01 (authors' re-implementation) to 93.12, at 2.88 -> 3.00 ms per image (PUAD Table 3). State clearly that the baseline is the authors' re-implementation; the original EfficientAD paper reports 90.0 (S) / 90.7 (M) (PUAD Table 2), so the gain over the published numbers is about 2.4 points.
- The weakest EfficientAD category in PUAD's re-implementation is screw bag (69.36), where the gain is largest (to 81.07; Table 3).

## UPDATE: visual-anomaly-detection
Section: Definition (structural vs logical block) and Where it appears
- Add a sentence under the structural/logical definition: logical anomalies split further into those a spatial map can localise and those it cannot ("picturable" vs "unpicturable", PUAD §1); the latter, e.g. wrong object count, are scored better by a spatially pooled feature than by any map-based residual (PUAD §3.3, Table 3).
- In the autoencoder-in-feature-space discussion: PUAD argues the autoencoder output of EfficientAD loses part identity (Fig. 4) so its output is unsuitable for a Mahalanobis score on counts; this is the paper's qualitative observation, not a measured ablation `?`.
- Add GaussianAD / Hotelling's $T^2$ Mahalanobis scoring on pooled features (Eq. 1-2) as a fourth, spatially aggregated scoring style that sits outside the survey's three families, as used by PUAD in addition to EfficientAD (PUAD §3.3).
- Keep the LOCO comparison table in PUAD (Table 2) out of the page unless its mixed provenance (original-paper numbers vs the authors' re-implementations) is spelled out per row.

# Provenance

- Setting, motivation, picturable/unpicturable definitions: Abstract; §1; §3.1; Figs. 1-2.
- Contributions: §1 (three bullets); further claims in §1 final paragraph and §5.
- EfficientAD structure, student output split, local/global maps, picturable score: §3.2. Eq. 1 (global average pooling over $H_{out}W_{out}$) and Eq. 2 (Mahalanobis distance): §3.3. Normalisation $x_z=(x-\mu)/\sigma$ and summation: §3.4 (unnumbered).
- Related work statements: §2.1 (datasets), §2.2 (feature-/segmentation-/reconstruction-based methods, GaussianAD, SINBAD, ComAD, GCAD, EfficientAD).
- Table 1: AUROC by EfficientAD size and network output (S/student-former 93.12 / 92.01 / 94.12; M/student-former 92.23 / 90.30 / 95.35; S/teacher 92.24 / 91.09 / 94.65; M/teacher 91.78 / 89.44 / 95.49; all / logical / structural). Table 2: mean MVTec LOCO AUROC (GCAD 83.3, ComAD 81.2, ComAD + PatchCore 90.1, SINBAD 86.8, EfficientAD re-implementation S 89.0 / M 88.6, EfficientAD paper S 90.0 / M 90.7, PUAD 93.1). Table 3: per-category AUROC and latency (EfficientAD 89.01 mean, 2.88 ms; PUAD 93.12 mean, 3.00 ms; breakfast box 84.64 -> 87.07, juice bottle 97.89 -> 99.68, pushpins 96.84 -> 98.02, screw bag 69.36 -> 81.07, splicing connectors 96.33 -> 96.76).
- "4.1 points" and "0.12 ms (< 5%)": §1, §4, §5; 93.12 - 89.01 = 4.11 and 3.00 - 2.88 = 0.12 ms (consistent with Table 3).
- Student-training hypothesis (norm pushed to zero, "counterproductive" for Mahalanobis): §4, stated as presumption.
- Uncertain `?`: channel count of the pooled vector; covariance regularisation; GPU/resolution for latency; whether "logical anomaly AUROC" in Table 1 uses the same split as EfficientAD's paper.
