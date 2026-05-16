---
title: "Convolutional Neural Network"
date: 2026-05-16
summary: "A feed-forward network that builds a spatial hierarchy of learned features by alternating weight-shared convolution layers, pointwise nonlinearities, and spatial downsampling, trained end-to-end by backpropagation."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites: []
sources:
  primary: krizhevsky2012-alexnet
  references:
    - simonyan2014-vgg
    - he2016-resnet
    - szegedy2015-inception
---

# Definition

A convolutional neural network (CNN) is a feed-forward neural network that maps an input image — or any intermediate feature map — to a spatial hierarchy of learned feature representations, culminating in a class-probability vector or a dense prediction map. The distinguishing structural priors are weight sharing (a single filter kernel is convolved across all spatial positions of a feature map) and local connectivity (each unit receives input from a spatially contiguous receptive field rather than the full previous layer). Together these priors cut free parameters by orders of magnitude relative to fully connected networks and encode the translation symmetry of natural images.

:::definition[Convolutional layer]
Let $x_c$ denote the $c$-th channel of an input feature map and $W_{k,c}$ a $h \times w$ learned kernel. The $k$-th output feature map is

$$y_k = \sigma\!\left(\sum_{c=1}^{C} W_{k,c} * x_c + b_k\right),$$

where $*$ denotes discrete 2-D cross-correlation, $b_k$ is a learned scalar bias, and $\sigma$ a pointwise nonlinearity. Weight sharing constrains every spatial position to use the same $W_{k,c}$; local connectivity constrains each output unit to an $h \times w$ receptive field.
:::

A complete CNN applies a sequence of such layers, interleaved with spatial downsampling, and terminates with a global aggregation stage — global average pooling or fully connected layers — that produces a fixed-length output vector.

# Mathematical Description

## Convolution layer

At position $(i, j)$ in output map $k$, the pre-activation is

$$z_k(i, j) = \sum_{c=1}^{C} \sum_{p=0}^{h-1} \sum_{q=0}^{w-1} W_{k,c}(p, q)\, x_c(i+p,\, j+q) + b_k.$$

All positions share the same $W_{k,c}$, so one layer has $K \times C \times h \times w + K$ parameters — independent of the spatial size of the input. Channel mixing is the sum over all $C$ input channels per filter.

## Nonlinearity

The Rectified Linear Unit $\sigma(z) = \max(0, z)$ is applied element-wise. AlexNet reports that, on CIFAR-10, ReLU networks reach 25% training error roughly six times faster than equivalent $\tanh$ networks. Saturating units compress large activations and slow gradient flow; ReLU preserves gradient magnitude for positive pre-activations.

## Spatial reduction

Spatial downsampling reduces feature-map resolution, enlarges the effective receptive field of subsequent layers, and grants local translation invariance. Max pooling selects the maximum activation in a $z \times z$ window slid with stride $s$; overlapping pooling ($z=3$, $s=2$) improves AlexNet's top-5 error by $0.3$ points over non-overlapping pooling. Strided convolution is the alternative: a stride $s > 1$ downsamples and learns the aggregation in one step.

## Depth and the receptive field

A single $h \times h$ convolution covers a receptive field of area $h^2$; stacking layers multiplies it geometrically — two stacked $3 \times 3$ convolutions cover a $5 \times 5$ field, three cover $7 \times 7$, at parameter cost $27C^2$ versus $49C^2$ for one $7 \times 7$ layer, a 44% saving. VGG uses exclusively $3 \times 3$ convolutions through 13–16 convolutional layers (VGG-16: 138M parameters; VGG-19: 144M), showing that depth with small kernels beats shallower networks with larger kernels.

## The degradation problem and residual connections

A plain CNN suffers a degradation problem: adding layers beyond a critical depth raises training error even without overfitting. On ImageNet a 34-layer plain network reaches 28.54% top-1 validation error against 27.94% for an 18-layer plain network. The cause is an optimisation barrier, not vanishing gradients — batch-normalised plain networks show healthy gradient norms yet still degrade.

:::definition[Residual block]
Instead of fitting a mapping $H(x)$ directly, the block fits the residual $\mathcal{F}(x) = H(x) - x$ and recovers $H$ through an identity shortcut. With matching dimensions,

$$y = \mathcal{F}(x,\,\{W_i\}) + x;$$

when resolution or channel count changes, a linear projection $W_s$ is applied to the shortcut, $y = \mathcal{F}(x,\,\{W_i\}) + W_s x$.
:::

If the identity is near-optimal, driving $\mathcal{F}$ toward zero is easier than fitting the identity through nonlinear layers. ResNet-152 reaches 4.49% top-5 validation error as a single model — below VGG-19's 9.33% — and 3.57% as a six-model ensemble.

