---
paper_id: szegedy2015-inception
title: "Going deeper with convolutions"
authors: ["C. Szegedy", "W. Liu", "Y. Jia", "P. Sermanet", "S. Reed", "D. Anguelov", "D. Erhan", "V. Vanhoucke", "A. Rabinovich"]
year: 2015
url: https://arxiv.org/pdf/1409.4842
created: 2026-05-12
relevant_atlas_pages: [googlenet, alexnet, vgg, fcn-semantic-segmentation]
---

# Setting

**Task.** Image classification (1000-class ILSVRC ImageNet) and object detection (200-class ILSVRC, bounding-box output). Both tasks evaluated on ILSVRC 2014.

**Input / output.** Classification: $224 \times 224$ RGB image → 1000-dimensional softmax probability vector. Detection: image of variable size → per-class bounding boxes scored with intersection-over-union $\geq 50\%$ against ground truth; reported in mean average precision (mAP).

**Budget constraint.** The architecture is explicitly designed for a computational budget of 1.5 billion multiply-adds at inference, to remain deployable on resource-constrained devices, not only in data-centre settings. [§1]

**Outputs include.** GoogLeNet — the specific Inception incarnation submitted to ILSVRC 2014 — is 22 layers deep when counting only parameterised layers (27 if pooling is included). [§5, Table 1 caption]

# Core idea

Naive scaling of deep networks (more filters, more layers) leads to quadratic growth in computation when two chained convolutional layers are widened: doubling filters in both layers quadruples multiply-adds. [§3] The theoretical justification from Arora et al. (2013) states: *"if the probability distribution of the data-set is representable by a large, very sparse deep neural network, then the optimal network topology can be constructed layer by layer by analysing the correlation statistics of the activations of the last layer and clustering neurons with highly correlated outputs."* [§3] This resonates with the Hebbian principle (neurons that fire together, wire together), motivating sparse-in-the-limit but dense-in-practice building blocks.

The **Inception module** is the proposed realisation. In its naïve form it runs four parallel branches on the same input — $1 \times 1$, $3 \times 3$, $5 \times 5$ convolutions and $3 \times 3$ max-pooling — and concatenates their outputs along the channel axis. [§4, Figure 2(a)] The problem: even a modest number of $5 \times 5$ filters on top of a large feature map is prohibitively expensive, and the pooling branch passes through the full channel count, causing the output channel dimension to grow with every stacked module. [§4]

The **dimension-reduction variant** (Figure 2(b), used in GoogLeNet) inserts $1 \times 1$ convolutions with ReLU before the $3 \times 3$ and $5 \times 5$ branches, and after the max-pool branch, acting as cross-channel projection bottlenecks. [§4] These $1 \times 1$ convolutions serve a dual purpose: dimensionality compression to control compute, and an additional non-linearity (ReLU). The $1 \times 1$ convolution idea comes from Lin et al. Network-in-Network (2013). [§2]

The module is stacked 9 times in GoogLeNet with occasional stride-2 max-pool layers to halve spatial resolution. Lower layers use traditional convolutions (for memory-efficiency reasons during training). [§4, §5] At the top of the network, global **average pooling** replaces fully-connected classification layers, improving top-1 accuracy by about 0.6% over FC-only while keeping dropout essential. A single linear + softmax layer follows for label-set adaptability. [§5]

Two **auxiliary classifiers** are branched off intermediate Inception layers (4a and 4d) during training. Their losses are added to the total loss with a discount weight of **0.3**. At inference these branches are discarded. [§5]

# Assumptions

1. **(Hard) Spatial translation invariance.** The architecture is built from convolutional blocks that share weights spatially; inputs that violate this (e.g. structured non-stationary scenes) are not explicitly handled.
2. **(Soft) Sparse-correlation structure in activations.** The Arora et al. theoretical justification requires that the data distribution is representable by a sparse deep net. The paper explicitly flags that this assumption may not hold strictly in practice; GoogLeNet works empirically but the theory is not proven to apply exactly. [§3]
3. **(Soft) Fixed input spatial resolution.** Training uses $224 \times 224$ crops; test-time multi-scale evaluation resizes to 4 scales (shorter side $\in \{256, 288, 320, 352\}$). Classification performance degrades at very small or non-square inputs not covered by the training distribution.
4. **(Hard) Sufficient labelled data.** With only 7M parameters, GoogLeNet is less prone to overfitting than AlexNet (60M) at ILSVRC scale, but performance still depends on the 1.2M ILSVRC training images with multi-scale augmentation.
5. **(Soft) Auxiliary classifiers help.** The paper claims they encourage discrimination in lower layers and inject gradient, but subsequent work (Inception v3) showed their regularisation benefit was the primary effect; gradient boosting was secondary. [§5, and see Szegedy et al. 2016 for revision]

