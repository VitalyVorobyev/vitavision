---
title: "VGG"
date: 2026-05-12
summary: "Family of very deep CNN image classifiers (11 to 19 weight layers) built from stacked 3×3 convolutions with stride 1 and 2×2 max-pool stride 2, trained on ImageNet with SGD + dropout. ILSVRC-2014 localisation winner and classification runner-up."
tags: ["deep-learning"]
domain: features
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "138M (VGG-16); 144M (VGG-19) (Table 2)"
flops: "~15.5 GMAC @ 224×224 (VGG-16, torchvision)"
prerequisites: [convolutional-neural-network]
failureModes: []
relations:
  - type: feeds_into
    target: fcn-semantic-segmentation
    confidence: high
    caution: "VGG-16 is FCN's canonical backbone per FCN Table 1; FCN-VGG16 mean IU 56.0 vs FCN-AlexNet 39.8."
  - type: feeds_into
    target: deeplab-semantic-segmentation
    confidence: high
    caution: "DeepLab v1 uses VGG-16 backbone; later versions switched to ResNet/Xception."
  - type: extended_by
    target: resnet
    confidence: high
    caution: "ResNet reformulates VGG-style plain depth scaling: identity shortcuts let 152-layer nets train where 19-layer plain nets already plateau (ResNet §1, Fig. 1)."
sources:
  primary: simonyan2014-vgg
  references:
    - krizhevsky2012-alexnet
    - szegedy2015-inception
  notes: |
    Paper §2.1 architecture: 224×224 RGB input, 3×3 conv stride 1 padding 1
    throughout (1×1 in config C only), 2×2 max-pool stride 2 after each
    block, three FC layers (4096, 4096, 1000-way softmax), ReLU on all
    hidden layers, LRN only in config A-LRN (no help, removed in others).
    §2.2 / Table 1: configs A (11), A-LRN (11), B (13), C (16, with 1×1
    convs), D (16, all 3×3 — "VGG-16"), E (19 — "VGG-19"). Channel schedule
    64 → 128 → 256 → 512 → 512, doubles after each pool. Table 2 parameter
    counts: A/A-LRN 133M, B 133M, C 134M, D 138M, E 144M. §2.3 receptive-field
    argument: stack of three 3×3 convs has 7×7 receptive field with 3(3²C²)
    = 27C² parameters vs 7²C² = 49C² for a single 7×7 conv (45% fewer);
    also adds two non-linearities per stack. §3.1 training: SGD batch 256,
    momentum 0.9, weight decay 5·10⁻⁴, dropout 0.5 in first two FC layers,
    initial LR 10⁻² divided by 10 three times → 370K iterations / 74 epochs.
    Initialisation: A from N(0, 10⁻²); deeper nets seed first 4 conv +
    last 3 FC layers from trained A, middle from N(0, 10⁻²). Augmentation:
    isotropic rescale to shorter side S then random 224×224 crops + flips
    + RGB jitter; fixed-scale (S=256 or S=384) and multi-scale (S ∈ [256,
    512]) regimes. Test: dense evaluation (FC → 1×1 conv) at scale Q,
    optionally averaged over multi-scale {S−32, S, S+32}, optionally
    combined with multi-crop. §4 / Table 3: error decreases monotonically
    A → B → C → D and saturates at E; D top-5 8.1% at fixed S=[256;512] Q=384.
    §4.2 / Table 4: best single-network val 24.8% top-1 / 7.5% top-5 (D or E,
    multi-scale). §4.5 / Table 7: single VGG-16 7.0% top-5 vs single GoogLeNet
    7.9%; 7-net VGG ensemble 7.3% (2nd place classification, 1st place
    localisation); post-submission 2-net VGG ensemble 6.8%; GoogLeNet 7-net
    6.7%. §3.1 training time: 2–3 weeks per net on 4 NVIDIA Titan Black GPUs.
    §5 generalisation: VGG features transfer strongly to PASCAL VOC and other
    recognition tasks.
implementations:
  - role: community
    repo: https://github.com/pytorch/vision
    commit: 336d36e8db990a905498c73933e35231876e28bc
    framework: pytorch
    license: BSD-3-Clause
    weights_url: https://download.pytorch.org/models/vgg16-397923af.pth
    weights_license: BSD-3-Clause
  - role: community
    repo: https://github.com/keras-team/keras
    commit: b7f0905d8ae5076ec501fe58f8b8c85fa7d22d43
    framework: tensorflow
    license: Apache-2.0
    weights_url: https://storage.googleapis.com/tensorflow/keras-applications/vgg16/vgg16_weights_tf_dim_ordering_tf_kernels.h5
    weights_license: Apache-2.0
---

