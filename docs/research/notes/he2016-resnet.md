---
paper_id: he2016-resnet
title: "Deep Residual Learning for Image Recognition"
authors: ["K. He", "X. Zhang", "S. Ren", "J. Sun"]
year: 2016
url: https://arxiv.org/pdf/1512.03385
created: 2026-05-13
relevant_atlas_pages: [alexnet, vgg, googlenet, fcn-semantic-segmentation, mask-rcnn, deeplab-semantic-segmentation, loftr]
---

# Setting

Image classification on the ImageNet Large Scale Visual Recognition Challenge (ILSVRC) 2012 dataset: 1.28 million training images, 50k validation images, 100k test images across 1000 object categories. Inputs are 224×224 RGB crops randomly sampled from images whose shorter side is in [256, 480], with per-pixel mean subtracted and standard color augmentation applied (§3.4). Outputs are 1000-way softmax class probabilities; evaluation metrics are top-1 and top-5 error rates.

Secondary settings: CIFAR-10 (50k training / 10k test, 10 classes, 32×32 inputs) for architecture analysis (§4.2); PASCAL VOC 2007/2012 and MS COCO object detection as transfer targets with Faster R-CNN replacing the VGG-16 backbone with ResNet-101 (§4.3, Tables 7/8).

# Core idea

Plain deep networks suffer from a *degradation problem*: adding more layers to a suitably deep model raises training error, not just test error — the deeper 34-layer plain net achieves 28.54% top-1 validation error against 27.94% for the shallower 18-layer plain net (Table 2, §4.1). The problem is not overfitting; it is an optimization difficulty (§1, Fig. 1, Fig. 4).

The residual learning framework attacks this by reformulating what each block of layers must fit. Rather than having stacked nonlinear layers approximate a desired mapping $H(x)$ directly, they are made to approximate the residual $F(x) := H(x) - x$, so the original mapping is recast as $F(x) + x$. The authors hypothesize that optimizing the residual is easier: if the optimal mapping is close to identity, it is easier to push $F$ toward zero than to fit identity through a stack of nonlinear layers (§3.1).

The shortcut realizing this is an element-wise addition. When input and output dimensions match, the identity shortcut is parameter-free (Eq. 1):

$y = \mathcal{F}(x, \{W_i\}) + x$

When dimensions differ (e.g., when channel count or spatial resolution changes between stages), a linear projection $W_s$ is applied (Eq. 2):

$y = \mathcal{F}(x, \{W_i\}) + W_s x$

with $W_s$ implemented as a 1×1 convolution with stride 2. The paper evaluates three shortcut options for dimension-changing connections: (A) zero-padding (no extra parameters), (B) projection only when dimensions change, (C) all projections. Option B is selected as the default because A leaves zero-padded dimensions without residual learning, and C doubles complexity for bottleneck designs (§3.3, Table 3).

For ResNet-50/101/152, each residual function $\mathcal{F}$ uses a *bottleneck* design: a 1×1 convolution to reduce channels, followed by a 3×3 convolution, followed by a 1×1 convolution to restore channels (§3.3, Fig. 5). This keeps time complexity comparable to the two-layer 3×3 basic block used in ResNet-18/34 while allowing much greater depth. The 50-layer ResNet has 3.8B FLOPs, the 152-layer 11.3B FLOPs — both below VGG-19's 19.6B FLOPs (Table 1, §3.3).

# Assumptions

1. **[hard] Degradation is an optimization problem, not a vanishing-gradient problem.** The paper trains plain nets with BatchNorm (BN), verifies healthy gradient norms, yet still observes degradation. The authors conjecture deep plain nets may have exponentially low convergence rates (§4.1). The residual reformulation addresses this; BN alone does not.

2. **[hard] Identity shortcuts suffice for dimension-matching blocks.** When input and output have the same spatial dimensions and channel count, a parameter-free identity shortcut resolves the degradation problem. Projection shortcuts add marginal accuracy (option C slightly better than B, B slightly better than A) but are not essential (§3.3, Table 3).

3. **[soft] Projection shortcuts are used only for dimension changes.** Option B (projection shortcuts only when dimensions change) is the default; option C (all projections) is marginally better but doubles memory/time for bottleneck architectures (§3.3). The choice is a practical tradeoff, not a theoretical requirement.

4. **[hard] BatchNorm is applied after each convolution, before activation.** This is required for the very deep nets (50–152 layers) to converge stably. Without BN, even residual shortcuts are insufficient (§3.4, implicit; BN is a hard prerequisite for all ResNet results in the paper, following Ioffe & Szegedy [16]).

