---
title: "Knowledge Distillation"
date: 2026-08-23
summary: "Training a student network to match a teacher's softened output distribution — the temperature softmax, the T² gradient scaling, hard-label distillation, and self-distillation with a momentum teacher."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
domain: representation-learning
difficulty: intermediate
prerequisites: []
failureModes: []
sources:
  primary: hinton2015-distillation
  references: [touvron2020-deit, caron2021-dino]
---

# Definition

Knowledge distillation trains a small model to reproduce a larger model's output distribution rather than only its hard labels. The large model is the teacher, called the "cumbersome" model in the original formulation — a single strongly-regularized net or an ensemble of nets. The small model is the student, or distilled model. Training runs over a transfer set: the original training set, a subset of it, or unlabeled data, on which the teacher is run in inference mode to produce targets.

The mechanism that exposes the teacher's knowledge is a temperature applied inside the softmax.

:::definition[Temperature softmax]
A softmax classifier converts logit $z_i$ for class $i$ into a probability via a temperature $T$:

$$
q_i = \frac{\exp(z_i/T)}{\sum_j \exp(z_j/T)}
$$

$T$ is normally $1$; raising $T$ produces a softer distribution over classes.
:::

A well-trained teacher assigns non-trivial relative probability to wrong classes. Those relative magnitudes describe how the model generalizes, and a one-hot hard label discards them. Distillation is the transfer of that signal.

Two distinct regimes use the same machinery. In the compression regime the teacher is a separate, fully trained, fixed model, and distillation is a two-stage pipeline. In the self-distillation regime the teacher has the same architecture as the student and is built dynamically from it during the same training run, which removes the need for both an external model and labels.

# Mathematical Description

## Soft targets and temperature

The teacher's soft targets are produced by running its softmax at a raised $T$. The same raised $T$ is used in the student's softmax during transfer training; at deployment the student reverts to $T=1$.

When hard labels are available, the preferred recipe is a weighted average of two cross-entropy objectives computed from the same student logits: one against the soft targets at the same high $T$ used to generate them, one against the hard labels at $T=1$, with a considerably lower weight on the hard-label term. This was found better than modifying the soft targets with the hard labels.

The gradient magnitude produced by the soft-target term scales as $1/T^2$. The soft-target loss must therefore be multiplied by $T^2$ when it is combined with the hard-label loss at $T=1$. Without that factor the relative contribution of the two terms shifts whenever $T$ is changed during hyperparameter search. The soft distillation loss written for a transformer student makes the factor explicit, with teacher logits $Z_t$, student logits $Z_s$, temperature $\tau$, ground-truth label $y$, softmax $\psi$, and balancing coefficient $\lambda$:

$$
\mathcal{L}_\text{global} = (1-\lambda)\,\mathcal{L}_\text{CE}(\psi(Z_s), y) + \lambda \tau^2\, \text{KL}(\psi(Z_s/\tau), \psi(Z_t/\tau))
$$

## The high-temperature limit

For a transfer case with teacher logits $v_i$ producing soft targets $p_i$, the cross-entropy gradient with respect to student logit $z_i$ at transfer temperature $T$ is

$$
\frac{\partial C}{\partial z_i} = \frac{1}{T}(q_i - p_i) = \frac{1}{T}\left(\frac{e^{z_i/T}}{\sum_j e^{z_j/T}} - \frac{e^{v_i/T}}{\sum_j e^{v_j/T}}\right)
$$

When $T$ is high relative to the logit magnitudes, $e^{x/T} \approx 1 + x/T$, giving

$$
\frac{\partial C}{\partial z_i} \approx \frac{1}{T}\left(\frac{1+z_i/T}{N+\sum_j z_j/T} - \frac{1+v_i/T}{N+\sum_j v_j/T}\right)
$$

If logits are additionally zero-meaned per transfer case, $\sum_j z_j = \sum_j v_j = 0$, this collapses to

$$
\frac{\partial C}{\partial z_i} \approx \frac{1}{NT^2}(z_i - v_i)
$$

