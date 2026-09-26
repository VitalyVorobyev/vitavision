---
title: "Self-Supervised Learning"
date: 2026-08-23
summary: "Survey of label-free visual representation learning: contrastive objectives (SimCLR, MoCo) and negative-free self-distillation (BYOL, DINO), with a decision table and the collapse mechanics that separate them."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
domain: representation-learning
difficulty: intermediate
prerequisites: [normalization]
failureModes: []
sources:
  primary: chen2020-simclr
  references: [he2019-moco, grill2020-byol, caron2021-dino, oquab2023-dinov2]
---

# Definition

Self-supervised representation learning trains an image encoder on unlabeled images by requiring agreement between two independently augmented views of the same image. No annotation enters the objective. Quality is measured after pretraining by freezing the encoder and fitting a linear classifier or a $k$-nearest-neighbour classifier on its output — the linear-evaluation protocol — or by fine-tuning on a labelled subset.

:::definition[View-invariance skeleton]
Every method surveyed here instantiates the same four stages:

1. A stochastic augmentation distribution $\mathcal{T}$, from which two view transforms are drawn independently per image.
2. A backbone encoder $f$, shared between branches or duplicated into two weight sets. Its output is the representation kept at the end of training.
3. A projection head $g$, attached only during pretraining and discarded afterwards.
4. An agreement objective on the two projected outputs.

Methods differ in stage 4: whether the objective needs negative examples, and if it does not, what asymmetry prevents collapse to a constant output.
:::

Two objective families follow from that last question. Contrastive methods supply negative examples — views of other images — and maximise a softmax over similarities, so a constant encoder is penalised directly. Self-distillation methods drop negatives and instead make the two branches asymmetric: one branch carries an extra predictor or an output transform, and receives no gradient. Both families keep only $f$ at the end; the projection head, the second branch, and any negative store are training-time scaffolding.

| Method | Objective family | Negatives | Key mechanism | Batch-size sensitivity | Representative result |
|---|---|---|---|---|---|
| SimCLR | Contrastive (NT-Xent) | In-batch: $2(N-1)$ per positive pair | 2-layer MLP projection head; cosine similarity with temperature $\tau$ | High — at 100 epochs, batch 256 → 57.5% top-1 (linear LR scaling) vs. batch 8192 → 64.8% | 69.3% top-1 linear probe, ResNet-50 |
| MoCo | Contrastive (InfoNCE) | FIFO queue of $K = 65536$ past keys | Momentum-updated key encoder, $m = 0.999$; shuffling BN | Low — queue decouples $K$ from mini-batch $N=256$ | 60.6% top-1 linear probe, ResNet-50 |
| BYOL | Self-distillation (normalized MSE) | None | Online predictor $q_\theta$ + EMA target network + stop-gradient | Low — stable over a wide range of batch sizes from 256 to 4096 | 74.3% top-1 linear probe, ResNet-50 |
| [dino](/atlas/dino) | Self-distillation (cross-entropy) | None | EMA teacher + centering and sharpening of the teacher softmax; multi-crop | Low — batch 128/256/512/1024 → k-NN 57.9/59.1/59.6/59.9 | 77.0% linear / 74.5% k-NN, ViT-S/16 |

Linear-probe figures are each paper's own headline number under its own protocol and backbone; they are not a controlled head-to-head ranking.

# Mathematical Description

## Contrastive objectives with in-batch negatives

SimCLR draws two augmentations per image over a minibatch of $N$ images, yielding $2N$ views. For a positive pair $(i,j)$ the loss is

$$
\ell_{i,j} = -\log\frac{\exp(\text{sim}(z_i,z_j)/\tau)}{\sum_{k=1}^{2N}\mathbb{1}_{[k\neq i]}\exp(\text{sim}(z_i,z_k)/\tau)}
$$

with $\text{sim}(u,v)=u^\top v/\lVert u\rVert\lVert v\rVert$ and $\tau$ a temperature. The full objective sums over both orderings of every pair, $\mathcal{L} = \frac{1}{2N}\sum_{k=1}^N[\ell(2k-1,2k)+\ell(2k,2k-1)]$. The paper names this loss NT-Xent.

