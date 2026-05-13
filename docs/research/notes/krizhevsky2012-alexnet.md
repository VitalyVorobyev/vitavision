---
paper_id: krizhevsky2012-alexnet
title: "ImageNet Classification with Deep Convolutional Neural Networks"
authors: ["A. Krizhevsky", "I. Sutskever", "G. E. Hinton"]
year: 2012
url: https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf
created: 2026-05-12
relevant_atlas_pages: [fcn-semantic-segmentation, unet-segmentation, deeplab-semantic-segmentation, mask-rcnn, mate-checkerboard-detector, ccdn-checkerboard-detector, superpoint, hog-descriptor, sift]
---

# Setting

**Problem class:** Large-scale image classification (single-label, closed-set, 1000 classes).

**Inputs:** Fixed-size $224 \times 224 \times 3$ RGB image patches, mean-subtracted (per-channel mean computed over the full ImageNet training set). Images are sourced from the ILSVRC subset of ImageNet: roughly 1.2 million training images, 50,000 validation images, and 150,000 test images spanning 1000 categories.

**Outputs:** A 1000-dimensional probability vector from a softmax layer. Evaluation uses top-1 and top-5 error rates; top-5 measures whether the correct label appears among the five highest-probability predictions.

**Scale:** ImageNet contains over 15 million labeled high-resolution images in over 22,000 categories; ILSVRC uses a 1000-category subset with roughly 1000 images per class.


# Core idea

A deep CNN with 5 convolutional layers and 3 fully-connected layers is trained end-to-end on ImageNet using GPU-parallelised stochastic gradient descent. Four design choices jointly drive the result:

1. **ReLU nonlinearity** ($f(x) = \max(0, x)$) replaces saturating activations (tanh, sigmoid), enabling roughly 6× faster convergence on CIFAR-10 at 25% training error.

2. **Local Response Normalisation (LRN)** suppresses activations across adjacent kernel maps at the same spatial position via:
$$b^i_{x,y} = a^i_{x,y} \Big/ \!\left(k + \alpha \sum_{j=\max(0,\,i-n/2)}^{\min(N-1,\,i+n/2)} (a^j_{x,y})^2 \right)^\beta$$
with $k=2$, $n=5$, $\alpha=10^{-4}$, $\beta=0.75$. Applied after ReLU on layers 1 and 2; reduces top-1 / top-5 error by 1.4% / 1.2%.

3. **Overlapping max-pooling** (window $z=3$, stride $s=2$) instead of non-overlapping ($z=s=2$), reducing top-1 / top-5 error by 0.4% / 0.3%.

4. **Dropout** ($p=0.5$) in the first two fully-connected layers halves the effective model size at training time, preventing co-adaptation of feature detectors.

Two GPUs are used, each holding half the kernels; cross-GPU communication occurs only at layers 3 and the fully-connected layers (layer 4 and layer 5 kernels communicate only within the same GPU).


# Assumptions

1. **Fixed-resolution input (hard).** The network requires $224 \times 224 \times 3$ inputs. Variable-resolution source images are rescaled so the shorter side is 256 pixels, then center-cropped to $256 \times 256$; random $224 \times 224$ patches are drawn during training.

2. **Sufficient labeled data (soft).** With 60 million parameters and only $\sim$1.2 million training images, heavy augmentation and dropout are required to avoid overfitting. The paper notes removing any convolutional layer degrades performance by $\sim$2% top-1, indicating the depth is only supportable because of the dataset scale.

3. **GPU memory parity (soft).** The two-GPU split assumes 3 GB per GPU (GTX 580). The split is asymmetric in inter-layer connectivity; porting to a single GPU or a GPU with much more memory requires architectural adjustment.

4. **IID class distribution (hard).** The model is trained with a 1000-way softmax on a roughly balanced class distribution. Fine-grained or heavily imbalanced taxonomies require loss reweighting or a different output head.

5. **Object identity invariant to illumination colour (soft).** The PCA colour jitter augmentation encodes this assumption explicitly. If colour is a diagnostic feature (e.g., multi-spectral imaging), this augmentation degrades performance.


# Failure regime

- **Removing any convolutional layer costs $\sim$2% top-1** (Section 7). The architecture is brittle to depth reductions; each middle layer contributes $\le 1\%$ of parameters but a disproportionate share of performance.
- **No unsupervised pre-training.** The paper explicitly defers this, expecting gains on smaller labeled sets (Section 7).
- **Highly inter-dependent augmentation patches.** The $2048\times$ training-set expansion from crops and flips produces highly correlated examples, so effective sample diversity is much lower than the raw count suggests.
- **GPU specialisation is unpredictable.** The two GPU branches spontaneously specialise (colour-agnostic vs colour-specific kernels); this is an emergent artefact of the architecture, not a designed property (Section 6.1).
- **Test-time ensemble of 10 patches.** Predictions at test time average over 5 crops × 2 flips; dropping this raises top-1 / top-5 error from 37.5% / 17.0% to 39.0% / 18.3%.
- **Error rates on the Fall 2009 ImageNet variant** (10,184 categories, 8.9M images) are 67.4% / 40.9%, illustrating steep degradation when class count grows by 10×.


