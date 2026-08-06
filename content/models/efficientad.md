---
title: "EfficientAD"
date: 2026-08-06
summary: "Millisecond-latency one-class anomaly detection combining a loss-induced-asymmetric student-teacher branch for structural defects with a feature-space autoencoder branch for logical defects, running 2.2 ms (S) / 4.5 ms (M) per image on an RTX A6000."
tags: ["deep-learning", "dense-prediction", "real-time"]
domain: anomaly-detection
tasks: [anomaly-detection, anomaly-segmentation]
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: hybrid
params: "8M (EfficientAD-S) / 21M (EfficientAD-M)"
flops: "76 GFLOPs (S) / 235 GFLOPs (M) @ 256×256"
prerequisites:
  - visual-anomaly-detection
  - convolutional-neural-network
sources:
  primary: batzner2023-efficientad
  references:
    - bergmann2020-uninformed-students
    - rudolph2023-ast
    - bergmann2022-mvtec-loco
    - roth2022-patchcore
  notes: |
    Headline accuracy figures are the clean-protocol ones (98.8 %
    EfficientAD-S / 99.1 % EfficientAD-M on MVTec AD, Table 2). The paper's
    99.8 % figure comes from the early-stopping protocol it criticises in
    SimpleNet and is not comparable to its own tables; it appears on the
    page only with that caveat attached.

    The autoencoder branch is NOT a U-Net. §3.3 describes "a standard
    convolutional autoencoder comprising strided convolutions in the
    encoder and bilinear upsampling in the decoder", and its layer table
    has no skip connections. The U-Net attribution in the paper belongs to
    the GCAD baseline from MVTec LOCO.

    The "24x latency reduction vs AST" claim is attributed to this paper's
    own conclusion, not presented as independently verified: AST reports no
    end-to-end throughput of its own, only student-only inference on a
    different GPU (rudolph2023-ast note, Table 6).

    No relations authored here. The compared_with edge to patchcore is
    authored on the patchcore page (symmetric, one side only); the
    extended_by edge is authored on uninformed-students; the feeds_into
    edge is authored on resnet.
implementations:
  - role: community
    repo: https://github.com/nelson1425/EfficientAD
    commit: fcab5146f84ae17597044ad5ddf1656ccf805401
    framework: pytorch
    license: Apache-2.0
  - role: community
    repo: https://github.com/open-edge-platform/anomalib
    commit: 091ca6aca92c8d0e416394f79e52f5a3cea3db73
    framework: pytorch
    license: Apache-2.0
---
# Motivation

Detect and localize anomalies in industrial images from normal-only training data, covering both structural defects (scratches, stains, foreign objects) and logical anomalies (wrong count, wrong position, wrong combination of otherwise-normal parts), at millisecond-level per-image latency. Input: an RGB image resized to $256\times256$. Output: a per-pixel anomaly map $M \in \mathbb{R}^{W \times H}$, bilinearly resized to the input's original resolution, plus a single image-level score $m_{image} = \max_{i,j} M_{i,j}$. The defining property is a two-branch design — a lightweight, loss-induced-asymmetric student-teacher branch for structural anomalies and an autoencoder-distillation branch for logical anomalies — combined into one map and run end to end at 2.2 ms (EfficientAD-S) or 4.5 ms (EfficientAD-M) per image on an RTX A6000.

# Architecture

**Family & shape.** Two parallel fully-convolutional branches over the same $256\times256$ input, both built from small CNNs rather than one shared backbone. The local branch is a patch description network (PDN) pair — a frozen teacher and a trainable student sharing one architecture. The global branch is a convolutional autoencoder. Both branches emit dense per-pixel output in the same 384-channel feature space, computed in a single forward pass over the whole image with no cropping or striding.

**Blocks.**

- **Patch description network (PDN).** A compact CNN with a deliberately small receptive field: 33×33 pixels per output location. EfficientAD-S uses 4 conv layers plus 2 strided-average-pool layers; EfficientAD-M uses 6 conv layers, 2 strided-average-pool layers, and two extra 1×1 convs. The teacher is frozen and trained once, by distilling features from a pretrained WideResNet-101 classifier — the same feature space PatchCore uses — and outputs 384 channels. The student shares the teacher's architecture exactly but outputs 768 channels: 384 for the local student-teacher head, 384 for a second head that predicts the autoencoder's output (below). The receptive field is kept small on purpose: it keeps the branch fast and confines it to local, structural deviations, leaving compositional and long-range structure to the autoencoder branch.

