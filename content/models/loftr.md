---
title: "LoFTR"
date: 2026-05-10
summary: "Detector-free dense feature matcher: shared CNN backbone produces coarse and fine feature maps, a Linear Transformer with interleaved self- and cross-attention establishes confidence-thresholded mutual nearest-neighbour correspondences, and a fine module refines each match to sub-pixel accuracy."
tags: ["computer-vision", "image-matching", "transformer", "detector-free", "dense-matching"]
domain: features
tasks: [local-feature-matching]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: hybrid
prerequisites: []
failureModes: []
relations:
  - type: compared_with
    target: superglue
    confidence: high
  - type: compared_with
    target: xfeat
    confidence: high
    caution: "XFeat is later and lighter; LoFTR is the heavyweight reference for the detector-free paradigm."
  - type: compared_with
    target: lightglue
    confidence: high
    caution: "Different paradigm — LoFTR is detector-free dense; LightGlue is detector-based sparse with adaptive depth. LoFTR wins in textureless regions; LightGlue wins on speed (~8× faster per Lindenberger et al. Fig. 1)."
sources:
  primary: sun2021-loftr
  references:
    - sarlin2020-superglue
    - detone2018-superpoint
    - potje2024-xfeat
    - lindenberger2023-lightglue
    - he2016-resnet
  notes: |
    §3 four sub-modules: (1) FPN-ResNet backbone → coarse maps at 1/8,
    fine maps at 1/2; (2) Local Feature Transformer with $N_c$ interleaved
    self/cross attention layers, ELU+1 Linear Transformer kernel
    $\phi(x) = \text{elu}(x) + 1$ for $O(N)$ complexity; (3) coarse
    matching via dual-softmax (LoFTR-DS) or Sinkhorn (LoFTR-OT, 3 iters)
    + MNN + confidence threshold; (4) fine refinement: $w \times w$
    correlation window → sub-pixel expectation. §3.5 score matrix
    $\mathcal{S}(i,j) = (1/\tau) \langle \tilde{F}^A_{tr}(i),
    \tilde{F}^B_{tr}(j) \rangle$. §4.1 HPatches homography SOTA AUC@3px
    /5px/10px. §4.2 ScanNet pose AUC@10° improves SuperGlue by 13%, DRC
    by 61%. §4.4 runtime 116 ms (DS) / 130 ms (OT) per 640×480 pair on
    RTX 2080Ti. §B training: 64 GTX 1080Ti GPUs, ~24 h indoor; ScanNet
    640×480, MegaDepth 840 long-side training / 1200 long-side eval.
implementations:
  - role: official
    repo: https://github.com/zju3dv/LoFTR
    commit: df7ca80f917334b94cfbe32cc2901e09a80e70a8
    framework: pytorch
    license: Apache-2.0
    weights_url: https://drive.google.com/drive/folders/1DOcOPZb3-5cWxLqn256AhwUVjBPifhuf?usp=sharing
    weights_license: Apache-2.0
---

# Motivation

Produce dense, sub-pixel 2D-to-2D correspondences between an image pair without any keypoint detector. Input: a pair of grayscale images $(I^A, I^B)$. Output: a set of matched positions $\mathcal{M}_f = \{(p^A_k, p^B_k)\}$ at sub-pixel accuracy, consumed by pose estimators, SfM pipelines, or visual localisation engines. The defining property is a **coarse-to-fine, detector-free** design: both images are encoded by a shared CNN backbone; the resulting coarse feature maps are processed by a stack of interleaved self- and cross-attention layers using the Linear Transformer approximation, which gives every position a global receptive field and context-aware representation; a differentiable matching layer then selects confident mutual nearest-neighbour pairs; and a fine-level module refines each selected pair to sub-pixel accuracy. The global attention mechanism allows the model to establish correspondences in low-texture and homogeneous regions where repeatability-based keypoint detectors fail to find interest points.

# Architecture

**Family & shape.** Hybrid encoder–decoder with Transformer cross-attention. Input: image pair $(I^A, I^B)$. Stage 1 extracts coarse feature maps $\tilde{F}^A$, $\tilde{F}^B$ at $1/8$ resolution and fine feature maps $\hat{F}^A$, $\hat{F}^B$ at $1/2$ resolution via a shared CNN backbone (ResNet-like with FPN structure). Stages 2–4 operate on the flattened coarse maps, culminating in the final correspondence set $\mathcal{M}_f$.

**Blocks.** Four sub-modules executed in sequence:

1. **Local feature CNN.** A shared ResNet-like backbone with FPN structure extracts two feature-map pairs per image: coarse maps at $1/8$ resolution ($\tilde{F}^A$, $\tilde{F}^B$) and fine maps at $1/2$ resolution ($\hat{F}^A$, $\hat{F}^B$). 2D sinusoidal positional encoding (DETR-style) is added once to the coarse maps at backbone output.

2. **Coarse-level Local Feature Transformer (LoFTR module).** The coarse maps are flattened to 1D sequences and processed by $N_c$ interleaved self-attention and cross-attention layers. To reduce complexity from $O(N^2)$ to $O(N)$, each attention operation uses the Linear Transformer kernel $\phi(\cdot) = \mathrm{elu}(\cdot) + 1$:

:::definition[Linear attention]
The ELU+1 kernel substitutes vanilla softmax attention with a non-negative kernel that admits the associativity trick, reducing per-sequence complexity from $O(N^2)$ to $O(N)$ when the feature dimension $D \ll N$.

$$
\mathrm{Attention}(Q, K, V) = \phi(Q)\,\bigl(\phi(K)^\top V\bigr),
$$

where the key–value product $\phi(K)^\top V \in \mathbb{R}^{D \times D}$ is computed once and shared across all queries.
:::

   Self-attention layers aggregate context within one image; cross-attention layers aggregate context across the image pair. Outputs are context- and position-dependent representations $\tilde{F}^A_{tr}$, $\tilde{F}^B_{tr}$.

3. **Coarse matching module.** A score matrix is formed as:

$$
\mathcal{S}(i, j) = \frac{1}{\tau} \cdot \langle \tilde{F}^A_{tr}(i),\, \tilde{F}^B_{tr}(j) \rangle,
$$

where $\tau$ is a temperature parameter. Two matching variants are offered: (a) **dual-softmax** (LoFTR-DS) — applies row-wise and column-wise softmax and multiplies pointwise to form the confidence matrix $\mathcal{P}_c$; (b) **optimal transport** (LoFTR-OT) — applies the Sinkhorn algorithm with 3 iterations. Coarse matches $\mathcal{M}_c$ are selected by a confidence threshold combined with a mutual-nearest-neighbour (MNN) criterion.

   The self/cross attention update at each layer, illustrating the residual structure:

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class LinearAttention(nn.Module):
    """Self- or cross-attention layer with ELU+1 Linear Transformer kernel."""
    def __init__(self, dim: int):
        super().__init__()
        self.to_qkv = nn.Linear(dim, 3 * dim, bias=False)
        self.to_out = nn.Linear(dim, dim)

    def forward(self, x: torch.Tensor, source: torch.Tensor) -> torch.Tensor:
        # x: (B, N, D)  source: (B, M, D) — same as x for self-attention
        q, _, _ = self.to_qkv(x).chunk(3, dim=-1)
        _, k, v = self.to_qkv(source).chunk(3, dim=-1)
        phi = lambda t: F.elu(t) + 1.0          # ELU+1 kernel
        q, k = phi(q), phi(k)
        # O(N) associativity: compute KV once, then Q·(KV)
        kv = torch.einsum("bmd,bme->bde", k, v)  # (B, D, D)
        out = torch.einsum("bnd,bde->bne", q, kv) # (B, N, D)
        return x + self.to_out(out)              # residual