5. **[hard] He initialization is used for all weights.** Weights are initialized from $\mathcal{N}(0, \sigma^2)$ with $\sigma^2 = 2/n$ following [12] (Delving Deep into Rectifiers). All plain and residual nets in the paper are trained from scratch with this initialization (§3.4).

6. **[soft] Residual functions are typically 2–3 layers deep.** The basic block uses two 3×3 convolutions; the bottleneck uses three layers (1×1 → 3×3 → 1×1). A single-layer residual reduces to $y = W_1 x + x$, which offers no observed advantage (§3.2).

# Failure regime

**Depth without residual shortcuts: plain-net degradation.** The 34-layer plain net has top-1 validation error 28.54% vs 27.94% for the 18-layer plain net (Table 2, §4.1). The degradation is in *training* error, not just test error, ruling out overfitting (Fig. 4 left). The problem persists even with 3× more training iterations (footnote 3, §4.1).

**Over-depth on small datasets: 1202-layer CIFAR-10 overfitting.** The 1202-layer ResNet achieves test error 7.93% on CIFAR-10 — worse than the 110-layer model's 6.43% (Table 6, §4.2). Both models reach training error below 0.1% (Fig. 6 right), so the gap is overfitting: the 1202-layer model has 19.4M parameters while the dataset has only 50k training images. The paper attributes this to insufficient regularization (no dropout or maxout used); strong regularization would likely close the gap (§4.2).

**Figure 1 / Fig. 4 reproducibility:** The degradation on CIFAR-10 (Fig. 1) is confirmed on ImageNet (Fig. 4 left). The 20-layer plain net achieves lower training error than the 56-layer plain net throughout all training iterations on CIFAR-10 (Fig. 1 left).

**Plain-net degradation is not vanishing gradients.** Backward-propagated gradients have healthy norms when BN is applied; the 34-layer plain net still achieves competitive accuracy (Table 3, §4.1), so the solver does eventually converge — just at a degraded optimum. The mechanism is conjectured to be exponentially slow convergence rather than outright gradient death.

# Numerical sensitivity

- **Weight initialization:** He 2015 initialization ([12], Delving Deep), $\mathcal{N}(0, \sigma^2)$ with $\sigma^2 = 2/n$ where $n$ is the fan-in. Critical for stable convergence of very deep networks; Glorot/uniform initialization is not used (§3.4).
- **Batch Normalization:** Applied after every convolution and before activation, following Ioffe & Szegedy [16]. No dropout used (§3.4).
- **SGD training (ImageNet):** momentum 0.9, weight decay $10^{-4}$, mini-batch size 256, initial LR 0.1 divided by 10 when error plateaus, up to $60 \times 10^4$ iterations (§3.4).
- **SGD training (CIFAR-10):** same momentum/weight-decay, mini-batch size 128 on two GPUs, initial LR 0.1, divided by 10 at 32k and 48k iterations, terminate at 64k iterations (§4.2). For the 110-layer model specifically: warm-up with LR 0.01 until training error < 80% (~400 iterations), then revert to 0.1 (§4.2, footnote 5).
- **Testing (ImageNet):** 10-crop for comparison studies; fully-convolutional multi-scale for best results, scales {224, 256, 384, 480, 640} shorter-side (§3.4).
- **FLOPs sensitivity:** ResNet-50 (3.8B), ResNet-101 (7.6B), ResNet-152 (11.3B) — all below VGG-16/19 (15.3/19.6B). Bottleneck design is what keeps 50+ layer models tractable (Table 1, §3.3).
- **32-bit float vs 64-bit:** not explicitly discussed in the paper. The reference Caffe implementation uses float32 throughout; BN normalization (mean/variance estimation over mini-batches) is the main numerical sensitivity.

# Applicability

- **Use when:** building an image classification backbone or a transfer-learning starting point for detection/segmentation; depth > 20 layers is desired; pretrained ImageNet weights are available (torchvision, timm). The residual shortcut resolves the optimization barrier that makes plain depth scaling fail.
- **Use when (transfer):** swapping the VGG-16 backbone in Faster R-CNN for ResNet-101 yields +3.2% mAP on PASCAL VOC 2007 (Table 7) and +6.9% mAP@0.5 on COCO (Table 8); the same substitution in segmentation frameworks is the basis for DeepLab v2 and the torchvision FCN-ResNet port.
- **Don't use when:** extreme inference-latency or memory constraints apply (prefer MobileNet/EfficientNet families); task requires dense prediction at full input resolution without feature-pyramid extensions (the strided spatial downsampling in conv3_1/conv4_1/conv5_1 reduces spatial resolution to 7×7 by the final stage, which loses fine-grained localization without dilated convolutions or FPN).
- **Don't use when:** the dataset is very small (< ~50k images) and the model variant is very deep (1202-layer CIFAR-10 result shows overfitting without strong regularization — §4.2).
- **Compared against:** VGG-19 (28.07% top-1 / 9.33% top-5 single-model, Table 3), GoogLeNet/Inception-v1 (9.15% top-5, Table 3), BN-Inception (21.99% top-1 / 5.81% top-5, Table 4), PReLU-net (21.59% top-1 / 5.71% top-5, Table 4). ResNet-152 single model: 19.38% top-1 / 4.49% top-5 (Table 4); 6-model ensemble: 3.57% top-5 on test set (Table 5).

