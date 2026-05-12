---
title: "AlexNet"
date: 2026-05-12
summary: "Eight-layer convolutional neural network for 1000-class image classification on ImageNet, trained end-to-end on two GPUs with ReLU activations, local response normalisation, overlapping max-pooling, and dropout; the first deep CNN to win ILSVRC by a large margin."
tags: ["computer-vision", "image-classification", "cnn", "deep-learning"]
domain: features
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "60M (paper §3.5); 61.1M (torchvision impl)"
flops: "~720 MMAC @ 224×224 (torchvision impl)"
prerequisites: []
failureModes: []
relations:
  - type: extended_by
    target: vgg
    confidence: high
    caution: "VGG extends AlexNet's CNN classifier paradigm from 8 to 16/19 weight layers via stacked 3×3 conv blocks; same task, deeper architecture, same training framework."
sources:
  primary: krizhevsky2012-alexnet
  references:
    - szegedy2015-inception
  notes: |
    Paper §3.5 architecture: 5 conv + 3 FC, 60M params, 650K neurons; per-GPU
    kernel widths 48–128–192–192–128 (totals 96–256–384–384–256 across both
    GPUs); FC widths 4096-4096-1000. Torchvision single-GPU port collapses the
    channels to 64–192–384–256–256 (see torchvision/models/alexnet.py). §3.1 ReLU f(x)=max(0,x); §3.2 two-GPU
    split with cross-GPU connectivity only at conv3 and FC layers; §3.3 LRN
    with k=2, n=5, α=1e-4, β=0.75 reduces top-1/top-5 by 1.4%/1.2%; §3.4
    overlapping pooling z=3, s=2 reduces top-1/top-5 by 0.4%/0.3%; §4.1
    data augmentation (random 224×224 crops from 256×256, horizontal flips,
    PCA colour jitter with α_i ~ N(0, 0.1²)); §4.2 dropout p=0.5 in first
    two FC layers; §5 SGD batch 128, momentum 0.9, weight decay 0.0005,
    initial LR ε=0.01 divided by 10 three times, 90 epochs, 5–6 days on
    two GTX 580 3GB GPUs, weight init N(0, 0.01²), bias init 1 for conv2,
    conv4, conv5, FC6, FC7 (0 elsewhere). Results: Table 1 (ILSVRC-2010)
    top-1 37.5% / top-5 17.0% vs prior best 45.7% / 25.7%; Table 2 (ILSVRC-2012)
    top-5 15.3% ensemble vs 26.2% second place. Section 7: removing a middle
    conv layer costs ~2% top-1. Note: practical implementations use 227×227
    input to make the §3.5 stride-4 11×11 first conv produce a 55×55 feature
    map; the paper's stated 224×224 is a typographical inconsistency.
implementations:
  - role: community
    repo: https://github.com/pytorch/vision
    commit: 336d36e8db990a905498c73933e35231876e28bc
    framework: pytorch
    license: BSD-3-Clause
    weights_url: https://download.pytorch.org/models/alexnet-owt-7be5be79.pth
    weights_license: BSD-3-Clause
  - role: community
    repo: https://github.com/BVLC/caffe
    commit: eeebdab16155d34ff8f5f42137da7df4d1c7eab0
    framework: caffe
    license: BSD-2-Clause
    weights_url: http://dl.caffe.berkeleyvision.org/bvlc_alexnet.caffemodel
    weights_license: unrestricted
---

# Motivation

AlexNet takes a fixed-size $224 \times 224 \times 3$ RGB image and produces a 1000-dimensional probability vector via a softmax output layer, trained end-to-end on the ILSVRC ImageNet subset with approximately 1.2 million labeled images. The defining property is the combination of four techniques — ReLU nonlinearity, Local Response Normalisation (LRN), overlapping max-pooling, and dropout — applied to a deep CNN with 5 convolutional and 3 fully-connected layers, trained across two GPUs. The model achieved top-5 error of 15.3% on ILSVRC-2012 against 26.2% for the second-place entry, a margin that displaced all hand-engineered feature pipelines from the top of large-scale image classification.

# Architecture