```

4. **Fine-level refinement.** For each coarse match $(\tilde{i}, \tilde{j}) \in \mathcal{M}_c$, a $w \times w$ window is cropped from the fine feature maps $\hat{F}^A$, $\hat{F}^B$. A correlation volume over this window produces logits; the expected sub-pixel position is computed as a weighted sum over the $w \times w$ grid, yielding the final match set $\mathcal{M}_f$ with sub-pixel precision.

**Training.** The indoor model is trained on ScanNet; the outdoor model on MegaDepth — the same protocol as SuperGlue. Ground-truth coarse matches $\mathcal{M}_c^{gt}$ are derived from camera poses and depth maps: mutual nearest neighbours of the $1/8$-resolution grids projected through known depth. The coarse loss is negative log-likelihood on $\mathcal{P}_c$ over $\mathcal{M}_c^{gt}$ (NLL for dual-softmax; same formulation as SuperGlue for OT). The fine loss is weighted negative log-likelihood on fine-level window predictions, uncertainty-weighted so low-confidence predictions contribute less. Training runs end-to-end from random initialisation on 64 GTX 1080Ti GPUs, converging in approximately 24 hours for the indoor model. Images are resized to 840 long-side for training on MegaDepth and to $640 \times 480$ for ScanNet; MegaDepth evaluation uses 1200 long-side. Headline results: on ScanNet indoor relative pose estimation, LoFTR improves the state of the art by 13% over SuperGlue at AUC@10° and by 61% over DRC-Net at AUC@10°. On HPatches homography estimation, LoFTR-DS achieves state-of-the-art AUC across the @3 px, @5 px, and @10 px corner-error thresholds.

**Complexity.** Runtime: 116 ms per 640×480 image pair for LoFTR-DS, 130 ms for LoFTR-OT (3 Sinkhorn iterations), measured on RTX 2080Ti. The LoFTR module operates on $(H/8 \times W/8)^2$ feature sequences; at 640×480 this gives sequences of length 4800, and the $O(N)$ linear attention avoids the $O(N^2)$ cost of full softmax attention. The paper does not report a parameter count.

# Implementations

Official PyTorch release with Apache-2.0 code and Apache-2.0 pretrained weights. Indoor and outdoor weights are distributed separately.

# Assessment

**Novelty.**

- Replaces the conventional detect-describe-match pipeline (SIFT/ORB/SuperPoint → matcher) with an end-to-end dense matching architecture that requires no keypoint detector at any stage.
- Cross-attention in the LoFTR module provides every position a global receptive field, enabling matches to be established in textureless regions where CNN-based detectors find no repeatable interest points — a persistent blind spot of classical and learned detector-based methods since SIFT.
- Coarse-to-fine refinement combines Transformer-style global reasoning at $1/8$ resolution with sub-pixel correlation-based refinement at $1/2$ resolution, independently from any detector's localisation quality.

**Strengths.**

- On ScanNet indoor relative pose estimation, LoFTR improves AUC@10° by 13% over SuperGlue and by 61% over DRC-Net (Table §4.2). On HPatches homography estimation, LoFTR-DS achieves state-of-the-art AUC at @3 px, @5 px, and @10 px corner-error thresholds (§4.1).
- Strong in precisely the scenarios where detector-based methods fail: low-texture surfaces, wide-baseline indoor scenes (ScanNet), and outdoor landmark scenes with illumination variation (MegaDepth).
- Apache-2.0 code and weights license — commercial deployment is unrestricted.

**Limitations.**

- Dense attention at $1/8$ resolution imposes a memory cost proportional to $(HW/64)^2$ even with linear attention. At 640×480 the coarse sequence length is 4800; at inference time on high-resolution inputs, memory and runtime scale quadratically in the image area before any linear-attention savings.
- Slower per pair than sparse SuperPoint+SuperGlue at modest keypoint counts: 116 ms (LoFTR-DS) or 130 ms (LoFTR-OT) per 640×480 pair on RTX 2080Ti, whereas SuperGlue at 512 keypoints runs at approximately 69 ms on GTX 1080. The newer SuperPoint+[LightGlue](/atlas/lightglue) widens this gap further — Lindenberger et al. Fig. 1 reports approximately 8× the throughput of LoFTR at comparable accuracy on standard benchmarks.
- Two separate model weights exist for indoor (ScanNet) and outdoor (MegaDepth) scenes; inference-time domain mismatch between trained weights and scene type degrades performance, and no single universal model is available.

# References

1. J. Sun, Z. Shen, Y. Wang, H. Bao, X. Zhou. *LoFTR: Detector-Free Local Feature Matching with Transformers.* CVPR, 2021. [arXiv:2104.00680](https://arxiv.org/pdf/2104.00680)
2. P. Sarlin, D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperGlue: Learning Feature Matching with Graph Neural Networks.* CVPR, 2020. [arXiv:1911.11763](https://arxiv.org/pdf/1911.11763)
3. D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperPoint: Self-Supervised Interest Point Detection and Description.* CVPR Workshops, 2018. [arXiv:1712.07629](https://arxiv.org/abs/1712.07629)
4. G. Potje, F. Cadar, A. Araujo, R. Martins, E. R. Nascimento. *XFeat: Accelerated Features for Lightweight Image Matching.* CVPR, 2024. [arXiv:2404.19174](https://arxiv.org/pdf/2404.19174)
5. P. Lindenberger, P. Sarlin, M. Pollefeys. *LightGlue: Local Feature Matching at Light Speed.* ICCV, 2023. [arXiv:2306.13643](https://arxiv.org/pdf/2306.13643)
