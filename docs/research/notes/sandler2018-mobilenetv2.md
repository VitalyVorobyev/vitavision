---
paper_id: sandler2018-mobilenetv2
title: "MobileNetV2: Inverted Residuals and Linear Bottlenecks"
authors: ["M. Sandler", "A. Howard", "M. Zhu", "A. Zhmoginov", "L. Chen"]
year: 2018
url: https://arxiv.org/pdf/1801.04381
created: 2026-05-29
relevant_atlas_pages: [mobilenetv3, fast-scnn, bisenet, convolutional-neural-network, convolution]
---

# Setting

On-device image classification backbone for mobile and resource-constrained environments. Input: an RGB image (default 224×224×3). Output: a class probability vector over ImageNet's 1000 categories. The same backbone is reused as a feature extractor for two downstream tasks: object detection (SSDLite head, COCO dataset, 320×320 input) and semantic segmentation (Mobile DeepLabv3 head, PASCAL VOC 2012). No server; all inference is expected to run on hardware with limited memory and compute budget. Accuracy is measured by top-1 on ImageNet; efficiency by MAdds (multiply-adds) and parameter count.

# Core idea

MobileNetV2 introduces two coupled innovations that jointly reduce cost while preserving representational power.

**Depthwise separable convolution as the efficiency primitive.** A standard k×k convolution with d_i input and d_j output channels costs h·w·d_i·d_j·k² MAdds. Depthwise separable convolution factorises this into a per-channel depthwise k×k filter plus a 1×1 pointwise mixer, costing h·w·d_i·(k² + d_j) — a reduction of approximately k² (exactly k²·d_j/(k²+d_j)). With k=3 this is an 8–9× saving at minor accuracy loss. MobileNetV2 uses 3×3 depthwise separable convolutions throughout (Section 3.1, Eq. 1).

**Inverted residual block with linear bottleneck.** Classic residual blocks widen internally and connect the wide layers via shortcut. MobileNetV2 inverts this: the shortcut connects the narrow bottleneck layers; the interior expands to t·k channels. The three-step block structure (Table 1) is:

1. 1×1 conv2d + ReLU6 — expand input from k channels to t·k channels
2. 3×3 depthwise conv2d, stride s, + ReLU6 — spatial filtering in the expanded space
3. linear 1×1 conv2d (no nonlinearity) — project back to k′ bottleneck channels

The final projection is linear (no ReLU) because ReLU applied to a low-dimensional manifold destroys information: if the manifold of interest can be embedded in a lower-dimensional subspace, ReLU collapses it to a ray (in the 1D case) or piecewise-linear curve, losing information that cannot be recovered (Section 3.2). Removing the nonlinearity in the narrow projection avoids this collapse. The paper shows empirically that adding a nonlinearity in the bottleneck projection hurts performance by several percent (Section 3.2, Figure 6).

The default expansion factor is t = 6 (Section 4): a 64-channel bottleneck expands to 64·6 = 384 channels before depthwise filtering. Total MAdds per block: h·w·d′·t·(d′ + k² + d″) (Section 3.3). Shortcuts exist only when stride s = 1 and input/output channel dimensions match.

The architecture starts with a standard 32-filter conv2d (stride 2), then 19 bottleneck layers tabulated in Table 2, followed by a 1×1 conv2d to 1280 channels, 7×7 avgpool, and a classifier. All spatial convolutions use 3×3 kernels and ReLU6. Width multiplier α and input-resolution multiplier ρ scale down both channels and spatial dimensions uniformly for smaller/faster variants.

# Assumptions

1. (Hard) Input images must be preprocessed to the target spatial resolution (224×224 for the default model); the network is not resolution-agnostic.
2. (Soft) The manifold of interest of each layer's activations is low-dimensional and can be embedded in a significantly lower-dimensional subspace — the justification for the linear bottleneck. If this assumption fails, the linear projection loses information that cannot be recovered.
3. (Soft) Expansion factor t > 1 is required for the inverted-residual design to be advantageous. For t < 1 the block degenerates to a conventional residual (Section 3.4).
4. (Hard) Shortcut residual connections only exist when the input and output bottleneck dimensions match and stride s = 1; otherwise no skip connection is added (Table 2 pattern).
5. (Soft) ReLU6 (clamping at 6) is assumed beneficial for low-precision fixed-point inference; it is the only nonlinearity used in expanded layers (Section 4).

# Failure regime

