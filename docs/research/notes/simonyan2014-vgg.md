---
paper_id: simonyan2014-vgg
title: "Very Deep Convolutional Networks for Large-Scale Image Recognition"
authors: ["K. Simonyan", "A. Zisserman"]
year: 2014
url: https://arxiv.org/pdf/1409.1556
created: 2026-05-12
relevant_atlas_pages: [alexnet, fcn-semantic-segmentation, deeplab-semantic-segmentation, superpoint, xfeat]
---

# Setting

Large-scale image classification on ILSVRC (ImageNet 1000-class). Input: a fixed $224 \times 224$ RGB image (only preprocessing: per-pixel mean RGB subtraction). Output: 1000-class posterior via softmax. The paper's primary contribution is a systematic depth study — holding all other design variables constant (3×3 conv throughout, same pooling, same FC structure) and varying depth from 11 to 19 weight layers.

# Core idea

Replace all large-kernel convolutions with stacked $3 \times 3$ convolutions (stride 1, padding 1 — "same" convolutions). Two stacked $3 \times 3$ layers cover a $5 \times 5$ effective receptive field; three cover $7 \times 7$, at a parameter cost of $27C^2$ vs $49C^2$ for a single $7 \times 7$ layer with the same receptive field (a 44% saving). This lets depth scale without explosive parameter growth.

Channel widths follow a doubling schedule: 64 → 128 → 256 → 512 → 512, separated by five $2 \times 2$ max-pool layers (stride 2). Three fully-connected layers cap the network: FC-4096, FC-4096, FC-1000-softmax. All hidden units use ReLU; LRN (used in AlexNet) is absent in all configs except A-LRN, and shown to give no accuracy benefit (Section 4.1).

Depth is increased systematically across six configurations (A, A-LRN, B, C, D, E). Config D (16 weight layers = 13 conv + 3 FC) is "VGG-16"; config E (19 weight layers = 16 conv + 3 FC) is "VGG-19". Config C introduces three $1 \times 1$ conv layers as channel-wise non-linearities within the 256 and 512 blocks; D replaces these with $3 \times 3$ and outperforms C, confirming that spatial context matters beyond extra non-linearity.

# Assumptions

1. (**Hard**) Input is a fixed $224 \times 224$ RGB crop. At test time the fully-connected layers are reinterpreted as convolutional layers ($7 \times 7$ and $1 \times 1$), enabling dense sliding-window inference over larger images — but the training crop size is a design constant.
2. (**Hard**) ImageNet-scale training data (1.3M images, 1000 classes). VGG weights transfer well, but the FC layers carry 122M of the 138M VGG-16 parameters and cannot be trivially resized for smaller class counts without replacement.
3. (**Soft**) Per-pixel mean subtraction is the only normalisation. The absence of batch normalisation (BN, published 2015) means training is sensitive to learning-rate schedule and initialisation.
4. (**Soft**) All channels in a layer have the same spatial extent after pooling; this uniform depth-doubling schedule is not a fundamental constraint but is maintained across all six configs for comparability.

# Failure regime

- **Memory at inference**: VGG-16 requires ~4 GB GPU memory to run forward on a single $224 \times 224$ image at float32 in the dense-evaluation mode. This made it impractical on mobile hardware even at its release.
- **No residual connections**: gradient vanishes through 16–19 layers without skip connections; training relies on careful weight initialisation from the shallower config A. Post-publication authors note that Glorot/Xavier initialisation would have eliminated this dependency, but it was not used.
- **Config E (VGG-19) does not improve over D (VGG-16)**: depth ablation (Table 3) shows error saturates at 19 layers for ImageNet-1000. Deeper VGG variants give no further gain on this dataset, suggesting the architecture hits its capacity ceiling for the task, not a principled stopping criterion.
- **Large FC layers**: 122M parameters reside in the three FC layers. These are the primary source of overfitting risk and inference cost. Dropout (ratio $0.5$) in the first two FC layers is the sole regulariser targeting them.
- **Scale mismatch at test time**: a large discrepancy between training scale $S$ and test scale $Q$ drops performance (Section 4.2). Fixed-$S$ models evaluated at $Q \ne S$ degrade; multi-scale training $S \in [256, 512]$ mitigates this.

# Numerical sensitivity

