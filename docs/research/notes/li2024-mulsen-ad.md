---
paper_id: li2024-mulsen-ad
title: "Multi-Sensor Object Anomaly Detection: Unifying Appearance, Geometry, and Internal Properties"
authors: ["W. Li", "B. Zheng", "X. Xu", "J. Gan", "F. Lu", "X. Li", "N. Ni", "Z. Tian", "X. Huang", "S. Gao", "Y. Wu"]
year: 2024
url: https://arxiv.org/pdf/2412.14592
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, patchcore, dino]
---

# Setting

**Task**: unsupervised object-level anomaly detection (and localisation) from *three synchronised sensors* per object: an RGB camera, lock-in infrared thermography, and a hand-held laser scanner producing a 3D point cloud. The paper contributes a dataset (MulSen-AD), a benchmark (MulSen-AD Bench) and a baseline (MulSen-TripleAD) (Abstract; §1).

**Dataset**: 15 industrial products (metal, plastic, fibre, rubber, semiconductor, composites), 14 manually introduced anomaly types (cracks, holes, breaks, creases, scratches, foreign bodies, labelling errors, bends, colour defects, detachments) (§3.2). 2035 samples: 1391 normal training samples, 150 normal and 494 abnormal test samples (Table 3: Train total 1391, Test normal 150, Test abnormal 494, Total 2035). On average 33 abnormal test samples and 4.8 defect types per category (§3.5; Table 3).