# Connections

- **Builds on:** krizhevsky2012-alexnet (AlexNet, ImageNet classification with deep CNNs [21]), simonyan2014-vgg (VGG, very deep plain networks [40]), szegedy2015-inception (GoogLeNet, Inception-v1 [43]), ioffe2015-batchnorm (BatchNorm [16], cited as [16] in the paper — verify paper_id in index.yaml `?`)
- **Enables:** he2017-maskrcnn (Mask R-CNN uses ResNet-50/101 + FPN as headline backbones), long2015-fcn (community torchvision FCN-ResNet50/101 port; not paper-authored but the dominant practical form), chen2018-deeplab (DeepLab v2 and later use ResNet-101 as backbone)
- **Refutes / supersedes:** not strictly — AlexNet, VGG, and GoogLeNet remain in use and are cited; ResNet establishes residual shortcuts as the standard for deep CNNs rather than refuting prior architectures. The paper positions itself as enabling depth gains that plain nets (VGG-style) cannot achieve, not as making VGG wrong.

# Atlas update plan

## NEW: resnet
Type: model
Category: classification / backbone
Primary source: this paper
Bullets per public-page section:
- Goal: Enable training of very deep convolutional networks (up to 152 layers) for image classification by reformulating layer learning as residual functions, resolving the degradation problem that prevents depth gains in plain networks.
- Family & shape: deep CNN (18, 34, 50, 101, 152 layers); residual building blocks — basic 2×(3×3 conv) for ResNet-18/34, bottleneck 1×1 → 3×3 → 1×1 for ResNet-50/101/152; ImageNet 224×224 RGB input → 1000-way softmax.
- Architecture: §3.3 / Table 1 — five stages: conv1 7×7/stride-2/64 filters then 3×3 max-pool/stride-2; conv2_x 56×56 feature maps, 3 bottleneck blocks (50-layer); conv3_x 28×28, 4 blocks; conv4_x 14×14, 6/23/36 blocks for 50/101/152-layer; conv5_x 7×7, 3 blocks; global average pool + FC-1000 + softmax.
- Residual block math: $y = \mathcal{F}(x, \{W_i\}) + x$ when dims match (Eq. 1); $y = \mathcal{F}(x, \{W_i\}) + W_s x$ when dims differ, with $W_s$ as 1×1 conv (Eq. 2). Bottleneck uses 1×1 (reduce) → 3×3 → 1×1 (restore) (§3.3, Fig. 5).
- Training: He init (§3.4), BN after every conv before activation (§3.4), SGD with momentum 0.9, weight decay $10^{-4}$, batch 256, LR 0.1 ÷10 at plateau, up to 600K iterations on ImageNet; no dropout.
- Results: ILSVRC-2015 winning entry. ResNet-152 top-5 val error 4.49% single model (Table 4), 3.57% 6-model ensemble (Table 5, §4.1). On CIFAR-10: 110-layer 6.43%, 1202-layer 7.93% (Table 6, §4.2). Transfer: PASCAL VOC mAP ResNet-101 76.4% vs VGG-16 73.2% (Table 7); COCO mAP@[.5,.95] ResNet-101 27.2% vs VGG-16 21.2% (Table 8).
- Implementations: PyTorch torchvision `torchvision.models.resnet{18,34,50,101,152}` (BSD-3-Clause); Microsoft Research original Caffe release; timm (rwightman, Apache-2.0).
- Remarks: The residual shortcut is the mechanism that unlocks training depth beyond ~20 layers; the degradation problem is an optimization landscape issue (not vanishing gradients) as evidenced by BN providing healthy gradient norms in plain nets that still degrade (§1, §4.1, Fig. 1).
- References: krizhevsky2012-alexnet, simonyan2014-vgg, szegedy2015-inception, long2015-fcn