- **LR schedule**: initial LR $10^{-2}$, decreased by factor 10 three times on validation plateau. Entire training = 370K iterations / 74 epochs (batch size 256). For the $S=384$ fixed-scale variant, a reduced initial LR of $10^{-3}$ is used when fine-tuning from the $S=256$ checkpoint, to prevent overwriting a good initialisation.
- **Weight init**: net A weights sampled from $\mathcal{N}(0, 10^{-2})$ (std = 0.1), biases set to zero. Deeper nets use A's first 4 conv + last 3 FC layers as seed; remaining layers use the same Gaussian. Authors note post-hoc that Glorot/Xavier (Glorot & Bengio, 2010) would work without the staged init.
- **Weight decay**: $L_2$ penalty multiplier $5 \cdot 10^{-4}$.
- **Momentum**: $0.9$.
- **Dropout**: ratio $0.5$ on the first two FC layers only.
- **Parameter counts (Table 2)**: A = 133M, A-LRN = 133M, B = 133M, C = 134M, D = 138M, E = 144M.
- **Parameter-efficiency argument (Section 2.3)**: three stacked $3 \times 3$ conv layers cost $3 \cdot (3^2 C^2) = 27C^2$ parameters; a single $7 \times 7$ layer costs $7^2 C^2 = 49C^2$ — 81% more for the same receptive field.
- **GPU compute**: 4 NVIDIA Titan Black GPUs; 2–3 weeks per net. Multi-GPU data-parallel scheme achieves $3.75\times$ speedup vs single GPU (Section 3.3).

# Applicability

- **Use when**: transfer-learning backbone for dense prediction tasks (segmentation, detection, depth) where the established public checkpoints and the wide adoption of VGG-16 in benchmark literature are a significant advantage.
- **Use when**: ablating depth effects in a controlled experiment — the six configs share all design choices except depth, making VGG the canonical depth-ablation dataset in the CNN literature.
- **Don't use when**: memory is constrained. VGG-16 is one of the largest standard backbones per FLOP. ResNet-50 and EfficientNet variants achieve lower error with far fewer parameters and activations.
- **Don't use when**: training from scratch on a small dataset. The 138M parameters and absence of BN make VGG a poor choice without pretrained weights.
- **Compared against**: GoogLeNet (Inception-v1, ILSVRC-2014 classification winner at 6.7% top-5 vs VGG-7-net 7.3%); AlexNet (ILSVRC-2012, 16.4% top-5); OverFeat; Zeiler & Fergus ZFNet.

# Connections

- Builds on: AlexNet (Krizhevsky et al., 2012) — same overall ConvNet structure, first large-scale CNN to win ILSVRC.
- Enables: FCN-VGG16 (Long et al., 2015) — VGG-16 is the canonical FCN backbone (FCN Table 1: FCN-VGG16 mean IU 56.0 vs FCN-AlexNet 39.8); DeepLab v1 — VGG-16 backbone for atrous convolution segmentation; transfer-learning era (2014–2019): VGG features used as off-the-shelf feature extractors across object detection, face recognition, and style transfer.
- Refutes / supersedes: large-kernel-first-layer designs (AlexNet $11 \times 11$ stride-4 first conv, ZFNet $7 \times 7$ stride-2 first conv) — Section 2.3 shows the same receptive field can be achieved more efficiently and with more non-linearity via stacked $3 \times 3$ conv.

# Atlas update plan

## NEW: vgg
Type: model
Category: image classification (CNN)
Primary source: this paper

**Goal**: Classify an RGB image into one of 1000 ImageNet categories. The family spans configs D (VGG-16, 16 weight layers, 138M params) and E (VGG-19, 19 weight layers, 144M params). Both have been the canonical transfer-learning backbone for dense prediction tasks throughout 2014–2019.

**Architecture**:
- Input $224 \times 224$ RGB, mean-subtracted (Section 2.1).
- All conv layers use $3 \times 3$ kernels, stride 1, padding 1 ("same"). Five max-pool stages ($2 \times 2$, stride 2) each double the channel count: 64 → 128 → 256 → 512 → 512 (Table 1).
- Three FC layers: FC-4096, FC-4096, FC-1000-softmax. All hidden layers use ReLU. No LRN (shown to add cost with no accuracy gain, Section 4.1).
- Config C adds three $1 \times 1$ conv layers as channel-wise non-linearities; config D replaces these with $3 \times 3$ and achieves lower error (Section 4.1).
- Key invariant: two stacked $3 \times 3$ layers cover a $5 \times 5$ effective receptive field; three cover $7 \times 7$, with 44% fewer parameters than a single $7 \times 7$ layer at the same C (Section 2.3).

**Training**:
- SGD with momentum $0.9$, weight decay $5 \cdot 10^{-4}$, batch size 256.
- Dropout ratio $0.5$ in first two FC layers.
- Initial LR $10^{-2}$; decreased ×10 three times on validation plateau. Total: 370K iterations / 74 epochs (Section 3.1).
- Two training-scale regimes: fixed $S \in \{256, 384\}$; multi-scale $S \in [256, 512]$.
- Dense test evaluation (FC layers reinterpreted as conv) + multi-crop fusion. Best single-network: 24.8% / 7.5% top-1/top-5 val error (config D, multi-scale, Table 4). Configuration E achieves 7.3% top-5 test error (Table 4, Section 4.2).
- ILSVRC-2014: 7-net ensemble 7.3% test top-5 (2nd place classification; 1st place localisation). Post-submission 2-net ensemble: 6.8% (Table 7).
- GoogLeNet (ILSVRC-2014 winner): 6.7% top-5 (7 nets); single VGG-16 at 7.0% beats single GoogLeNet 7.9% (Table 7).