**Sensors** (Table 2; §3.1, §3.3): RGB Daheng MER2-230-168U3C, 1920x1200 max resolution, 8 bit, on a UR5 robot arm with two line light sources (the RGB images are described as 1280x960, §3.3 ? inconsistent with Table 2's device maximum); infrared Noverlteq TWILIS-180 (spelling as printed) lock-in system with a FLIR A600 camera, 640x480, +-2 deg C, 16 bit, 7.5-14 um, periodic thermal stimulation for 30-180 s depending on material and thickness; point cloud Creaform MetraSCAN 750 with C-Track, 0.05 mm resolution, 0.03 mm accuracy, 275x250 mm scanning area, 20k-100k points per object. Ultrasonic sensing was excluded because of signal-interpretation complexity (§3.1).

**Annotation**: pixel masks for RGB and IR (LabelMe); selected anomalous points for point clouds (Geomagic Design X). A modality is annotated only if the anomaly is visible in it (§3.4).

**Baseline problem definition**: training set $T=\{t_i\}_{i=1}^N$ of anomaly-free objects, each with three modalities; at test time $I_{rgb}$, $I_{ir}$, $P$; the object is anomalous if at least one modality-specific label is positive (§4.1). The paper calls this a "zero-shot setting where no labeled anomalies are seen during training" (§4.1) - terminology that is really one-class (normal training data is used), marked ?.

# Core idea

MulSen-TripleAD is a *decision-level fusion of three PatchCore-style memory banks* (§4.2). Features: DINO-pretrained ViT-B/8 for RGB and IR (images resized to 224x224 giving 784 patch features per image) and PointMAE (pretrained on ShapeNet; layers 3, 7, 11) for point clouds (Supplementary §9). One memory bank per sensor ($\mathcal{M}_{rgb}$, $\mathcal{M}_{ir}$, $\mathcal{M}_{pc}$) is built from normal training features following PatchCore (§4.2). Each sensor's score uses PatchCore's rule (Eqs. 2-3): $\phi(\mathcal{M},f)=\|f^{*}-m^{*}\|_2$ with $f^{*},m^{*}=\arg\max_{f^{(i,j)}\in f}\arg\min_{m\in\mathcal{M}}\|f^{(i,j)}-m\|_2$. The three scores are combined by a *decision gating unit* $G_a$ "inspired by the learnable One-Class SVM from M3DM" (Eq. 1): $S=G_a\big(\phi(\mathcal{M}_{rgb},f_{rgb}),\phi(\mathcal{M}_{pc},f_{pc}),\phi(\mathcal{M}_{ir},f_{ir})\big)$ (§4.2, §5.1: gating "adopts the M3DM configuration"). Training of the gate: AdamW, learning rate 0.001, 200 epochs, one Tesla V100 (Supplementary §9).

The dataset is designed so that anomalies are visible to different sensor subsets: of all anomalies, 9.4% are visible only in RGB, 9.2% only in IR, 4.3% only in point cloud, and 43.7% in all three (Fig. 4, §3.5). Collection pipeline: IR first (to locate the object), RGB with positions adjusted from IR, point clouds by a dual-scan strategy (flip and rescan), coarse manual alignment then ICP refinement repeated until aligned (§3.3).

# Claimed contributions

- C1: "MulSen-AD framework. We introduce the MulSen-AD framework, a novel multi-sensor approach for industrial object anomaly detection that integrates high-resolution RGB imaging, high-precision laser scanning, and lock-in infrared thermography". (§1, first bullet)
- C2: "MulSen-AD dataset. We present MulSen-AD, the first real-world dataset specifically designed for evaluating multi-sensor anomaly detection in industrial settings ... 15 distinct industrial products with real-world defects." (§1, second bullet)
- C3: "Benchmark and toolkit. We establish a comprehensive benchmark ... and provide an open-source toolkit". (§1, third bullet)
- C4: "MulSen-TripleAD model ... a decision-level fusion gating method for unsupervised multi-sensor anomaly detection ... achieving 96.1% AUROC in object-level anomaly detection accuracy". (§1, fourth bullet; Abstract)

# Assumptions

1. All three sensors are available at inspection time and objects are placed so that RGB, IR and point cloud views correspond (hard for the fusion method; the gate sees only object-level scores, so no pixel-level co-registration is needed for detection) (§4).
2. Normal training samples cover all legitimate variation; the memory-bank scoring inherits PatchCore's assumption (soft).
3. Thermal contrast arises from different heat absorption of the defect versus the object under periodic stimulation (hard for IR usefulness; "If the heat absorption of anomalies is different from the objects, the temperature difference is presented in the images", §3.1).
4. Point clouds are complete: the dual-scan plus ICP step is manual-coarse then refined (hard; labour-intensive, §3.3).
5. Anomalies are manually introduced to replicate industrial conditions (§3.2) - the defect distribution may not match production defects (soft; stated as design, not as a limitation by the authors).

# Failure regime

- Single sensors fail on defects they cannot see: RGB 91.1% AUROC (weak on subsurface defects), IR 90.9% (weak where geometric accuracy matters), point cloud only 66.8%, with 'Cube' at 42.3% and 'Solar panel' at 40.0% (§5.3, Table 5).
- Dual fusion still leaves gaps: RGB+IR 94.8%, PC+RGB and PC+IR 91.9% (§5.3).
- Localisation: point-cloud localisation is poor - pixel-F1-max 0.111 and pixel-AUPR 0.062 for point cloud; pixel-AUROC RGB 0.982, IR 0.970, point cloud 0.632 (§5.4, Table 6).
- Decision-level fusion "may miss important cross-modal interactions"; no X-ray modality; scalability and real-time performance are open (§6 Limitation and future work).

# Numerical sensitivity

- Feature resolution: 224x224 inputs through a ViT-B/8 give 28x28 = 784 patches (Supplementary §9); small anomalies below ~8x8 pixels of the resized image are sub-patch.
- Point-cloud density: 20k-100k points per object at 0.05 mm resolution (§3.1); PointMAE features from layers 3, 7, 11 (Supplementary §9).
- Fusion gating is learned (OCSVM-style, M3DM configuration); sensitivity to its hyper-parameters is not reported ?.
- Pixel-level scoring metrics: pixel AUROC, pixel-F1-max, pixel-AUPR (§5.1); object-level AUROC for detection (§5.1).
- Data statistics noted: abnormal pixel ratio averages 0.372% (RGB), 0.451% (IR) and 4.98% (point cloud points) (Table 3 means, column assignment partly garbled in extraction ?).

# Applicability

- Use when: inspecting parts with both surface and subsurface/geometric defects where RGB alone is insufficient, and when an IR lock-in rig and 3D scanner are available; as a benchmark for multi-sensor AD.
- Don't use when: only an RGB camera is available (use the single-sensor methods in the survey); real-time throughput is needed (data acquisition includes 30-180 s thermal stimulation, §3.3, and a manual flip-and-rescan scan stage).
- Compared against: single-modality baselines grouped as RGB-based (CFA, CFLOW-AD, DeSTSeg, DRAEM, InvAD, PatchCore, RD++, SimpleNet), IR-based (the same RGB methods applied to IR), and point-cloud-based (BTF FPFH/raw, M3DM PointMAE/PointBERT, PatchCore FPFH/FPFH+raw/PointMAE, Reg3D-AD) (Table 4).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| `patchcore` (roth2022-patchcore) | "Inspired by PatchCore [26] and M3DM [34], we propose MulSen-TripleAD" (§4.2); "memory banks ... following the approach in PatchCore" (§4.2) | none (no target page; method is a dataset baseline) | - | Genuine build-on (PatchCore memory bank and Eqs. 2-3 are reused per modality), but the baseline is not a page candidate, so there is no edge target. Record it as a Remarks fact on `patchcore` if useful. |
| M3DM (Wang et al. 2023) - not registered | "decision gating unit ... inspired by the learnable One-Class Support Vector Machine (OCSVM) from M3DM [34]" (§4.2) | none | - | No page, not registered. |
| `dino` / caron2021-dino (registered) | "We utilize two pretrained feature extractors - DINO [39] for RGB and infrared images" (§4.2) | none (feature-extractor use, data-flow) | - | Citation [39] in the reference list is Zhang et al., "DINO: DETR with improved denoising anchor boxes", not Caron et al. self-supervised DINO; the Supplementary says the extractor is "ViT-B/8 ... pretrained on ImageNet with DINO", i.e. the self-supervised model. Mis-citation in the paper; do not link from the cited reference. |
| MVTec3D-AD, Eyecandies, Real3D-AD, Anomaly-ShapeNet, MAD, Real-IAD, PVEL-AD, GDXray - not registered | "existing object AD datasets just rely on one single kind of sensor" (§2) | none | - | Dataset positioning (Table 1); relation vocabulary does not cover datasets and none have pages. |
| `bergmann2019-mvtec-ad`, `zou2022-visa`, `bergmann2022-mvtec-loco` | "MVTec-AD, BTAD, MPDD, and VisA is a series of single view photo-realistic industrial anomaly detection datasets"; "LOCO AD dataset [4] provides rich global structural and logical information" (§2) | none | - | Same. |

# Connections

- Builds on: [roth2022-patchcore, caron2021-dino (via implementation text, not the cited ref), bergmann2019-mvtec-ad, zou2022-visa, bergmann2022-mvtec-loco], plus unregistered M3DM, PointMAE, MVTec3D-AD, Real3D-AD.
- Enables: multi-sensor and multi-modal AD research; the authors flag feature-level fusion and few-/zero-shot settings as future work (§6).
- Refutes / supersedes: none claimed.

# Atlas update plan

Role: supplementary update. Not an algorithm/model page: the dataset is not a method, and the baseline is a recombination of PatchCore scoring and M3DM gating whose substantive pieces are not original to this paper. Concept-page criterion for "multi-modal anomaly detection" is not met (needs >=3 synthesised sources).

## UPDATE: visual-anomaly-detection
Section: Definition (scope) and Where it appears
- Add a scope sentence noting modalities beyond RGB: the survey's methods are RGB image-based; MulSen-AD reports that single sensors miss anomaly classes (RGB 91.1%, IR 90.9%, point cloud 66.8% object-level AUROC; best single sensor still below the 3-sensor fusion at 96.1%) (§5.3).
- Add one sentence under "Where it appears" or the PatchCore bullet: PatchCore's memory-bank scoring has been reused unchanged per modality (Eqs. 2-3) with a learned gate in a multi-sensor baseline, one of the few places the design is carried beyond RGB.
- Reference: W. Li et al., Multi-Sensor Object Anomaly Detection, arXiv:2412.14592, with the dataset's 15 products / 2035 samples as a pointer.

## UPDATE: patchcore
Section: Remarks (optional, low priority)
- One bullet: the memory-bank scoring rule transfers to infrared images and point-cloud features in MulSen-TripleAD, with a per-sensor memory bank and an OCSVM-style gate; single-sensor PatchCore variants appear as baselines in Table 4. Keep it about the algorithm's reusability, not about the dataset's numbers.

# Provenance

1. Sensors, devices, resolutions, accuracy, wavelength range, scan area - Table 2; §3.1 (sensor descriptions).
2. Object preparation (15 objects, 14 anomaly types) - §3.2.
3. Data collection (IR thermal stimulation 30-180 s, RGB top view, dual-scan plus ICP) - §3.3.
4. Annotation protocol (modality-specific) - §3.4.
5. Dataset statistics - Table 3 (Train total 1391, Test normal 150, Test abnormal 494, Total 2035; mean 33 abnormal / 4.8 types); text §3.5.
6. Venn percentages 9.4 / 9.2 / 4.3 / 43.7 - §3.5, Fig. 4.
7. Problem definition ("zero-shot" wording) - §4.1.
8. Method and Eqs. (1)-(3) - §4.2; feature extractors and training details (ViT-B/8 DINO, 224x224, 784 patches, PointMAE layers 3/7/11, AdamW lr 0.001, 200 epochs, Tesla V100) - Supplementary §9.
9. Benchmark setup and metrics - §5.1; Table 4 (object-level AUROC; mean 0.961 for MulSen-TripleAD, §5.2).
10. Single / dual / triple results (91.1, 90.9, 66.8, 94.8, 91.9, 96.1) - §5.3, Table 5.
11. Localisation results (0.982, 0.970, 0.632 pixel AUROC; F1-max 0.371 RGB, 0.377 IR, 0.111 PC; AUPR 0.062 PC) - §5.4, Table 6.
12. Limitations and future work - §6.
13. Related-work positioning - §2; reference [39] (Zhang et al., DINO-DETR) versus implementation text - reference list vs Supplementary §9.
14. Table 3 mean abnormal ratios (0.372, 0.451, 4.98) - Table 3 "Mean" row; column assignment ? (extraction garbled).
