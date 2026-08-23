---
title: "CLIP"
date: 2026-08-23
summary: "Contrastive image–text pretraining on 400M web pairs: dual encoders in one embedding space make natural language the classifier — zero-shot ImageNet at 76.2% via prompts, with unmatched robustness under distribution shift."
tags: ["deep-learning"]
domain: representation-learning
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: vit
params: "Text encoder 63M; image encoders RN50–RN50x64 and ViT-B/32–ViT-L/14@336px (default)"
prerequisites: [transformer, attention-mechanism, self-supervised-learning]
failureModes: []
sources:
  primary: radford2021-clip
  references:
    - dosovitskiy2020-vit
    - chen2020-simclr
    - oquab2023-dinov2
relations:
  - type: feeds_into
    target: sam
    confidence: medium
    caution: "SAM's prompt encoder uses a frozen CLIP text encoder for free-form text prompts — a proof-of-concept path in SAM v1, not its primary interface."
  - type: compared_with
    target: dinov2
    confidence: high
    caution: "Opposite supervision sources: text-supervised vs image-only self-distillation. They converge on image-level benchmarks; DINOv2 leads on dense/retrieval tasks, CLIP alone offers text-conditioned inference."
implementations:
  - role: official
    repo: https://github.com/openai/CLIP
    commit: d05afc436d78f1c48dc0dbf8e5980a9d471f35f6
    framework: pytorch
    license: MIT
    weights_license: MIT
  - role: community
    repo: https://github.com/mlfoundations/open_clip
    commit: 602d4af74f86df6f2ff81ba0f0a847b0b70ad2e5
    framework: pytorch
    license: "MIT (custom copyright notice)"
    weights_license: "varies by checkpoint (see model cards)"
---

# Motivation

Supervised pre-training predicts a fixed set of category identifiers, which caps a model's usable vocabulary at the taxonomy chosen when its dataset was built. CLIP replaces that signal with naturally occurring text. Training consumes (image, text) pairs scraped from the public internet, with no per-image class label at any point.

The training corpus, WIT ("WebImageText"), is 400 million (image, text) pairs. It is collected by querying for text co-occurring with images against a list of 500,000 search terms — all words occurring at least 100 times in English Wikipedia, augmented with high-PMI bigrams, popular Wikipedia article titles, and WordNet synsets — with each query capped at 20,000 pairs for approximate class balance. Scale is the motivating constraint: MS-COCO and Visual Genome hold ≈100K photos each, and filtered YFCC100M ≈15M.

Natural language is also the inference-time interface. Training produces an image encoder $f_I$ and a text encoder $f_T$ mapping into a shared embedding space compared by cosine similarity. At test time the text encoder is repurposed as a hypernetwork that synthesizes the weights of a zero-shot linear classifier from a list of class-name strings, with no gradient updates and no task-specific training data. Zero-shot ImageNet accuracy reaches 76.2%, matching the accuracy of the original ResNet-50 without using any of the 1.28 million training examples that model was trained on.

The objective is contrastive rather than predictive. The initial approach jointly trained an image CNN and a text transformer from scratch to predict the exact caption of an image. That transformer language model — 63M parameters, already using 2x the compute of its ResNet-50 image encoder — learned to recognize ImageNet classes 3x slower than a simpler baseline predicting a bag-of-words encoding of the same text. Swapping the bag-of-words predictive objective for the contrastive objective gave a further 4x efficiency improvement in the rate of zero-shot ImageNet transfer. The paper states these two ratios separately and does not compose them. The stated rationale is that predicting the exact words of a caption is unnecessarily hard given the variety of text co-occurring with an image.

# Architecture

**Dual encoders.** Two independent encoders map into one embedding space. There is no cross-modal fusion module — the only interaction between the modalities is a dot product in the learned joint space.

*Image encoder, ResNet family.* A modified ResNet-50 base (see [resnet](/atlas/resnet)): ResNet-D stem and downsampling improvements, antialiased rect-2 blur pooling, and global average pooling replaced by an attention-pooling mechanism — a single layer of transformer-style multi-head QKV attention whose query is conditioned on the global-average-pooled image representation.