**Family & shape.** CNN. Input: $(3, 224, 224)$ RGB image (practical implementations use $227 \times 227$; the paper's stated $224 \times 224$ is a typographical inconsistency with the stride-4 first convolution). Output: $(1000,)$ probability vector from a softmax layer.

**Blocks.** The network has 8 learned layers: 5 convolutional and 3 fully-connected (Section 3.5). The two-GPU paper architecture uses per-GPU kernel widths of 48–128–192–192–128 (totals 96–256–384–384–256 across both GPUs); FC widths are 4096–4096–1000. The torchvision single-GPU port merges the per-GPU channels to 64–192–384–256–256, which differs from the paper's split. ReLU ($f(x) = \max(0, x)$) follows every convolutional and fully-connected layer. LRN is applied after conv1 and conv2. Overlapping max-pooling (window $z=3$, stride $s=2$) follows conv1, conv2, and conv5. Dropout ($p=0.5$) is applied in FC6 and FC7 only.

The torchvision single-GPU `AlexNet` (channels 64–192–384–256–256, adaptive average pool to $6 \times 6$):

```python
# torchvision/models/alexnet.py @ 336d36e
class AlexNet(nn.Module):
    def __init__(self, num_classes: int = 1000, dropout: float = 0.5) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=11, stride=4, padding=2),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2),
            nn.Conv2d(64, 192, kernel_size=5, padding=2),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2),
            nn.Conv2d(192, 384, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(384, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2),
        )
        self.avgpool = nn.AdaptiveAvgPool2d((6, 6))
        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(256 * 6 * 6, 4096),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout),
            nn.Linear(4096, 4096),
            nn.ReLU(inplace=True),
            nn.Linear(4096, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return self.classifier(x)
```

Note: this is the "One Weird Trick 2014" single-GPU variant. The original 2012 paper uses a two-GPU split with per-GPU widths 48–128–192–192–128 and cross-GPU connections only at conv3 and the FC layers.

**Training.** Trained on ILSVRC (roughly 1.2 million training images, 1000 classes) with SGD, batch size 128, momentum 0.9, weight decay 0.0005. Initial learning rate $\epsilon = 0.01$, divided by 10 three times when validation error stops improving; 90 epochs over 5–6 days on two GTX 580 3 GB GPUs (Section 5). Data augmentation: random $224 \times 224$ crops from $256 \times 256$ images, horizontal flips, and PCA colour jitter ($\alpha_i \sim \mathcal{N}(0, 0.1^2)$). Test-time prediction averages 10 patches (5 crops × 2 flips). Results: top-1 37.5% / top-5 17.0% on ILSVRC-2010 (Table 1), against prior best of 45.7% / 25.7% (SIFT+Fisher Vectors); top-5 15.3% (7-CNN pre-trained ensemble) on ILSVRC-2012 (Table 2) against 26.2% for second place.

**Complexity.** 60 million parameters, 650,000 neurons (paper Abstract and Section 3.5). Torchvision reports 61.1 M parameters; approximately 720 MMAC at $224 \times 224$ input.

# Implementations

Official Caffe Model Zoo release and widely-used PyTorch torchvision port; both are community redistributions, as no single authoritative authors' repository has been maintained.

# Assessment

**Novelty.**

- Demonstrated that a deep CNN with ReLU nonlinearities ($f(x) = \max(0, x)$, from Nair & Hinton 2010) trained end-to-end on GPU can outperform all hand-engineered feature pipelines (BoW + SIFT, sparse coding) by a large margin on million-image-scale classification.
- Introduced Local Response Normalisation across adjacent kernel maps as a form of lateral inhibition, contributing a 1.4% / 1.2% top-1 / top-5 error reduction (Section 3.3).
- Applied dropout ($p=0.5$, from Hinton et al. 2012) to the two hidden FC layers, making deep networks with 60 million parameters trainable without catastrophic overfitting at 1.2 million training images.
- Established the overlapping max-pooling convention ($z=3$, $s=2$) that reduces top-1 / top-5 by 0.4% / 0.3% over non-overlapping pooling (Section 3.4).

**Strengths.**

- Top-5 15.3% on ILSVRC-2012 vs 26.2% for second place (Table 2): the margin over all contemporary methods is unambiguous at the year of publication.
- Top-1 37.5% / top-5 17.0% on ILSVRC-2010 (Table 1) vs prior best of 45.7% / 25.7%, confirming the result across two benchmark years.
- Architecture straightforwardly serves as a transfer-learning backbone for downstream dense-prediction tasks (FCN-style segmentation, R-CNN detection) due to the clearly separable conv feature stack and FC classification head.

**Limitations.**

- Brittle to depth reduction: removing any middle convolutional layer costs approximately 2% top-1 accuracy (Section 7), indicating each layer is load-bearing with no redundancy.
- GoogLeNet (Szegedy et al. 2015) reached 6.67% top-5 on ILSVRC-2014 — a 56.5% relative reduction from AlexNet's 16.4% on ILSVRC-2012 — with approximately $12\times$ fewer parameters (7M vs ~60M), demonstrating that architectural efficiency rather than raw parameter count drives ImageNet classification accuracy.
- Superseded for practical classification by VGG, ResNet, and EfficientNet, which consistently outperform AlexNet at lower or comparable parameter counts.
- The two-GPU split of the 2012 architecture is an artefact of 3 GB GTX 580 GPU memory constraints and is not a principled design choice; the torchvision port collapses the split, producing a topology that diverges from the paper's Section 3.5 figures.
- Both listed implementations carry BSD-licensed weights (torchvision: BSD-3-Clause; Caffe Model Zoo: unrestricted), which permits commercial use, but neither ships the authors' original CUDA training code from `code.google.com/p/cuda-convnet`.

# References

1. Krizhevsky, Sutskever, Hinton. *ImageNet Classification with Deep Convolutional Neural Networks.* NeurIPS 2012. [paper](https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf)
2. Nair, Hinton. *Rectified Linear Units Improve Restricted Boltzmann Machines.* ICML 2010. [paper](https://www.cs.toronto.edu/~hinton/absps/reluICML.pdf)
3. Hinton, Srivastava, Krizhevsky, Sutskever, Salakhutdinov. *Improving neural networks by preventing co-adaptation of feature detectors.* arXiv 2012. [paper](https://arxiv.org/abs/1207.0580)
