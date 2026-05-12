---
paper_id: chen2018-deeplab
title: "DeepLab: Semantic Image Segmentation with Deep Convolutional Nets, Atrous Convolution, and Fully Connected CRFs"
authors: ["L. Chen", "G. Papandreou", "I. Kokkinos", "K. Murphy", "A. Yuille"]
year: 2018
url: https://arxiv.org/abs/1606.00915
created: 2026-05-11
relevant_atlas_pages: [fcn-semantic-segmentation, unet-segmentation, deeplab-semantic-segmentation]
---

# Setting

Dense semantic segmentation of natural RGB images: assign a class label to every pixel. Inputs are arbitrary-resolution RGB images; the paper evaluates on PASCAL VOC 2012 (21 classes including background, 10,582 trainaug images), PASCAL-Context (60 classes), PASCAL-Person-Part (human body-part segmentation), and Cityscapes (19 classes, 2975/500/1525 train/val/test images). Outputs are per-pixel K-way class probabilities at the original input resolution, produced via bilinear upsampling from a stride-8 feature map.

The paper presents DeepLab v1 (conference version, VGG-16 backbone, single-rate atrous convolution) and DeepLab v2 (TPAMI version, ResNet-101 backbone + ASPP). The arxiv version 1606.00915 is the v2 TPAMI paper. Top-line result: 79.7% mean IoU on the PASCAL VOC 2012 test set.

# Core idea

DeepLab addresses three problems that arise when applying ImageNet-pretrained classifiers to dense prediction: (1) spatial resolution is destroyed by repeated strided pooling, (2) objects appear at multiple scales, (3) CNN invariance blurs segment boundaries. It makes three main contributions in response.

**Atrous (dilated) convolution** repurposes a pre-trained classification network for dense prediction by removing the stride from the last two max-pooling layers and replacing downstream convolutions with atrous convolutions at rates $r=2$ and $r=4$, yielding output stride 8 instead of the original 32. The 1-D atrous convolution formula is $y[i] = \sum_{k=1}^{K} x[i + r \cdot k]\, w[k]$ (Eq. 1). A $k \times k$ filter dilated at rate $r$ has effective receptive size $k_e = k + (k-1)(r-1)$ without adding parameters or FLOPs.

**Atrous Spatial Pyramid Pooling (ASPP)** runs four parallel atrous convolution branches on the same feature map at rates $r \in \{6, 12, 18, 24\}$ (ASPP-L variant; there is also ASPP-S with $r \in \{2, 4, 8, 12\}$). Each branch applies a $3 \times 3$ atrous conv followed by $1 \times 1$ projection to the number of classes; the four branch outputs are summed. This captures multi-scale context without rescaling the image.

**Fully-connected CRF post-processing** refines the coarse CNN predictions using dense pairwise Gaussian potentials over all pixel pairs. The energy contains an appearance kernel weighted by $w_1$ (bilateral: position + RGB colour) and a smoothness kernel weighted by $w_2$ (spatial-only). Mean-field inference via the permutohedral lattice runs for 10 iterations and takes under 0.5 s on a CPU for a VOC image. This step is decoupled from DCNN training.

# Assumptions

1. **Hard: ImageNet-pretrained backbone is available.** The entire approach repurposes VGG-16 or ResNet-101 weights; training from scratch is not studied in this paper.
2. **Hard: Input is a natural RGB image.** The bilateral CRF kernel uses pixel colour differences ($I_i - I_j$) to gate boundary decisions; this has no meaningful semantic interpretation for monochrome, thermal, or medical images.
3. **Soft: Output stride 8 is the efficiency–fidelity sweet spot.** The paper uses two strided-to-atrous replacements ($r=2$, $r=4$) to reach output stride 8, followed by $8\times$ bilinear upsampling. Going further (output stride 4 or 2) is possible but prohibitively expensive.
4. **Soft: CRF and DCNN are trained separately.** CRF parameters are cross-validated on 100 VOC val images with the DCNN fixed; end-to-end joint training was contemporaneous work (CRF-as-RNN), not pursued here.
5. **Soft: The CRF colour statistics assumption holds.** Segmentation quality from CRF post-processing degrades when image colour does not correlate with object boundaries (e.g., cluttered scenes, uniform-colour objects).

# Failure regime

