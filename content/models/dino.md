---
title: "DINO"
date: 2026-08-23
summary: "Self-distillation with no labels: an EMA teacher, multi-crop training, and centering+sharpening yield ViT features whose frozen k-NN accuracy nearly matches a linear probe and whose attention maps segment objects without supervision."
tags: ["deep-learning"]
domain: representation-learning
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: vit
params: "21M (ViT-S), 85M (ViT-B), 23M (ResNet-50)"
prerequisites: [vit, attention-mechanism, self-supervised-learning, knowledge-distillation]
failureModes: []
sources:
  primary: caron2021-dino
  references:
    - grill2020-byol
    - he2019-moco
    - chen2020-simclr
    - touvron2020-deit
relations:
  - type: extended_by
    target: dinov2
    confidence: high
implementations:
  - role: official
    repo: https://github.com/facebookresearch/dino
    commit: 7c446df5b9f45747937fb0d72314eb9f7b66930a
    framework: pytorch
    license: Apache-2.0
    weights_license: Apache-2.0
---

# Motivation

Takes unlabeled images and produces a frozen backbone whose output — the `[CLS]` token for a ViT, global-average-pooled features for a ResNet-50 — is read out by a linear probe or a k-NN classifier without finetuning. Training uses no annotations of any kind; the framework is posed as self-distillation with no labels, a form of [knowledge-distillation](/atlas/knowledge-distillation) in which the teacher is built from past iterations of the student rather than supplied externally.

Two properties emerge from this recipe that supervised ViT pretraining does not produce at comparable strength. A k-NN classifier on frozen features reaches 78.3% ImageNet top-1 with ViT-S/8, close to the 79.7% linear probe on the same model — no linear layer, no finetuning, no augmentation at evaluation. Thresholding the `[CLS]` self-attention map of the last layer to keep 60% of the mass yields object masks with PASCAL VOC12 Jaccard similarity 45.9 for ViT-S/16, versus 27.3 for the supervised backbone and 22.0 for random weights.

This is version one of the DINO line. Training and evaluation are ImageNet-1k scale; the extension to a large uncurated web corpus is stated as future work and is what [dinov2](/atlas/dinov2) supplies. The page for [self-supervised-learning](/atlas/self-supervised-learning) covers the surrounding method family.

# Architecture

**Family & shape.** A network $g = h \circ f$: backbone $f$ plus projection head $h$. The backbone is a [vit](/atlas/vit) or a ResNet-50; downstream use keeps only $f$'s output and discards $h$. The ViT-S configuration follows the [deit](/atlas/deit) DeiT-S design, with pre-norm layer normalization, a `[CLS]` token prepended to the patch-embedding sequence, and position embeddings bicubic-interpolated across resolutions.

The projection head is a 3-layer MLP with hidden dimension 2048 and GELU activations (no GELU on the last MLP layer), followed by $\ell_2$-normalization and a weight-normalized fully-connected layer with $K$ outputs. Defaults are $K = 65536$ and bottleneck dimension $d = 256$. The system is BN-free: standard ViT has no batch normalization, and DINO omits it from the head as well. Ablation gives 69.7 k-NN without BN versus 68.6 with it.

**Blocks.** A student $g_{\theta_s}$ is trained to match a teacher $g_{\theta_t}$ of identical architecture but different parameters. Both emit a $K$-dimensional distribution through a temperature softmax.

:::definition[Self-distillation objective]
$\tau_s > 0$ controls student sharpness; the teacher uses an analogous $P_t$ with temperature $\tau_t$. A stop-gradient is applied on the teacher branch — gradients flow only through the student.

$$
P_s(x)^{(i)} = \frac{\exp(g_{\theta_s}(x)^{(i)}/\tau_s)}{\sum_{k=1}^K \exp(g_{\theta_s}(x)^{(k)}/\tau_s)}
$$

$$
\min_{\theta_s} H(P_t(x), P_s(x)), \quad H(a,b) = -a\log b
$$
:::

The teacher is an exponential moving average of the student, with $\lambda$ following a cosine schedule from 0.996 to 1 during training:

$$
\theta_t \leftarrow \lambda \theta_t + (1-\lambda)\theta_s
$$