Negatives are the remaining $2(N-1)$ views in the same minibatch. No memory bank is used, so the negative count is tied to batch size: a batch size of 8192 gives 16382 negative examples per positive pair. The loss is applied to $z_i = g(h_i) = W^{(2)}\sigma(W^{(1)} h_i)$, a 2-layer MLP projecting to a 128-dimensional latent space, not to the representation $h$ itself. The softmax weights negatives by relative hardness implicitly, which is why NT-Xent reaches 63.9% top-1 against 50.9% for Margin-Triplet and 57.5% for the semi-hard-mined margin variant.

## The dictionary perspective

MoCo reframes the same objective as dictionary look-up: an encoded query $q$ must match a single positive key $k_+$ against $K$ negative keys. The loss is InfoNCE,

$$
\mathcal{L}_q = -\log \frac{\exp(q \cdot k_+ / \tau)}{\sum_{i=0}^{K} \exp(q \cdot k_i / \tau)}
$$

with $\tau = 0.07$. The dictionary is a FIFO queue: the current minibatch's keys are enqueued and the oldest minibatch dequeued. This decouples the dictionary size $K$ from the mini-batch size $N$, with $K = 65536$ against $N = 256$ in the main experiments.

A queue is only useful if its entries remain comparable. The key encoder is therefore never trained by backpropagation; its parameters follow an exponential moving average of the query encoder,

$$
\theta_k \leftarrow m\,\theta_k + (1-m)\,\theta_q
$$

with default $m = 0.999$. The stated design goal is a dictionary that is simultaneously large and consistent; the queue supplies size, the momentum update supplies consistency.

## Negative-free self-distillation

BYOL removes negatives entirely. An online network (encoder, projector, predictor, weights $\theta$) predicts the projection produced by a target network (encoder, projector only, weights $\xi$) on a second view. Both vectors are $\ell_2$-normalized and the loss is a normalized mean squared error,