*Image encoder, ViT family.* [vit](/atlas/vit) is followed closely, with one architectural addition — an extra layer normalization applied to the combined patch and position embeddings before the transformer — and a different initialization scheme.

| Variant | Family | Scaling |
|---|---|---|
| RN50, RN101 | modified ResNet | base configurations |
| RN50x4, RN50x16, RN50x64 | modified ResNet | ~4x/16x/64x RN50 compute, allocating additional compute equally to width, depth, and resolution |
| ViT-B/32, ViT-B/16, ViT-L/14 | ViT | trained alongside the ResNets |
| ViT-L/14@336px | ViT | ViT-L/14 fine-tuned for one epoch at 336px input; the default "CLIP" model |

*Text encoder.* A Transformer with GPT-2-style architecture modifications, base size 63M parameters, 12 layers, 512-wide, 8 attention heads. Input is lower-cased byte-pair-encoded text with a 49,152-token vocabulary, max sequence length capped at 76, bracketed with `[SOS]` and `[EOS]` tokens. The highest-layer activation at the `[EOS]` position is the text feature; it is layer-normalized, then linearly projected. Masked self-attention is used rather than bidirectional attention, preserving the option of adding a language-modeling objective later. Only the width of the text encoder is scaled with model size; depth is not scaled, because performance is less sensitive to text-encoder capacity.

**Projection.** Each encoder's representation is mapped into the shared $d_e$-dimensional space by a single linear projection and $\ell_2$-normalized: $I_e = \ell_2(\,I_f W_i\,)$, $T_e = \ell_2(\,T_f W_t\,)$. No non-linear projection head is used. This is an explicit deviation from the image-only contrastive recipe of [self-supervised-learning](/atlas/self-supervised-learning), where SimCLR's 2-layer MLP projection head outperforms a linear one by +3% and a no-head identity by >10% top-1 under linear evaluation. CLIP reports no efficiency difference between linear and non-linear projections in its own ablation, and speculates that non-linear projections may be co-adapted with details of current image-only self-supervised representation learning methods. Image augmentation is likewise reduced to a single random square crop from a resized image.

**Objective.**

:::definition[Symmetric contrastive objective]
Given a minibatch of $N$ (image, text) pairs, the model predicts which $N$ of the $N \times N$ possible pairings actually co-occurred. Cosine similarities between all pairs are scaled by a temperature and read as logits; cross-entropy is applied along both axes of the matrix and averaged.

$$
\text{logits} = I_e T_e^{\top} \exp(t), \qquad L = \tfrac{1}{2}\left(L_{i} + L_{t}\right)
$$

The temperature $t$ is a learned, log-parameterized scalar initialized to the equivalent of $\tau_0 = 0.07$ and clipped so the logits are never scaled by more than 100, which was found necessary to prevent training instability.
:::

The full batch-level computation, following the paper's pseudocode:

```python
logits = I_e @ T_e.T * exp(t)          # [N, N] scaled cosine similarities
labels = arange(N)
loss_i = cross_entropy(logits, labels, axis=0)   # image -> text direction
loss_t = cross_entropy(logits, labels, axis=1)   # text -> image direction
loss   = (loss_i + loss_t) / 2
```

The objective is not claimed as novel. It is the multi-class N-pair loss, popularized as InfoNCE, adapted to (text, image) contrastive learning by prior medical-imaging work.

**Training.** Five ResNets and three ViTs are trained for 32 epochs each with Adam, decoupled weight decay on all non-gain/bias weights, and a cosine learning-rate schedule. Minibatch size is 32,768. Because negatives are drawn in-batch, the effective negative-set size is tied directly to batch size — the same dependency documented for image-only contrastive pre-training, where a batch of 8192 yields 16382 negative examples per positive pair. Memory is managed with mixed precision, gradient checkpointing, half-precision Adam statistics, half-precision stochastically-rounded text-encoder weights, and sharded pairwise-similarity computation. The largest ResNet, RN50x64, took 18 days on 592 V100 GPUs; the largest ViT, ViT-L/14, took 12 days on 256 V100 GPUs. Every pre-training step can be read as optimizing a randomly created proxy dataset containing 1 example per class and 32,768 total classes.