# Numerical sensitivity

- **Learning rate schedule.** Initial learning rate $\epsilon = 0.01$; divided by 10 three times when validation error plateaus. The timing of these manual reductions is critical — the paper does not give a fixed schedule, only a heuristic.
- **Weight decay as regulariser and loss reducer.** $\lambda = 0.0005$; the authors note it reduces training error, not only test error, and is not a pure regulariser in this regime.
- **Bias initialisation asymmetry.** Biases in layers 2, 4, 5 (conv) and the two hidden fully-connected layers are initialised to $1$ to provide positive ReLU inputs early in training; remaining layer biases initialised to $0$. Incorrect initialisation stalls early convergence.
- **Weight initialisation.** All weights drawn from $\mathcal{N}(0, 0.01^2)$. A scale error here (e.g., $0.1$) would saturate tanh units; with ReLU the risk is smaller but large initialisations still produce exploding activations.
- **PCA colour jitter scale.** Perturbation magnitudes proportional to eigenvalues times $\alpha_i \sim \mathcal{N}(0, 0.1^2)$. The standard deviation $0.1$ is a fixed hyper-parameter; larger values distort colour identity.
- **LRN constants.** $k=2$, $n=5$, $\alpha=10^{-4}$, $\beta=0.75$ were tuned on a validation set. The scheme is sensitive to $\alpha$: too large and it suppresses useful activations; too small and it provides no benefit.
- **Input size caveat.** The paper states $224 \times 224 \times 3$ input (Section 3.5, Figure 2 caption), but the stride-4 first layer with 11×11 kernels produces a $55 \times 55$ feature map only if the input is $227 \times 227$. Practical implementations use $227 \times 227$; the discrepancy is a typographical error in the paper.?


# Applicability

- **Use when:** training a large CNN classifier on a millions-scale labeled image dataset with GPU resources; the ReLU + LRN + overlapping pooling + dropout combination is a proven baseline; the architecture is also the standard backbone for downstream transfer learning to detection (R-CNN) and segmentation (FCN) tasks.
- **Don't use when:** dataset is small (<<100K images per class), inference latency is critical (60M parameters is heavy for embedded), or when more recent architectures (VGG, ResNet, EfficientNet) are available — they consistently outperform AlexNet.
- **Compared against (at time of publication):** Sparse coding features (top-1 47.1%, top-5 28.2% on ILSVRC-2010); SIFT + Fisher Vectors (top-1 45.7%, top-5 25.7%). AlexNet achieves 37.5% / 17.0% on ILSVRC-2010 and 15.3% top-5 on ILSVRC-2012 vs 26.2% for second place.


# Connections

- Builds on: ReLU units from Nair & Hinton 2010 [20]; dropout from Hinton et al. 2012 [10]; earlier CNN architectures from LeCun et al. [15, 16, 17]
- Enables: FCN-style transfer learning for dense prediction (semantic segmentation uses AlexNet-style backbones); deep detection pipelines (HOG+SVM replaced by CNN features); modern image classification and representation learning
- Refutes / supersedes: BoW + SIFT pipelines and sparse coding approaches for large-scale image classification (historical displacement, not a formal typed relation)


# Atlas update plan

## NEW: alexnet
Type: model
Category: image classification (CNN)
Primary source: this paper

**Motivation**
- First CNN to win ILSVRC (2012) by a large margin (top-5 15.3% vs 26.2% second place), demonstrating that deep CNNs trained on GPU with ReLU nonlinearities and dropout can outperform all hand-engineered feature pipelines at scale.
- Introduced or popularised four techniques that became standard: ReLU activations, Local Response Normalisation, overlapping pooling, dropout for FC regularisation.
- Established the recipe of GPU-parallelised training + heavy data augmentation as the dominant paradigm for image classification for the following decade.

**Architecture**
- 8 learned layers: 5 convolutional + 3 fully-connected; 60 million parameters; 650,000 neurons.
- Layer dimensions (Section 3.5): Conv1 — 96 kernels, $11\times11\times3$, stride 4; Conv2 — 256 kernels, $5\times5\times48$; Conv3 — 384 kernels, $3\times3\times256$; Conv4 — 384 kernels, $3\times3\times192$; Conv5 — 256 kernels, $3\times3\times192$; FC6 — 4096 neurons; FC7 — 4096 neurons; FC8 — 1000-way softmax.
- Neuron layer sizes (Figure 2 caption): 253,440 → 186,624 → 64,896 → 64,896 → 43,264 → 4096 → 4096 → 1000.
- ReLU nonlinearity after every conv and FC layer; LRN after conv1 and conv2; overlapping max-pooling ($z=3$, $s=2$) after conv1, conv2, and conv5.
- Dropout ($p=0.5$) in FC6 and FC7 only.

**Training**
- SGD, batch size 128, momentum 0.9, weight decay 0.0005.
- Weight init $\mathcal{N}(0, 0.01^2)$; bias init 1 for conv2, conv4, conv5, FC6, FC7; 0 elsewhere.
- Learning rate $\epsilon=0.01$, manually divided by 10 three times when validation error stops improving.
- 90 epochs over 1.2M training images; 5–6 days on two GTX 580 3GB GPUs.
- Data augmentation: random $224\times224$ crops + horizontal flips from $256\times256$ images; PCA colour jitter ($\alpha_i \sim \mathcal{N}(0, 0.1^2)$).

