---
title: "GoogLeNet"
date: 2026-05-12
summary: "Twenty-two-layer CNN built from Inception modules — parallel 1×1, 3×3, 5×5 convolutions and 3×3 max-pool concatenated along the channel axis, with 1×1 bottlenecks reducing dimensionality before the larger spatial convs. ILSVRC-2014 classification winner at 6.67% top-5 error with 7M parameters (12× fewer than AlexNet)."
tags: ["computer-vision", "image-classification", "cnn", "deep-learning", "inception"]
domain: features
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "7M (paper §1; 12× fewer than AlexNet)"
flops: "~1.5 billion multiply-adds @ 224×224 (paper §1 target budget)"
prerequisites: []
failureModes: []
relations:
  - type: parallel_foundation_with
    target: vgg
    confidence: high
    caution: "Both ILSVRC-2014 entries — GoogLeNet won classification (6.67% top-5), VGG won localisation. Different design philosophies: Inception modules vs homogeneous 3×3 depth scaling."
  - type: compared_with
    target: alexnet
    confidence: high
    caution: "22 layers vs AlexNet's 8; 7M vs 60M parameters; 56.5% relative reduction in top-5 error vs AlexNet (16.4% → 6.67%) over two ILSVRC years."
  - type: feeds_into
    target: fcn-semantic-segmentation
    confidence: medium
    caution: "One of three backbones explored in FCN; FCN-GoogLeNet 42.5 mean IU vs FCN-VGG16 56.0 (FCN Table 1) — aggressive early downsampling hurts dense prediction."
sources:
  primary: szegedy2015-inception
  references:
    - krizhevsky2012-alexnet
    - simonyan2014-vgg
  notes: |
    Paper §1 design target: 1.5 billion multiply-adds at inference;
    12× fewer parameters than AlexNet (7M vs ~60M). §3 motivation:
    Hebbian principle + Arora et al. 2013 theorem on approximating
    sparse network topologies via correlation clustering. §4 Inception
    module: parallel 1×1, 3×3, 5×5 convs and 3×3 max-pool concatenated
    on channel axis (Figure 2a naïve, Figure 2b with 1×1 reduction
    bottlenecks before 3×3/5×5 and 1×1 projection after pool). 1×1
    convolutions sourced from Lin et al. Network-in-Network 2013. §5 /
    Table 1: full layer-by-layer architecture, 22 weight layers (27
    with pooling), 9 Inception modules (3a, 3b, 4a–4e, 5a, 5b), stem
    7×7/2 conv → 3×3/2 max-pool → 3×3/1 conv → 3×3/2 max-pool before
    Inception modules. Global average pooling before final softmax
    (improves top-1 by ~0.6% over FC layers, requires dropout in
    auxiliary classifier still). Auxiliary classifiers at Inception
    (4a) and (4d): 5×5 avg-pool stride 3 → 1×1/128 conv → FC-1024 +
    ReLU → dropout 0.7 → FC-1000 softmax; auxiliary loss weight 0.3
    at training, discarded at inference. §6 training: DistBelief
    distributed system, async SGD momentum 0.9, LR polynomial decrease
    by 4% every 8 epochs, Polyak averaging for inference. Augmentation:
    aspect-ratio sampling area 8%–100%, ratio ∈ [3/4, 4/3], photometric
    distortions, random interpolation. §7 / Table 2 / Table 3 ILSVRC
    2014 classification: ensemble top-5 6.67% (7 models × 144 crops),
    single model 7.9% (vs single VGG-16 7.0%). 56.5% relative reduction
    vs ILSVRC 2012 SuperVision (AlexNet 16.4%). §8 / Table 4 / Table 5
    ILSVRC 2014 detection: 6-net ensemble mAP 43.9%, single model
    38.02%; uses Selective Search proposals; no bounding-box regression
    "due to lack of time". §7 test-time: 4 scales × 3 squares × 6 crops
    × 2 mirrors = 144 crops per image, softmax averaged. Torchvision
    Inception block (336d36e): branches 1×1, 1×1→3×3, 1×1→3×3 (known
    bug, paper specifies 5×5), 3×3 maxpool→1×1; see pytorch/vision#906.
    Torchvision weights trained by maintainers, not the original BVLC
    GoogLeNet weights (which achieve 68.7% top-1 / 88.9% top-5 single
    centre crop per BVLC model zoo readme).
implementations:
  - role: community
    repo: https://github.com/pytorch/vision
    commit: 336d36e8db990a905498c73933e35231876e28bc
    framework: pytorch
    license: BSD-3-Clause
    weights_url: https://download.pytorch.org/models/googlenet-1378be20.pth
    weights_license: BSD-3-Clause
  - role: community
    repo: https://github.com/BVLC/caffe
    commit: eeebdab16155d34ff8f5f42137da7df4d1c7eab0
    framework: caffe
    license: BSD-2-Clause
    weights_url: http://dl.caffe.berkeleyvision.org/bvlc_googlenet.caffemodel
    weights_license: unrestricted