- **Very narrow bottlenecks (t close to 1 or width multiplier α << 1):** At very small widths the linear bottleneck assumption — that the manifold fits comfortably in the reduced-dimension space — breaks down, and accuracy degrades more steeply than MAdds savings justify. The paper notes small networks benefit from slightly smaller t but does not quantify a hard floor.
- **High-resolution, high-accuracy tasks without architectural modification:** The pooling-based classifier discards spatial detail; applying this backbone to dense prediction tasks (segmentation, detection) requires modifying strides or using atrous convolution and attaching task-specific heads. The architecture is not designed for pixel-wise output at full resolution.
- **Extreme quantisation:** While ReLU6 is chosen for robustness in low-precision computation, integer-only quantisation of the linear bottleneck projection can introduce rounding error that degrades accuracy; requires careful per-layer scale calibration.
- **Removing the linear bottleneck (adding ReLU to the projection):** Experimentally shown to hurt performance by several percent (Section 3.2, Figure 6). This is a design constraint, not merely a hyperparameter.

# Numerical sensitivity

- The expansion factor t is kept constant at 6 across all main experiments. Values in the range 5–10 produce nearly identical performance curves (Section 4), so t is not a sensitive hyperparameter in that range; values below 5 or above 10 are less well characterised.
- Width multiplier α and resolution multiplier ρ scale MAdds quadratically and the number of parameters linearly in α. A 1.4× width multiplier increases MAdds from 300M to 585M (+95%) while raising top-1 from 72.0% to 74.7% (Table 4).
- Batch normalisation is applied after every layer; weight decay is set to 0.00004 (Section 6.1). Without BN or with incorrect BN momentum, training instability can occur.
- ReLU6 clips values at 6, making activations bounded; this is beneficial for 8-bit fixed-point representation but has no effect at float32 training in practice.

# Applicability

- Use when: mobile inference on CPU/GPU with hard MAdds or latency budgets; 300 MAdds / 3.4M parameters / 75ms on Pixel 1 large core at 72% top-1 is the baseline operating point. Attach SSDLite head for detection or Mobile DeepLabv3 head for segmentation on mobile devices.
- Use when: the inverted-residual block (MBConv) is needed as a composable module — MobileNetV3, EfficientNet, and MnasNet all inherit it.
- Don't use when: highest possible accuracy on server hardware is required; ResNets or ViT-family models dominate that regime. Don't use when depth-wise separable convolution is not well-supported in the target hardware backend (some FPGA or custom ASICs prefer standard convolutions).
- Compared against: MobileNetV1 (70.6% top-1, 575M MAdds, 4.2M params), ShuffleNet 1.5 (71.5%, 292M MAdds, 3.4M params), ShuffleNet ×2 (73.7%, 524M MAdds), NASNet-A (74.0%, 564M MAdds, 5.3M params). MobileNetV2 1.0 achieves 72.0% at 300M MAdds in 75ms vs MobileNetV1's 113ms (Table 4). MobileNetV2 1.4 (74.7%) surpasses NASNet-A at comparable MAdds.

# Connections

- Builds on: MobileNetV1 (depthwise separable convolution efficiency primitive; width multiplier concept), ResNet (residual shortcut connections, He et al. 2016)
- Enables: MobileNetV3 (inherits MBConv block directly), MnasNet (MBConv as the NAS search space primitive), EfficientNet (MBConv with SE attention), Fast-SCNN (Global Feature Extractor uses MobileNetV2 inverted residual bottlenecks), BiSeNet (bilateral network that uses MobileNetV2 as a reference lightweight backbone)
- Refutes / supersedes: MobileNetV1 for most practical mobile applications (faster, smaller, more accurate at similar MAdds budget)

# Atlas update plan

## NEW: mobilenetv2
Type: model
Domain: features    (tasks: [image-classification]; arch_family: cnn)
Primary source: this paper (sandler2018-mobilenetv2)
Prerequisites: convolutional-neural-network, convolution

Relations (feeds_into authored ON THIS antecedent page — A→B, chronology A≤B holds):
- { type: feeds_into, target: mobilenetv3, confidence: high, caution: "MobileNetV3 inherits the inverted-residual + linear-bottleneck block as its core building primitive." }
- { type: feeds_into, target: fast-scnn, confidence: high, caution: "Fast-SCNN's Global Feature Extractor is built from MobileNetV2 inverted-residual bottlenecks." }
- { type: feeds_into, target: mnasnet, confidence: medium, caution: "MnasNet's MBConv search space is built on MobileNetV2's inverted-residual block." }

**Motivation:** Mobile and embedded inference requires drastically reducing computation without proportional accuracy loss. MobileNetV1 showed that depthwise separable convolutions achieve ~8–9× savings, but its linear per-layer structure leaves representational capacity on the table. MobileNetV2 targets both lower MAdds and a better accuracy-efficiency Pareto frontier.