In the high-temperature limit distillation is therefore equivalent to minimizing $\tfrac{1}{2}(z_i-v_i)^2$ — direct regression of the student's logits onto the teacher's logits. Distillation at finite $T$ generalizes that special case. At lower $T$ the loss pays much less attention to logits that are very negative relative to the average.

## Hard-label distillation

The teacher's argmax decision $y_t = \arg\max_c Z_t(c)$ can serve as a second ground-truth target, with equal weight and no temperature to tune:

$$
\mathcal{L}_\text{global}^\text{hardDistill} = \tfrac{1}{2}\mathcal{L}_\text{CE}(\psi(Z_s), y) + \tfrac{1}{2}\mathcal{L}_\text{CE}(\psi(Z_s), y_t)
$$

This variant is parameter-free by comparison with the soft objective. Hard labels can additionally be label-smoothed, with $\varepsilon = 0.1$ in the reference recipe. In [deit](/atlas/deit) the target is not consumed by a loss term alone: a distillation token is appended to the input sequence alongside the patch tokens and class token, interacts with them through self-attention across all layers, and is read at the output by a separate linear head. The two heads are fused at inference by late-fusion of their softmax outputs. Hard distillation outperforms soft distillation for this student, 83.0% versus 81.8% top-1 at DeiT-B/224.

## Self-distillation with a momentum teacher

[dino](/atlas/dino) removes the external teacher entirely and casts distillation as a self-supervised objective. Student $g_{\theta_s}$ and teacher $g_{\theta_t}$ share the same architecture and differ only in parameters. Both emit a $K$-dimensional feature normalized by a temperature softmax:

$$
P_s(x)^{(i)} = \frac{\exp(g_{\theta_s}(x)^{(i)}/\tau_s)}{\sum_{k=1}^K \exp(g_{\theta_s}(x)^{(k)}/\tau_s)}
$$

with an analogous $P_t$ at temperature $\tau_t$. Given a fixed teacher, the student minimizes

$$
\min_{\theta_s} H(P_t(x), P_s(x)), \quad H(a,b) = -a\log b
$$

extended over multi-crop views, where all crops pass through the student and only the two global crops pass through the teacher:

