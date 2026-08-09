---
paper_id: he2021-mae
title: "Masked Autoencoders Are Scalable Vision Learners"
authors: ["K. He", "X. Chen", "S. Xie", "Y. Li", "P. Dollár", "R. Girshick"]
year: 2021
url: https://arxiv.org/pdf/2111.06377
created: 2026-05-27
relevant_atlas_pages:
  - vit
  - sam
  - mobilesam
  - mask2former
  - detr
  - resnet
  - attention-mechanism
  - convolutional-neural-network
  - fcn-semantic-segmentation
  - mask-rcnn
  - deeplab-semantic-segmentation
---

# Setting

Self-supervised pretraining of Vision Transformers (ViT) on unlabeled RGB images. Pretraining input: a 224×224 RGB image tiled into non-overlapping 16×16 patches (196 patches for ViT-B/L, 256 patches for ViT-H/14 at 224; 448-resolution fine-tuning is evaluated separately). Pretraining output: reconstructed pixel values for masked patches. There is no label, no contrastive pair, and no discrete tokenizer. Downstream use: the pretrained encoder is discarded of its decoder, then fine-tuned end-to-end with a task head on labeled data (ImageNet-1K classification, COCO Mask R-CNN detection/segmentation, ADE20K UperNet segmentation).

The key constraint: the encoder operates on a sparse, variable-length sequence of visible patch tokens. This is natural for ViT (which treats images as sequences) and unnatural for convolutional backbones (which require fixed spatial grids).

# Core idea

MAE is an asymmetric masked autoencoder. The two design pivots that distinguish it from naive masked-ViT baselines:

1. **Very high masking ratio (75%).** Images have heavy spatial redundancy. BERT masks 15% of language tokens and the task is hard. Masking 15–50% of image patches is too easy — the model can reconstruct missing patches by interpolating neighboring visible patches, learning low-level texture rather than high-level semantics. At 75%, the task forces holistic reasoning about objects and scenes (§4.1, Fig. 5).

2. **Asymmetric encoder-decoder: mask tokens enter only the decoder.** The encoder receives only the visible 25% of patches (no mask-token placeholders). After encoding, a list of mask tokens — each a single shared learnable vector plus its positional encoding — is inserted, and the full set (encoded visible + mask tokens) is passed to a lightweight decoder. This means the encoder processes only 25% of the full sequence, yielding a 3–4× FLOPs reduction. The decoder is small: 8 Transformer blocks, 512-d hidden dim, less than 10% of the per-token compute of ViT-L (§3, §4.1).

