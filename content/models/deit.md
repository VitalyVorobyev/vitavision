---
title: "DeiT"
date: 2026-08-23
summary: "Data-efficient image transformers: ViT's architecture unchanged, made ImageNet-1k-competitive by a heavy augmentation/regularization recipe and distillation through attention — a dedicated distillation token supervised by a convnet teacher's hard decisions."
tags: ["deep-learning"]
domain: representation-learning
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: vit
params: "5M (DeiT-Ti), 22M (DeiT-S), 86M (DeiT-B)"
prerequisites: [vit, knowledge-distillation]
failureModes: []
sources:
  primary: touvron2020-deit
  references:
    - dosovitskiy2020-vit
    - hinton2015-distillation
relations:
  - type: compared_with
    target: swin
    confidence: high
    caution: "Direct head-to-head backbone comparison at matched complexity; Swin reuses DeiT's training recipe but is a different, hierarchical architecture."
implementations:
  - role: official
    repo: https://github.com/facebookresearch/deit
    commit: 7e160fe43f0252d17191b71cbb5826254114ea5b
    framework: pytorch
    license: Apache-2.0
    weights_license: Apache-2.0
---

# Motivation

Takes a fixed-size RGB image, splits it into $16 \times 16$ patches, and produces a class-probability distribution over the 1000 ImageNet classes. The architecture is [vit](/atlas/vit) unchanged — same patch embedding, same class token, same encoder blocks. The defining property is the data regime: competitive ImageNet top-1 accuracy trained on ImageNet-1k alone (1.28M images), with no external or private pretraining corpus, on a single node with 4 GPUs in three days. ViT as published required a 300M-image curated corpus (JFT-300M) to be competitive, on the stated grounds that transformers do not generalise well when trained on insufficient amounts of data. Two contributions remove that requirement: a heavy augmentation-and-regularization training recipe, and distillation through attention — a dedicated distillation token that carries a teacher's decision into the encoder through self-attention rather than through an output-side loss term alone.

# Architecture

**Family & shape.** Pure ViT backbone, patch size 16, no convolutions. Input: a fixed-resolution RGB image split into $16 \times 16$ patches. Output: a probability distribution over 1000 classes, read from the class token by a linear head. The architecture design is identical to ViT's; the only differences are the training strategy and the distillation token. DeiT-B is architecturally identical to ViT-B.

**Blocks.** Self-attention is the standard scaled dot-product form, unchanged from ViT:

$$
\text{Attention}(Q,K,V) = \text{Softmax}(QK^\top/\sqrt{d})V
$$

with $Q \in \mathbb{R}^{N\times d}$ and $K,V \in \mathbb{R}^{k\times d}$. Three released sizes:

| Variant | Embed dim | Heads | Params | Throughput (im/s) |
|---|---|---|---|---|
| DeiT-Ti | 192 | 3 | 5M | 2536 |
| DeiT-S | 384 | 6 | 22M | 940 |
| DeiT-B | 768 | 12 | 86M | 292 |

DeiT-Ti and DeiT-S are introduced as the counterparts of ResNet-18 and ResNet-50. Throughput is measured on a 16GB V100 at the largest feasible batch size per model, using the timm reference implementation; numbers from other setups are not directly comparable.

**Training.** The recipe is the substance of the paper. Hyperparameters: AdamW, 300 epochs, batch size 1024, cosine learning-rate decay, 5 warmup epochs, weight decay 0.05, label smoothing $\varepsilon = 0.1$, no dropout, stochastic depth 0.1, repeated augmentation enabled, no gradient clipping. The learning rate follows the linear-scaling rule with base batch size 512 rather than the 256 of the original rule:

$$
\text{lr}_\text{scaled} = \frac{\text{lr}}{512} \times \text{batchsize}, \qquad \text{lr} = 0.0005
$$

The augmentation stack: RandAugment at magnitude 9 and probability 0.5, Mixup at probability 0.8, CutMix at probability 1.0, random erasing at probability 0.25. Repeated augmentation uses 3 repetitions, so a nominal epoch covers roughly one third of the unique images; the reported 300 epochs are 100 true passes × 3 repeats, kept at 300 for comparability with non-repeated runs.

Weight decay is 0.05 against ViT-B's reported 0.3 — the ViT value is reported to hurt convergence in this setting. The searched grid is $\text{lr} \in \{5\times10^{-4}, 3\times10^{-4}, 5\times10^{-5}\}$ and weight decay $\in \{0.03, 0.04, 0.05\}$. Initialization is truncated normal; several other schemes failed to converge.

**Distillation through attention.** Two objectives are defined. The soft variant is the classical temperature-based knowledge-distillation objective applied to a transformer student; see [knowledge-distillation](/atlas/knowledge-distillation) for the general mechanism.

:::definition[Soft distillation loss]
$Z_t$ and $Z_s$ are teacher and student logits, $\psi$ the softmax, $y$ the ground-truth label, $\tau$ the temperature, $\lambda$ the balancing coefficient. The $\tau^2$ factor compensates the $1/T^2$ scaling of soft-target gradient magnitudes, keeping the two terms' relative weight invariant when $\tau$ is retuned. DeiT uses $\tau = 3.0$ and $\lambda = 0.1$.

$$
\mathcal{L}_\text{global} = (1-\lambda)\,\mathcal{L}_\text{CE}(\psi(Z_s), y) + \lambda \tau^2\, \text{KL}(\psi(Z_s/\tau), \psi(Z_t/\tau))
$$
:::

The hard variant is the paper's proposal. It replaces the teacher's probability vector with the teacher's decision.

:::definition[Hard-label distillation loss]
$y_t = \arg\max_c Z_t(c)$ is the teacher's argmax prediction, used as a second ground-truth target with equal weight. There is no temperature and no $\lambda$ to tune. The true-label term may additionally be label-smoothed ($\varepsilon = 0.1$).

