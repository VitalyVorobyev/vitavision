---
title: "ResNet"
date: 2026-05-13
summary: "Family of very deep CNN image classifiers (18 to 152 layers) built from residual blocks $y = \\mathcal{F}(x, \\{W_i\\}) + x$ that reformulate each block as learning a residual mapping rather than a direct one, resolving the depth-degradation problem and enabling 152-layer training. ILSVRC-2015 classification winner (3.57% top-5 test ensemble) and the default backbone for downstream detection and segmentation."
tags: ["deep-learning"]
domain: features
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "11.7M (ResNet-18), 25.6M (ResNet-50), 44.5M (ResNet-101), 60.2M (ResNet-152) — torchvision"
flops: "1.8 GMAC (18), 3.8 GMAC (50), 7.6 GMAC (101), 11.3 GMAC (152) @ 224×224 (Table 1)"
prerequisites: [convolutional-neural-network]
failureModes: []
relations:
  - type: compared_with
    target: googlenet
    confidence: high
    caution: "Both push depth beyond VGG: GoogLeNet 22 layers via Inception modules, ResNet up to 152 via residual blocks. ResNet-152 single model 4.49% top-5 val vs GoogLeNet ensemble 6.66% top-5 test (Tables 4/5)."
  - type: feeds_into
    target: mask-rcnn
    confidence: high
    caution: "Mask R-CNN's headline backbones are ResNet-50/101 and ResNeXt-101 paired with FPN."
  - type: feeds_into
    target: deeplab-semantic-segmentation
    confidence: high
    caution: "DeepLab v2 onward uses ResNet-101 as the dense-prediction backbone; v1 used VGG-16."
  - type: feeds_into
    target: loftr
    confidence: medium
    caution: "LoFTR's local-feature CNN is a ResNet-like backbone with FPN structure."