Reconstruction target: per-pixel MSE loss, applied only to masked patches. Pixel values are normalized per-patch (mean and variance computed over each patch's pixels) before computing the loss. Without per-patch normalization, accuracy drops by approximately 0.5% top-1 (§4.1).

The complete pretraining sequence: (a) embed all patches via a linear projection; (b) randomly shuffle the token list and drop the last (1 − 0.25) fraction — no sparse ops, just index manipulation; (c) run the encoder on the remaining 25%; (d) append mask tokens at their original positions (unshuffle); (e) run the lightweight decoder on the full sequence; (f) compute MSE on masked patches only; (g) discard the decoder before fine-tuning.

Loss function:

$$\mathcal{L} = \frac{1}{|\mathcal{M}|} \sum_{i \in \mathcal{M}} \left\| \hat{x}_i - \text{norm}(x_i) \right\|_2^2$$

where $\mathcal{M}$ is the set of masked patch indices, $x_i$ is the raw pixel vector of patch $i$, $\text{norm}(\cdot)$ denotes per-patch mean/variance normalization, and $\hat{x}_i$ is the decoder's prediction at position $i$ (§3).

# Assumptions

1. (Hard) The encoder is a ViT operating on a variable-length token sequence. Convolutional encoders need all spatial positions; the sparse-token trick fails silently on them.

2. (Hard) Random patch masking without replacement, using a uniform distribution. Non-uniform masking (e.g., block-wise as in BEiT) at 75% creates a harder reconstruction task with blurrier results and lower accuracy; grid-wise masking creates an easier task with lower representation quality (§4.1, ablation).

3. (Soft) Per-patch normalization of pixel targets improves representation quality. Unnormalized pixel targets yield approximately 0.5% lower top-1 on ImageNet fine-tuning (§4.1).

4. (Soft) Pretraining on ImageNet-1K (1.28M unlabeled images) for 1600 epochs is sufficient to reach state-of-the-art — no need for JFT-300M or external data (§4.2, Table 3).

5. (Soft) MSE on raw pixels (normalized) is a sufficient reconstruction target. Discrete token targets (dVAE/DALL-E tokenizer, as in BEiT) do not improve fine-tuning or transfer accuracy once per-patch normalization is applied (§5, Table 7).

# Failure regime

- **Low masking ratios.** At ≤50% masking, linear-probe accuracy drops sharply: the gap between 50% and 75% masking is approximately 8 percentage points on linear probing for ViT-L (Fig. 5, §4.1). The model learns low-level texture copying rather than scene semantics. Fine-tuning is more robust (the gap is smaller), but accuracy still degrades below 40%.

- **Block-wise masking at 75%.** Removing large contiguous blocks creates a task that is too hard — high training loss, blurry reconstructions, degraded fine-tuning accuracy relative to random masking at the same ratio (§4.1, Fig. 6).

- **Encoder with mask tokens.** If mask tokens are included in the encoder input (the naive BERT-style approach), linear-probe accuracy drops by ~14 percentage points (59.6% vs. 73.5% for ViT-L) and FLOPs increase 3.3× (Table 1c, §4.1). The distribution mismatch — encoder sees many mask tokens at pretraining but none at inference — is the proximate cause.

- **Small datasets.** MAE pretraining on ImageNet-1K scale is effective; there is no reported evidence of benefit for datasets smaller than 1M images. The technique assumes abundant unlabeled data.

- **Convolutional encoders.** The sparse-token encoding trick is ViT-native. Applying it to a convolutional network is not straightforward and the paper does not study this direction.

# Numerical sensitivity

**ImageNet-1K top-1 accuracy (Table 3, 1600-epoch pretraining + fine-tuning):**

| Model | Fine-tune acc (224) | Fine-tune acc (448) |
|-------|---------------------|---------------------|
| ViT-B/16 | 83.6% | — |
| ViT-L/16 | 85.9% | — |
| ViT-H/14 | 86.9% | **87.8%** |

ViT-H/14 at 448 with MAE pretraining sets a new SOTA among ImageNet-1K-only methods (previous best 87.1% from advanced networks using 512-size input) (§4.2).

**Linear probing accuracy (Table 1, ViT-L, 1600 epochs):** 73.5%. For comparison, MoCo v3 achieves higher linear-probe accuracy on ViT-L (84.1% fine-tune vs. MAE's 85.9%, but linear-probe is not reported comparably; partial fine-tuning in Fig. 9 shows MAE beats MoCo v3 for ≥1 tuned block).

**Masking ratio ablation (Fig. 5, ViT-L, 800 epochs):**
- Optimal for both fine-tuning and linear probing: **75%**
- Fine-tuning range 40–80% all outperform scratch (82.5%)
- Linear-probe gap from 50% to 75%: approximately 8%
- Linear-probe gap from no masking (~0%) to 75%: approximately 20% (54.6% → 73.5%)

**Decoder architecture (Table 1a, 1b):**
- Default: **8 blocks, 512-d hidden dim**, <10% per-token FLOPs vs. ViT-L encoder
- Decoder depth: 1 block gives 84.8% ft (−0.1%), 8 blocks gives 84.9% ft; but 1 block linear-probe = 65.5% vs. 8 blocks = 73.5%
- Decoder width: 128-d to 512-d all give 84.9% ft; linear-probe peaks at 512-d (73.5%)

**Wall-clock pretraining speedup (Table 2, 800 epochs, 128 TPU-v3 cores):**
- ViT-L without mask tokens in encoder: **2.8× faster** than ViT-L with mask tokens (15.4h vs. 42.4h)
- ViT-H without mask tokens, 1-block decoder: **4.1× faster** (29.3h vs. estimated 119.6h†)
- For 1600-epoch ViT-L: 31 hours (MAE) vs. 36 hours for MoCo v3 at 300 epochs (§4.2)

**COCO object detection (Table 4, ViT Mask R-CNN + FPN):**
- MAE ViT-B: AP_box = 50.3 (vs. supervised 47.9, +2.4)
- MAE ViT-L: AP_box = 53.3 (vs. supervised 49.3, +4.0)
- Instance segmentation: MAE ViT-B 44.9, ViT-L 47.2

**ADE20K semantic segmentation (Table 5, UperNet, mIoU):**
- MAE ViT-B: 48.1 (vs. supervised 47.4)
- MAE ViT-L: **53.6** (vs. supervised 49.9, +3.7; vs. BEiT 53.3, +0.3)

**Per-patch normalization sensitivity:** unnormalized pixels yield approximately 0.5% lower fine-tune accuracy (§3, §4.1). Color jittering degrades results vs. crop-only augmentation (§4.1).

**Training schedule (Fig. 7):** accuracy improves monotonically from 200 to 1600 epochs; no saturation observed at 1600 epochs for linear probing. Fine-tuning saturates earlier.

# Applicability

- Use when: pretraining a large ViT backbone on a domain with abundant unlabeled images and scarce or no labels (medical imaging, satellite imagery, scientific microscopy). The computational cost is lower than contrastive methods at equivalent model scale due to the sparse encoder.
- Use when: the downstream task benefits from a strong dense feature extractor (detection, segmentation) rather than a linear-separable representation — MAE fine-tuning transfers better than MAE linear-probe.
- Do not use when: the dataset is small (<100K images); pretraining overhead exceeds the benefit of SSL.
- Do not use when: the backbone is convolutional; the sparse-token encoding is ViT-native.
- Compared against: BEiT (discrete token targets, requires dVAE pretraining, slower, comparable accuracy after normalization fix), MoCo v3 (contrastive, higher linear-probe accuracy but lower fine-tuning and transfer accuracy at scale), DINO (contrastive/distillation, ViT-B comparable on fine-tune, not scaled to ViT-H in this paper).

# Connections

- Builds on: ViT (Dosovitskiy et al. 2020, [16]); BERT masked language modeling (Devlin et al. 2018, [14]); denoising autoencoders (Vincent et al. 2008, [58]); iGPT (pixel autoregression, [6])
- Enables: SAM v1 (Kirillov et al. 2023) — SAM's ViT-H image encoder is MAE-pretrained; SAM 2's Hiera (hierarchical ViT) is also MAE-pretrained; DINOv2 comparisons use MAE as SSL baseline; BEiT v2/v3 build on the pixel reconstruction insight. Conceptually enables any large-scale ViT pretraining recipe without labels.
- Refutes / supersedes: naive masked-ViT with mask tokens in encoder (14% linear-probe drop, 3.3× slower); dVAE tokenization as a necessary component (tokenization is unnecessary given per-patch normalization)

# Atlas update plan

## NEW: mae
Type: model
Category: foundation / self-supervised pretraining
Primary source: this paper (he2021-mae)

**Motivation:** ViT models are data-hungry and tend to overfit ImageNet-1K when trained supervised from scratch. MAE provides a scalable SSL recipe: mask 75% of patches, encode only visible 25%, reconstruct pixel values for masked patches via a lightweight decoder. The asymmetric design enables 3–4× faster pretraining than mask-token-in-encoder baselines while improving accuracy.

**Architecture:**
- Encoder: standard ViT applied to visible patches only (25% of total). Linear patch embedding + positional encoding + Transformer blocks. No mask tokens in encoder input.
- Decoder: small Transformer (default: 8 blocks, 512-d) operating on all positions (encoded visible + shared mask-token vectors + positional encodings). <10% per-token FLOPs of encoder.
- Reconstruction head: linear projection to pixel values (patch_size² × 3 channels); per-patch mean/variance normalization applied to targets.
- MSE loss over masked patches only.

**Training:**
- Dataset: ImageNet-1K unlabeled (1.28M images)
- Schedule: 1600 epochs (best); ablations at 800 epochs
- Optimizer: AdamW
- Augmentation: random crop + random horizontal flip only (no color jitter, works even without augmentation)
- Masking: random uniform sampling without replacement at 75% ratio

**Implementations:**
- Official PyTorch: https://github.com/facebookresearch/mae (CC-BY-NC-4.0 — research use only; commercial use prohibited)
- SAM's MAE-pretrained ViT-H weights (via segment-anything repo) inherit this license

**Assessment.Novelty:**
- 75% masking ratio (far higher than BERT's 15% or prior vision SSL at 20–50%)
- Asymmetric encoder-decoder: mask tokens deferred to decoder, not encoder
- Pixel-target reconstruction with per-patch normalization competitive with or better than discrete token targets
- No contrastive pairs, no momentum encoder, no data augmentation dependency

**Assessment.Strengths:**
- ViT-H/14 achieves 87.8% ImageNet-1K top-1 (448-size fine-tune, IN1K only) — outperforms JFT-300M supervised ViT-L/16 (85.2%) at the time of publication
- COCO AP_box: 53.3 (ViT-L), +4.0 over supervised IN1K pretraining
- ADE20K mIoU: 53.6 (ViT-L), +3.7 over supervised IN1K pretraining
- ViT-L pretraining takes 31h at 1600 epochs (128 TPU-v3) vs. MoCo v3's 36h at 300 epochs
- No specialized sparse ops; simple index-shuffle implementation

**Assessment.Limitations:**
- CC-BY-NC-4.0 license on official weights — research only, no commercial use
- SAM v1's ViT-H encoder (and downstream SAM weights) inherit this constraint
- Linear-probe accuracy is lower than contrastive methods (e.g., MoCo v3) — representations are strongly non-linear; partial or full fine-tuning is required
- No benefit demonstrated below ~1M-image datasets
- ViT-specific; does not apply directly to convolutional architectures

## UPDATE: sam
Section: Architecture / Image Encoder
Bullets to add:
- SAM v1's image encoder is ViT-H/14, pretrained using MAE (he2021-mae) on ImageNet-1K. The MAE pretraining is the SSL recipe that makes training large ViTs on ImageNet-1K-scale data without labels feasible. CC-BY-NC-4.0 license of MAE weights propagates to SAM's ViT-H encoder weights.

## UPDATE: vit
Section: Remarks or Relations
Bullets to add:
- MAE (he2021-mae) shows that ViT-H trained with MAE pretraining on ImageNet-1K achieves 87.8% top-1 — surpassing supervised JFT-300M ViT-L/16 (85.2%). MAE is the SSL recipe that unlocked practical pretraining of large ViTs without billion-image supervised datasets.

# Provenance

- Abstract: masking ratio 75%, asymmetric encoder-decoder, ViT-H 87.8%, "3× or more" training speedup. Directly quoted values.
- §1, Fig. 1: architecture description (mask tokens introduced after encoder, small decoder, decoder discarded at fine-tuning).
- §1, p5 (S1.p5): information density argument — spatial redundancy in images requires high masking to prevent trivial texture-extrapolation solutions.
- §1, p7 (S1.p7): "can reduce overall pre-training time by 3× or more."
- §3 (Masking paragraph): random sampling without replacement from a uniform distribution; "random sampling" terminology.
- §3 (MAE encoder): "only operates on a small subset (e.g., 25%) of the full set."
- §3 (MAE decoder): mask token is "a shared, learned vector"; decoder has "<10% computation per token vs. the encoder."
- §3 (Reconstruction target): MSE between reconstructed and original images, computed only on masked patches; per-patch normalization variant described.
- §3 (Simple implementation): shuffle/unshuffle trick avoids specialized sparse ops.
- §4 (Baseline: ViT-Large table, S4.SS0.SSS0.Px1): ViT-L scratch 82.5%, MAE fine-tune 84.9% (Table inline).
- §4.1 (Masking ratio, Fig. 5 caption): "A high masking ratio (75%) works well for both fine-tuning (top) and linear probing (bottom)." Linear-probe gap: "~20% (54.6% vs. 73.5%)."
- §4.1 (Decoder design, S4.SS1.SSS0.Px2): "default MAE decoder has 8 blocks and a width of 512-d." "only has 9% FLOPs per token vs. ViT-L."
- Table 2 (S4.T2): wall-clock times — ViT-L with mask tokens 42.4h, without 15.4h (2.8×); ViT-H with mask tokens ~119.6h†, without (1-block decoder) 29.3h (4.1×).
- §4.1 (Mask token, S4.SS1.SSS0.Px3): "encoder uses mask tokens, it performs worse: accuracy drops by 14% in linear probing." "reduces training FLOPs by 3.3×."
- §4.1 (Reconstruction target, S4.SS1.SSS0.Px4): "Using pixels with normalization improves accuracy." Token-based variant adds 0.4% ft vs. unnormalized pixels, no advantage vs. normalized pixels.
- §4.1 (Training schedule, Fig. 7 caption): monotonic improvement up to 1600 epochs, no saturation.
- Table 3 (S4.T3): MAE ViT-B 83.6%, ViT-L 85.9%, ViT-H 86.9% (224), ViT-H_448 87.8%; pre-trained 1600 epochs IN1K.
- §4.2 (S4.SS2.SSS0.Px1): "ViT-L on 128 TPU-v3 cores, our MAE's training time is 31 hours for 1600 epochs and MoCo v3's is 36 hours for 300 epochs."
- Table 4 (S5.T4): COCO AP_box: MAE ViT-B 50.3, ViT-L 53.3; supervised ViT-B 47.9, ViT-L 49.3.
- Table 5 (S5.T5): ADE20K mIoU: MAE ViT-B 48.1, ViT-L 53.6; supervised ViT-B 47.4, ViT-L 49.9.
- §3 footnote 1: "computing the loss on all pixels leads to a slight decrease in accuracy (~0.5%)."