## Zero-shot mechanics

To classify an image against a candidate class set, the image and every candidate name are encoded, cosine similarities are temperature-scaled, and a softmax is applied. The prediction layer is a multinomial logistic regression classifier with L2-normalized inputs, L2-normalized weights, no bias, and temperature scaling. The synthesized classifier is cached once per dataset and reused across predictions.

The text side of that construction is part of the interface, not a fixed detail. Embedding class names in the template `A photo of a {label}.` instead of using a bare class-name string improves ImageNet accuracy by 1.3%, closing the distribution gap between single-word labels and the mostly full-sentence captions in WIT and helping resolve polysemy — "boxer" as dog breed versus athlete, "crane" as bird versus construction equipment. Task-specific customization helps further: `{label}, a type of pet` for Oxford-IIIT Pets, `a type of food` for Food101, `a satellite photo of a {label}` for satellite imagery, and quoted text for OCR tasks.

Multiple prompt-generated classifiers can be ensembled in embedding space rather than probability space, so the amortized inference cost remains that of a single classifier. On ImageNet, ensembling 80 different context prompts adds 3.5% over the single default prompt. Prompt engineering and ensembling together improve ImageNet accuracy by almost 5% — comparable to a 4x compute increase under the non-engineered baseline.

Zero-shot transfer requires that target classes be nameable and that the dataset expose those names. Several datasets in their released form omit a class-name mapping entirely, preventing zero-shot transfer.

# Implementations

Code and pre-trained weights are released by the authors, providing inference code and the trained checkpoints. An independent open reproduction of the training recipe is maintained as open_clip; OpenCLIP-trained checkpoints are the text-supervised reference points against which later image-only backbones are benchmarked.

# Assessment

## What CLIP introduced

- **Natural-language supervision at scale.** A 400M-pair (image, text) corpus replaces crowd-labeled category IDs; the claim is that predicting which caption goes with which image is an efficient and scalable way to learn state-of-the-art image representations from scratch.
- **Zero-shot-by-prompt as an evaluation paradigm.** The text encoder generates classifier weights from class descriptions, making transfer to a new dataset a text-authoring task rather than a training task. Evaluation spans over 30 existing computer vision datasets covering OCR, video action recognition, geo-localization, and fine-grained classification.
- **Robustness as evidence about task-agnostic models.** Across 7 natural-distribution-shift datasets, a ResNet-101 makes 5x as many errors as on the ImageNet validation set. Zero-shot CLIP shrinks the robustness gap — accuracy under shift versus accuracy predicted from ImageNet accuracy — by up to 75%. Fitting a supervised linear probe on CLIP features raises ImageNet accuracy by 9.2% to 85.4% but *decreases* accuracy under shift on 4 of 7 datasets (-4.7% ImageNet-R, -3.8% ObjectNet, -2.8% ImageNet-Sketch, -1.9% ImageNet-A).
- **Prompt engineering as part of the model.** The wording of the class template is a tunable component with a measured effect size comparable to a large compute increase, not a presentation detail.

**Strengths.**

- Zero-shot ImageNet 76.2%, matching supervised ResNet-50 with no ImageNet training examples; top-5 accuracy ≈95%. Against the closest prior zero-shot-transfer baseline: aYahoo 72.4 → 98.4, ImageNet 11.5 → 76.2, SUN 23.0 → 58.5.
- Across 27 datasets, zero-shot CLIP beats a fully-supervised logistic-regression classifier on canonical ResNet-50 features on 16/27, with a margin above 20% on Stanford Cars and Food101, 99.3% on STL10, and gains of +14.5% on Kinetics700 and +7.7% on UCF101.
- Linear-probe representation quality: the best model beats the best prior model by +2.6% average on the 12-dataset Kornblith suite and +5% on the broader 27-dataset suite, winning on 21/27 datasets, with +14.7% on GTSRB. CLIP ViTs are ~3x more compute-efficient than CLIP ResNets.
- Data efficiency of the zero-shot classifier: half of the evaluated datasets need fewer than 5 labeled examples per class for a same-feature-space linear classifier to match it (median 5.4). On ImageNet, zero-shot matches a 16-shot linear classifier on the same features.
- Transfer performance is a smoothly predictable function of compute — a log-log linear trend across a 44x compute range spanning the five ResNet CLIP models.
- Using per-dataset custom zero-shot classifiers rather than pooling ImageNet-class predictions improves average effective robustness by an additional 5%, and ObjectNet accuracy by +2.3%.