**Architecture:**
- *Inverted residual block:* The shortcut (residual) connection joins the thin bottleneck (narrow) layers, not the wide expanded layers, which is the inverse of a classic ResNet bottleneck that connects wide layers. This allows the skip path to operate on small tensors, reducing memory pressure during inference (Section 3.3, Figure 3).
- *Linear bottleneck:* The final 1×1 projection back to bottleneck width is linear (no ReLU). Motivation from Section 3.2: activations lie on a low-dimensional manifold of interest; ReLU applied to a low-dimensional projection destroys information by collapsing the manifold to a ray or zero (Figure 1 demonstrates the spiral experiment). The linear projection preserves this manifold. Ablation (Section 3.2, Figure 6) shows adding ReLU to the bottleneck hurts several percent.
- *Expansion factor t = 6:* Default expansion ratio for all experiments. For a 64-channel input, the intermediate expanded tensor has 384 channels (64 × 6 = 384; Section 4). Expansion rates 5–10 give near-identical performance.
- *Depthwise separable conv:* 3×3 depthwise (single filter per channel) followed by 1×1 pointwise. Saves approximately k² = 9× MAdds vs standard conv at 8–9× in practice (Section 3.1, Eq. 1, footnote 1 with the exact factor k²·d_j/(k²+d_j)).
- *ReLU6:* min(max(x,0),6). Used after the expand and depthwise layers; chosen for robustness in low-precision computation (Section 4, citing MobileNetV1).
- *Architecture table (Table 2, 224×224 input):*
  - 224²×3 → conv2d/32/s=2
  - 112²×32 → bottleneck t=1, c=16, n=1, s=1
  - 112²×16 → bottleneck t=6, c=24, n=2, s=2
  - 56²×24 → bottleneck t=6, c=32, n=3, s=2
  - 28²×32 → bottleneck t=6, c=64, n=4, s=2
  - 14²×64 → bottleneck t=6, c=96, n=3, s=1
  - 14²×96 → bottleneck t=6, c=160, n=3, s=2
  - 7²×160 → bottleneck t=6, c=320, n=1, s=1
  - 7²×320 → conv2d 1×1 to 1280 → avgpool 7×7 → conv2d 1×1 to k classes
  - Total: 300M MAdds, 3.4M parameters (Table 4)
- *Width/resolution multipliers:* α scales all channel widths; ρ scales input resolution. MobileNetV2 1.4 uses α=1.4 giving 585M MAdds / 6.9M params / 74.7% top-1 (Table 4).

**Implementations:**
- TensorFlow-Slim (official, Google Inc.): referenced in Section 1 [bib.bib4]
- TensorFlow Object Detection API: used for SSDLite experiments (Section 6.2, [bib.bib38])
- PyTorch: `torchvision.models.mobilenet_v2` (open-source, BSD-3)

**Assessment:**
- *Novelty:* The linear bottleneck and the inverted shortcut topology are the key contributions. Prior mobile nets (MobileNetV1, ShuffleNet) did not combine the manifold-preservation argument with the inverted shortcut.
- *Strengths:* Achieves 72.0% top-1 at 300M MAdds / 3.4M params / 75ms on Pixel 1 (Table 4), outperforming MobileNetV1 (70.6%, 575M MAdds, 113ms) with half the MAdds and latency. Composable: the block (MBConv) became the standard building primitive for later NAS-discovered and manually designed efficient models (MobileNetV3, EfficientNet, MnasNet). Memory-efficient inference: shortcut connects small tensors so intermediate expanded tensors can be discarded immediately (Section 5.1).
- *Limitations:* The manifold-of-interest argument is heuristic; the linear projection is empirically justified rather than theoretically guaranteed. Depthwise convolutions are not always efficiently supported in hardware (some TPU/FPGA targets). At extreme compression (very small width multiplier) the accuracy cliff is steep. SSDLite mAP 22.1 (Table 6) matches MobileNetV1+SSDLite at 22.2 but both lag behind SSD300 (23.2) and SSD512 (26.8) by significant margins.

**References:**
- Sandler et al. (2018). MobileNetV2: Inverted Residuals and Linear Bottlenecks. CVPR 2018. arXiv:1801.04381.
- Howard et al. (2017). MobileNets: Efficient Convolutional Neural Networks for Mobile Vision Applications. (MobileNetV1)
- He et al. (2016). Deep Residual Learning for Image Recognition. (ResNet residual connections)

## UPDATE: mobilenetv3
Section: sources.references + # References
- The mobilenetv3 page names MobileNetV2 in prose but does not yet formally cite it. Add sandler2018-mobilenetv2 to sources.references and as a numbered # References entry, since MobileNetV3's core block is inherited from MobileNetV2.

# Provenance