sources:
  primary: he2016-resnet
  references:
    - krizhevsky2012-alexnet
    - simonyan2014-vgg
    - szegedy2015-inception
    - long2015-fcn
  notes: |
    Paper §1 / Fig. 1: degradation problem on CIFAR-10 — 56-layer plain net
    has higher training error than 20-layer plain net, ruling out overfitting.
    §3.1 residual learning: stacked layers learn $\mathcal{F}(x) := H(x) - x$
    rather than $H(x)$ directly, and the block computes $\mathcal{F}(x) + x$.
    §3.2 / Eq. 1: $y = \mathcal{F}(x, \{W_i\}) + x$ identity shortcut.
    §3.2 / Eq. 2: $y = \mathcal{F}(x, \{W_i\}) + W_s x$ projection shortcut
    when input/output dimensions differ; $W_s$ is a 1×1 convolution.
    §3.3 / Table 1: five stages — conv1 (7×7/stride-2/64); conv2_x at 56×56
    with 3 blocks (50-layer) / 3 (101-layer) / 3 (152-layer); conv3_x at
    28×28 with 4 / 4 / 8 blocks; conv4_x at 14×14 with 6 / 23 / 36 blocks;
    conv5_x at 7×7 with 3 / 3 / 3 blocks; global average pool + FC-1000 +
    softmax. Bottleneck block (§3.3, Fig. 5): 1×1 (reduce) → 3×3 → 1×1
    (restore), 4× channel expansion. Three shortcut options (§3.3, Table 3):
    A zero-padding, B projection only when dims change, C all projections;
    B selected as default. §3.4 implementation: 224×224 crops from short-side
    [256, 480]; per-pixel mean subtracted; standard color augmentation; BN
    after every conv before activation [16]; He 2015 init [12]; SGD momentum
    0.9, weight decay 10⁻⁴, batch 256, initial LR 0.1 ÷10 at plateau, up to
    60·10⁴ iterations; no dropout. Test: 10-crop standard for comparison;
    fully-convolutional multi-scale {224, 256, 384, 480, 640} for best
    results. Table 2 (top-1 val, 10-crop): plain-18 27.94%, plain-34 28.54%,
    ResNet-18 27.88%, ResNet-34 25.03% — documents plain-net degradation
    and residual-net resolution. Table 4 single-model val: ResNet-152
    19.38% top-1 / 4.49% top-5; BN-Inception 21.99% / 5.81%. Table 5
    ensemble test: ResNet 6-model 3.57% top-5; VGG (v5) 6.8%; GoogLeNet
    (ILSVRC'14) 6.66%; BN-Inception 4.82%. §4.2 CIFAR-10 (Table 6):
    ResNet-110 6.43% (1.7M params); ResNet-1202 7.93% (19.4M params) —
    overfitting without strong regularization. §4.2 footnote 5: 110-layer
    needs warm-up LR 0.01 until training error < 80%, then 0.1. §4.3
    transfer (Table 7): PASCAL VOC 07 test mAP — VGG-16 73.2%, ResNet-101
    76.4%. Table 8 COCO: VGG-16 mAP@[.5,.95] 21.2%, ResNet-101 27.2% —
    28% relative improvement.
implementations:
  - role: official
    repo: https://github.com/KaimingHe/deep-residual-networks
    commit: a7026cb6d478e131b765b898c312e25f9f6dc031
    framework: caffe
    license: MIT
  - role: community
    repo: https://github.com/pytorch/vision
    commit: afc54f754c734d903a06194e416495e20d920ff6
    framework: pytorch
    license: BSD-3-Clause
    weights_url: https://download.pytorch.org/models/resnet50-0676ba61.pth
    weights_license: BSD-3-Clause
draft: false
---

# Motivation

ResNet takes a $(3, 224, 224)$ RGB image as input and produces a $(1000,)$ softmax probability vector. The defining property is the residual reformulation: rather than fitting a stacked-layer mapping $H(x)$ directly, each building block approximates the residual $\mathcal{F}(x) := H(x) - x$, so the full mapping is realised as $\mathcal{F}(x) + x$. This reformulation resolves the degradation problem that prevents plain networks from improving with additional depth — a problem distinct from vanishing gradients, as plain nets trained with BatchNorm exhibit healthy gradient norms yet still reach worse optima as depth increases beyond approximately 20 layers.

# Architecture

**Family & shape.** CNN. Input $(3, 224, 224)$ RGB; output $(1000,)$ softmax probabilities. The family covers five depth variants — ResNet-18, ResNet-34, ResNet-50, ResNet-101, and ResNet-152 — organised in a five-stage layout. ResNet-18 and ResNet-34 use the basic block (two stacked $3 \times 3$ convolutions); ResNet-50, ResNet-101, and ResNet-152 use the bottleneck block ($1 \times 1 \to 3 \times 3 \to 1 \times 1$).

**Blocks.** Each residual unit wraps its layer stack in a shortcut connection. When input and output dimensions match, the identity shortcut is parameter-free (§3.2, Eq. 1):

$$y = \mathcal{F}(x, \{W_i\}) + x$$

When channel count or spatial resolution changes between stages, a linear projection $W_s$ is applied via a $1 \times 1$ convolution with stride 2 (§3.2, Eq. 2):

$$y = \mathcal{F}(x, \{W_i\}) + W_s x$$

Three shortcut options are evaluated for dimension-changing connections: (A) zero-padding (no extra parameters), (B) projection shortcut only when dimensions change, (C) all shortcuts as projections. Option B is selected as the default — option A leaves zero-padded dimensions without residual learning, and option C approximately doubles complexity for bottleneck architectures (§3.3, Table 3).

For ResNet-50/101/152, the residual function $\mathcal{F}$ uses a bottleneck design: a $1 \times 1$ convolution reducing channels, then a $3 \times 3$ convolution, then a $1 \times 1$ convolution restoring channels (§3.3, Fig. 5). BatchNorm is applied after each convolution and before the ReLU activation throughout.

The five-stage layer structure, following Table 1 of the paper:

| Layer | Output size | ResNet-18 | ResNet-34 | ResNet-50 | ResNet-101 | ResNet-152 |
|-------|:-----------:|:---------:|:---------:|:---------:|:----------:|:----------:|
| conv1 | 112×112 | 7×7/2, 64 | 7×7/2, 64 | 7×7/2, 64 | 7×7/2, 64 | 7×7/2, 64 |
| conv2_x | 56×56 | [3×3, 64]×2 | [3×3, 64]×3 | [1×1, 64; 3×3, 64; 1×1, 256]×3 | [1×1, 64; 3×3, 64; 1×1, 256]×3 | [1×1, 64; 3×3, 64; 1×1, 256]×3 |
| conv3_x | 28×28 | [3×3, 128]×2 | [3×3, 128]×4 | [1×1, 128; 3×3, 128; 1×1, 512]×4 | [1×1, 128; 3×3, 128; 1×1, 512]×4 | [1×1, 128; 3×3, 128; 1×1, 512]×8 |
| conv4_x | 14×14 | [3×3, 256]×2 | [3×3, 256]×6 | [1×1, 256; 3×3, 256; 1×1, 1024]×6 | [1×1, 256; 3×3, 256; 1×1, 1024]×23 | [1×1, 256; 3×3, 256; 1×1, 1024]×36 |
| conv5_x | 7×7 | [3×3, 512]×2 | [3×3, 512]×3 | [1×1, 512; 3×3, 512; 1×1, 2048]×3 | [1×1, 512; 3×3, 512; 1×1, 2048]×3 | [1×1, 512; 3×3, 512; 1×1, 2048]×3 |
| pool + FC | 1×1, 1000 | avg pool, FC-1000 | avg pool, FC-1000 | avg pool, FC-1000 | avg pool, FC-1000 | avg pool, FC-1000 |
| FLOPs | — | 1.8B | 3.6B | 3.8B | 7.6B | 11.3B |

The bottleneck residual unit in PyTorch (torchvision @ afc54f7):

```python
# torchvision/models/resnet.py @ afc54f7  (BSD-3-Clause)
# torchvision places the stride at conv2 (3×3), not conv1 (1×1) as in the paper.
# This variant is known as ResNet V1.5 and improves accuracy slightly.
class Bottleneck(nn.Module):
    expansion: int = 4

    def __init__(self, inplanes, planes, stride=1, downsample=None,
                 groups=1, base_width=64, dilation=1, norm_layer=None):
        super().__init__()
        if norm_layer is None:
            norm_layer = nn.BatchNorm2d
        width = int(planes * (base_width / 64.0)) * groups
        self.conv1 = conv1x1(inplanes, width)
        self.bn1   = norm_layer(width)
        self.conv2 = conv3x3(width, width, stride, groups, dilation)
        self.bn2   = norm_layer(width)
        self.conv3 = conv1x1(width, planes * self.expansion)
        self.bn3   = norm_layer(planes * self.expansion)
        self.relu  = nn.ReLU(inplace=True)
        self.downsample = downsample

    def forward(self, x):
        identity = x
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.relu(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        if self.downsample is not None:
            identity = self.downsample(x)
        out += identity
        return self.relu(out)
```

**Training.** Trained on ILSVRC ImageNet: 1.28 million training images, 50k validation images, 100k test images, 1000 classes (§3.4). Objective: standard softmax cross-entropy. Optimiser: SGD with momentum $0.9$, weight decay $10^{-4}$, mini-batch 256, initial learning rate $0.1$ divided by $10$ when error plateaus, up to $60 \times 10^4$ iterations. Augmentation: $224 \times 224$ random crops from images rescaled with shorter side in $[256, 480]$, per-pixel mean subtraction, and standard colour augmentation. Weights initialised from $\mathcal{N}(0, \sigma^2)$ with $\sigma^2 = 2/n$ (He 2015 initialisation); no dropout. Headline results:

- Plain-18 top-1 val: **27.94%**; plain-34 top-1 val: **28.54%** — the 34-layer plain net is *worse* than the 18-layer plain net, confirming the degradation problem (Table 2).
- ResNet-152 single model: **19.38% top-1 / 4.49% top-5** validation (Table 4).
- 6-model ResNet ensemble: **3.57% top-5** on the ImageNet test set, winning ILSVRC-2015 (Table 5).
- CIFAR-10: ResNet-110 **6.43%** test error; ResNet-1202 **7.93%** (Table 6, §4.2).
- Transfer to detection — PASCAL VOC 2007: ResNet-101 **76.4% mAP** vs VGG-16 **73.2%** (Table 7); COCO mAP@[.5,.95]: ResNet-101 **27.2%** vs VGG-16 **21.2%** (Table 8).

**Complexity.** ResNet-18: 11.7M parameters, 1.8B FLOPs; ResNet-50: 25.6M parameters, 3.8B FLOPs; ResNet-101: 44.5M parameters, 7.6B FLOPs; ResNet-152: 60.2M parameters, 11.3B FLOPs — all below VGG-16 (15.3B) and VGG-19 (19.6B) (Table 1, torchvision).

# Implementations

The original Caffe release accompanies the paper; the PyTorch torchvision port (`torchvision.models.resnet{18,34,50,101,152}`) is the de-facto practical reference and ships pretrained ImageNet weights.

# Assessment

**Novelty.**

- Identified the degradation problem as an optimization difficulty — not vanishing gradients — by demonstrating that plain nets trained with BatchNorm still degrade with depth (§1, Fig. 1, Fig. 4); AlexNet and VGG share the same class of depth-scaling failure.
- Introduced residual shortcuts as parameter-free identity connections that bypass the optimization barrier, enabling systematic depth scaling from 8 layers (AlexNet) and 19 layers (VGG) to 152 layers.
- Demonstrated that the bottleneck block keeps FLOPs comparable to the shallower basic block (ResNet-50 at 3.8B FLOPs is below VGG-19 at 19.6B), decoupling depth from compute growth — a strictly more efficient path than GoogLeNet's Inception module for equal-depth networks.
- Showed that the residual reformulation generalises: the same shortcut mechanism, without architecture-specific tuning, yields improvements from CIFAR-10 through ImageNet detection and segmentation benchmarks.

**Strengths.**

- ILSVRC-2015 classification winner: 6-model ensemble **3.57% top-5** on the test set (Table 5) — versus GoogLeNet (ILSVRC-2014) ensemble **6.66%** top-5 (Table 5), a 46% relative reduction with a single architectural change (residual shortcuts).
- Depth scaling yields monotone improvement up to 152 layers: ResNet-152 single model 4.49% top-5 val beats BN-Inception 5.81%, PReLU-net 5.71%, and GoogLeNet 7.89% all single-model (Table 4).
- Transfer to detection is directly measurable: replacing VGG-16 with ResNet-101 in [Faster R-CNN](faster-rcnn) raises PASCAL VOC 2007 mAP from 73.2% to 76.4% and COCO mAP@[.5,.95] from 21.2% to 27.2% (Tables 7, 8).
- Pretrained torchvision weights are BSD-3-Clause licensed and cover five depth variants with ImageNet-pretrained checkpoints; the architecture supports `replace_stride_with_dilation` for dilated-convolution dense-prediction variants without retraining.

**Limitations.**

- Depth without dataset scale overfits: the 1202-layer CIFAR-10 model achieves 7.93% test error — worse than the 110-layer model at 6.43% — with training error below 0.1%, indicating that 19.4M parameters exceed the capacity of a 50k-image training set without strong regularisation (Table 6, §4.2).
- Spatial downsampling leaves a $7 \times 7$ final feature map at the deepest stage; fine-grained localisation requires FPN or dilated convolutions to recover spatial resolution for dense prediction tasks.
- ResNet-152 carries 60.2M parameters, comparable in memory footprint to VGG-19 (144M weights but dominated by FC layers); at float32 the backbone alone requires ~230 MB of storage.
- The deepest CIFAR-10 variant (110 layers) requires a learning-rate warm-up: initial LR 0.1 is too large, necessitating a warm-up to LR 0.01 until training error drops below 80% (~400 iterations) before reverting to 0.1 (§4.2, footnote 5).

# References

1. He, Zhang, Ren, Sun. *Deep Residual Learning for Image Recognition.* CVPR 2016. [arXiv 1512.03385](https://arxiv.org/abs/1512.03385)
2. Krizhevsky, Sutskever, Hinton. *ImageNet Classification with Deep Convolutional Neural Networks.* NeurIPS 2012.
3. Simonyan, Zisserman. *Very Deep Convolutional Networks for Large-Scale Image Recognition.* ICLR 2015. [arXiv 1409.1556](https://arxiv.org/abs/1409.1556)
4. Szegedy et al. *Going Deeper with Convolutions.* CVPR 2015. [arXiv 1409.4842](https://arxiv.org/abs/1409.4842)
5. Ioffe, Szegedy. *Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift.* ICML 2015.