- **Thin elongated structures** (poles, bicycle spokes, plant stems): the CNN over-smooths these even at output stride 8; the CRF's short effective range for small bilateral bandwidths cannot fully recover them.
- **Instance-level distinctions**: two adjacent instances of the same class (two adjacent dogs, touching persons) cannot be separated — this is semantic segmentation, not instance segmentation; the CRF unary terms are class-level and offer no instance signal.
- **Very large dilation rates in ASPP**: at $r=24$ the $3 \times 3$ kernel samples a $49 \times 49$ spatial support but touches only 9 positions; very small objects can fall entirely in the gaps, causing misses not compensated by the other ASPP branches.
- **Domain shift**: CRF colour kernel assumes natural-image RGB statistics; results on medical, infrared, or depth images are unreliable, and the backbone features are also out-of-domain.
- **Boundary quality vs. CRF parameter sensitivity**: the bilateral kernel hyperparameters ($\sigma_\alpha, \sigma_\beta$) are cross-validated and not robust across domains; wrong values reduce CRF benefit or introduce artefacts.

# Numerical sensitivity

The model is fp32 throughout. Key hyperparameters and their values confirmed from paper:

**CRF pairwise potential** (Eq. 2–3, Section 3.3):
$$\theta_{ij}(x_i, x_j) = \mu(x_i, x_j)\left[w_1 \exp\!\left(-\frac{\|p_i - p_j\|^2}{2\sigma_\alpha^2} - \frac{\|I_i - I_j\|^2}{2\sigma_\beta^2}\right) + w_2 \exp\!\left(-\frac{\|p_i - p_j\|^2}{2\sigma_\gamma^2}\right)\right]$$

Fixed defaults: $w_2 = 3$, $\sigma_\gamma = 3$. Cross-validated search ranges: $w_1 \in [3:6]$, $\sigma_\alpha \in [30:10:100]$, $\sigma_\beta \in [3:6]$ (MATLAB notation). 10 mean-field iterations used in all reported experiments.

**Training (VGG-16 / DeepLab v1 baseline)**: mini-batch of 20, initial LR 0.001 (0.01 for final classifier layer), LR multiplied by 0.1 every 2000 iterations, momentum 0.9, weight decay 0.0005.

**Training (v2 improvements)**: "poly" learning rate policy — LR × $(1 - \text{iter}/\text{max\_iter})^{0.9}$ — outperforms step decay. Best configuration: batch size 10, 20K iterations. Using batch size 10 with 10K iterations yields 64.71% val mIoU; 20K iterations improves to 64.90%.

**Multi-scale input fusion**: score maps from three scales $\{0.5, 0.75, 1\}$ are bilinearly interpolated to original resolution and fused by taking the maximum response per position.

**ASPP rates**: ASPP-S uses $r \in \{2, 4, 8, 12\}$ (four branches); ASPP-L uses $r \in \{6, 12, 18, 24\}$ (four branches). ASPP-L is the variant reported in the headline results.

# Applicability

- **Use when**: you need dense pixel-wise segmentation of natural-image scenes; you have an ImageNet-pretrained backbone; boundary sharpness matters and you can afford 0.5 s CRF post-processing; GPU memory allows storing output-stride-8 feature maps ($8\times$ larger than stride-64).
- **Don't use when**: instance-level discrimination is needed (use Mask R-CNN or Panoptic FPN instead); images are non-natural (medical, thermal, depth); real-time inference is required and the CRF cost is unacceptable (DeepLabv3+ or PSPNet without CRF may be preferable); you need end-to-end training with boundary supervision (the CRF is a separate post-processing step in v1/v2).
- **Compared against**:
  - **FCN** (Long et al.): DeepLab replaces strided downsampling with atrous convolution to avoid resolution loss, avoiding the need for FCN-style skip connections to recover spatial detail; ASPP provides multi-scale context that FCN's multi-scale skip architecture approximates in a cruder fashion.
  - **U-Net**: same segmentation goal, different mechanism — DeepLab uses an atrous-dilated encoder with a multi-scale pooling head + CRF post-processor, while U-Net uses a symmetric encoder-decoder with skip concatenation for boundary recovery; the two approaches are contemporary peers rather than one superseding the other.
  - **SegNet**: another encoder-decoder approach using pooling-index unpooling rather than skip concatenation; DeepLab's atrous approach avoids the decoder stack entirely.
  - **CRF-RNN** (Zheng et al., contemporaneous): unrolls mean-field CRF into an end-to-end RNN layer, enabling joint DCNN+CRF training; DeepLab keeps them decoupled in v1/v2.