## Multi-branch and 1×1 bottleneck blocks

The Inception module runs four parallel branches on the same input — $1\times1$, $3\times3$, $5\times5$ convolutions and $3\times3$ max-pooling — and concatenates their outputs along the channel axis. To control cost, $1\times1$ convolutions are inserted as bottlenecks before the $3\times3$ and $5\times5$ branches: a $1\times1$ convolution mixes $C$ input channels into $C'$ output channels per spatial position, a cheap dimension-reduction step. GoogLeNet stacks 9 Inception modules to 22 weight layers with about 7M parameters — roughly $12\times$ fewer than AlexNet's 60M.

# Numerical Concerns

**Vanishing and exploding gradients.** Training requires the error signal to propagate back through every layer. Saturating nonlinearities suppress gradients for large activations; ReLU alleviates this for positive pre-activations. In very deep plain networks even ReLU and batch normalisation leave an optimisation barrier — the degradation problem. The residual shortcut $y = \mathcal{F}(x) + x$ propagates error to the input directly, bypassing suppression inside the block.

**Batch normalisation.** Deep bottleneck ResNets depend on batch normalisation after each convolution and before activation; without it they do not converge stably. Batch normalisation estimates per-channel statistics over mini-batches and is sensitive to batch size — small batches produce noisy statistics.

**Parameter count versus depth.** VGG-16's 138M parameters include 122M in its three fully connected layers, the dominant source of overfitting risk and inference cost. ResNet's $1\times1$-bottleneck design keeps ResNet-50 at 3.8B FLOPs and ResNet-152 at 11.3B, both below VGG-19's 19.6B.

**The 1×1 convolution as channel control.** A $1\times1$ convolution reduces or expands the channel dimension without changing spatial resolution — making $5\times5$ convolutions on high-channel maps affordable in Inception, and forming the reduce/restore pair in the ResNet bottleneck.

**Receptive-field growth.** Stacking $n$ layers of kernel size $h$ at stride 1 yields an effective receptive field of side $n(h-1)+1$; each stride-2 pooling or convolution doubles the field of all subsequent layers.

**Overfitting.** AlexNet's 60M parameters over $\sim$1.2M images require heavy regularisation: dropout at $p = 0.5$ in the first two fully connected layers, and data augmentation (random crops, flips, PCA colour jitter) expanding the effective training set by a large factor. Weight initialisation also matters — AlexNet draws from $\mathcal{N}(0, 0.01^2)$, while ResNet adopts He initialisation $\sigma^2 = 2/n$ derived for ReLU, critical for stable convergence of 50- to 152-layer networks.

# Where it appears

Four registered architectures each advanced one structural dimension of the CNN:

- [alexnet](/atlas/alexnet) — 5 convolutional + 3 fully connected layers (60M parameters); introduced ReLU activations, overlapping max-pooling, and dropout, and established GPU-trained deep CNNs as the dominant recognition paradigm.
- [vgg](/atlas/vgg) — 13–16 layers of exclusively $3\times3$ kernels; established the stacked $3\times3$ block as the canonical convolutional primitive.
- [googlenet](/atlas/googlenet) — 22 weight layers in 9 Inception modules ($\sim$7M parameters); introduced the multi-branch block with $1\times1$ bottlenecks.
- [resnet](/atlas/resnet) — 18–152 layers with identity shortcuts; resolved the degradation problem and made very deep networks practical.

CNNs are the backbone of most registered detection and dense-prediction models: [faster-rcnn](/atlas/faster-rcnn) and [mask-rcnn](/atlas/mask-rcnn) attach proposal and ROI heads to a CNN backbone; [fcn-semantic-segmentation](/atlas/fcn-semantic-segmentation) reinterprets VGG-16's fully connected layers as convolutions for dense prediction; [deeplab-semantic-segmentation](/atlas/deeplab-semantic-segmentation) inserts atrous convolutions into the backbone; and [unet-segmentation](/atlas/unet-segmentation) pairs a contracting CNN encoder with a symmetric expanding decoder.

# References

1. A. Krizhevsky, I. Sutskever, G. E. Hinton. *ImageNet Classification with Deep Convolutional Neural Networks.* NeurIPS, 2012.
2. K. Simonyan, A. Zisserman. *Very Deep Convolutional Networks for Large-Scale Image Recognition.* ICLR, 2015.
3. K. He, X. Zhang, S. Ren, J. Sun. *Deep Residual Learning for Image Recognition.* IEEE CVPR, 2016.
4. C. Szegedy, W. Liu, Y. Jia, P. Sermanet, S. Reed, D. Anguelov, D. Erhan, V. Vanhoucke, A. Rabinovich. *Going Deeper with Convolutions.* IEEE CVPR, 2015.