# Failure regime

- **Detection without bounding-box regression.** The paper notes GoogLeNet's detection approach did not use bounding-box regression "due to lack of time." [§8] R-CNN with regression produces better localisation; this was an engineering limitation, not a fundamental one.
- **Dense prediction backbone.** As a backbone for FCN semantic segmentation, GoogLeNet (FCN-GoogLeNet: mean IU 42.5 on PASCAL VOC 2011 val) significantly underperformed FCN-VGG16 (56.0 mean IU). [Referenced in Long et al. 2015, FCN Table 1] The Inception architecture's early aggressive spatial downsampling (stride-2 conv1 + two stride-2 max-pools before the Inception modules) and heterogeneous branching make it harder to repurpose for dense pixel-level prediction than VGG's regular stride-1 $3 \times 3$ blocks.
- **Gradient flow in very deep configurations.** The motivation for auxiliary classifiers is explicitly the concern that gradient would not flow effectively back through 22 layers. [§5] Without auxiliary losses during training the network is susceptible to vanishing gradients — later resolved by batch normalisation in BN-Inception (2015).
- **Training instability across hyperparameter variants.** The paper reports that the sampling strategy and hyperparameters (dropout, learning rate) were changed substantially during training, and converged models were retrained under different conditions. No single canonical training recipe was fixed before competition. [§6]
- **Aspect-ratio and scale sensitivity.** Test-time crops from 4 scales and 3 square crops each, plus 6 crops per square plus mirroring ($4 \times 3 \times 6 \times 2 = 144$ crops) are needed to reach peak accuracy. Single-crop performance is notably below ensemble. [§7]

# Numerical sensitivity

**Auxiliary classifier loss weight.** The discount weight of **0.3** on auxiliary losses was chosen empirically; the paper does not ablate it. Too large a weight would bias the network toward intermediate-layer features over the final head. [§5]