$$
\min_{\theta_s} \sum_{x \in \{x_1^g, x_2^g\}} \sum_{\substack{x' \in V \\ x' \neq x}} H(P_t(x), P_s(x'))
$$

The teacher is built from past iterations of the student by an exponential moving average,

$$
\theta_t \leftarrow \lambda \theta_t + (1-\lambda)\theta_s
$$

with $\lambda$ following a cosine schedule from 0.996 to 1. A stop-gradient operator is applied on the teacher branch, so gradients flow only through the student. Collapse is avoided by two operations on the teacher output — centering, an additive bias $c$ updated by an EMA over the batch mean,

$$
c \leftarrow mc + (1-m)\frac{1}{B}\sum_{i=1}^B g_{\theta_t}(x_i)
$$

and sharpening, obtained by using a low $\tau_t$. Their interaction is read off the decomposition

$$
H(P_t, P_s) = h(P_t) + D_{KL}(P_t \,\|\, P_s)
$$

A KL of zero indicates collapse. The entropy $h$ converges to 0 with no centering and to $-\log(1/K)$ with no sharpening — two distinct collapse signatures.

# Numerical Concerns

**Temperature interacts with student capacity.** With 30 hidden units per layer, only a narrow $T \in [2.5, 4]$ range worked well on MNIST, and both lower and higher $T$ degraded results. With at least 300 units per layer, all temperatures above 8 gave fairly similar results. Distillation is not temperature-invariant once the student is capacity-constrained. Reported working values: $T=20$ for the MNIST regularization-only result, $T \in \{1, 2, 5, 10\}$ swept for the speech experiment, and $\tau = 3.0$ with $\lambda = 0.1$ for DeiT's soft objective.

**The $T^2$ factor is not optional.** Omitting it silently changes the effective weighting between the soft and hard terms whenever $T$ is retuned, so a temperature sweep confounds two hyperparameters at once.

**The logit-matching equivalence requires zero-meaned logits.** Without $\sum_j z_j = \sum_j v_j = 0$ per transfer case, the reduction to $\frac{1}{NT^2}(z_i - v_i)$ does not hold and only the exact and high-$T$ gradient forms apply. Intermediate temperatures are reported to work best when the student is too small to capture all of the teacher's knowledge, which suggests that ignoring the large negative logits can be helpful.

**Soft/hard weighting.** A relative weight of $0.5$ on the hard-target cross-entropy is used in the speech experiment, against the general guidance of a considerably lower weight on the hard-label term. Hard-label distillation sidesteps the choice with a fixed $\tfrac{1}{2}$ / $\tfrac{1}{2}$ split.

**EMA-teacher schedules have narrow collapse boundaries.** Centering rate $m \in \{0, 0.9, 0.99, 0.999\}$ gives k-NN top-1 of 69.1 / 69.7 / 69.4 / 0.1, collapsing when the update is too slow. Fixed sharpening temperature $\tau_t \in \{0, 0.02, 0.04, 0.06, 0.08\}$ gives 43.9 / 66.7 / 69.6 / 68.7 / collapse; the linear warm-up of $\tau_t$ from 0.04 to 0.07 over the first 30 epochs is what makes the higher final value trainable, so the schedule is load-bearing rather than the endpoint alone.

**The teacher construction itself is a stability parameter.** Without a momentum teacher the framework collapses completely to 0.1 k-NN. Copying the student weights fails, using the previous-iteration student does not converge, and a previous-epoch teacher works but reaches only 66.6 k-NN against the momentum teacher's 72.8.

**Missing transfer-set classes shift biases, not shapes.** When a class is absent from the transfer set the failure is a miscalibrated class bias, correctable post hoc. On MNIST with digit 3 omitted, the raw distilled model made 206 test errors; increasing the learned bias for class 3 by $+3.5$ left 109 total errors and only 14 on 3s. With only 7s and 8s in the transfer set, the error rate fell from 47.3% to 13.2% after reducing the 7/8 biases by $-7.6$.

# Where it appears

Self-distillation lineage, where the teacher is an EMA copy of the student rather than an external model:

- [dino](/atlas/dino) — the framework itself, self-distillation with no labels, with a momentum teacher, centering and sharpening.
- [dinov2](/atlas/dinov2) — keeps the student/teacher cross-entropy loss and additionally trains ViT-S/B/L by distillation from a frozen ViT-g/14 teacher rather than from scratch.
- [dinov3](/atlas/dinov3) — continues the same lineage as a further extension of DINOv2.
- [deit](/atlas/deit) — hard-label distillation through a dedicated distillation token, with a convnet teacher (RegNetY-16GF, 84M params, 82.9% top-1).

Student–teacher discrepancy used as a signal rather than as a compression objective:

- [uninformed-students](/atlas/uninformed-students) — students regress a frozen teacher's dense per-pixel descriptors, and the regression error plus ensemble variance becomes the anomaly score.
- [efficientad](/atlas/efficientad) — same student–teacher discrepancy principle with a single distilled patch description network and loss-induced asymmetry.

Distillation for deployment-size compression of a foundation model:

- [mobilesam](/atlas/mobilesam) — distils SAM's heavy ViT-H image encoder into a lightweight TinyViT student under an MSE loss on image embeddings.
- [depth-anything](/atlas/depth-anything) — uses a teacher-labeled large unlabeled corpus to train smaller student depth models.

# References

1. G. E. Hinton, O. Vinyals, J. Dean. *Distilling the Knowledge in a Neural Network.* NeurIPS 2014 Deep Learning Workshop (arXiv 2015). [arXiv](https://arxiv.org/abs/1503.02531)
2. H. Touvron, M. Cord, M. Douze, F. Massa, A. Sablayrolles, H. Jégou. *Training data-efficient image transformers & distillation through attention.* ICML, 2021. [arXiv](https://arxiv.org/abs/2012.12877)
3. M. Caron, H. Touvron, I. Misra, H. Jégou, J. Mairal, P. Bojanowski, A. Joulin. *Emerging Properties in Self-Supervised Vision Transformers.* ICCV, 2021. [arXiv](https://arxiv.org/abs/2104.14294)