- **Loss-induced student-teacher asymmetry.** The student and teacher share the identical PDN architecture. The asymmetry that keeps the student from reproducing the teacher on anomalous input at test time comes entirely from the training loss, not from any structural difference between the two networks.

:::definition[Hard feature loss]
Restricts the student's regression loss to the hardest per-channel, per-pixel discrepancies, analogous to Online Hard Example Mining.

$$
D_{c,w,h} = (T(I)_{c,w,h} - S(I)_{c,w,h})^2, \qquad L_{hard} = \text{mean of } D_{c,w,h} \ge d_{hard},
$$

where $d_{hard}$ is the $p_{hard}$-quantile of $D$. $p_{hard} = 0.999$, corresponding to using, on average, ten percent of the values.
:::

The hard feature loss in PyTorch:

```python
import torch


def hard_feature_loss(teacher_out: torch.Tensor,
                       student_out: torch.Tensor,
                       p_hard: float = 0.999) -> torch.Tensor:
    """Hard feature loss (Sec. 3.2). Restricts the student's regression
    loss to the p_hard-quantile hardest per-channel, per-pixel elements.
    teacher_out, student_out: [C, H, W] feature maps for one image.
    """
    d = (teacher_out - student_out) ** 2      # D_{c,w,h}
    d_hard = torch.quantile(d, p_hard)        # d_hard
    return d[d >= d_hard].mean()              # L_hard
```

A separate pretraining penalty adds a term on a random ImageNet image $P$ at each training step, penalizing the norm of the student's output on that out-of-distribution input: $L_{ST} = L_{hard} + (CWH)^{-1}\sum_c \|S(P)_c\|_F^2$. The local anomaly map at inference is the channel-averaged discrepancy, $M_{w,h} = C^{-1}\sum_c D_{c,w,h}$.

- **Autoencoder branch.** A standard convolutional autoencoder — strided convolutions in the encoder, bilinear upsampling in the decoder — not a U-Net; its layer table has no skip connections. A 6-layer strided-conv encoder compresses the image to a 64-dimensional bottleneck; a 6-stage bilinear-upsample-and-conv decoder (dropout 0.2 per stage) reconstructs not the image but the teacher's 384-channel feature output: $L_{AE} = (CWH)^{-1}\sum_c \|T(I)_c - A(I)_c\|_F^2$. Because the 64-dimensional bottleneck cannot carry fine texture, the autoencoder's reconstructions are flawed on normal images too — using the raw autoencoder-versus-teacher residual directly would false-positive on ordinary background texture.

- **Second student head.** Instead of scoring the raw autoencoder residual, the student's second output head is trained to predict the autoencoder's output ($L_{STAE}$). The student learns the autoencoder's systematic reconstruction errors on normal images, which cancel out at inference, but does not generalize that prediction to images with unseen logical anomalies. The global anomaly map $M^{AE}$ is the squared difference between the autoencoder's output and this second student head.

**Training.** Trained per scenario on MVTec AD, VisA, or MVTec LOCO, using only normal images for training and (for map normalization only) validation. Total loss is the unweighted sum $L_{total} = L_{AE} + L_{ST} + L_{STAE}$. Adam, learning rate $10^{-4}$, weight decay $10^{-5}$, batch size 1, 70000 iterations, learning rate decayed to $10^{-5}$ after iteration 66500; the PDN teacher is distilled separately beforehand — 60000 iterations, batch size 16, Adam with the same learning rate and weight decay. Brightness/contrast/saturation augmentation ($\lambda \sim U(0.8, 1.2)$) is applied only to the autoencoder branch's input. Both anomaly maps are normalized before combination:

:::definition[Combined anomaly map]
Each map is linearly rescaled per scenario using two quantiles of its own score distribution on held-out normal validation images ($q_a = 0.9 \to 0$, $q_b = 0.995 \to 0.1$), then the two normalized maps are averaged in equal parts.

$$
M = 0.5\,\hat M^{ST} + 0.5\,\hat M^{AE}.
$$
:::

Under the paper's clean evaluation protocol (early stopping disabled), MVTec AD AU-ROC is 98.8 % for EfficientAD-S and 99.1 % for EfficientAD-M (Table 2). A separately reported early-stopped figure of 99.8 % on MVTec AD uses the same test-time early-stopping protocol the paper disqualifies when scoring its SimpleNet baseline, and is not comparable to the clean-protocol numbers above.

**Complexity.** EfficientAD-S: 8M parameters, 76 GFLOPs, 100 MB GPU memory, 2.2 ms latency and 614 img/s throughput (batch 16) on an RTX A6000. EfficientAD-M: 21M parameters, 235 GFLOPs, 161 MB GPU memory, 4.5 ms latency and 269 img/s throughput (batch 16), same hardware (Table 1, Table 16).

