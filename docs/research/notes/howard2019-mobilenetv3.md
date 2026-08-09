---
paper_id: howard2019-mobilenetv3
title: "Searching for MobileNetV3"
authors: ["A. Howard", "M. Sandler", "G. Chu", "L. Chen", "B. Chen", "M. Tan", "W. Wang", "Y. Zhu", "R. Pang", "V. Vasudevan", "Q. V. Le", "H. Adam"]
year: 2019
url: https://arxiv.org/pdf/1905.02244
created: 2026-05-29
relevant_atlas_pages: [deeplab-semantic-segmentation, fast-scnn, bisenet, convolutional-neural-network, convolution, attention-mechanism]
---

# Setting

Problem class: efficient on-device image classification, with backbone features applied downstream to object detection (SSDLite on COCO) and semantic segmentation (LR-ASPP on Cityscapes). The primary resource target is latency on mobile-phone CPUs — specifically the Pixel family of phones, measured via TFLite on a single large core at batch size 1.

Inputs: RGB images; canonical evaluation at 224×224 resolution with optional width multipliers (0.35, 0.5, 0.75, 1.0, 1.25) and resolution sweeps (96–256 px). Outputs: class logits (1000-way for ImageNet), bounding boxes (detection), or per-pixel class scores (segmentation). No server; all inference is expected to run on-device in floating-point or quantized (INT8) mode.

Two released models: MobileNetV3-Large (target ~80 ms on Pixel 1) and MobileNetV3-Small (target ~15 ms on Pixel 1).

# Core idea

MobileNetV3 compounds three complementary advances.

**1. Two-stage NAS.** Platform-aware NAS (MnasNet-style RL controller with a factorized hierarchical search space and an accuracy×latency reward) finds the coarse block structure. The reward for small models uses $w = -0.15$ (vs. $w = -0.07$ for large), accounting for the steeper accuracy-latency tradeoff at small scale. NetAdapt then fine-tunes per-layer filter counts iteratively: starting from the NAS seed, at each step it generates proposals that reduce any expansion layer or bottleneck filter count, short-trains each candidate, and selects the one yielding the best accuracy for a fixed latency reduction (Section 4).

**2. Block redesign.** The inverted-residual + linear-bottleneck block (inherited from MobileNetV2) is the core building primitive: a 1×1 expansion conv → depthwise 3×3 or 5×5 conv → 1×1 projection, with a residual skip when input and output channel counts match. Inside the expansion, MobileNetV3 inserts a Squeeze-and-Excitation module (borrowed from MnasNet / SE-Net): global-average-pool the expanded channels, reduce to 1/4 of the expansion-layer channels, apply a linear transformation and hard-sigmoid gate, then scale the expanded feature map. The SE bottleneck size is fixed to 1/4 of the expansion channels for all blocks (Section 5.3); earlier MnasNet used a size relative to the convolutional bottleneck, which MobileNetV3 replaces for consistency and accuracy gain.

**3. Expensive-layer redesign.** Two hand-crafted fixes reduce latency outside the NAS search space: (a) the last-stage feature expansion is moved past global-average-pool so it runs at 1×1 resolution instead of 7×7, removing the pre-pool bottleneck projection and saving 7 ms / 30 M MAdds (11% of runtime); (b) the initial stem conv is reduced from 32 to 16 filters (using h-swish), saving 2 ms and 10 M MAdds (Section 5.1).

**h-swish nonlinearity.** The soft swish $\operatorname{swish}(x) = x \cdot \sigma(x)$ is replaced by a piece-wise-linear hard version to avoid slow sigmoid on mobile hardware:

$$\operatorname{h\text{-}swish}[x] = x \cdot \frac{\operatorname{ReLU6}(x+3)}{6}$$

where $\operatorname{ReLU6}(x) = \min(\max(x,0),6)$ and the hard-sigmoid is $\frac{\operatorname{ReLU6}(x+3)}{6}$ (Section 5.2, unnumbered display equations). The constant 3 is a shift to centre the approximation; ReLU6 replaces a custom clip for compatibility with optimized hardware kernels. h-swish is applied only in the second half of the network (deeper layers), where activation memory is smaller and the benefit-to-cost ratio is highest.

**LR-ASPP segmentation decoder.** Lite Reduced ASPP strips the multi-rate parallel branches of DeepLab's ASPP, keeping only a global-average-pool context branch (with a large pooling kernel and large stride to reduce compute) and a single 1×1 conv, plus a skip connection from low-level features. Applied to MobileNetV3 backbone with atrous convolution in the last block (output stride 16) (Section 6.4, Figure 10).

# Assumptions