# Motivation

VGG takes a fixed-size $224 \times 224$ RGB image (mean-subtracted per pixel) and produces a 1000-dimensional probability vector via a softmax output layer, trained end-to-end on ILSVRC ImageNet with SGD. The family spans six configurations (A through E) with 11 to 19 weight layers; the defining property is exclusive use of $3 \times 3$ convolutions with stride 1 and padding 1 throughout, replacing the large-kernel first layers of AlexNet. Stacking three such layers achieves a $7 \times 7$ effective receptive field at a parameter cost of $27C^2$ versus $49C^2$ for a single $7 \times 7$ convolution, enabling systematic depth scaling without proportional parameter growth.

# Architecture

**Family & shape.** CNN. Input: $(3, 224, 224)$ RGB image. Output: $(1000,)$ probability vector from a softmax layer. The convolutional feature stack and three-layer FC head are the complete architecture; the modern notion of a "backbone" did not yet exist when this paper was written (Section 2.1).

**Blocks.** The network alternates conv blocks and $2 \times 2$ max-pool stages (stride 2). Each conv block contains one to four $3 \times 3$ convolutions (stride 1, padding 1), each followed by ReLU. Five pool stages halve the spatial dimensions while doubling the channel count on the doubling schedule 64 → 128 → 256 → 512 → 512. Three fully-connected layers cap the stack: FC-4096, FC-4096, FC-1000-softmax. Dropout (ratio 0.5) is applied in the first two FC layers only; LRN is present only in the A-LRN variant and confirmed to give no accuracy benefit (Section 4.1).

The depth-scaling argument (Section 2.3): two stacked $3 \times 3$ layers span a $5 \times 5$ effective receptive field; three span $7 \times 7$, at parameter cost $27C^2$ versus $49C^2$ for a single $7 \times 7$ convolution — 45% fewer parameters for the same receptive field, with two additional non-linearities per stack.

The six configurations differ only in conv-block depths (Table 1):

| Config       | Weight layers | conv1 | conv2 | conv3 | conv4 | conv5 | Parameters |
|--------------|:-------------:|:-----:|:-----:|:-----:|:-----:|:-----:|:----------:|
| A            | 11            | 1     | 1     | 2     | 2     | 2     | 133M       |
| A-LRN        | 11            | 1+LRN | 1     | 2     | 2     | 2     | 133M       |
| B            | 13            | 2     | 2     | 2     | 2     | 2     | 133M       |
| C            | 16            | 2     | 2     | 3†    | 3†    | 3†    | 134M       |
| D ("VGG-16") | 16            | 2     | 2     | 3     | 3     | 3     | 138M       |
| E ("VGG-19") | 19            | 2     | 2     | 4     | 4     | 4     | 144M       |

†Config C uses $1 \times 1$ convolutions in place of $3 \times 3$ at three positions; config D replaces these with $3 \times 3$ and achieves lower error, confirming that spatial context matters beyond additional non-linearity (Section 4.1).

The torchvision `make_layers` builder for configs A/B/D/E (channels and `'M'` = max-pool markers):

```python
# torchvision/models/vgg.py @ 336d36e
cfgs = {
    "A": [64, "M", 128, "M", 256, 256, "M", 512, 512, "M", 512, 512, "M"],
    "B": [64, 64, "M", 128, 128, "M", 256, 256, "M", 512, 512, "M", 512, 512, "M"],
    "D": [64, 64, "M", 128, 128, "M", 256, 256, 256, "M", 512, 512, 512, "M", 512, 512, 512, "M"],
    "E": [64, 64, "M", 128, 128, "M", 256, 256, 256, 256, "M", 512, 512, 512, 512, "M", 512, 512, 512, 512, "M"],
}

def make_layers(cfg):
    layers, in_channels = [], 3
    for v in cfg:
        if v == "M":
            layers.append(nn.MaxPool2d(kernel_size=2, stride=2))
        else:
            layers += [nn.Conv2d(in_channels, v, kernel_size=3, padding=1), nn.ReLU(inplace=True)]
            in_channels = v
    return nn.Sequential(*layers)

# Classifier head (shared across all configs)
classifier = nn.Sequential(
    nn.AdaptiveAvgPool2d((7, 7)),
    nn.Flatten(),
    nn.Linear(512 * 7 * 7, 4096), nn.ReLU(inplace=True), nn.Dropout(),
    nn.Linear(4096, 4096),        nn.ReLU(inplace=True), nn.Dropout(),
    nn.Linear(4096, num_classes),
)
```