# Implementations

No official open-source implementation accompanies this paper, unlike its baselines, whose repositories are linked from Appendix B.

# Assessment

**Novelty.**

- Loss-induced, not architectural, student-teacher asymmetry: student and teacher share one PDN architecture, and the hard feature loss plus pretraining penalty alone keep the student from generalizing to anomalies. This directly disagrees with AST (Rudolph et al. 2023), which argues architectural asymmetry — a bijective normalizing-flow teacher paired with a non-bijective CNN student — is required, stating that "a student with similar architecture tends to undesired generalization, such that it extrapolates similar outputs as the teacher for inputs that are out of the training distribution."
- Two-branch design covering both anomaly classes in one model: extends the plain student-teacher framework of Uninformed Students (Bergmann et al. 2020) with a second, autoencoder-based branch — in the spirit of MVTec LOCO's GCAD baseline — that targets the logical and compositional anomalies the local branch's 33×33 receptive field cannot see.
- Hard feature loss, analogized to Online Hard Example Mining: restricting the student's loss to the $p_{hard}=0.999$-quantile hardest elements moves MVTec AD AU-ROC from 94.9 (no mining) to 96.0 — an ablated design choice, not an incidental detail (Table 3).
- Quantile-based anomaly-map normalization outperforms a Gaussian mean/variance baseline by 0.7 AU-ROC points (95.4 → 94.7 without it), by being distribution-free across scenarios whose raw score distributions differ in shape (Table 5).

**Strengths.**

- Millisecond latency: 2.2 ms (EfficientAD-S) and 4.5 ms (EfficientAD-M) per image on an RTX A6000; 614 and 269 img/s throughput at batch 16 (Table 1).
- Leads its own clean-protocol comparison table across MVTec AD, VisA, and MVTec LOCO, ahead of GCAD, SimpleNet, S-T, FastFlow, DSR, PatchCore, and AST under the same evaluation protocol (Table 1, Table 2).
- Per the paper's own conclusion, EfficientAD-S reduces latency by a factor of 24 and increases throughput by a factor of 15 relative to AST — "the second-best method" — though AST reports no comparable end-to-end throughput figure of its own to independently verify this against.
- More robust to the choice of distillation backbone than PatchCore is to its own feature extractor, on MVTec LOCO specifically (Table 9): EfficientAD-M varies 88.3–90.7 AU-ROC across WideResNet-101/ResNeXt-101/DenseNet-201, versus PatchCore's 76.5–80.3 over the same three backbones.
- Robust to float16 inference precision — detection results are unchanged across all 32 evaluated scenarios (Appendix E); the reported latency figures use float16.

**Limitations.**

- Requires training per scenario (about twenty minutes, §5) — in contrast to kNN-based methods, which require no training pass at all.
- Compared with PatchCore: see [When to choose PatchCore over EfficientAD](/atlas/patchcore#when-to-choose-patchcore-over-efficientad). The PatchCore page hosts the comparison.
- Logical anomalies remain the method's weakest slice even while leading the field: 85.8 / 86.8 AU-ROC on MVTec LOCO's logical-anomaly split (EfficientAD-S/M), against 98.8 / 99.1 on MVTec AD's largely-structural anomalies (Table 2).
- Fine-grained logical anomalies below the branches' resolving power — the paper's own example is "a screw that is two millimeters too long" — are out of scope; the paper directs practitioners to metrology methods instead (§5).

# References

1. Batzner, K., Heckler, L., & König, R. *EfficientAD: Accurate Visual Anomaly Detection at Millisecond-Level Latencies.* arXiv 2303.14535, 2023. [arxiv](https://arxiv.org/abs/2303.14535)
2. Bergmann, P., Fauser, M., Sattlegger, D., & Steger, C. *Uninformed Students: Student-Teacher Anomaly Detection With Discriminative Latent Embeddings.* CVPR, 2020. [arxiv](https://arxiv.org/abs/1911.02357)
3. Rudolph, M., Wehrbein, T., Rosenhahn, B., & Wandt, B. *Asymmetric Student-Teacher Networks for Industrial Anomaly Detection.* WACV, 2023. [arxiv](https://arxiv.org/abs/2210.07829)
4. Bergmann, P., Batzner, K., Fauser, M., Sattlegger, D., & Steger, C. *Beyond Dents and Scratches: Logical Constraints in Unsupervised Anomaly Detection and Localization.* IJCV, 2022. [pdf](https://mediatum.ub.tum.de/download/1782820/1782820.pdf)