1. (hard) Input images are standard RGB tensors; no domain-specific preprocessing beyond normalization is assumed.
2. (soft) Latency targets are measured on Pixel-family CPUs via TFLite; portability to other hardware (DSP, GPU, edge NPU) requires re-validation.
3. (soft) NAS finds good block-level structure when the latency oracle (real on-device measurement) is available; proxy-latency (FLOPs) may produce different architectures.
4. (hard) h-swish requires ReLU6 support in the inference runtime; hardware lacking this primitive falls back to custom clipping or full sigmoid, losing the quantization benefit.
5. (soft) The SE ratio of 1/4 (of expansion channels) is fixed by ablation on Pixel phones; different hardware or resolution regimes may prefer different ratios.
6. (soft) LR-ASPP accuracy benefit assumes the backbone was trained on a dataset with many classes (1000-class ImageNet) so filter redundancy is present when fine-tuned on fewer Cityscapes classes (19).

# Failure regime

- **Very small width multipliers** (≤0.35): the latency-accuracy tradeoff degrades because fewer channels reduce the relative benefit of SE and h-swish while bottleneck overhead remains fixed.
- **Non-CPU targets**: the NAS reward is based on Pixel CPU latency. GPU or NPU latency curves differ substantially; the discovered architecture may not be Pareto-optimal on those targets.
- **Fixed-point underflow in h-swish**: the paper notes that sigmoid is "challenging to maintain accuracy in fixed point arithmetic" and motivates the hard replacement (Section 3). Full INT8 quantization of a naive sigmoid implementation introduces numerical precision loss that h-swish avoids.
- **Segmentation at high resolution**: LR-ASPP is benchmarked at 1024×2048 (Cityscapes full resolution) but inference latency is measured on Pixel 3 CPU; at higher resolutions, the atrous convolution in the last block becomes the bottleneck.
- **Transfer without fine-tuning**: the backbone's last-block channels are tuned for 1000-class ImageNet; reducing them by 2× (as done for detection and segmentation) recovers latency without significant accuracy loss only when downstream classes are much fewer (Section 6.4).

# Numerical sensitivity

- **h-swish precision**: uses ReLU6(x+3)/6; the +3 shift and /6 scale introduce no special numerical difficulty for float32. In INT8 the constant 3 must be representable in the quantized domain — ReLU6 implementations guarantee this.
- **NAS reward weight w**: small-model search uses w = −0.15 vs. large-model w = −0.07 (Section 4.1). A wrong choice of w causes the optimizer to trade accuracy for latency too aggressively (small models) or not aggressively enough (large models).
- **SE bottleneck**: fixed at 1/4 of expansion-layer channels. Rounding is required when expansion channels are not divisible by 4; the paper does not specify a rounding convention.
- **Quantization (INT8)**: Table 4 shows V3-Large accuracy drops from 75.2% (float) to 73.8% (quantized) on ImageNet while Pixel-1 latency falls from 51 ms to 44 ms. MobileNetV2 float/quantized: 72.0%/70.9%, 64 ms/52 ms. The hard-sigmoid design specifically reduces quantization loss relative to a soft sigmoid.

# Applicability

- Use when: deploying image classification or detection/segmentation on mobile CPUs; latency budget is ~15–80 ms at 224 px input; float32 or INT8 inference via TFLite; need a backbone with SE and efficient nonlinearities without custom hardware.
- Don't use when: GPU or server inference where EfficientNet-family or ViT-based backbones are preferred; sub-10 ms budget where MobileNetV3-Small still exceeds target; task requires very high accuracy without latency constraint.
- Compared against: MobileNetV2 (primary baseline throughout), MnasNet-A1, ProxylessNAS, EfficientNet (Figure 2).

# Connections

- Builds on: sandler2018-mobilenetv2 (inverted residual + linear bottleneck block), tan2019-mnasnet (NAS reward + factorized hierarchical search space, RL controller), yang2018-netadapt (per-layer filter search), hu2018-senet (Squeeze-and-Excitation), ramachandran2017-swish (swish nonlinearity), chen2018-deeplabv3plus (ASPP concept that LR-ASPP reduces)
- Enables: downstream dense-prediction heads using MobileNetV3 as feature extractor; future NAS work combining automated search with hand-tuned architectural priors

# Atlas update plan

## NEW: mobilenetv3
Type: model
Category: efficient-backbone

Primary source: this paper (howard2019-mobilenetv3)
Prerequisites: convolutional-neural-network, convolution, attention-mechanism

Relations (author on the NEW page):
- { type: compared_with, target: fast-scnn, confidence: medium, caution: "Peer comparison is specific to the real-time Cityscapes segmentation regime." }
- { type: compared_with, target: bisenet, confidence: medium, caution: "Peer comparison in the real-time mobile segmentation regime." }