**Multi-crop.** A set $V$ of views is generated per image: 2 global crops at $224^2$ resolution and several local crops at $96^2$ — six in the ablation configurations. All crops pass through the student; only the two global crops pass through the teacher. The loss sums cross-entropy over all teacher-view / student-view pairs excluding self-pairs, which forces local-to-global correspondence:

$$
\min_{\theta_s} \sum_{x \in \{x_1^g, x_2^g\}} \sum_{\substack{x' \in V \\ x' \neq x}} H(P_t(x), P_s(x'))
$$

**Collapse avoidance.** No contrastive negatives, no online clustering, no predictor network. Two operations on the teacher output do the work. Centering adds a bias term $c$ updated by EMA over the batch mean, with rate $m$ and batch size $B$:

$$
c \leftarrow mc + (1-m)\frac{1}{B}\sum_{i=1}^B g_{\theta_t}(x_i)
$$

Sharpening uses a low teacher temperature $\tau_t$. The two push in opposite directions, which the entropy decomposition makes explicit:

$$
H(P_t, P_s) = h(P_t) + D_{KL}(P_t \,\|\, P_s)
$$

A KL of zero signals collapse. Without centering the entropy $h(P_t)$ converges to 0, the dominant-dimension mode; without sharpening it converges to $-\log(1/K)$, the uniform mode. Both operations together are required and sufficient under a momentum teacher.

**Training.** $\tau_s = 0.1$ fixed; $\tau_t$ linearly warmed up from 0.04 to 0.07 during the first 30 epochs, then held. AdamW, batch size 1024 (16 GPUs for ViT-S/16), $\text{lr} = 0.0005 \times \text{batchsize}/256$ warmed up linearly over 10 epochs then cosine-decayed, weight decay on a cosine schedule 0.04 → 0.4. Augmentations follow BYOL — color jittering, Gaussian blur, solarization — plus multi-crop. Evaluation uses a linear probe or a weighted k-NN vote with $k=20$.

**Variants.** Backbone configurations and ImageNet top-1 under both frozen protocols; throughput measured on V100 at batch size 128, backbone only.

| Backbone | Blocks | Dim | Heads | Params | im/s | Linear | k-NN |
|---|---|---|---|---|---|---|---|
| ResNet-50 | – | 2048 | – | 23M | 1237 | 75.3 | 67.5 |
| ViT-S/16 | 12 | 384 | 6 | 21M | 1007 | 77.0 | 74.5 |
| ViT-S/8 | 12 | 384 | 6 | 21M | 180 | 79.7 | 78.3 |
| ViT-B/16 | 12 | 768 | 12 | 85M | 312 | 78.2 | 76.1 |
| ViT-B/8 | 12 | 768 | 12 | 85M | 63 | 80.1 | 77.4 |

Reducing patch size from 16 to 8 adds no parameters and raises accuracy, at roughly 5× the inference cost for ViT-S.

**Complexity.** Multi-crop dominates training cost: 2×224² alone reaches 72.5% linear in 45.9h, while 2×224²+10×96² reaches 76.1% in 72.6h at 300 epochs. The 2-crop setting does not catch up with longer training.

# Implementations

Official PyTorch release from Facebook AI Research under Apache-2.0; ships training and evaluation code plus pretrained checkpoints for ViT-S and ViT-B at patch sizes 16 and 8.

# Assessment

## What v1 introduced

- **Self-distillation with no labels.** Student and teacher share the exact same architecture, and the teacher is constructed dynamically from the student by EMA rather than being a fixed pretrained model. No predictor head, unlike BYOL.
- **Cross-entropy on softmax outputs** as the matching loss, replacing BYOL's MSE on $\ell_2$-normalized predictions. The MSE variant scores 52.6 k-NN / 62.4 linear against 72.8 / 76.1 for cross-entropy.
- **Centering plus sharpening** as a complete collapse-avoidance pair, requiring neither negative pairs, nor a memory queue, nor Sinkhorn-Knopp. Adding Sinkhorn-Knopp on top of the momentum teacher changes little (72.2/76.0 versus 72.8/76.1).
- **Multi-crop as a load-bearing component**, not an add-on: local-to-global matching between $96^2$ and $224^2$ views contributes 4.9 k-NN points.
- **Emergent unsupervised segmentation** in `[CLS]` attention: VOC12 Jaccard 45.9 for DINO ViT-S/16 against 27.3 supervised and 22.0 random. The property is shared across SSL frameworks on ViT — MoCo-v2 46.3, BYOL 47.8, SwAV 46.8 at the 80%-mass threshold — but is far weaker under supervision.
- **Frozen features strong enough for k-NN**, closing most of the gap to the linear probe on ViT backbones.

**Strengths.**

- ViT-S/16 reaches 77.0 linear / 74.5 k-NN, outperforming BYOL, MoCo-v2 and SwAV re-run under the same protocol by +3.5% linear and +7.9% k-NN.
- ViT-B/8 reaches 80.1 linear / 77.4 k-NN with 10× less parameters and 1.4× faster run time than the previous state of the art.
- ResNet-50 reaches 75.3 linear / 67.5 k-NN, matching the best convnet self-supervised results of the time on linear probing and exceeding them on k-NN.
- Dense and instance-level transfer without task-specific training: DAVIS-2017 video object segmentation $(J\&F)_m$ up to 71.4 with ViT-B/8 by nearest-neighbour label propagation on frozen patch tokens; Copydays "strong" copy-detection mAP 85.5 with ViT-B/8.
- Retrieval on revisited Oxford/Paris: ViT-S/16 pretrained on ImageNet gives ROx-M 41.8, RPar-M 63.1, above the supervised backbone; pretraining on Google Landmarks v2 instead gives ROx-M 51.5, RPar-M 75.3.
- Small-batch tolerance, a consequence of having no negative-pair term: k-NN 57.9/59.1/59.6/59.9 across batch sizes 128/256/512/1024.

**Limitations.**

- **Data scale.** Training and evaluation are ImageNet-1k — curated and class-balanced. Behaviour on a large uncurated web corpus is flagged as future work and not validated here; that is the gap [dinov2](/atlas/dinov2) closes with a 142M-image curated corpus.
- **Compute.** The accuracy depends on multi-crop, which is the expensive part of the recipe (72.6h versus 45.9h at 300 epochs for ViT-S/16), and the strongest variants use patch size 8, which costs roughly 5× throughput.
- **Fragile ablation boundaries.** Removing the momentum teacher without substituting Sinkhorn-Knopp collapses the run outright (0.1 k-NN / 0.1 linear). A centering rate of $m = 0.999$ collapses. A fixed $\tau_t \geq 0.08$ collapses when applied from the start, so the 0.04 → 0.07 warmup is itself load-bearing. A head with three or more layers collapses without the $\ell_2$ bottleneck.
- **Recipe components are not portable.** Multi-crop degrades BYOL's transfer performance while helping DINO most among the compared frameworks; the paper leaves this unresolved.
- **Naive teacher constructions fail.** Copying student weights collapses, and using the immediately preceding iteration does not converge; only the EMA teacher, or an epoch-lagged copy at 66.6 k-NN, trains at all.

# References

1. Caron, M., Touvron, H., Misra, I., Jégou, H., Mairal, J., Bojanowski, P., & Joulin, A. *Emerging Properties in Self-Supervised Vision Transformers.* ICCV, 2021. [arXiv 2104.14294](https://arxiv.org/abs/2104.14294)
2. Grill, J., Strub, F., Altché, F., et al. *Bootstrap Your Own Latent: A New Approach to Self-Supervised Learning.* NeurIPS, 2020. [arXiv 2006.07733](https://arxiv.org/abs/2006.07733)
3. He, K., Fan, H., Wu, Y., Xie, S., & Girshick, R. *Momentum Contrast for Unsupervised Visual Representation Learning.* CVPR, 2020. [arXiv 1911.05722](https://arxiv.org/abs/1911.05722)
4. Chen, T., Kornblith, S., Norouzi, M., & Hinton, G. E. *A Simple Framework for Contrastive Learning of Visual Representations.* ICML, 2020. [arXiv 2002.05709](https://arxiv.org/abs/2002.05709)
5. Touvron, H., Cord, M., Douze, M., Massa, F., Sablayrolles, A., & Jégou, H. *Training data-efficient image transformers & distillation through attention.* ICML, 2021. [arXiv 2012.12877](https://arxiv.org/abs/2012.12877)
