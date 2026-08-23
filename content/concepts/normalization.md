---
title: "Normalization"
date: 2026-08-23
summary: "Standardises intermediate activations over a chosen index set, then restores capacity with a learned affine transform; batch, layer, instance, and group normalization differ only in which indices are pooled."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
domain: representation-learning
difficulty: intermediate
prerequisites: []
sources:
  primary: ioffe2015-batchnorm
  references:
    - ba2016-layernorm
    - wu2018-groupnorm
    - vaswani2017-attention
---

# Definition

Activation normalization standardises a network's intermediate activations to zero mean and unit variance over a chosen set of tensor indices, then restores representational capacity with a learned affine transform. The normalization step is differentiable and participates in backpropagation, so it is part of the model rather than a preprocessing stage. The variants used in practice differ in one choice only: which indices are pooled to form the mean and variance.

:::definition[Unifying formulation]
For a feature tensor $x$ indexed by $i = (i_N, i_C, i_H, i_W)$, every normalization variant computes

$$
\hat x_i = \frac{1}{\sigma_i}(x_i - \mu_i), \qquad
\mu_i = \frac{1}{m}\sum_{k \in S_i} x_k, \qquad
\sigma_i = \sqrt{\frac{1}{m}\sum_{k \in S_i}(x_k - \mu_i)^2 + \epsilon},
$$

followed by a learned per-channel affine transform

$$
y_i = \gamma \hat x_i + \beta.
$$

$S_i$ is the index set over which statistics are pooled and $m = |S_i|$ is its size. Batch, layer, instance, and group normalization are the four standard choices of $S_i$.
:::

The affine parameters $\gamma$ and $\beta$ let the transform represent the identity map, so normalization does not reduce the network's representational capacity.

# Mathematical Description

## Batch normalization

Batch normalization pools statistics over the batch axis, independently per scalar feature. Over a mini-batch of size $m$:

$$
\mu_B = \frac{1}{m}\sum_i x_i, \qquad
\sigma_B^2 = \frac{1}{m}\sum_i (x_i - \mu_B)^2, \qquad
\hat x_i = \frac{x_i - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \qquad
y_i = \gamma \hat x_i + \beta.
$$

The stated motivation is internal covariate shift, defined as the change in the distribution of network activations due to the change in network parameters during training. Normalization is applied to the pre-activation $Wu + b$ rather than the layer input $u$, and the bias $b$ is dropped because mean subtraction cancels it and $\beta$ subsumes its role. For convolutional layers the transform is applied per feature map, sharing $\gamma^{(k)}$ and $\beta^{(k)}$ across all spatial locations and mini-batch elements, so the effective normalization set has size $m' = m \cdot p \cdot q$ for feature-map size $p \times q$.

Inference does not use mini-batch statistics. Population statistics are substituted, $E[x] \leftarrow E_B[\mu_B]$ and $\mathrm{Var}[x] \leftarrow \frac{m}{m-1} E_B[\sigma_B^2]$, accumulated by moving average over training mini-batches. The two steps fold into a single linear transform:

$$
y = \frac{\gamma}{\sqrt{\mathrm{Var}[x] + \epsilon}} \cdot x + \left(\beta - \frac{\gamma\,E[x]}{\sqrt{\mathrm{Var}[x] + \epsilon}}\right).
$$

Inference is therefore deterministic and batch-independent, while training is not. The method presumes $m > 1$ and large enough that per-batch moments approximate the population moments; the original ImageNet experiments use $m = 32$.

## Layer normalization

Layer normalization transposes the pooling axis. Statistics are computed over all hidden units in the same layer, for a single training case:

$$
\mu^l = \frac{1}{H}\sum_{i=1}^{H} a_i^l, \qquad
\sigma^l = \sqrt{\frac{1}{H}\sum_{i=1}^{H}(a_i^l - \mu^l)^2},
$$

where $H$ is the number of hidden units in layer $l$ and $a_i^l$ is the summed input to unit $i$. All hidden units in a layer share $\mu^l$ and $\sigma^l$, and different training cases have different normalization terms — the reverse of batch normalization. Each neuron keeps an adaptive gain $g_i$ and bias $b_i$, giving the shared normalized-GLM form

$$
h_i = f\!\left(\frac{g_i}{\sigma_i}(a_i - \mu_i) + b_i\right)
$$

that also covers batch normalization and weight normalization under different $\mu_i, \sigma_i$.

Because the statistics depend only on the current case, there is no batch-size constraint and the pure online regime with batch size 1 works unchanged. Training and test computation are identical. In a recurrent layer the same layer-wise statistics are recomputed at each time step from that step's summed inputs $a^t = W_{hh}h^{t-1} + W_{xh}x^t$, so no per-time-step statistics need to be stored, unlike batch-normalized recurrent variants.

The original transformer wraps each sublayer as $\mathrm{LayerNorm}(x + \mathrm{Sublayer}(x))$ — post-LN, with normalization applied after the residual add rather than before it.

The invariance properties differ from batch normalization in a specific pattern. Layer normalization is invariant to re-scaling and re-centering of the whole weight matrix, to dataset re-scaling, and to re-scaling of a single training case; it is not invariant to re-scaling an individual weight vector, and not to dataset re-centering. Batch normalization is invariant to weight-matrix re-scaling, single-weight-vector re-scaling, dataset re-scaling, and dataset re-centering, but not to single-training-case re-scaling.

## Group normalization and the unifying view

Group normalization completes the taxonomy by making the pooling set a tunable partition of the channel axis.

| Method | Pooling set $S_i$ | Axes pooled | Batch-dependent |
|---|---|---|---|
| Batch norm | $\{k \mid k_C = i_C\}$ | $(N, H, W)$ per channel | Yes |
| Layer norm | $\{k \mid k_N = i_N\}$ | $(C, H, W)$ per sample | No |
| Instance norm | $\{k \mid k_N = i_N,\, k_C = i_C\}$ | $(H, W)$ per sample and channel | No |
| Group norm | $\{k \mid k_N = i_N,\, \lfloor k_C/(C/G)\rfloor = \lfloor i_C/(C/G)\rfloor\}$ | $(H, W)$ and intra-group $C$ per sample | No |

$G$ is a predefined hyperparameter, default $G = 32$, and $C/G$ is the number of channels per group. Channels are assumed stored in sequential order along the $C$ axis, so a contiguous block of $C/G$ channels forms one group. Setting $G = 1$ recovers layer normalization; one channel per group recovers instance normalization.

The motivating evidence is batch normalization's degradation at small batch sizes on ImageNet with ResNet-50. At batch size 2, batch normalization reaches 34.7% error against group normalization's 24.1%, a 10.6-point gap; at batch size 4 the figures are 27.3% and 24.2%. At batch size 32 the ordering reverses by a small margin: 23.6% for batch normalization against 24.1% for group normalization, a 0.5-point gap attributed to group normalization lacking batch normalization's stochastic regularization from batch sampling.

## Choosing among them

Batch statistics are the strongest option when the per-worker batch is large and stable, and the workload is plain image classification. They degrade once the batch falls to 4 or 2 samples, and they break when the batch is not i.i.d. — batch normalization on Mask R-CNN region-of-interest features, where 512 regions are sampled from the same image, is about 9 AP worse. Layer normalization is the choice for recurrent and variable-length sequence models, for online learning at batch size 1, and wherever identical train and test computation is required. It is measurably weaker in convolutional networks: the assumption that all hidden units contribute comparably fails there, because the many hidden units whose receptive fields lie near the image boundary are rarely activated and have different statistics from the rest of the layer. Group normalization is the option for small-batch dense-prediction workloads — detection, segmentation, and video — and for fine-tuning that must transfer across a change of batch size.

# Numerical Concerns

**The $\epsilon$ term.** $\epsilon$ is a constant added to the mini-batch variance for numerical stability, guarding the division when the variance is near zero. Group normalization places it inside the square root by the same convention; the reference implementation uses `eps=1e-5`. The layer-normalization paper's own canonical operator omits an explicit $\epsilon$ in its notation, so stability against $\sigma \to 0$ is not addressed there and must be supplied by the implementation.

**Biased versus unbiased variance.** Training uses the biased $1/m$ estimator inside the normalization step. Inference uses the unbiased population estimate $\mathrm{Var}[x] = \frac{m}{m-1} E_B[\sigma_B^2]$. Reusing one estimator in both places is a silent mismatch.

**Train/serve skew from moving averages.** Batch normalization's inference path substitutes moving-average population statistics for the mini-batch statistics used during training, so the training and inference computations are not the same function. Group normalization requires no moving-average machinery at all, because its statistics never touch the batch axis, which eliminates the discrepancy rather than tuning it.

**Estimator variance at small $m$.** The pooling-set size $m = |S_i|$ is the numerical lever. Batch mean and variance estimation becomes overly stochastic and inaccurate when computed over 4 or 2 images. For group normalization $m = (C/G) \times H \times W$: fewer, larger groups give lower-variance estimates and coarser per-group specialization; more, smaller groups trade the reverse. The measured extremes are 25.3% error at $G = 1$ and 28.4% at one channel per group, against 24.1% at $G = 32$.

**Divisibility.** The floor-division grouping formula requires $C$ divisible by $G$ so that all groups have equal size.

**Weight-scale invariance.** Batch normalization satisfies $\mathrm{BN}(Wu) = \mathrm{BN}((aW)u)$ for scalar $a$, with $\partial\mathrm{BN}((aW)u)/\partial u = \partial\mathrm{BN}(Wu)/\partial u$ and $\partial\mathrm{BN}((aW)u)/\partial(aW) = \frac{1}{a}\,\partial\mathrm{BN}(Wu)/\partial W$. Larger weights therefore produce smaller gradients, which is the stated mechanism behind tolerance of higher learning rates.

**Normalization must stay inside the gradient path.** Computing the statistics outside the gradient-descent loop causes parameter blow-up: with $\hat x = x - E[x]$, a bias update $\Delta b$ is exactly cancelled by the corresponding shift in $E[x]$, so $b$ grows without bound while the loss stays flat.

**Affine-parameter weight decay.** Weight decay of 0 on $\gamma$ and $\beta$ is reported as important for good detection results when those parameters are being tuned during fine-tuning.

# Where it appears

Convolutional backbones in the register use batch normalization as a structural component:

- [resnet](/atlas/resnet) — BatchNorm after each convolution and before the ReLU throughout the bottleneck design; the degradation problem is identified as an optimization difficulty precisely because plain nets trained with BatchNorm still degrade with depth.
- [convolutional-neural-network](/atlas/convolutional-neural-network) — records that deep bottleneck ResNets do not converge stably without batch normalisation, and that its per-channel batch statistics are sensitive to batch size.
- [googlenet](/atlas/googlenet) — predates batch normalisation; its auxiliary classifiers exist as the gradient-flow workaround that BN-Inception superseded.
- [mobilenetv2](/atlas/mobilenetv2) — batch normalization after every layer in the inverted-residual block.
- [hrnet](/atlas/hrnet) — batch normalisation in the per-branch residual units and in both the downsample and upsample paths of the exchange units.
- [fast-scnn](/atlas/fast-scnn) — batch normalization and ReLU on all three stride-2 learning-to-downsample layers.
- [superpoint](/atlas/superpoint) — ReLU followed by BatchNorm after every convolution of the shared VGG-style encoder.
- [xfeat](/atlas/xfeat) — the basic layer is convolution, ReLU, BatchNorm.
- [bisenet](/atlas/bisenet) — BatchNorm inside the attention-refinement and fusion branches.

Transformer-family pages use layer normalization:

- [attention-mechanism](/atlas/attention-mechanism) — attention is the sublayer that the residual-plus-LayerNorm wrapper encloses.
- [transformer](/atlas/transformer) — the encoder and decoder stacks apply $\mathrm{LayerNorm}(x + \mathrm{Sublayer}(x))$, the post-LN convention.
- [vit](/atlas/vit) — pre-LayerNorm blocks, with normalization before the multi-head self-attention and before the MLP rather than after the residual add.
- [detr](/atlas/detr) — LayerNorm on each of the three residual paths of the decoder layer.
- [sam](/atlas/sam) — LayerNorm on the two-way cross-attention mask decoder's residual paths.
- [rf-detr](/atlas/rf-detr) — a layer-norm projector rather than batch norm, chosen for consumer-GPU training.

# References

1. S. Ioffe, C. Szegedy. *Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift.* ICML, 2015. [arXiv](https://arxiv.org/abs/1502.03167)
2. J. L. Ba, J. R. Kiros, G. E. Hinton. *Layer Normalization.* arXiv preprint, 2016. [arXiv](https://arxiv.org/abs/1607.06450)
3. Y. Wu, K. He. *Group Normalization.* ECCV, 2018. [arXiv](https://arxiv.org/abs/1803.08494)
4. A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, I. Polosukhin. *Attention Is All You Need.* NeurIPS, 2017. [arXiv](https://arxiv.org/abs/1706.03762)