1. **Abstract / Section 1 (p. 1):** "inverted residual structure where the shortcut connections are between the thin bottleneck layers"; "The intermediate expansion layer uses lightweight depthwise convolutions"; "we find that it is important to remove non-linearities in the narrow layers." Source: ar5iv HTML lines 83–100.
2. **Section 3.1, Eq. 1:** Depthwise separable convolution cost = h_i·w_i·d_i·(k² + d_j). Standard conv cost = h_i·w_i·d_i·d_j·k². Reduction factor k²·d_j/(k²+d_j) ≈ k² (footnote 1). MobileNetV2 uses k=3, reduction 8–9×. Source: ar5iv HTML lines 142–159.
3. **Section 3.2 (Linear Bottlenecks):** Manifold-of-interest argument: activations of each layer form a manifold embeddable in a low-dimensional subspace. "ReLU applied to a line in 1D space produces a 'ray'." If ReLU(Bx) has non-zero volume S, the interior is a linear transformation of input — so deep nets have only linear power on the non-zero-volume part. Conclusion: removing nonlinearity in the bottleneck projection preserves the manifold. "using non-linear layers in bottlenecks indeed hurts the performance by several percent" (footnote 3 notes the effect is weaker with shortcuts). Source: ar5iv HTML lines 162–256.
4. **Figure 1 (Section 3.2):** Spiral manifold experiment. For embedding dimension n=2,3 (small), ReLU destroys the manifold; for n=15–30, it is preserved. Visual demonstration of the manifold argument. Source: ar5iv HTML lines 191–198.
5. **Figure 3 (Section 3.3):** Classic residual block vs inverted residual block. "Note how classical residuals connects the layers with high number of channels, whereas the inverted residuals connect the bottlenecks." Diagonally hatched layers (no nonlinearity) in the bottleneck projection. Source: ar5iv HTML lines 266–291.
6. **Table 1 (Section 4):** Bottleneck residual block structure: (1) h×w×k → 1×1 conv2d + ReLU6 → h×w×(tk); (2) h×w×tk → 3×3 dwise s=s, ReLU6 → (h/s)×(w/s)×(tk); (3) (h/s)×(w/s)×tk → linear 1×1 conv2d → (h/s)×(w/s)×k′. Source: ar5iv HTML lines 340–371.
7. **Section 4 (Model Architecture):** "For all our main experiments we use expansion factor of 6." Example: 64-channel input → 64·6 = 384 expanded channels. "We use ReLU6 as the non-linearity because of its robustness when used with low-precision computation." Architecture starts with 32-filter conv2d, then 19 residual bottleneck layers. Source: ar5iv HTML lines 328–339.
8. **Table 2 (Section 4):** Full bottleneck sequence for 1.0/224 model: input 224²×3, conv2d to 32 (s=2); then bottleneck stages with t/c/n/s = 1/16/1/1, 6/24/2/2, 6/32/3/2, 6/64/4/2, 6/96/3/1, 6/160/3/2, 6/320/1/1; then conv2d 1×1 to 1280, avgpool 7×7, conv2d to k. Source: ar5iv HTML lines 372–481.
9. **Section 4:** "expansion rates between 5 and 10 result in nearly identical performance curves." Source: ar5iv HTML lines 334–336.
10. **Table 4 (Section 6.1):** ImageNet top-1 accuracy comparisons: MobileNetV1 70.6% / 575M MAdds / 4.2M params / 113ms; ShuffleNet 1.5 71.5% / 292M MAdds / 3.4M params; ShuffleNet ×2 73.7% / 524M MAdds; NASNet-A 74.0% / 564M MAdds / 5.3M params / 183ms; **MobileNetV2 1.0 72.0% / 300M MAdds / 3.4M params / 75ms**; MobileNetV2 1.4 74.7% / 585M MAdds / 6.9M params / 143ms. Source: ar5iv HTML lines 707–768.
11. **Table 5 (Section 6.2):** SSDLite vs SSD (with MobileNetV2 backbone, 80 classes): SSD = 14.8M params / 1.25B MAdds; **SSDLite = 2.1M params / 0.35B MAdds**. Source: ar5iv HTML lines 787–812.
12. **Table 6 (Section 6.2):** COCO mAP (test-dev, 320×320): SSD300=23.2, SSD512=26.8, YOLOv2=21.6, MobileNetV1+SSDLite=22.2 (5.1M, 1.3B, 270ms), **MobileNetV2+SSDLite=22.1 (4.3M, 0.8B, 200ms)**. Source: ar5iv HTML lines 825–884.
13. **Section 6.3 / Table 7 (Semantic Segmentation):** Mobile DeepLabv3 on PASCAL VOC 2012. MobileNetV2* (second-to-last feature map) + DeepLabv3, output_stride=16, ASPP: **75.70% mIOU, 4.52M params, 5.8B MAdds**. Best mobile candidate identified: 75.32% mIOU at 2.75B MAdds (bold in Table 7). Source: ar5iv HTML lines 886–901.
14. **Training setup (Section 6.1):** RMSPropOptimizer, decay=momentum=0.9; batch normalisation after every layer; weight decay 0.00004; initial LR 0.045, decay 0.98 per epoch; 16 GPU asynchronous workers, batch size 96. Source: ar5iv HTML lines 692–697.