**Limitations.**

- **Fine-grained, counting, and abstract tasks.** Zero-shot CLIP trails a ResNet-50 linear-probe baseline by more than 10% on Flowers102 and FGVCAircraft, and is weak on EuroSAT, RESISC45, PatchCamelyon, CLEVRCounts, GTSRB, and KITTI Distance — several of which non-expert humans handle reasonably well.
- **Truly out-of-distribution data.** Zero-shot MNIST accuracy is 88%, below logistic regression on raw pixels, because near-duplicate and semantic nearest-neighbour retrieval finds almost no MNIST-like images in WIT. The paper's own reading is that CLIP does little to address brittle generalization, and instead relies on pre-training breadth making most evaluation data effectively in-distribution.
- **Zero-shot remains below task-specific supervision.** On most datasets zero-shot underperforms a fully-supervised linear classifier on the same features by 10% to 25%; only 5/27 come within 3 points, all cases where both numbers already exceed 90%.
- **Scaling cost.** The paper estimates around a 1000x increase in compute is required for zero-shot CLIP to reach overall state-of-the-art performance, and calls that infeasible on 2021 hardware. Data efficiency is poor rather than solved: at one image per second, iterating the 12.8 billion images seen over 32 epochs would take 405 years.
- **Zero-to-few-shot dip.** Fitting a linear classifier on a few labeled examples initially underperforms the zero-shot classifier, surpassing it only around 4-shot on average.
- **Data provenance and bias.** WIT is scraped from the public internet without curation for representational balance; the paper devotes a dedicated section to bias probes of the resulting model. Development itself repeatedly queried full validation sets, which is not a realistic zero-shot deployment scenario.
- **Fixed candidate set.** The zero-shot classifier can only choose among a supplied list of text candidates. Open-ended generative output is outside its interface.

**Relation to image-only self-supervision.** [dinov2](/atlas/dinov2) takes the opposite position on the supervision source: no text, no captions, discriminative self-distillation on curated images alone. On image-level benchmarks the two families converge — DINOv2 ViT-g/14 reaches 86.5% ImageNet linear and 83.5% kNN against 86.4%/83.5% for EVA-CLIP/OpenCLIP-G — while DINOv2 leads on retrieval and fine-grained recognition (Oxford-Hard 52.3 mAP, +34% versus OpenCLIP-G; iNaturalist-2021 85.7%, +9.7% versus OpenCLIP-G) and on dense pixel-level tasks. The capability CLIP retains and image-only backbones cannot supply is text-conditioned inference: zero-shot text-image matching requires a jointly trained text encoder. The frozen CLIP text encoder appears in exactly that role inside [sam](/atlas/sam), as the free-form-text path of its prompt encoder.

# References

1. Radford, A., Kim, J. W., Hallacy, C., Ramesh, A., Goh, G., Agarwal, S., Sastry, G., Askell, A., Mishkin, P., Clark, J., Krueger, G., & Sutskever, I. *Learning Transferable Visual Models From Natural Language Supervision.* ICML, 2021. [arXiv 2103.00020](https://arxiv.org/abs/2103.00020)
2. Dosovitskiy, A. et al. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arXiv 2010.11929](https://arxiv.org/abs/2010.11929)
3. Chen, T., Kornblith, S., Norouzi, M., & Hinton, G. E. *A Simple Framework for Contrastive Learning of Visual Representations.* ICML, 2020. [arXiv 2002.05709](https://arxiv.org/abs/2002.05709)