**Implementations**:
- Authors released VGG-16 and VGG-19 Caffe model files at http://www.robots.ox.ac.uk/~vgg/research/very_deep/
- PyTorch: `torchvision.models.vgg16(pretrained=True)`, `torchvision.models.vgg19(pretrained=True)`.
- Keras/TF: `keras.applications.VGG16`, `keras.applications.VGG19`.

**Assessment**:
- Foundational: established stacked $3 \times 3$ conv as the default conv-block primitive, adopted by ResNet, DenseNet, and nearly every subsequent architecture.
- Superseded for production use by ResNet-50/101 (better accuracy, ~40% fewer parameters, faster inference), EfficientNet, and modern transformers. Retained for citation lineage and as a baseline.
- Transfer learning value remains: VGG-16 Conv4/5 features are among the most-studied image representations in the literature (style transfer, texture synthesis, perceptual loss functions).

Relations:
- { type: feeds_into, target: fcn-semantic-segmentation, confidence: high, caution: "VGG-16 is FCN's canonical backbone per FCN Table 1; FCN-VGG16 mean IU 56.0 vs FCN-AlexNet 39.8." }
- { type: feeds_into, target: deeplab-semantic-segmentation, confidence: high, caution: "DeepLab v1 uses VGG-16 backbone; later versions switched to ResNet/Xception." }

Cross-page edits to author later:
- alexnet: add relations entry { type: extended_by, target: vgg, confidence: high, caution: "VGG extends AlexNet's CNN classifier paradigm from 8 to 16/19 layers via stacked 3×3 conv blocks." }

# Provenance

- **Abstract**: "pushing the depth to 16–19 weight layers" — direct quote confirming the range.
- **Section 2.1**: $224 \times 224$ input; $3 \times 3$ kernels stride 1, padding 1; $1 \times 1$ conv in one config; $2 \times 2$ max-pool stride 2; three FC layers (4096, 4096, 1000); ReLU on all hidden; LRN only in A-LRN.
- **Section 2.2 / Table 1**: six configurations A, A-LRN, B, C, D, E with 11, 11, 13, 16, 16, 19 weight layers; channel schedule 64 → 128 → 256 → 512 → 512; conv notation "conv3-64" (kernel-size – channels).
- **Table 2**: parameter counts 133M (A, A-LRN, B), 134M (C), 138M (D), 144M (E).
- **Section 2.3**: three $3 \times 3$ layers cost $3(3^2 C^2) = 27C^2$ vs $7^2 C^2 = 49C^2$ for single $7 \times 7$ (81% more). Two stacked $3 \times 3$ = $5 \times 5$ receptive field; three = $7 \times 7$.
- **Section 3.1 (Training)**: batch size 256; momentum 0.9; $L_2$ weight decay $5 \cdot 10^{-4}$; dropout ratio 0.5 in first two FC layers; initial LR $10^{-2}$; decreased ×10 three times; 370K iterations / 74 epochs. Net A: $\mathcal{N}(0, 10^{-2})$ init (std = 0.1, i.e., variance $= 10^{-2}$), biases zero; deeper nets: first 4 conv + last 3 FC from A. Fixed scale variants: $S = 256$, $S = 384$ (LR $10^{-3}$ for S=384 fine-tune). Multi-scale: $S \in [S_{min}, S_{max}] = [256, 512]$.
- **Section 3.2 (Testing)**: FC layers reinterpreted as conv ($7 \times 7$ and $1 \times 1$); multi-crop fusion with dense evaluation.
- **Section 3.3 (Implementation Details)**: 4 NVIDIA Titan Black GPUs; 2–3 weeks per net; $3.75\times$ speedup vs single GPU.
- **Section 4.1 / Table 3**: LRN gives no improvement. Error decreases A→B→C→D; D better than C despite same depth (spatial context from $3 \times 3$ > non-linearity from $1 \times 1$). Best single-scale (Table 3): D $S=[256;512]$ Q=384: top-1 25.6%, top-5 8.1%.
- **Section 4.2 / Table 4**: best single-network val: 24.8% top-1 / 7.5% top-5 (D or E, $S=[256;512]$, $Q=\{256,384,512\}$). Config E test set: 7.3% top-5.
- **Section 4.3 / Table 5**: dense eval D top-5 val 7.5%; multi-crop D 7.5%; multi-crop + dense D 7.2%; best single model E multi-crop+dense: 7.1% top-5.
- **Section 4.4 / Table 6**: ILSVRC submission 7-net ensemble: 7.3% test top-5. Post-submission D+E 2-net ensemble dense: 7.0%; multi-crop+dense: 6.8%.
- **Section 4.5 / Table 7**: VGG "2 nets multi-crop & dense" = 6.8% top-5 test; VGG ILSVRC submission 7 nets = 7.3%; GoogLeNet 7 nets = 6.7%; GoogLeNet 1 net = 7.9%; single VGG-16 post-submission = 7.0% (outperforms single GoogLeNet by 0.9%).
