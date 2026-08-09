---
title: "PatchCore"
date: 2026-08-06
summary: "Training-free industrial anomaly detection: a single forward pass over defect-free images builds a coreset-subsampled memory bank of locally aware mid-level CNN patch features, and test images are scored by reweighted nearest-neighbour distance in that feature space."
tags: ["deep-learning", "local-descriptors", "dense-prediction"]
domain: anomaly-detection
tasks: [anomaly-detection, anomaly-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "No trained parameters — frozen ImageNet-pretrained WideResNet-50; memory-bank size scales with the coreset percentage of the training set."
prerequisites:
  - visual-anomaly-detection
  - convolutional-neural-network
relations:
  - type: compared_with
    target: efficientad
    confidence: high
    caution: "Peer choice, not supersession — EfficientAD leads on accuracy and latency, but PatchCore requires no per-scenario training."
sources:
  primary: roth2022-patchcore
  references:
    - bergmann2019-mvtec-ad
    - bergmann2020-uninformed-students
    - batzner2023-efficientad
  notes: |
    This page hosts the `## When to choose PatchCore over EfficientAD`
    comparison; the older paper hosts, per docs/README.md §4. The
    efficientad page carries only a back-pointer to the anchor
    #when-to-choose-patchcore-over-efficientad.

    Two values the paper never assigns numerically: the reweighting
    neighbourhood size b, and the Johnson-Lindenstrauss target
    dimensionality d*. Both are stated as unspecified rather than guessed.

    The paper is internally inconsistent about one figure: §4.2 prose says
    "PaDiM" where Table 1 says "PaDiM*" (the backbone-selected variant).
    The page attributes it as the table does.

    "Nvidia Tesla V4" in Appendix A is an OCR artifact of the cached PDF
    and is not repeated as fact anywhere on the page.
implementations:
  - role: official
    repo: https://github.com/amazon-science/patchcore-inspection
    commit: fcaa92f124fb1ad74a7acf56726decd4b27cbcad
    framework: pytorch
    license: Apache-2.0
  - role: community
    repo: https://github.com/open-edge-platform/anomalib
    commit: 091ca6aca92c8d0e416394f79e52f5a3cea3db73
    framework: pytorch
    license: Apache-2.0
---
# Motivation

PatchCore performs cold-start visual anomaly detection: it fits a detector using only nominal (defect-free) example images of a fixed product or scene category, with no anomalous examples and no fine-tuning on the target domain. Input: an RGB image, resized to 256×256 and center-cropped to 224×224 for the standard configuration. Output: a scalar image-level anomaly score and a same-resolution pixel-level anomaly segmentation map. The defining property is that PatchCore is training-free: the ImageNet-pretrained backbone weights are never updated, and there is no learned detection head. The only fitting step is a single forward pass over the nominal training images that populates a memory bank of patch features, followed by a deterministic, non-gradient coreset-selection step over that bank. Adding a new product category costs one forward pass over its nominal images, not a training run.

# Architecture

**Family & shape.** Non-parametric memory-bank method built on a frozen, ImageNet-pretrained CNN feature extractor — no anomaly-detection-specific network is trained end to end. Default backbone: WideResNet-50. Input: RGB image resized to 256×256, center-cropped to 224×224. Output: a scalar image-level anomaly score $s$ and a same-resolution pixel-level anomaly map, produced by bilinear upsampling of per-patch scores followed by Gaussian smoothing ($\sigma = 4$, not tuned by the authors). Patch features are aggregated from blocks 2 and 3 of the backbone's feature hierarchy.

**Blocks.** Backbone feature maps are indexed by hierarchy level $j$; for ResNet-like architectures $j \in \{1, 2, 3, 4\}$. The choice of level is a direct trade-off. The deepest level loses localized nominal information and is biased towards the ImageNet-classification task the backbone was pretrained on. A too-shallow hierarchy loses semantic abstraction; a too-deep hierarchy is over-biased toward ImageNet classification. The default is the mid-level pair $j \in \{2, 3\}$.

Each patch feature is made locally aware by adaptive-average-pooling the feature map over a $p \times p$ neighbourhood centered at that spatial location ($p = 3$ default), collected on a grid with stride $s$ ($s = 1$ default, changed only for the stride ablation). The memory bank $M$ is the union of every such patch feature from every nominal training image.

$M$ grows linearly with training-set size and becomes too large to search or store cheaply. PatchCore reduces it with greedy coreset subsampling: a subset $M_C$ is selected that still covers the same region of patch-feature space as $M$.

:::definition[Minimax facility-location coreset selection]
Selects the subset $M_C$ of the memory bank $M$ that minimises the worst-case distance from any element of $M$ to its nearest neighbour in $M_C$.

$$
M_C^* = \arg\min_{M_C \subset M} \max_{m \in M} \min_{n \in M_C} \|m - n\|_2.
$$
:::

Exact computation of $M_C^*$ is NP-hard. PatchCore uses an iterative greedy approximation (Algorithm 1). To make greedy selection tractable on high-dimensional CNN features, a random linear projection $\psi: \mathbb{R}^d \to \mathbb{R}^{d^*}$, $d^* < d$, is applied first, justified by the Johnson–Lindenstrauss theorem. The paper defines $d^*$ but does not assign it a numeric value.

At test time, every patch feature of the test image is matched to its nearest neighbour in $M_C$ by L2 distance.

:::definition[PatchCore anomaly score]
The raw score is the largest nearest-neighbour distance between a test-image patch feature and the coreset memory bank $M_C$; $m^{\text{test},*}$ is the test patch attaining it and $m^*$ its nearest neighbour in $M_C$.

$$
s^* = \max_{m^{\text{test}} \in \mathcal{P}^{\text{test}}} \; \min_{n \in M_C} \|m^{\text{test}} - n\|_2.
$$

The final score reweights $s^*$ by the isolation of $m^*$ among its own $b$ nearest neighbours $N_b(m^*)$ in the memory bank, using unstabilised exponentials of the raw L2 distances:

$$
s = \left(1 - \frac{\exp\|m^{\text{test},*} - m^*\|_2}{\displaystyle\sum_{m \in N_b(m^*)} \exp\|m^{\text{test},*} - m\|_2}\right) s^*.
$$

$\mathcal{P}^{\text{test}}$ is the set of patch features of the test image. The paper defines $b$ but does not assign it a numeric value.
:::

The reweighted scoring computation in Python:

```python
import numpy as np


def patchcore_score(test_patches: np.ndarray, memory_bank: np.ndarray, b: int) -> float:
    """Reweighted PatchCore anomaly score (Eqs. 6-7, Roth et al. 2022).
    test_patches: [N, D] locally aware patch features of the test image.
    memory_bank: [K, D] coreset-subsampled memory bank M_C.
    b: size of the reweighting neighbourhood in the memory bank.
    """
    # Eq. 6: nearest-neighbour distance of every test patch to the bank.
    dists = np.linalg.norm(test_patches[:, None, :] - memory_bank[None, :, :], axis=-1)
    nn_dist = dists.min(axis=1)              # [N]
    idx_star = nn_dist.argmax()              # test patch attaining the max
    s_star = nn_dist[idx_star]
    m_test_star = test_patches[idx_star]
    m_star = memory_bank[dists[idx_star].argmin()]

    # Eq. 7: reweight by isolation of m_star among its b nearest bank neighbours.
    bank_dists_to_m_star = np.linalg.norm(memory_bank - m_star, axis=-1)
    neighbourhood = memory_bank[np.argsort(bank_dists_to_m_star)[:b]]
    num = np.exp(np.linalg.norm(m_test_star - m_star))
    den = np.exp(np.linalg.norm(m_test_star - neighbourhood, axis=-1)).sum()
    weight = 1.0 - num / den

    return weight * s_star
```

The same per-patch nearest-neighbour distances, realigned to their spatial position and upsampled, give the segmentation map.

**Training.** PatchCore requires no gradient-based training. The "fitting" step is the forward pass that populates the memory bank plus the coreset-selection step described above; the backbone stays frozen at its ImageNet-pretrained weights throughout. Evaluated per-category on MVTec AD: 15 sub-datasets, 5354 images total, defect-free training sets only. Headline image-level AUROC with the default single WideResNet-50 backbone: 99.1% at 25% coreset subsampling, 99.0% at 10%, and 99.0% at 1% (Table 1). Up to 99.6% with a three-backbone ensemble (DenseNet-201 + ResNeXt-101 + WideResNet-101, blocks 2+3, 320 px input) (Table 4).

**Complexity.** Memory-bank size scales linearly with the number of nominal training images and their patch count, then is reduced to a chosen coreset percentage (25%/10%/1% evaluated, Table 1). Coarser striding is an alternative size-reduction lever but costs accuracy directly: image AUROC drops to 97.6% at $s = 2$ and 96.8% at $s = 3$, versus the default $s = 1$ (§4.4.2). Nearest-neighbour retrieval and distance computation, both at fitting time and test time, use faiss. Per-image inference time is 0.17–0.6 s depending on coreset percentage (Table 5).

# Implementations

Official PyTorch repository from the paper's Amazon Science authors; a community reimplementation is maintained inside Intel's Anomalib toolkit.

# Assessment

**Novelty.**

- PatchCore requires no training on the target domain: a single forward pass over nominal images populates the memory bank, and coreset selection is a deterministic, non-gradient step — in contrast to density-estimation methods that fit a per-position statistical model to pretrained features (PaDiM) or to student-teacher ensembles that require gradient-based training (Uninformed Students).
- Locally aware, mid-level patch features avoid both extremes the paper argues against: the deepest backbone layer is biased toward ImageNet-classification semantics and loses localized detail, while a too-shallow layer lacks semantic abstraction.
- Greedy minimax-facility-location coreset subsampling, made tractable by a Johnson–Lindenstrauss random projection, replaces naive random subsampling of the memory bank — random subsampling loses significant information and can miss entire clusters of a multi-modal feature distribution.
- The nearest-neighbour anomaly score is reweighted by how isolated the matched memory-bank feature is among its own neighbours, rewarding matches to nominal regions that are themselves rare or borderline.

**Strengths.**

- Image-level AUROC up to 99.6% on the three-backbone ensemble configuration (Table 4); 99.1%/99.0%/99.0% at 25%/10%/1% coreset subsampling with the default single WideResNet-50 backbone (Table 1) — beating the next-best competitor PaDiM* at 97.9%, a reduction in error from 2.1% to 0.9%, a 57% relative reduction as stated in §4.2. That §4.2 passage labels the comparison figure "PaDiM" in prose, while Table 1 attributes the same number to the backbone-selected "PaDiM*" variant specifically; this page follows the table's label.
- Matches prior state of the art using about one-fifth of the full nominal training set, and stays competitive down to 1–5 shots (§4.5) — a genuine advantage when only a handful of nominal images exist for a new category.
- Pixel-level AUROC 98.1% (PatchCore-25%) versus PaDiM's 97.5% (Table 2); PRO 93.5% (PatchCore-10%) versus PaDiM's 92.1% (Table 3).
- Position-agnostic shared memory bank tolerates size-varying inputs: it applies directly to the Magnetic Tile Defects dataset, whose images vary in size, where spatially-rigid patch-position-indexed models like PaDiM cannot be applied directly (§4.6). Cross-dataset AUROC 97.9% on MTD and pixelwise AUROC 91.8% on mSTC (Table 6).

**Limitations.**

- Accuracy is bounded by how well the frozen ImageNet-pretrained backbone transfers to the inspected domain; PatchCore performs no target-domain feature adaptation. The paper states this directly as its own core limitation.
- The image-level score is a max over per-patch distances (Eq. 6). Most of the paper's own false negatives are anomalies that are visible in the per-patch score map but whose aggregate contribution does not cross the image-level threshold.
- Random subsampling of the memory bank loses significant information and can miss whole clusters of a multi-modal feature distribution; greedy coreset selection is required, adding an extra offline step relative to a naive memory bank.
- The Johnson–Lindenstrauss target dimensionality $d^*$ and the reweighting neighbourhood size $b$ are defined but never assigned numeric defaults in the paper, leaving both hyperparameters unspecified for reproduction.
- Inference time is 0.17–0.6 s per image depending on coreset percentage (Table 5) — far from real-time relative to detectors with a fixed-cost forward pass.

## When to choose PatchCore over EfficientAD

On MVTec AD, the two methods are close under each paper's own clean-protocol evaluation. PatchCore reaches 99.1% image-level AUROC at its single-backbone default configuration and 99.6% with a three-backbone ensemble (Table 4 of Roth et al.). EfficientAD reports 98.8% (EfficientAD-S) and 99.1% (EfficientAD-M) under its early-stopping-disabled, methodologically clean protocol (Table 2 of Batzner et al.). Beyond MVTec AD, EfficientAD's own combined benchmark — spanning MVTec AD, VisA, and MVTec LOCO, and covering both structural and logical anomaly types — names AST, not PatchCore, as its closest competitor: "the second-best method." That ranking places PatchCore below both EfficientAD and AST on that broader, mixed-anomaly-type evaluation.

EfficientAD is also decisively faster: 2.2 ms (EfficientAD-S) and 4.5 ms (EfficientAD-M) per image on an RTX A6000 at batch size 1 (Table 1 of Batzner et al.), against PatchCore's reported 0.17–0.6 s per image (Table 5 of Roth et al., coreset-percentage-dependent; the source paper does not reliably state the GPU used, so the two latency figures are not measured on a common, confirmed hardware basis).

PatchCore's advantage is deployment cost, not accuracy or speed. EfficientAD requires roughly twenty minutes of training per new scenario, chiefly so its autoencoder can learn that scenario's logical constraints. PatchCore's equivalent step is a forward pass over the category's nominal images plus deterministic coreset selection — no gradient updates. Choose PatchCore over EfficientAD when new product or scene categories are added frequently and a per-category training run is operationally undesirable, or when only a handful of nominal images exist for a new category — PatchCore matches prior state of the art at about one-fifth of the full nominal training set and stays competitive down to 1–5 shots. Choose EfficientAD when best accuracy across a broad, mixed structural-and-logical-anomaly benchmark or a strict low-millisecond latency budget is the priority.

# References

1. Roth, K., Pemula, L., Zepeda, J., Schölkopf, B., Brox, T., & Gehler, P. *Towards Total Recall in Industrial Anomaly Detection.* CVPR, 2022. [arxiv](https://arxiv.org/abs/2106.08265)
2. Bergmann, P., Fauser, M., Sattlegger, D., & Steger, C. *MVTec AD — A Comprehensive Real-World Dataset for Unsupervised Anomaly Detection.* CVPR, 2019. [cvf](https://openaccess.thecvf.com/content_CVPR_2019/papers/Bergmann_MVTec_AD_--_A_Comprehensive_Real-World_Dataset_for_Unsupervised_Anomaly_CVPR_2019_paper.pdf)
3. Bergmann, P., Fauser, M., Sattlegger, D., & Steger, C. *Uninformed Students: Student-Teacher Anomaly Detection With Discriminative Latent Embeddings.* CVPR, 2020. [arxiv](https://arxiv.org/abs/1911.02357)
4. Batzner, K., Heckler, L., & König, R. *EfficientAD: Accurate Visual Anomaly Detection at Millisecond-Level Latencies.* arXiv 2303.14535, 2023. [arxiv](https://arxiv.org/abs/2303.14535)