Relations:
- { type: feeds_into, target: mask-rcnn, confidence: high, caution: "Mask R-CNN headline backbones are ResNet-50/101 and ResNeXt-101 paired with FPN (Mask R-CNN §3.1, Table 1)." }
- { type: feeds_into, target: deeplab-semantic-segmentation, confidence: high, caution: "DeepLab v2 onward uses ResNet-101 as the dense-prediction backbone; v1 used VGG-16." }
- { type: feeds_into, target: fcn-semantic-segmentation, confidence: medium, caution: "The torchvision FCN-ResNet50/101 port swaps the paper's VGG-16 backbone for ResNet; not the design Long et al. published." }
- { type: feeds_into, target: loftr, confidence: medium, caution: "LoFTR's local-feature CNN is a ResNet-like backbone with FPN structure (LoFTR §3.1)." }
- { type: compared_with, target: googlenet, confidence: high, caution: "Both push depth beyond VGG: GoogLeNet 22 layers via Inception modules, ResNet up to 152 via residual blocks; ResNet-152 wins ILSVRC-2015 over BN-Inception baselines (Table 4/5)." }

## UPDATE: vgg
Section: Relations / Remarks
- Add Relations entry: { type: extended_by, target: resnet, confidence: high, caution: "ResNet reformulates VGG-style plain depth scaling: identity shortcuts let 152-layer nets train where 19-layer plain nets already plateau (ResNet §1, Fig. 1)." }
- Existing Remarks bullet on "VGG depth saturation at 16 layers" already correctly cross-references ResNet; no body change needed.

## UPDATE: alexnet
Section: Relations / Remarks
- Existing Remarks bullet already names ResNet as a successor; no Relations change strictly required since the AlexNet → VGG → ResNet lineage flows through VGG's extended_by → resnet edge.
- Optional: keep as is.

## UPDATE: googlenet
Section: Relations
- Add Relations entry: { type: compared_with, target: resnet, confidence: high, caution: "ResNet (2015, 152 layers, residual blocks) follows GoogLeNet (2014, 22 layers, Inception modules); ResNet wins ILSVRC-2015 classification at 3.57% top-5 vs GoogLeNet's 6.67% (paper §4.1, Table 4)." }
- The existing Remarks bullet on auxiliary classifiers being superseded by BN/ResNet already cross-references ResNet correctly.

## UPDATE: fcn-semantic-segmentation
Section: sources.references / Backbone-sensitivity
- Add `he2016-resnet` to `sources.references`.
- The Remarks bullet on torchvision FCN-ResNet50/101 already cross-references ResNet; no body rewrite needed.

## UPDATE: mask-rcnn
Section: sources.references
- Add `he2016-resnet` to `sources.references` (paper §3 declares ResNet-50/101 backbones as the headline design).
- Body already names ResNet repeatedly; relations entry from resnet → mask-rcnn handles the typed edge.

## UPDATE: deeplab-semantic-segmentation
Section: sources.references
- Add `he2016-resnet` to `sources.references` (DeepLab v2 declares ResNet-101 backbone).
- Relations edge from resnet → deeplab-semantic-segmentation handles the typed link.

## UPDATE: loftr
Section: sources.references
- Add `he2016-resnet` to `sources.references` (LoFTR §3.1 uses a ResNet-like FPN backbone).
- Relations edge from resnet → loftr handles the typed link.

# Provenance