draft: false
---

# Motivation

GoogLeNet takes a $224 \times 224 \times 3$ RGB image and produces a 1000-class softmax probability vector. The defining property is the Inception module — four parallel branches ($1 \times 1$ convolution, $1 \times 1$ reduce followed by $3 \times 3$ convolution, $1 \times 1$ reduce followed by $5 \times 5$ convolution, and $3 \times 3$ max-pool followed by $1 \times 1$ projection) concatenated on the channel axis, with $1 \times 1$ bottleneck convolutions performing cross-channel dimensionality reduction before the larger spatial convolutions. GoogLeNet stacks 22 weight layers and requires approximately 7M parameters — 12× fewer than AlexNet — while winning ILSVRC-2014 classification at 6.67% top-5 error.

# Architecture

**Family & shape.** CNN. Input $(3, 224, 224)$. Output $(1000,)$ softmax. The stem is a traditional (non-Inception) stack used for memory efficiency: $7 \times 7$/2 conv → $3 \times 3$/2 max-pool → $3 \times 3$/1 conv → $3 \times 3$/2 max-pool. Nine Inception modules follow in three groups (3a–3b, 4a–4e, 5a–5b), with stride-2 max-pool separating groups 3→4 and 4→5. Global average pooling precedes the single linear + softmax head (§4, §5, Table 1).

**Blocks.** The Inception module's dimension-reduction variant (Figure 2(b)) runs four parallel branches on the same input: (1) direct $1 \times 1$ convolution; (2) $1 \times 1$ bottleneck → $3 \times 3$ convolution; (3) $1 \times 1$ bottleneck → $5 \times 5$ convolution; (4) $3 \times 3$ max-pool → $1 \times 1$ projection. All branches are concatenated on the channel axis. The $1 \times 1$ bottleneck idea originates from Lin et al. Network-in-Network (2013) and serves dual purpose: cross-channel dimensionality compression and an additional ReLU non-linearity (§2, §4).

Two auxiliary classifiers are branched off at Inception (4a) and (4d) during training only. Each auxiliary classifier applies a $5 \times 5$ average-pool stride 3, then a $1 \times 1$/128 convolution, then FC-1024 with ReLU, then dropout 70%, then FC-1000 softmax. Auxiliary losses are weighted **0.3** at training and discarded at inference (§5).

The Inception module's dimension-reduction variant (torchvision port at commit `336d36e`):

```python
# torchvision/models/googlenet.py @ 336d36e
class Inception(nn.Module):
    def __init__(self, in_channels, ch1x1, ch3x3red, ch3x3,
                 ch5x5red, ch5x5, pool_proj, conv_block=None):
        super().__init__()
        if conv_block is None:
            conv_block = BasicConv2d
        self.branch1 = conv_block(in_channels, ch1x1, kernel_size=1)
        self.branch2 = nn.Sequential(
            conv_block(in_channels, ch3x3red, kernel_size=1),
            conv_block(ch3x3red, ch3x3, kernel_size=3, padding=1),
        )
        self.branch3 = nn.Sequential(
            conv_block(in_channels, ch5x5red, kernel_size=1),
            # NOTE: kernel_size=3 is a known torchvision bug; paper specifies 5×5.
            # See pytorch/vision#906.
            conv_block(ch5x5red, ch5x5, kernel_size=3, padding=1),
        )
        self.branch4 = nn.Sequential(
            nn.MaxPool2d(kernel_size=3, stride=1, padding=1, ceil_mode=True),
            conv_block(in_channels, pool_proj, kernel_size=1),
        )

    def forward(self, x):
        outs = [self.branch1(x), self.branch2(x),
                self.branch3(x), self.branch4(x)]
        return torch.cat(outs, 1)
```

Global average pooling before the final softmax improves top-1 accuracy by approximately 0.6% over FC-only (§5). The network comprises 22 weight layers (27 including pooling) and approximately 100 building blocks total (§5).

**Training.** Trained on ILSVRC (approximately 1.2 million images, 1000 classes). Optimiser: DistBelief distributed CPU training with asynchronous SGD, momentum **0.9**, and a polynomial learning-rate schedule decreasing by **4% every 8 epochs**. Polyak averaging of iterates produces the final inference model (§6). Data augmentation: aspect-ratio sampling with area 8%–100% of the image and aspect ratio $\in [3/4, 4/3]$; photometric distortions; random interpolation method (§6). Test-time evaluation uses $4 \times 3 \times 6 \times 2 = 144$ crops per image with softmax probabilities averaged across crops (§7). Auxiliary classifier branches contribute loss weight **0.3** at training and are discarded at inference (§5). Results:

- ILSVRC 2014 classification: ensemble top-5 error **6.67%** (7 models, 144 crops, §7, Table 2/3, first place). Single model top-5 7.9% versus single VGG-16 at 7.0% (VGG paper Table 7). Relative reduction versus ILSVRC 2012 SuperVision (AlexNet 16.4%): 56.5% (§7).
- ILSVRC 2014 detection: ensemble mAP **43.9%** (Table 4, first place); single model mAP **38.02%** (Table 5).

**Complexity.** Approximately 7M parameters; approximately 1.5 billion multiply-adds at $224 \times 224$ inference (§1 budget target).

# Implementations

No official authors' repository is maintained; the BVLC Caffe Model Zoo replication and the PyTorch torchvision port are the canonical community implementations.

# Assessment

**Novelty.**

- Introduced the Inception module — parallel $1 \times 1$, $3 \times 3$, $5 \times 5$ convolutions and $3 \times 3$ max-pool concatenated on the channel axis — replacing the homogeneous block stacking of AlexNet and (concurrently) VGG.
- Established $1 \times 1$ convolutions (from Lin et al. Network-in-Network 2013) as cross-channel dimensionality-reduction bottlenecks before expensive $3 \times 3$ and $5 \times 5$ spatial convolutions, decoupling depth and width growth from quadratic compute growth (§3, §4).
- Replaced AlexNet's and VGG's fully-connected classification head with global average pooling, reducing parameter count and improving top-1 by approximately 0.6% (§5).
- Demonstrated auxiliary classifiers at intermediate Inception layers (4a, 4d) injecting gradient and regularising training of 22-layer networks before batch normalisation existed (§5).

**Strengths.**

- ILSVRC 2014 classification winner at **6.67%** ensemble top-5 — a 56.5% relative reduction over the 2012 SuperVision baseline (16.4%) — with approximately 12× fewer parameters (7M versus ~60M for AlexNet) (§1, §7, Table 2/3).
- ILSVRC 2014 detection winner at **43.9%** mAP ensemble / **38.02%** mAP single model (§8, Table 4/5).
- Architecturally efficient: approximately 7M parameters fit a 1.5 billion multiply-adds inference budget targeting mobile and embedded deployment (§1), in contrast to VGG-16's 138M parameters.

**Limitations.**

- Detection submission did not use bounding-box regression "due to lack of time" (§8); R-CNN with regression produces better localisation.
- Poor backbone for dense pixel-level prediction: FCN-GoogLeNet achieves mean IU **42.5** on PASCAL VOC 2011 val versus FCN-VGG16 at **56.0** (FCN Table 1) — aggressive early downsampling (two stride-2 stem operations before the Inception modules) and heterogeneous branch widths make the topology hard to repurpose for FCN-style upsampling.
- Single-model classification accuracy trails VGG-16: 7.9% top-5 (single GoogLeNet) versus 7.0% (single VGG-16) on ILSVRC 2014 test (VGG Table 7); the ensemble headline depends on 7 models × 144 crops.
- Training instability before batch normalisation: the auxiliary classifiers exist explicitly to mitigate gradient flow concerns through 22 layers (§5); BN-Inception (2015) and ResNet (2015) superseded this workaround within months.
- **Implementation caveats.** Torchvision's `Inception` block uses `kernel_size=3` in the $5 \times 5$ branch (documented bug, see `pytorch/vision#906`) — it diverges from the paper's Figure 2(b) specification, and the torchvision pretrained weights `googlenet-1378be20.pth` (BSD-3-Clause) are trained independently by maintainers rather than loaded from BVLC. The BVLC Caffe replication's weights (license `unrestricted`) reach 68.7% top-1 / 88.9% top-5 single centre-crop and were trained for 60 epochs with `quick_solver.prototxt` rather than the paper's longer training schedule — a faithful but not identical reproduction.

# References

1. Szegedy, Liu, Jia, Sermanet, Reed, Anguelov, Erhan, Vanhoucke, Rabinovich. *Going deeper with convolutions.* CVPR 2015. [arXiv:1409.4842](https://arxiv.org/abs/1409.4842)
2. Krizhevsky, Sutskever, Hinton. *ImageNet Classification with Deep Convolutional Neural Networks.* NeurIPS 2012. [paper](https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf)
3. Simonyan, Zisserman. *Very Deep Convolutional Networks for Large-Scale Image Recognition.* ICLR 2015 (arXiv 2014). [arXiv:1409.1556](https://arxiv.org/abs/1409.1556)