$$
\mathcal{L}_{\theta,\xi} \triangleq \left\| \overline{q_\theta}(z_\theta) - \bar{z}'_\xi \right\|_2^2 = 2 - 2 \cdot \frac{\langle q_\theta(z_\theta), z'_\xi \rangle}{\lVert q_\theta(z_\theta)\rVert_2 \cdot \lVert z'_\xi \rVert_2}
$$

symmetrized by swapping which view goes to which branch. Only $\theta$ is updated by gradient descent; a stop-gradient blocks the target branch, whose weights follow

$$
\xi \leftarrow \tau \xi + (1-\tau)\theta
$$

with $\tau_{\text{base}} = 0.996$ annealed toward 1 by $\tau \triangleq 1 - (1-\tau_{\text{base}}) \cdot (\cos(\pi k/K) + 1)/2$.

Collapse avoidance is empirical, not proven. The paper hypothesizes that there is no loss $L_{\theta,\xi}$ such that BYOL's dynamics is a gradient descent on $L$ jointly over $\theta,\xi$, and states that while BYOL's dynamics still admit undesirable equilibria, convergence to such equilibria was not observed in experiments. Under an idealised predictor $q^\star(z_\theta) = \mathbb{E}[z'_\xi \mid z_\theta]$, the online update follows in expectation the gradient of the conditional variance $\sum_i \text{Var}(z'_{\xi,i} \mid z_\theta)$, which a constant output maximises. The ablations locate the load-bearing part in the predictor: removing it while keeping the target network collapses, and an optimal linear predictor with no target network at all still avoids collapse, reaching 52.5% top-1.

## Cross-entropy self-distillation

[dino](/atlas/dino) replaces BYOL's regression with a classification-style objective and drops the predictor. Student and teacher share architecture and emit $K$-dimensional logits normalized by a temperature softmax,

$$
P_s(x)^{(i)} = \frac{\exp(g_{\theta_s}(x)^{(i)}/\tau_s)}{\sum_{k=1}^K \exp(g_{\theta_s}(x)^{(k)}/\tau_s)}
$$

with an analogous $P_t$ at temperature $\tau_t$. The student minimises

$$
\min_{\theta_s} H(P_t(x), P_s(x)), \quad H(a,b) = -a\log b
$$

The teacher is built from past students, $\theta_t \leftarrow \lambda \theta_t + (1-\lambda)\theta_s$, with $\lambda$ following a cosine schedule from 0.996 to 1, and carries a stop-gradient. Multi-crop generates 2 global views $x_1^g, x_2^g$ at $224^2$ and several local views at $96^2$; all crops are passed through the student while only the global views are passed through the teacher, so the objective enforces local-to-global correspondence.

Two operations on the teacher branch replace negatives. Centering is an additive bias updated by EMA over the batch mean,

$$
c \leftarrow mc + (1-m)\frac{1}{B}\sum_{i=1}^B g_{\theta_t}(x_i)
$$

and sharpening is a low teacher temperature $\tau_t$. Centering prevents one dimension from dominating but encourages collapse to the uniform distribution, while sharpening has the opposite effect. The balance is read off the decomposition

$$
H(P_t, P_s) = h(P_t) + D_{KL}(P_t \,\|\, P_s)
$$

where a KL of zero signals collapse and the teacher entropy identifies which collapse occurred. This casts label-free pretraining as [knowledge-distillation](/atlas/knowledge-distillation) with a teacher derived from the student rather than from an externally pretrained model.

# Numerical Concerns

**Temperature.** Contrastive temperature is a first-order hyperparameter, not a detail. Under $\ell_2$ normalization SimCLR reports $\tau=0.05 \to$ top-1 59.7, $\tau=0.1 \to$ top-1 64.4, $\tau=0.5 \to$ top-1 60.7 and $\tau=1 \to$ top-1 58.0 — a 6.4-point spread across one decade. MoCo fixes $\tau = 0.07$ inherited from prior work and does not ablate it. DINO splits the temperature across branches: $\tau_s = 0.1$ fixed, $\tau_t$ linearly warmed up from 0.04 to 0.07 during the first 30 epochs. The warmup is load-bearing — with a fixed teacher temperature the sweep gives $\tau_t \in \{0, 0.02, 0.04, 0.06, 0.08\}$ → k-NN = 43.9 / 66.7 / 69.6 / 68.7 / collapse (0.1), while the warmup schedule reaches 69.7.

**Batch size.** In-batch negatives make batch size an accuracy parameter. SimCLR's gap closes only with schedule length: by 800 epochs the gap narrows to 66.6% (256) vs. 69.0% (8192). MoCo's queue removes the coupling by construction, at the cost of one extra hyperparameter. BYOL's performance remains stable over a wide range of batch sizes from 256 to 4096, and only drops for smaller values due to batch normalization layers in the encoder — the residual sensitivity is attributed to normalization statistics, not to the loss. DINO degrades mildly from 1024 to 128, and a run at batch size of 8, reaching 35.2% after 50 epochs, is reported as evidence that the objective itself carries no batch-size floor.

**EMA momentum.** All three momentum-based methods sit in a narrow usable band. MoCo's ablation at $K=4096$ gives $m \in \{0, 0.9, 0.99, 0.999, 0.9999\}$ → accuracy $\{\text{fail}, 55.2, 57.8, 59.0, 58.9\}$: zero momentum does not merely underperform, it fails to converge. BYOL, under its 300-epoch ablation regime, reports $\tau_{\text{base}}=1$ → 18.8%, $0.999$ → 69.8%, $0.99$ → 72.5% and $0.9$ → 68.4%, with instantaneous copying at $\tau=0$ → 0.3%. Those ablation percentages use a different schedule and $\tau_{\text{base}}$ than the 74.3% headline and should not be compared against it. DINO without a momentum teacher and without a substitute anti-collapse mechanism collapses to 0.1 k-NN and 0.1 linear. Its centering rate has the opposite failure direction: $m \in \{0, 0.9, 0.99, 0.999\}$ → k-NN top-1 = 69.1 / 69.7 / 69.4 / 0.1, so a centering update that is too slow collapses.

**Batch normalization.** Normalization statistics are a recurring leak. SimCLR requires global batch normalization aggregated across devices, because positive pairs computed on the same device let the model exploit the local information leakage. MoCo shuffles the sample order of the key-encoder minibatch across GPUs and un-shuffles after encoding, so a query and its positive key never share BN statistics; without it the model cheats the pretext task. BYOL leaves its projector output un-normalized, unlike SimCLR, and traces its only remaining batch-size dependence to the BN layers. DINO removes the problem instead of managing it: the ViT plus head system is BN-free, with heads without BN at 69.7 k-NN vs 68.6 with BN.

**Collapse signatures.** Negative-free objectives fail silently rather than loudly. BYOL collapses when the predictor is removed while the target network is kept. DINO's two collapse modes are distinguishable from the loss alone: entropy $h(P_t) \to 0$ with no centering, and $h(P_t) \to -\log(1/K)$ with no sharpening, with the KL term going to zero in both. Monitoring teacher entropy and student-teacher KL separately identifies which mechanism failed.

**Augmentation dependence.** The objective is only as good as the invariances the augmentations encode. SimCLR reports that no single transformation suffices to learn good representations, and that one composition of augmentations stands out: random cropping and random color distortion — crops of one image share colour histograms, so a crop-only policy is solvable by histogram matching. Negative-free objectives are less brittle but not immune: reducing augmentation to crops only costs BYOL 72.5%→59.4% against SimCLR's 67.9%→40.3%.

# Where it appears

Registered pages that pretrain without labels:

- [mae](/atlas/mae) — the generative alternative. It reconstructs raw pixel values directly rather than discrete tokens or augmented views, and its page records the trade-off that follows: ViT-L linear probe 73.5% versus fine-tune 85.9%, with the note that MAE features are not linearly separable at the level of contrastive-SSL methods. View-invariance objectives buy frozen-feature quality; masked reconstruction buys fine-tuning quality and pretraining throughput.
- [dino](/atlas/dino) — the cross-entropy self-distillation recipe surveyed above, and the first to make k-NN accuracy on frozen features nearly match a linear probe.
- [dinov2](/atlas/dinov2) — keeps the image-level DINO loss and adds a patch-level iBOT masked-image-modelling loss plus a KoLeo regularizer, so the two paradigms appear jointly rather than as alternatives; Sinkhorn-Knopp centering replaces DINO's EMA centering for large-scale stability.
- [dinov3](/atlas/dinov3) — the later entry in the same self-distillation line.
- [superpoint](/atlas/superpoint) — a different self-supervised flavour, outside the view-invariance family. Homographic Adaptation generates pseudo-ground-truth keypoint labels by applying random homographies, running the current detector on each warped copy, and back-projecting through the inverse homography. The supervision signal is a bootstrapped label set rather than an agreement objective between two branches.

# References

1. T. Chen, S. Kornblith, M. Norouzi, G. E. Hinton. *A Simple Framework for Contrastive Learning of Visual Representations.* ICML, 2020. [arXiv](https://arxiv.org/abs/2002.05709)
2. K. He, H. Fan, Y. Wu, S. Xie, R. Girshick. *Momentum Contrast for Unsupervised Visual Representation Learning.* CVPR, 2020. [arXiv](https://arxiv.org/abs/1911.05722)
3. J. Grill, F. Strub, F. Altché, C. Tallec, P. H. Richemond, E. Buchatskaya, C. Doersch, B. Á. Pires, Z. D. Guo, M. G. Azar, B. Piot, K. Kavukcuoglu, R. Munos, M. Valko. *Bootstrap Your Own Latent: A New Approach to Self-Supervised Learning.* NeurIPS, 2020. [arXiv](https://arxiv.org/abs/2006.07733)
4. M. Caron, H. Touvron, I. Misra, H. Jégou, J. Mairal, P. Bojanowski, A. Joulin. *Emerging Properties in Self-Supervised Vision Transformers.* ICCV, 2021. [arXiv](https://arxiv.org/abs/2104.14294)