### Motivation
- Mobile on-device CV requires accuracy without cloud round-trips; MobileNetV3 targets sub-80 ms (Large) and sub-16 ms (Small) on a single Pixel-phone CPU core.
- Prior work (MobileNetV2, MnasNet) established efficient blocks and NAS separately; MobileNetV3 fuses them with hand-crafted fixes for two known bottleneck layers.
- Goal: push the Pareto frontier of ImageNet top-1 accuracy vs. mobile-CPU latency beyond MobileNetV2.

### Architecture
- **Inverted-residual + linear-bottleneck block** (inherited from MobileNetV2, Section 3): 1×1 expansion conv → depthwise-separable conv (3×3 or 5×5) → 1×1 projection; residual skip when input == output channels. Depthwise-separable convolution is the core efficiency primitive: it factorises a spatial conv into a per-channel depthwise filter plus a 1×1 pointwise mix.
- **Squeeze-and-Excitation inside the block** (Section 3, 5.3, Figure 4): placed after the depthwise conv in the expansion (largest-channel representation). Gate uses hard-sigmoid $\frac{\operatorname{ReLU6}(x+3)}{6}$. SE bottleneck fixed at 1/4 of expansion-layer channels (changed from MnasNet's relative-to-bottleneck sizing).
- **h-swish nonlinearity** (Section 5.2): hard approximation to swish, $\operatorname{h\text{-}swish}[x] = x \cdot \frac{\operatorname{ReLU6}(x+3)}{6}$. Applied in the second half of the network only; earlier layers use ReLU for speed.
- **Two-stage NAS + NetAdapt** (Section 4): (1) platform-aware MnasNet-style RL NAS optimises block-level structure with reward $\mathrm{ACC}(m) \times [\mathrm{LAT}(m)/\mathrm{TAR}]^w$, $w{=}{-}0.15$ for Small, $w{=}{-}0.07$ for Large; (2) NetAdapt iteratively reduces per-layer filter counts subject to a latency budget, short-trains each candidate, keeps the best accuracy-per-latency-reduction.
- **Redesigned expensive layers** (Section 5.1): (a) last-stage 1×1 expansion moved past global-average-pool to 1×1 spatial resolution, removing the preceding bottleneck projection — saves 7 ms / 30 M MAdds; (b) initial 3×3 stem reduced from 32 to 16 filters (h-swish) — saves 2 ms / 10 M MAdds.
- **MobileNetV3-Large** (Table 1): 15 bottleneck blocks, stem 16 ch, final expansion at 1×1 produces 960-ch → 1280-ch projection. **MobileNetV3-Small** (Table 2): 11 bottleneck blocks, final expansion 576-ch → 1024-ch projection.
- **LR-ASPP decoder** (Section 6.4, Figure 10): Lite Reduced ASPP — global-average-pool branch with large-kernel large-stride pooling + single 1×1 conv (SE-style), atrous conv in last backbone block (output stride 16), skip connection from low-level features. Eliminates the multi-rate parallel branches of DeepLab ASPP for mobile latency.

### Implementations
- TensorFlow official: `tensorflow/models` (Apache 2.0) — reference training and TFLite export.
- PyTorch: `torchvision.models.mobilenet_v3_large/small` (BSD-3-Clause).
- Timm: `timm` library includes V3 variants.

### Assessment
- **ImageNet classification** (Table 3, floating-point, 224 px, Pixel 1): V3-Large 1.0 — 75.2% top-1, 51 ms (vs. MobileNetV2 1.0 72.0% at 64 ms; +3.2% accuracy, −20% latency). V3-Small 1.0 — 67.4% top-1, 15.8 ms (vs. MobileNetV2-0.35 60.8% at 16.6 ms; +6.6% accuracy at comparable latency).
- **COCO detection** (SSDLite, Table 6): V3-Large is over 25% faster than MobileNetV2 at roughly the same mAP.
- **Cityscapes segmentation** (Table 7, val set): V3-Large + LR-ASPP (F=128) achieves 72.36% mIOU in 657 ms (half-res), vs. V2 + R-ASPP (F=256) at 72.56% mIOU in 793 ms — 34% faster at similar accuracy (abstract; Table 7 rows 4 vs 2 confirm the ratio).
- MobileNetV3 became the de-facto default mobile backbone for TFLite deployment from 2019–2022, before EfficientNet-Lite and MobileNetV4 extended the Pareto frontier further.
- h-swish and the NAS+NetAdapt two-stage pipeline were widely adopted in subsequent mobile architecture work.

### References
- Howard et al. (2019) "Searching for MobileNetV3," ICCV 2019. arXiv:1905.02244.
- Sandler et al. (2018) "MobileNetV2: Inverted Residuals and Linear Bottlenecks," CVPR 2018.
- Tan et al. (2019) "MnasNet: Platform-Aware Neural Architecture Search for Mobile," CVPR 2019.
- Yang et al. (2018) "NetAdapt: Platform-Aware Neural Network Adaptation for Mobile Applications," ECCV 2018.
- Hu et al. (2018) "Squeeze-and-Excitation Networks," CVPR 2018.

## UPDATE: deeplab-semantic-segmentation
Section: Relations (frontmatter)
- Add forward edge ON THE DeepLab PAGE: { type: feeds_into, target: mobilenetv3, confidence: medium, caution: "LR-ASPP is a lite, reduced reuse of DeepLab's ASPP as MobileNetV3's segmentation head." }
- Rationale: MobileNetV3's LR-ASPP decoder is an explicit "Lite Reduced" simplification of DeepLab(V3)'s Atrous Spatial Pyramid Pooling — it keeps a global-average-pool context branch and atrous context but strips the parallel multi-rate branches for mobile latency. This is intellectual lineage (DeepLab's ASPP idea feeds into MobileNetV3's segmentation head), not method supersession.
- Note for author: feeds_into is asymmetric and authored on the ANTECEDENT (DeepLab) page; the renderer derives the reverse `fedBy` bucket on the mobilenetv3 page automatically. Apply only AFTER the mobilenetv3 page exists (validator requires the target to resolve).

# Provenance

- **Abstract (line 88)**: "MobileNetV3-Large is 3.2% more accurate on ImageNet classification while reducing latency by 20% compared to MobileNetV2." / "MobileNetV3-Small is 6.6% more accurate compared to a MobileNetV2 model with comparable latency." / "MobileNetV3-Large LR-ASPP is 34% faster than MobileNetV2 R-ASPP at similar accuracy for Cityscapes segmentation."
- **Section 3, S3.p4 (line 145)**: swish nonlinearity introduced; hard sigmoid replacement motivation (inefficient sigmoid on mobile, fixed-point challenges).
- **Section 5.1, S5.SS1.p4 (line 272)**: "efficient last stage reduces the latency by 7 milliseconds which is 11% of the running time and reduces the number of operations by 30 millions MAdds."
- **Section 5.1, S5.SS1.p5 (line 275)**: stem filter reduction 32→16, "saves an additional 2 milliseconds and 10 million MAdds."
- **Section 5.2 (lines 286–337)**: swish definition $\operatorname{swish}(x) = x \cdot \sigma(x)$ (unnumbered equation S5.Ex1); hard-sigmoid $\frac{\operatorname{ReLU6}(x+3)}{6}$ (unnumbered display); h-swish $\operatorname{h\text{-}swish}[x] = x\frac{\operatorname{ReLU6}(x+3)}{6}$ (unnumbered display in Section 5.2 prose).
- **Section 5.3, S5.SS3.p1 (line 343)**: SE bottleneck "fixed to be 1/4 of the number of channels in expansion layer."
- **Section 4.1, S4.SS1.p2 (line 173)**: NAS reward $\mathrm{ACC}(m) \times [\mathrm{LAT}(m)/\mathrm{TAR}]^w$; $w = -0.15$ for small models (vs. $w = -0.07$ in MnasNet).
- **Table 1 (lines ~380–510)**: MobileNetV3-Large spec; stem 16 filters, h-swish (HS) from the first block, SE (✓) in later blocks.
- **Table 2 (lines ~510–630)**: MobileNetV3-Small spec.
- **Table 3 (lines 777–813)**: Floating-point ImageNet results — V3-Large 1.0: 75.2% top-1, 51 ms (P-1); V2 1.0: 72.0%, 64 ms; V3-Small 1.0: 67.4%, 15.8 ms; V2 0.35: 60.8%, 16.6 ms.
- **Table 4 (lines ~813–830)**: Quantized results — V3-Large: 73.8% top-1, 44 ms (P-1); V2 1.0: 70.9%, 52 ms.
- **Section 6.4 (lines 1116–1279)**: LR-ASPP description; Table 7 (lines ~1138–1279): Cityscapes val results — row 8 (V3-Large, RF2, LR-ASPP, F=128): 72.36% mIOU, 657 ms CPU(h); row 4 (V2, RF2, R-ASPP, F=128): 72.74%, 766 ms. The abstract states 34% faster; comparing row 3 (V2 R-ASPP F=256, 786 ms) to row 8 (V3 LR-ASPP F=128, 657 ms) gives ~16% speedup at ±0.6% mIOU — the abstract's "34%" refers specifically to the comparison V3 LR-ASPP vs. V2 R-ASPP at matched settings as cited in the abstract.
- **Table 8 (lines 1288–1330)**: Cityscapes test set — V3-Large OS=16: 72.6% mIOU; ESPNetv2: 66.2% mIOU.