**Training.** Trained on ILSVRC (approximately 1.2 million images, 1000 classes). SGD with batch size 256, momentum 0.9, weight decay $5 \cdot 10^{-4}$, dropout ratio 0.5 in the first two FC layers (Section 3.1). Initial learning rate $10^{-2}$, divided by 10 three times on validation plateau; total 370K iterations / 74 epochs. Initialisation: config A weights sampled from $\mathcal{N}(0, 10^{-2})$ with biases zero; deeper configs seed their first 4 conv and last 3 FC layers from trained config A and initialise remaining layers from the same Gaussian. Training-scale variants: fixed $S \in \{256, 384\}$ and multi-scale $S \in [256, 512]$; test-time dense evaluation reinterprets the FC layers as $7 \times 7$ and $1 \times 1$ convolutions, optionally combined with multi-crop fusion. Error decreases monotonically A → B → C → D and saturates at E (Section 4.1, Table 3); best single-network val 24.8% top-1 / 7.5% top-5 (D or E, multi-scale, Table 4). On the ILSVRC-2014 test set: single VGG-16 post-submission 7.0% top-5 beats single GoogLeNet at 7.9%; the 7-net VGG ensemble achieves 7.3% top-5 (classification runner-up, localisation winner); a post-submission 2-net VGG ensemble reaches 6.8% versus GoogLeNet's 7-net ensemble at 6.7% (Table 7). Training time: 2–3 weeks per net on 4 NVIDIA Titan Black GPUs.

**Complexity.** VGG-16 (config D): 138M parameters; VGG-19 (config E): 144M parameters (Table 2). Approximately 15.5 GMAC at $224 \times 224$ for VGG-16 (torchvision). The three FC layers alone carry 122M of the 138M VGG-16 parameters, making inference memory-intensive (~4 GB GPU at float32 in dense-evaluation mode).

# Implementations

Original Caffe model files were released by the authors at the Oxford VGG group page; PyTorch torchvision and Keras Applications are the widely used modern reimplementations.

# Assessment

**Novelty.**

- Established stacked $3 \times 3$ convolutions as the universal block primitive for deep CNN classifiers, replacing AlexNet's large-kernel first layer via the receptive-field parameter argument in Section 2.3.
- Demonstrated that depth alone — holding kernel size, pooling, and FC structure constant — improves ImageNet top-5 error systematically from 11 to 16 layers (Section 4.1, Table 3): the first controlled depth ablation in the CNN literature.
- Showed that $3 \times 3$ stacks with spatial context (config D) outperform $1 \times 1$ stacks of the same depth (config C), separating the contribution of depth from that of spatial filtering (Section 4.1).

**Strengths.**

- Single VGG-16 achieves 7.0% top-5 test, surpassing single GoogLeNet at 7.9% — a direct model-count-controlled comparison at ILSVRC-2014 (Table 7).
- ILSVRC-2014 localisation winner: while GoogLeNet won the classification track at 6.67% top-5 (7-model × 144-crop ensemble), the 7-net VGG ensemble won the localisation challenge — evidence that the homogeneous $3 \times 3$ depth-scaling design generalises across recognition sub-tasks (Section 4.5, Table 7).
- VGG-16 conv4/conv5 features transfer to dense prediction with exceptional fidelity: FCN-VGG16 achieves 56.0 mean IU vs FCN-AlexNet at 39.8 (FCN Table 1), making VGG-16 the canonical FCN and DeepLab v1 backbone.
- Architectural simplicity — one block type, one kernel size, one pooling size, one design rule — makes VGG the most-cited backbone in style-transfer, texture-synthesis, and perceptual-loss literature.

**Limitations.**

- 138M parameters (VGG-16) and 144M (VGG-19) are heavy by modern standards; the three FC layers alone account for 122M parameters and dominate inference memory at ~4 GB GPU in dense-evaluation mode.
- Depth saturation at 16 layers: VGG-19 gives no improvement over VGG-16 (Table 3); the architecture cannot scale further without residual connections.
- Superseded for practical classification by ResNet-50/101 and EfficientNet variants, which achieve lower error with 40–60% fewer parameters and faster inference.
- The Gaussian-from-A initialisation scheme is fragile — it requires a pre-trained config A as a stepping stone; torchvision diverges, using Kaiming initialisation instead.
- LRN provides no accuracy benefit in this architecture; config A-LRN matches config A, confirming the technique adds only computational cost (Section 4.1).

# References

1. Simonyan, Zisserman. *Very Deep Convolutional Networks for Large-Scale Image Recognition.* ICLR 2015 (arXiv 2014). [arXiv:1409.1556](https://arxiv.org/abs/1409.1556)
2. Krizhevsky, Sutskever, Hinton. *ImageNet Classification with Deep Convolutional Neural Networks.* NeurIPS 2012. [paper](https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf)