# Connections

- Builds on: `long2015-fcn` (fully-convolutional reinterpretation of ImageNet classifiers for dense prediction), VGG-16 (Simonyan & Zisserman 2014), ResNet-101 (He et al. 2015/2016, DeepLab v2 addition), Krähenbühl & Koltun 2011 densecrf (fully-connected CRF with fast permutohedral-lattice mean-field inference).
- Enables: DeepLabv3 (Chen et al. 2017, removes CRF, improves ASPP with image-level pooling), DeepLabv3+ (adds decoder for sharper boundaries), many subsequent segmentation models that adopt atrous convolution.
- Refutes / supersedes: not a clean supersession of FCN or U-Net — DeepLab, FCN, and U-Net are peer approaches in the 2015–2016 era, each with distinct mechanisms and use-cases. Records the multi-year SOTA recipe on PASCAL VOC 2012.

# Atlas update plan

## NEW: deeplab-semantic-segmentation
Type: model
Category: deep-learning / semantic-segmentation
Primary source: this paper

**Motivation:**
Dense pixel-wise classification at near-input resolution without discarding ImageNet backbone expressiveness. The paper names three problems: (1) feature resolution destroyed by strided pooling; (2) multi-scale context capture; (3) localisation accuracy at object boundaries. DeepLab addresses all three in a single pipeline.

**Architecture:**
- **Backbone**: VGG-16 (DeepLab v1) or ResNet-101 (DeepLab v2). Last two strided max-pool layers set to stride 1; subsequent convolutions re-applied with atrous rates $r=2$ (pool5 region) and $r=4$ (following convolutions) → output stride 8.
- **ASPP head** (DeepLab v2): four parallel $3 \times 3$ atrous convolutions at $r \in \{6, 12, 18, 24\}$ (ASPP-L), each followed by a $1 \times 1$ conv to the class count (21 for PASCAL VOC); outputs summed.
- **Upsampling**: bilinear interpolation by $8\times$ to restore input resolution.
- **CRF post-processor**: fully-connected CRF with bilateral appearance kernel ($\sigma_\alpha, \sigma_\beta$) and spatial smoothness kernel ($\sigma_\gamma = 3$); 10 mean-field iterations; runs on CPU as a separate step.

**Implementation considerations:**
- Training (v2 final): batch size 10, 20K iterations, "poly" LR policy starting at 0.001 (0.01 for classifier), momentum 0.9, weight decay 0.0005.
- Multi-scale input fusion at $\{0.5, 0.75, 1\}$ scales, fused by max-pooling across scale maps.
- MS-COCO pre-training adds ~2% mIoU on top of PASCAL VOC training.
- Atrous convolution implemented as sparse sampling via the im2col extension (Caffe) or subsampling+reinterlacing (TensorFlow); modern frameworks have native `dilation_rate` parameter in conv layers.
- CRF runs as a post-processing step (densecrf library, Krähenbühl–Koltun); not end-to-end trained in v1/v2.

**Assessment (confirmed from paper):**
- PASCAL VOC 2012 test mIoU: 79.7% (DeepLab-ASPP, ResNet-101, MS-COCO pre-training, multi-scale + CRF) — Table V, Section 4.1.
- PASCAL VOC 2012 val mIoU: 77.69% (ResNet-101, best val model, +CRF) — Section 4.1.2.
- PASCAL-Context test mIoU: 45.7% — Table VI, Section 4.2.
- PASCAL-Person-Part: 63.1% (best model, multi-scale + CRF, without COCO pre-training) — Table VII, Section 4.3.
- Cityscapes test mIoU: 63.1% — Table VIII, Section 4.4.
- Inference speed: 8 FPS on NVIDIA Titan X GPU (DCNN only); CRF 0.5 s on CPU per image.

**Relations (typed):**
- `{ type: extended_by, target: deeplab-semantic-segmentation, confidence: high, caution: "DeepLab adopts FCN's fully-convolutional framing but replaces strided downsampling with atrous (dilated) convolution to preserve resolution, adds an ASPP multi-scale head and a fully-connected CRF post-processor." }` — author this on `fcn-semantic-segmentation` side (see UPDATE block below).
- `{ type: compared_with, target: unet-segmentation, confidence: high, caution: "Same task, different mechanism — atrous backbone + multi-scale head + CRF vs symmetric encoder-decoder with skip concatenation." }` — symmetric; recommend authoring on the new `deeplab-semantic-segmentation` page.
- Quality: omit (normal published page).