$$
\mathcal{L}_\text{global}^\text{hardDistill} = \tfrac{1}{2}\mathcal{L}_\text{CE}(\psi(Z_s), y) + \tfrac{1}{2}\mathcal{L}_\text{CE}(\psi(Z_s), y_t)
$$
:::

Hard-label distillation outperforms soft distillation: 83.0% versus 81.8% top-1 for DeiT-B at 224 px.

**Distillation token.** A learnable distillation token is appended to the input sequence alongside the patch tokens and the class token. It interacts with them through self-attention in every layer, and its final-layer state is read by a separate linear head trained against the teacher target. At inference the two heads are fused late, by summing their softmax outputs. The two tokens do not collapse: average cosine similarity between class and distillation token is 0.06, rising to 0.93 at the final layer while staying below 1. Two independently initialised class tokens instead converge to the same vector (cosine similarity 0.999) and bring no classification benefit, which isolates the teacher-supervised target — not the added capacity — as the source of the gain.

**Teacher choice.** The default teacher is a convnet, RegNetY-16GF (84M parameters, 82.9% top-1), trained with the same data and the same data augmentation as DeiT. A convnet teacher outperforms a transformer teacher of comparable accuracy.

**Complexity.** DeiT-B has 86M parameters at 292 im/s; DeiT-Ti has 5M at 2536 im/s. A full run is 53 hours of pre-training plus optionally 20 hours of fine-tuning.

# Implementations

Official PyTorch release from Facebook AI Research; ships training code and pretrained checkpoints for the DeiT-Ti/S/B family under Apache-2.0.

# Assessment

## What DeiT introduced

- **A convolution-free ImageNet-competitive network with no external data.** ViT's own requirement for JFT-300M-scale pretraining is replaced by a training recipe on ImageNet-1k alone.
- **Hard-label distillation.** The teacher's argmax decision is used as a second ground-truth target at equal weight, removing the $\tau$ and $\lambda$ of the soft objective inherited from classical knowledge distillation.
- **The distillation token.** The teacher signal enters the encoder through self-attention at every layer via a dedicated token with its own head, rather than only through an output-side loss term.
- **Convnet teachers for transformer students.** Image transformers learn more from a convnet than from another transformer of comparable performance.
- **DeiT-Ti and DeiT-S.** Two smaller ViT configurations positioned as counterparts of ResNet-18 and ResNet-50, filling the gap below ViT-B.

**Strengths.**

- Without distillation, DeiT-B reaches 81.8% top-1 at 224 px and 83.1% at 384 px after fine-tuning. ViT-B/16 trained on ImageNet-1k alone reaches 77.91% top-1.
- With distillation, DeiT-B⚗ reaches 83.4% at 224 px; DeiT-B⚗↑384 reaches 84.5% at 300 epochs and 85.2% at 1000 epochs. The 85.2% figure exceeds the cited JFT-300M-pretrained ViT-B/16 at 384 px (84.15%) while training substantially faster.
- Training cost is a single node with 4 GPUs for three days — 53 hours of pre-training, optionally 20 hours of fine-tuning.
- Transfer to fine-grained classification is competitive: DeiT-B⚗↑384 reaches CIFAR-10 99.2%, CIFAR-100 91.4%, Flowers 98.9%, Stanford Cars 93.9%, iNaturalist-18 80.1%, iNaturalist-19 83.0%.
- The DeiT-S configuration became a standard small-ViT backbone in later self-supervised work, including [dino](/atlas/dino).

**Limitations.**

- The headline distilled numbers require a strong pretrained teacher. The reference RegNetY-16GF (84M parameters, 82.9% top-1) must itself be trained with matching data augmentation. Undistilled DeiT still trains and reaches 81.8% at 224 px, so this is a soft rather than hard precondition.
- The recipe is load-bearing, not optional. Disabling either stochastic depth or repeated augmentation while keeping everything else collapses training to 3.4–4.3% pre-training top-1 and 0.1% after fine-tuning. Replacing AdamW with SGD for pre-training gives 74.5% versus 81.8% at 224 px and 77.3% versus 83.1% at 384 px.
- Transformers are sensitive to initialization and to weight decay in this regime; the ViT-reported weight decay of 0.3 hurts convergence and 0.05 is used instead.
- Fine-tuning at a different resolution requires bicubic interpolation of the positional embeddings. Bilinear interpolation reduces their $\ell_2$-norm relative to neighbours and produces a significant accuracy drop if used without fine-tuning.
- The large-data regime is out of reach. The best DeiT variant at 85.2% still trails the cited ViT-H/14 JFT-300M result at 512 px (88.55%). The ablations are DeiT-B/ImageNet-1k specific and are not expected to transfer unmodified to other architectures or dataset scales.
- The architecture is inherited from ViT unchanged, so its structural constraints are inherited too: a single-scale feature map and attention cost quadratic in the number of patches. Windowed-attention variants such as [swin](/atlas/swin) address that separately; DeiT does not.

# References

1. Touvron, H., Cord, M., Douze, M., Massa, F., Sablayrolles, A., & Jégou, H. *Training data-efficient image transformers & distillation through attention.* ICML, 2021. [arXiv 2012.12877](https://arxiv.org/abs/2012.12877)
2. Dosovitskiy, A. et al. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arXiv 2010.11929](https://arxiv.org/abs/2010.11929)
3. Hinton, G. E., Vinyals, O., & Dean, J. *Distilling the Knowledge in a Neural Network.* NeurIPS Deep Learning Workshop, 2014. [arXiv 1503.02531](https://arxiv.org/abs/1503.02531)