**Dropout ratio in auxiliary classifier.** 70% ratio (very high, compared with AlexNet/VGG's 50%) used in auxiliary classifier heads. The main network's dropout is applied only at the final classification layer. [§5 item list]

**Learning rate schedule.** Asynchronous SGD, momentum **0.9**, learning rate decreased by **4%** every **8 epochs** (polynomial schedule). Polyak averaging over iterates used to produce the final inference model. [§6] The exact initial LR is not specified in the publicly accessible text — described only as "a modestly small learning rate." [§6]

**Average pooling improvement.** Switching from fully-connected to average pooling improved top-1 accuracy by approximately **0.6%**. [§5]

**Compute budget.** GoogLeNet operates within approximately **1.5 billion multiply-adds** at inference. [§1] The stem (7×7/2 conv + max-pool + 3×3/1 conv + max-pool) accounts for ~400M ops; the Inception modules account for the remainder. [§5, Table 1 "ops" column]

**Test-time crop formula.** $4 \text{ scales} \times 3 \text{ squares} \times 6 \text{ crops} \times 2 \text{ mirrors} = 144$ crops. Averaging softmax probabilities across all 144 crops gives the best classification performance. [§7]

# Applicability

- **Use when:** compute budget is constrained at inference (mobile, embedded); classification or detection on ImageNet-scale data; multi-scale feature aggregation is desired without explicit feature pyramid structure; parameter count must be kept low (7M vs 60M AlexNet, 138M VGG-16).
- **Don't use when:** pixel-level dense prediction is the primary task — the aggressive downsampling and heterogeneous branch structure make FCN-style adaptations less effective than VGG (FCN-GoogLeNet 42.5 vs FCN-VGG16 56.0 mean IU); when batch normalisation and residual connections are available (use BN-Inception / Inception v3 / ResNet instead).
- **Compared against:** AlexNet (8 layers, 60M params, 16.4% top-5 ILSVRC 2012); VGG-16 (16 layers, 138M params, 7.0% top-5 ILSVRC 2014 single model — beats GoogLeNet single model at 7.9%); R-CNN (detection baseline from Girshick et al. 2014).

# Connections

- **Builds on:**
  - `krizhevsky2012-alexnet` — establishes the CNN architecture paradigm; AlexNet is the parameter-count baseline GoogLeNet beats ($12\times$ fewer params). [§1]
  - Network-in-Network (Lin et al. 2013) — source of $1 \times 1$ convolutions used as cross-channel projections. [§2]
  - Arora et al. 2013 "Provable Bounds" — theoretical motivation for approximating sparse network topologies with dense components via correlation clustering. [§3]
- **Enables:**
  - BN-Inception (Szegedy et al. 2015) — adds batch normalisation to each Inception module; resolves gradient flow issue.
  - Inception v2/v3 (Szegedy et al. 2016) — factorises convolutions ($5\times5 \to$ two $3\times3$; $n\times n \to 1\times n + n \times 1$); further reduces parameters.
  - Inception v4 / Inception-ResNet (Szegedy et al. 2017) — adds residual connections.
- **Refutes / supersedes:** nothing directly. Concurrent with VGG (Simonyan & Zisserman 2014); different design philosophy (Inception: heterogeneous multi-scale modules vs VGG: homogeneous $3\times3$ depth scaling). GoogLeNet won ILSVRC 2014 classification; VGG won localisation. [§4.5 of VGG paper, Table 7]

# Atlas update plan

## NEW: googlenet

Type: model
Category: image-classification-cnn
Primary source: szegedy2015-inception

**Motivation.** GoogLeNet introduces the Inception module to allow increasing network depth and width while holding computational cost roughly constant. Motivated by the theoretical result of Arora et al. (2013) on constructing optimal sparse topologies via correlation statistics, and the practical finding that $1 \times 1$ convolutions from Network-in-Network (Lin et al. 2013) efficiently compress cross-channel information before expensive spatial convolutions. The $12\times$ parameter reduction vs AlexNet (7M vs 60M) with higher accuracy demonstrates that architectural efficiency, not raw scale, drove ILSVRC 2014 improvement.

**Architecture.**
- Input: $224 \times 224 \times 3$ RGB; output: 1000-class softmax.
- Stem: $7\times7/2$ conv → $3\times3/2$ max-pool → $3\times3/1$ conv → $3\times3/2$ max-pool (traditional, not Inception, for memory efficiency). [§4, §5, Table 1]
- 9 stacked Inception modules (3a, 3b, 4a–4e, 5a, 5b) with stride-2 max-pool between groups 3→4 and 4→5.
- Each Inception module (Figure 2(b)): four parallel branches — (1) $1\times1$ conv; (2) $1\times1$ reduce → $3\times3$ conv; (3) $1\times1$ reduce → $5\times5$ conv; (4) $3\times3$ max-pool → $1\times1$ proj — concatenated on the channel axis.
- Global average pooling before the final classifier (not FC layers), plus a single linear + softmax head. Average pooling improves top-1 by ~0.6% over FC-only. [§5]
- Two auxiliary classifier branches during training only, attached at Inception (4a) and (4d): $5\times5$ avg-pool/stride 3 → $1\times1/128$ conv → FC-1024 with ReLU → dropout 70% → FC-1000 softmax. Auxiliary losses weighted 0.3; discarded at inference. [§5]
- Depth: 22 weight layers (27 including pooling); ~100 building blocks total. [§5]
- Parameters: ~7M (stated as $12\times$ fewer than AlexNet's ~60M). [§1]

**Training.**
- DistBelief distributed system; CPU-based; asynchronous SGD with momentum 0.9. [§6]
- Learning rate schedule: polynomial decrease by 4% every 8 epochs. [§6]
- Polyak averaging of iterates for the final inference model. [§6]
- Data augmentation: aspect-ratio sampling with area 8%–100% of image, aspect ratio $\in [3/4, 4/3]$; photometric distortions (Howard 2013); random interpolation (bilinear, area, nearest-neighbour, cubic with equal probability). [§6]
- Test-time: $4 \times 3 \times 6 \times 2 = 144$ crops per image, softmax probabilities averaged. [§7]

**Results.**
- ILSVRC 2014 classification: ensemble top-5 error **6.67%** (7 models, 144 crops) — first place. [§7, Table 2 / Table 3] Single model: 7.9% top-5 (vs single VGG-16: 7.0%).
- ILSVRC 2014 detection: ensemble mAP **43.9%** (6 ConvNet ensemble) — first place. [§8, Table 4] Single model: **38.02%** mAP. [§8, Table 5]
- 56.5% relative top-5 error reduction compared to ILSVRC 2012 winner (AlexNet 16.4%). [§7]

**Implementations.** ?? — open-source implementations to be gathered at page-authoring time; check `torchvision.models.googlenet` (BSD-3-Clause, available since torchvision 0.4) and `timm`/`inception_v1` as starting points. Do not invent URLs or commit SHAs here.

**Relations to author.**
- `{ type: parallel_foundation_with, target: vgg, confidence: high, caution: "Both ILSVRC 2014 entries — GoogLeNet won classification, VGG won localisation; different design philosophies." }`
- `{ type: compared_with, target: alexnet, confidence: high, caution: "Inception is 22 layers vs AlexNet 8; ~12x fewer params at higher accuracy. Cite AlexNet as the baseline GoogLeNet beats." }`
- `{ type: feeds_into, target: fcn-semantic-segmentation, confidence: medium, caution: "GoogLeNet is one of three backbones explored in FCN; underperformed FCN-VGG16 in their experiments." }`

## UPDATE: alexnet

Section: `# Assessment` → **Limitations** (or add a **Successors / lineage** bullet).

Bullet to add: GoogLeNet (Szegedy et al. 2015) raised ILSVRC top-5 to 6.67% (from AlexNet's 16.4% in 2012, a 56.5% relative reduction) with approximately $12\times$ fewer parameters (7M vs ~60M), demonstrating that architectural efficiency rather than raw parameter count drives accuracy. [szegedy2015-inception §1, §7]

## UPDATE: vgg

Section: `# Assessment` → **Strengths** or **Limitations** — wherever ILSVRC 2014 comparison context lives. The VGG page notes in `sources.notes` (§4.5 / Table 7) that single VGG-16 achieves 7.0% top-5 vs single GoogLeNet 7.9%, and 7-net VGG ensemble 7.3% vs GoogLeNet 7-net ensemble 6.7%.

The existing `sources.notes` already contains the relevant numbers from Table 7. The public `# Assessment` section should add a bullet in the context of ILSVRC 2014 results:

Bullet to add under **Strengths**: At ILSVRC 2014 GoogLeNet won the classification track (6.67% top-5, 7-model ensemble) ahead of VGG (7.3% top-5, 7-model ensemble); VGG won localisation. Single-model comparison favours VGG-16 (7.0%) over GoogLeNet (7.9%), illustrating a trade-off: GoogLeNet achieves lower parameter count (7M vs 138M VGG-16) at the cost of single-model classification accuracy; VGG's simpler homogeneous $3\times3$ architecture generalises better to dense prediction (FCN-VGG16 56.0 vs FCN-GoogLeNet 42.5 mean IU). [szegedy2015-inception §1; VGG paper Table 7]

## UPDATE: fcn-semantic-segmentation

Section: `# Assessment` → **Strengths** (FCN's backbone comparison already mentions GoogLeNet 42.5 mIoU).

No new content needed — the existing FCN page already states in `sources.notes` and in the public `# Assessment` section: "GoogLeNet (mean IU 42.5 on VOC 2011 val, Table 1)" and records the FCN-GoogLeNet vs FCN-VGG16 comparison. No update required unless the googlenet Atlas page is added and a `feeds_into` relation is wanted (author that from the googlenet page side).

# Provenance

- [§1 | Introduction] "$12\times$ fewer parameters than the winning architecture of Krizhevsky et al." — GoogLeNet ~7M vs AlexNet ~60M.
- [§1 | Introduction] Computational budget target: 1.5 billion multiply-adds at inference.
- [§2 | Related Work] $1 \times 1$ convolutions from Network-in-Network (Lin et al., ref [12]) used as cross-channel projections; dual purpose: dimension reduction + ReLU non-linearity.
- [§3 | Motivation] Arora et al. sparse-network theorem (ref [2]): "if the probability distribution of the data-set is representable by a large, very sparse deep neural network, then the optimal network topology can be constructed layer by layer by analysing the correlation statistics..."
- [§3 | Motivation] Quadratic compute growth when two chained conv layers are uniformly widened.
- [§4 | Architectural Details] Inception module filter sizes restricted to $1\times1$, $3\times3$, $5\times5$ plus $3\times3$ max-pool; outputs concatenated. Dimension-reduction variant: $1\times1$ bottleneck before $3\times3$ and $5\times5$; $1\times1$ projection after pooling. Figure 2(a) naïve, Figure 2(b) with reductions.
- [§5 | GoogLeNet] Table 1: full layer-by-layer architecture. 22 weight layers (27 with pooling); ~100 building blocks. Global average pooling before classifier; +0.6% top-1 over FC layers.
- [§5 | GoogLeNet] Auxiliary classifiers at Inception (4a) and (4d): $5\times5$ avg-pool stride 3 → $1\times1/128$ conv → FC-1024 → dropout 70% → softmax-1000. Loss weight **0.3** at training; discarded at inference.
- [§6 | Training Methodology] DistBelief, asynchronous SGD, momentum **0.9**, LR decreasing by **4%** every **8 epochs**. Polyak averaging for inference model. Aspect-ratio sampling: area 8%–100%, ratio $\in [3/4, 4/3]$. Photometric distortions. Random interpolation methods.
- [§7 | ILSVRC 2014 Classification Challenge] $4 \times 3 \times 6 \times 2 = 144$ crops per image. Top-5 error **6.67%** on both val and test (Table 2 / Table 3), ranking first. 56.5% relative reduction vs ILSVRC 2012 SuperVision (AlexNet).
- [§8 | ILSVRC 2014 Detection Challenge] Detection ensemble (6 ConvNets) mAP **43.9%** (Table 4, 1st place). Single model mAP **38.02%** (Table 5). Bounding-box regression not used. Multi-box + Selective Search proposal pipeline; ~60% of R-CNN proposals with 92→93% coverage.