**Implementations**
- Original CUDA implementation: http://code.google.com/p/cuda-convnet/ (referenced Section 3.1 footnote, Section 3.3 footnote).
- PyTorch `torchvision.models.alexnet`; Caffe Model Zoo.

**Assessment**
- ILSVRC-2010: top-1 37.5%, top-5 17.0% (Table 1, previous best 45.7% / 25.7%).
- ILSVRC-2012: top-5 15.3% ensemble (Table 2), vs 26.2% second place.
- Ablation: two-GPU vs one-GPU reduces top-1 / top-5 by 1.7% / 1.2% (Section 3.2); LRN reduces by 1.4% / 1.2% (Section 3.3); overlapping pooling reduces by 0.4% / 0.3% (Section 3.4).

**References**
- Primary: krizhevsky2012-alexnet
- Related: Nair & Hinton 2010 (ReLU origin); Hinton et al. 2012 (dropout); LeCun et al. (earlier CNNs)


# Provenance

All numerical constants, equations, and claims are sourced from the NeurIPS 2012 paper as rendered in `krizhevsky2012-alexnet.txt`.

- **60 million parameters, 650,000 neurons, 5 conv + 3 FC layers, 1000-way softmax** — Abstract.
- **Top-1 37.5%, top-5 17.0% (ILSVRC-2010)** — Abstract; Table 1 (Section 6).
- **Top-5 15.3% (ILSVRC-2012) vs 26.2% second place** — Abstract; Table 2 (Section 6).
- **ReLU $f(x) = \max(0, x)$, "six times faster" than tanh on CIFAR-10 at 25% training error** — Section 3.1, Figure 1 caption.
- **LRN formula** ($b^i_{x,y}$, $k$, $n$, $\alpha$, $\beta$) with constants $k=2$, $n=5$, $\alpha=10^{-4}$, $\beta=0.75$ — Section 3.3 (formula and surrounding text).
- **LRN error reductions 1.4% / 1.2%** — Section 3.3.
- **Overlapping pooling $z=3$, $s=2$; error reductions 0.4% / 0.3%** — Section 3.4.
- **Two-GPU split, cross-GPU communication only at certain layers; error reductions 1.7% / 1.2%** — Section 3.2.
- **Layer-by-layer dimensions** (96 kernels $11\times11\times3$ stride 4; 256 kernels $5\times5\times48$; 384 kernels $3\times3\times256$; 384 kernels $3\times3\times192$; 256 kernels $3\times3\times192$; FC 4096, 4096) — Section 3.5.
- **Neuron count sequence 253,440–186,624–64,896–64,896–43,264–4096–4096–1000** — Figure 2 caption (Section 3.5).
- **Input $224\times224\times3$** — Section 3.5; Figure 2 footnote 4.
- **Data augmentation: random $224\times224$ crops from $256\times256$; horizontal flips; 2048× training-set factor; 10-patch test-time averaging** — Section 4.1.
- **PCA colour jitter formula** $[p_1, p_2, p_3][\alpha_1\lambda_1, \alpha_2\lambda_2, \alpha_3\lambda_3]^T$ with $\alpha_i \sim \mathcal{N}(0, 0.1^2)$; reduces top-1 error by over 1% — Section 4.1.
- **Dropout $p=0.5$ in first two FC layers; doubles iterations to converge** — Section 4.2.
- **SGD batch size 128, momentum 0.9, weight decay 0.0005** — Section 5.
- **Update rule** $v_{i+1} := 0.9 \cdot v_i - 0.0005 \cdot \epsilon \cdot w_i - \epsilon \cdot \langle \partial L/\partial w \rangle_{D_i}$; $w_{i+1} := w_i + v_{i+1}$ — Section 5.
- **Weight init $\mathcal{N}(0, 0.01^2)$; bias init 1 for conv2, conv4, conv5, FC hidden layers; 0 elsewhere** — Section 5.
- **Learning rate init $\epsilon=0.01$, divided by 10 three times; 90 cycles; 5–6 days on two GTX 580 3GB GPUs** — Section 5.
- **Previous ILSVRC-2010 bests: sparse coding 47.1% / 28.2%; SIFT+FVs 45.7% / 25.7%** — Table 1 (Section 6).
- **Single CNN top-5 18.2%; 5-CNN ensemble 16.4%; pre-trained 7-CNN ensemble 15.3%** — Section 6, Table 2.
- **Fall 2009 ImageNet (10,184 categories, 8.9M images): 67.4% / 40.9% top-1 / top-5** — Section 6.
- **Removing a middle conv layer costs $\sim$2% top-1** — Section 7.
- **GPU specialisation (colour-agnostic vs colour-specific kernels)** — Section 6.1.
- **ImageNet >15M images, >22,000 categories** — Section 1 (Introduction) and Section 2.
- **ILSVRC ~1.2M training, 50K validation, 150K test** — Section 2.