## UPDATE: fcn-semantic-segmentation
Section: Relations (frontmatter)
- Add `relations[]` entry:
  ```yaml
  - type: extended_by
    target: deeplab-semantic-segmentation
    confidence: high
    caution: "DeepLab adopts FCN's fully-convolutional framing but replaces strided downsampling with atrous (dilated) convolution to preserve resolution, adds an ASPP multi-scale head and a fully-connected CRF post-processor."
  ```

## UPDATE: unet-segmentation
Section: Relations (frontmatter)
- The `compared_with` relation is symmetric; the build will mirror it automatically from the `deeplab-semantic-segmentation` side. Do NOT manually add a duplicate entry here — that would double-author the symmetric edge and cause a build conflict.

# Provenance

- **Atrous convolution definition** ($y[i] = \sum_k x[i + r \cdot k]\, w[k]$, rate parameter $r$) — Eq. (1), Section 3.1.
- **Effective filter size** $k_e = k + (k-1)(r-1)$ — inline math, Section 3.1, paragraph describing field-of-view enlargement.
- **Output stride 8** (last two stride-1 + atrous $r=2$ and $r=4$) — Section 3.1, paragraph on applying atrous in a chain of layers; also Figure 1 caption ("reducing degree of signal downsampling from 32x down to 8x") and Section 1 para 6.
- **Bilinear upsampling by 8×** — Section 3.1 ("fast bilinear interpolation by an additional factor of 8") and Figure 1 caption.
- **ASPP-L rates {6, 12, 18, 24}** — Section 4.1.2, text: "(3) ASPP-L, with four branches and larger rates ($r$ = {6, 12, 18, 24})." Line 994 of HTML.
- **ASPP-S rates {2, 4, 8, 12}** — Section 4.1.2, text: "(2) ASPP-S, with four branches and smaller atrous rates ($r$ = {2, 4, 8, 12})." Line 993 of HTML.
- **CRF pairwise potential** ($\sigma_\alpha, \sigma_\beta, \sigma_\gamma$ kernels, $w_1, w_2$ weights) — Eqs. 2–3, Section 3.3.
- **CRF default values**: $w_2 = 3$, $\sigma_\gamma = 3$ — Section 4.1.1, line 785 of HTML.
- **CRF cross-validation search ranges**: $w_1 \in [3:6]$, $\sigma_\alpha \in [30:10:100]$, $\sigma_\beta \in [3:6]$ — Section 4.1.1, lines 788–789 of HTML.
- **10 mean-field iterations** — Section 4.1.1, last line of CRF parameter paragraph: "We employ 10 mean field iterations." Line 790 of HTML. Also visible as "CRF Iteration 10" in Figure 5 caption (line 649).
- **Training hyperparameters (VGG-16)**: mini-batch 20, LR 0.001 (0.01 final layer), decay ×0.1 every 2000 iters, momentum 0.9, weight decay 0.0005 — Section 4.1.1, lines 776–780 of HTML.
- **"Poly" LR, batch size 10, 20K iterations** — Section 4.1.2, lines 911–912 of HTML.
- **Multi-scale input scales {0.5, 0.75, 1}** — Section 4.1.2, line 1155 of HTML: "DCNN images at scale = {0.5, 0.75, 1}, fusing their score maps by taking…"
- **PASCAL VOC 2012 test 79.7% mIoU** — Abstract line 91; also Section 4.1.2 ("test set performance of 79.7%") line 1182; Table V line 1284.
- **PASCAL VOC 2012 val 77.69%** — Section 4.1.2 ("Post-processing our best model by dense CRF yields performance of 77.69%.") line 1171; also Table IV line 1139.
- **PASCAL-Context 45.7%** — Table VI column header line 1485; Section 4.2 text line 1607.
- **PASCAL-Person-Part 63.1%** — Table VII line 1674; Section 4.3 line 1783.
- **Cityscapes test 63.1%** — Table VIII line 1841; Section 4.4 line 2002.
- **Inference speed 8 FPS / 0.5 s CRF** — Section 1, line 219–220 of HTML.
- **Trainaug split 10,582 images** — Section 4.1, line 767 of HTML.