- **§1 (Introduction) / Fig. 1:** Introduces the degradation problem with CIFAR-10 training/test error curves for 20-layer vs 56-layer plain nets; 56-layer plain net has *higher training error* — rules out overfitting. Caption confirms "Similar phenomena on ImageNet is presented in Fig. 4."
- **§3.1 (Residual Learning):** Defines $H(x)$ as the desired mapping and $F(x) := H(x) - x$ as the residual. States the reformulation hypothesis: residual is easier to optimize than unreferenced mapping. Notes that if identity is optimal, it is easier to push $F \to 0$ than to fit identity via nonlinear layers.
- **Eq. 1 (§3.2):** $y = \mathcal{F}(x, \{W_i\}) + x$ — identity shortcut, parameter-free.
- **Eq. 2 (§3.2):** $y = \mathcal{F}(x, \{W_i\}) + W_s x$ — projection shortcut for dimension mismatch; $W_s$ implemented as 1×1 conv.
- **§3.3 (Network Architectures):** Describes plain and residual variants; options A (zero-padding), B (projection for dim-change only), C (all projections); B selected as default. Bottleneck design: 1×1 → 3×3 → 1×1 for ResNet-50/101/152.
- **Table 1:** Layer configurations for ResNet-18/34/50/101/152. conv1: 7×7/stride-2/64; conv2_x through conv5_x block counts per depth variant; global avg pool + FC-1000. FLOPs: 1.8B (18-layer), 3.6B (34-layer), 3.8B (50-layer), 7.6B (101-layer), 11.3B (152-layer).
- **§3.4 (Implementation):** Training details — 224×224 crops from images with shorter side in [256, 480]; per-pixel mean subtracted; BN after each conv before activation; He 2015 init [12]; SGD momentum 0.9, weight decay $10^{-4}$ (0.0001), batch 256, LR 0.1 ÷10 at plateau, up to $60 \times 10^4$ iterations; no dropout. Test: 10-crop standard; fully-convolutional multi-scale for best results.
- **Table 2:** Top-1 error (10-crop, ImageNet val): plain-18 27.94%, plain-34 28.54%, ResNet-18 27.88%, ResNet-34 25.03%. Documents plain-net degradation and residual-net improvement.
- **Table 3:** 10-crop testing ImageNet val — VGG-16 28.07%/9.33% top-1/top-5; GoogLeNet –/9.15%; PReLU-net 24.27%/7.38%; plain-34 28.54%/10.02%; ResNet-34 A/B/C 25.03/24.52/24.19 top-1; ResNet-50 22.85%/6.71%; ResNet-101 21.75%/6.05%; ResNet-152 21.43%/5.71%.
- **Table 4:** Single-model results on ImageNet val — BN-Inception 21.99%/5.81%; ResNet-34 B 21.84%/5.71%; ResNet-50 20.74%/5.25%; ResNet-101 19.87%/4.60%; ResNet-152 19.38%/4.49%. GoogLeNet (ILSVRC'14) –/7.89%.
- **Table 5:** Ensemble top-5 error on ImageNet test set — GoogLeNet (ILSVRC'14) 6.66%; VGG (v5) 6.8%; BN-Inception 4.82%; ResNet (ILSVRC'15) **3.57%**.
- **§4.2 / Table 6 (CIFAR-10):** ResNet-110 (1.7M params): 6.43% (best; mean±std 6.61±0.16); ResNet-1202 (19.4M params): 7.93%. Confirms depth-overfitting at 1202 layers on 50k training images without strong regularization.
- **§4.2 LR warm-up (footnote 5):** For 110-layer ResNet on CIFAR-10, initial LR 0.1 is too large; warm up with 0.01 until training error < 80% (~400 iterations), then revert to 0.1.
- **§4.2 CIFAR-10 training schedule:** batch 128 on two GPUs, LR 0.1 ÷10 at 32k and 48k iterations, terminate at 64k; 45k/5k train/val split for schedule determination.
- **Fig. 4 (§4.1):** Training curves on ImageNet — left (plain): 34-layer has higher training and validation error than 18-layer throughout; right (residual): 34-layer ResNet dominates 18-layer ResNet, confirming residual learning resolves degradation.
- **Fig. 5 (§3.3):** Building blocks — left: basic 2×(3×3 conv) block for ResNet-34 (64-d feature maps); right: bottleneck 1×1/64 → 3×3/64 → 1×1/256 for ResNet-50+ (256-d feature maps).
- **Fig. 7 (§4.2):** Standard deviations of layer responses on CIFAR-10: ResNets have generally smaller responses than plain counterparts, supporting §3.1 hypothesis that residual functions are close to zero.
- **Table 7 (§4.3):** PASCAL VOC object detection mAP — VGG-16 73.2% (VOC 07 test), ResNet-101 76.4%.
- **Table 8 (§4.3):** COCO detection — VGG-16 mAP@.5 41.5% / mAP@[.5,.95] 21.2%; ResNet-101 48.4% / 27.2%. Relative improvement in mAP@[.5,.95]: $(27.2 - 21.2) / 21.2 \approx 28\%$, matching the "28% relative improvement" claimed in the Abstract.
- **References [12]:** K. He et al., "Delving deep into rectifiers," ICCV 2015 — the He initialization source.
- **References [16]:** S. Ioffe and C. Szegedy, "Batch normalization," ICML 2015 — BN source; cited as `ioffe2015-batchnorm` (`?` — verify paper_id exists in docs/papers/index.yaml).
- **References [40]:** K. Simonyan and A. Zisserman, VGG, ICLR 2015 — plain-net baseline and VGG-19 FLOPs (19.6B) referenced.
- **References [43]:** C. Szegedy et al., GoogLeNet, CVPR 2015 — GoogLeNet top-5 6.66% ensemble (Table 5).
