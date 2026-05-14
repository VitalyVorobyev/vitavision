---
paper_id: long2015-fcn
title: "Fully Convolutional Networks for Semantic Segmentation"
authors: ["J. Long", "E. Shelhamer", "T. Darrell"]
year: 2015
url: https://arxiv.org/abs/1411.4038
created: 2026-05-10
relevant_atlas_pages: []
---

# Setting

Problem class: dense pixel-wise classification — semantic segmentation. Input is an RGB image of arbitrary spatial dimensions H×W (no fixed-size constraint); output is a per-pixel probability distribution over K semantic classes at the full input resolution. For PASCAL VOC K=21 (20 object categories + background). For NYUDv2 K=40. For SIFT Flow K=33 semantic + 3 geometric categories.

This is supervised multi-class labelling. It is categorically distinct from:
- Classical unsupervised segmentation (graph-cut partitioning, mean-shift clustering) — those operate without class labels.
- Interactive binary segmentation (GrabCut) — binary foreground/background, user-guided.
- Instance segmentation — per-instance mask; FCN assigns class only, not instance identity.

The network operates on whole images in a single forward pass, producing a score map at 1/stride resolution then upsample to match input pixels. Inference time approximately 175 ms for a typical image on an NVIDIA Tesla K40c (Table 3).

# Core idea

The core trick is **convolutionalization**: every fully-connected layer in a classification CNN (AlexNet, VGG-16, GoogLeNet) can be reinterpreted as a 1×1 convolution covering the entire preceding feature map. Substituting all fc layers this way turns a fixed-input classifier into a dense-prediction FCN that naturally accepts inputs of any spatial size and produces a coarse spatial score map — the spatial output grows proportionally with the input (Section 3.1, Figure 2).

For VGG-16 this yields a total downsampling stride of 32 (five 2× pooling stages), so the score map for a 640×480 input is 20×15 before upsampling.

**Upsampling via backwards strided convolution ("deconvolution")**: upsampling by factor f is equivalent to convolution with fractional input stride 1/f. The network inserts a learnable deconvolution layer with output stride f that can be initialised to bilinear interpolation and then fine-tuned (Section 3.3). The final deconvolution kernel for FCN-32s upsamples the 1/32-resolution map back to full resolution in one step.

**Skip architecture** (FCN-32s / FCN-16s / FCN-8s): the key architectural contribution. Instead of upsampling from only the final conv7 (convolutionalized fc7) feature map at stride 32, intermediate pool layers are tapped:

- **FCN-32s**: single-stream, 32× deconvolution from conv7. Coarse predictions.
- **FCN-16s**: a 1×1 conv on pool4 (stride 16) produces additional class scores; these are element-wise summed with a 2× upsampling of conv7 predictions; the combined stride-16 map is then 16× upsampled to full resolution. Initialises from FCN-32s; new pool4 1×1 conv weights are zero-initialised. +3.0 mean IU on val (Table 2).
- **FCN-8s**: additionally taps pool3 (stride 8) with a 1×1 conv, sums with a 2× upsampling of FCN-16s intermediate predictions, then 8× deconvolution to full resolution. +0.3 mean IU further (Table 2).

The underlying rationale (Section 4.2): deep layers encode coarse semantic information ("what"), shallow layers encode fine spatial detail ("where"); skip connections merge these streams, calling this the "deep jet" by analogy to Koenderick–van Doorn's feature jet.

Training is end-to-end by per-pixel multinomial logistic (softmax cross-entropy) loss summed over all spatial output positions. Whole-image training is shown to be identical in expectation to patchwise training but faster in wall time (Section 3.4, Figure 5).

# Assumptions

1. **Pre-trained ImageNet backbone is required.** The convolutionalization trick requires that fc layers are present in the source architecture; random initialisation of the backbone is stated as infeasible due to training time (Section 4.3). Fine-tuning the output classifier alone yields only 70% of full fine-tuning performance (Table 2, FCN-32s-fixed row: 45.4 vs 59.4 mean IU).
2. **Dense pixel-level ground-truth labels** are available at training time. PASCAL VOC 2011 seg labels + Hariharan et al. (8498 training images).
3. **Fixed class set at training time.** The 1×1 scoring conv maps to K channels; adapting to a new class set requires retraining the scoring layer.
4. **Output resolution = input resolution after deconvolution.** The final upsampling factor is exactly 32 (FCN-32s), 16 (FCN-16s), or 8 (FCN-8s) times the score map stride — this is hard-coded by network topology, not parameterised at inference time.
5. **Soft assumption: summing (not max) skip-stream predictions.** Max fusion was found to make learning difficult due to gradient switching (footnote 6 in Section 4.2). Sum fusion is the published design.

# Failure regime

- **Coarse boundary resolution.** Even FCN-8s operates at 1/8 input resolution before the final deconvolution; fine object boundaries are blurred. Subsequent papers explicitly address this: DeepLab (Chen et al. 2015) adds a fully-connected CRF post-processing step; U-Net (Ronneberger et al. 2015) uses symmetric encoder–decoder skip connections with higher-resolution fusion.
- **Very small or thin structures** are below the effective resolution of stride-8 feature maps; they tend to be classified as background.
- **Homogeneous regions lacking local texture cues.** The network's receptive field for pool3 features (at stride 8, effective rf size in the ballpark of several hundred pixels) is large enough to capture global context, but class-confusable homogeneous regions (sky vs. water, road vs. sidewalk) still produce errors. An example failure: the network misclassifies life-jackets in a boat as people (Figure 6 caption, Section 5).
- **Depth information not exploited by default.** On NYUDv2, plain RGB FCN-32s achieves only 29.2 mean IU; late fusion with the HHA depth embedding raises this to 32.8 (FCN-32s) and 34.0 (FCN-16s) — improvement is significant but depth encoding is non-trivial (Table 4).
- **No handling of class imbalance.** The authors note that labels in PASCAL VOC are approximately 3/4 background and find class balancing unnecessary (Section 4.3). For highly imbalanced datasets this may not hold.

# Numerical sensitivity

- **Deconvolution initialisation.** Final deconvolution filters are initialised to bilinear interpolation weights and then frozen OR learned; intermediate skip-stream deconvolutions are initialised to bilinear and learned (Section 4.3, "Dense Prediction" paragraph). Random initialisation of the final deconvolution layer does not yield better performance or faster convergence (Section 4.3, "Optimization" paragraph — same note applies to the class scoring layer: zero-initialised, not random).
- **Skip-stream pool4 1×1 conv: zero-initialised.** This is critical — it ensures the network begins from the already-converged FCN-32s solution and refines incrementally (Section 4.2, end of FCN-16s paragraph). The learning rate for the skip-stream upgrade is decreased by a factor of 100 relative to the main branch.
- **Learning rates:** SGD with momentum 0.9.
  - FCN-AlexNet: lr = 10^-3
  - FCN-VGG16: lr = 10^-4
  - FCN-GoogLeNet: lr = 5×10^-5
  (Section 4.3, Optimization paragraph — chosen by line search)
- **Weight decay:** 5×10^-4 or 2×10^-4; doubled learning rate for biases (Section 4.3).
- **Minibatch:** 20 images (Section 4.3).
- **Data augmentation:** random mirroring and jitter up to 32 pixels (the coarsest stride) in each direction yielded no noticeable improvement (Section 4.3, Augmentation paragraph).
- **Training duration:** ~3 days on a single Tesla K40c for FCN-32s; ~1 additional day each for FCN-16s and FCN-8s upgrades (Section 4.3, Fine-tuning paragraph). At least 175 epochs to convergence at a fixed learning rate (Section 4.1).
- **Class scoring layer:** channel count must exactly match K; off-by-one in K silently degrades performance or causes shape errors.

# Applicability

- Use when: dense per-pixel class labelling from abundant supervised labels; large receptive field and coarse-to-fine architecture acceptable; ImageNet-pretrained backbone available; no post-processing CRF needed.
- Don't use when: fine boundary precision is paramount (use U-Net, SegNet, DeepLab v2+); labels are scarce (few-shot or zero-shot segmentation); real-time inference on CPU or embedded hardware (210 ms GPU inference is a lower bound; the model has 134 M parameters for VGG-16 backbone).
- Compared against: SDS (Hariharan et al. ECCV 2014, hybrid R-CNN proposal-classifier — 52.6 mean IU PASCAL VOC 2011 test vs FCN-8s 62.7); R-CNN (Girshick et al. CVPR 2014 — 47.9 mean IU); Farabet et al. 2013 multi-scale convnet; Pinheiro & Collobert 2014 recurrent convnet.

# Connections

- Builds on:
  - Krizhevsky, Sutskever, Hinton (NIPS 2012) — AlexNet, ImageNet pretraining (ref [20] in paper)
  - Simonyan & Zisserman (2014) — VGG-16 backbone, the best-performing FCN variant (ref [31])
  - Szegedy et al. (2014) — GoogLeNet (ref [32])
  - LeCun et al. (1989) — backpropagation applied to convnets; early fully-convolutional segmentation precedent (ref [21])
  - Donahue et al. (DeCAF, ICML 2014) — transfer learning of deep features (ref [3])
  - Girshick et al. (R-CNN, CVPR 2014) — adapting pre-trained classifiers to detection/segmentation (ref [10])

- Enables (direct influence, not exhaustive):
  - Noh et al. (2015) — DeconvNet for segmentation (deeper, symmetric deconvolution stack)
  - Ronneberger et al. (2015) — U-Net (symmetric encoder–decoder, dense skip connections, biomedical)
  - Chen et al. (2015) — DeepLab (dilated convolutions + CRF; extends FCN backbone)
  - Badrinarayanan et al. (2017) — SegNet (pooling index upsampling)
  - Redmon et al. (2016) — YOLO (dense prediction with single FCN pass)

- Refutes / supersedes:
  - Patch-based sliding-window CNN segmenters (Ning et al. 2005; Farabet et al. 2013; Pinheiro & Collobert 2014) — shown slower and equal or worse in accuracy (Section 3.4, Figure 5)
  - Post-processing pipelines with superpixel projection, CRF, or region proposals for basic segmentation (FCN achieves better mean IU without these steps)

# Atlas update plan

## NEW: fcn-semantic-segmentation
Type: model
Category: deep-learning / semantic-segmentation
Primary source: long2015-fcn

### Goal
- Assign a semantic class label to every pixel in an input image in a single forward pass, without post-processing, proposals, or superpixels.
- Reformulates any pretrained ImageNet classifier (AlexNet, VGG-16, GoogLeNet) as a fully convolutional network by reinterpreting fc layers as 1×1 convolutions, enabling inference on arbitrary-resolution inputs.
- Skip architecture (FCN-8s) fuses deep coarse-semantic features with shallow fine-spatial features to recover boundary detail lost by pooling.

### Architecture
- Family: fully-convolutional CNN derived from VGG-16 (16 parameter layers, 134 M parameters — Table 1) by replacing fc6/fc7/fc8 with 1×1 convolutions of channel widths 4096/4096/21.
- Input: arbitrary H×W RGB image. Output: per-pixel softmax over 21 classes (PASCAL VOC) at input resolution.
- Total stride: 32 (5 max-pooling stages with stride 2, conv layers with stride 1) — Table 1.
- Final classification conv: 1×1, 21 output channels, zero-initialised (Section 4.3).
- Upsampling: learnable bilinear deconvolution. FCN-32s: single 32× deconvolution. FCN-16s: 2× deconvolution of conv7 + pool4 1×1 sum → 16× deconvolution. FCN-8s: further fuses pool3 via 1×1 conv + 2× upsampling → 8× deconvolution to full resolution (Figure 3, Section 4.2).
- Skip connections: element-wise sum of score maps (not concatenation); max fusion was found to impede learning (footnote 6).
- Receptive field of output units: 404 pixels for FCN-VGG16 (Table 1).
- Forward pass time: ~210 ms for a 500×500 input on Tesla K40c for VGG-16 variant (Table 1).

### Training
- Dataset: PASCAL VOC 2011 segmentation training set (1112 images native; 8498 images with Hariharan et al. extra annotations — Section 4.3, More Training Data paragraph).
- Loss: per-pixel multinomial logistic (softmax cross-entropy), summed over all unmasked spatial output positions (Section 4, first paragraph).
- Whole-image training — no patch sampling; shown equivalent to patchwise training in expectation and faster in wall clock (Section 3.4, Figure 5).
- SGD with momentum 0.9, weight decay 5×10^-4 (or 2×10^-4), lr=10^-4 for FCN-VGG16 (Section 4.3).
- Staged learning: fine-tune FCN-32s first (3 days on single K40c), then upgrade to FCN-16s (~1 day), then FCN-8s (~1 day) (Section 4.3).
- Deconvolution init: bilinear for all upsampling layers; final deconvolution frozen or learned; intermediate ones learned.
- Pool4/pool3 1×1 prediction layers: zero-initialised; learning rate decreased 100× when adding each skip (Section 4.2).
- No class weighting needed for PASCAL VOC class distribution (Section 4.3, Class Balancing paragraph).

### Implementations
- Reference: Caffe (Long, Shelhamer et al., http://fcn.berkeleyvision.org). License: BSD-style. Status: historical, unmaintained.

### Assessment (benchmark numbers, all from cache)
- PASCAL VOC 2011 test mean IU = 62.7 for FCN-8s (Table 3); 62.2 on VOC 2012 test (Table 3). Represents a 20% relative improvement over prior SDS at 52.6 (Table 3).
- PASCAL VOC 2011 val FCN-32s = 59.4 mean IU (trained with extra Hariharan data) (Table 2 / Section 4.1).
- PASCAL VOC 2011 val comparison (no extra data): FCN-32s 45.4 fixed / 59.4 trained / FCN-16s 62.4 / FCN-8s 62.7 (Table 2).
- NYUDv2: FCN-16s RGB-HHA late fusion = 34.0 mean IU (Table 4).
- SIFT Flow: FCN-16s mean IU 39.5, pixel acc 85.2, geometric acc 94.3 (Table 5).
- Inference time: ~175 ms for FCN-8s on a typical image (Table 3, abstract).
- Compared to SDS [15]: inference 114× faster (convnet only) or 286× faster (overall pipeline) (Table 3 footnote / Section 5).

# Provenance

All numerical constants and claims below are verified from the `.txt` or `.html` cache. Lines refer to the `.txt` pdftotext rendition.

- mean IU PASCAL VOC 2011 test = 62.7 — txt line 439 ("FCN-8s  62.7  62.2  ~175 ms"), Table 3
- mean IU PASCAL VOC 2012 test = 62.2 — txt line 439, Table 3
- SDS mean IU PASCAL VOC 2011 test = 52.6 — txt line 438, Table 3
- R-CNN mean IU PASCAL VOC 2011 test = 47.9 — txt line 437, Table 3
- 20% relative improvement headline — txt line 47 (abstract), also Table 3 caption line 432-433
- inference time FCN-8s ~175 ms — txt line 439, Table 3
- inference speedup vs SDS: 114× convnet-only, 286× overall — txt line 428-429, Section 5
- VGG-16 total stride = 32 — txt line 295, Table 1
- FCN-VGG16 parameters = 134 M — txt line 293, Table 1
- FCN-VGG16 receptive field = 404 pixels — txt line 294, Table 1
- FCN-VGG16 conv layers = 16 — txt line 292, Table 1
- FCN-VGG16 forward time = 210 ms for 500×500 — txt line 291, Table 1
- FCN-AlexNet mean IU val = 39.8 — txt line 290, Table 1
- FCN-VGG16 mean IU val = 56.0 — txt line 290, Table 1; "59.4 with extra data" line 298, Section 4.1
- FCN-GoogLeNet mean IU val = 42.5 — txt line 290, Table 1
- FCN-AlexNet forward time = 50 ms — txt line 291, Table 1
- FCN-GoogLeNet forward time = 59 ms — txt line 291, Table 1
- FCN-VGG16 lr = 10^-4 — txt line 351, Section 4.3, Optimization paragraph
- FCN-AlexNet lr = 10^-3 — txt line 350-351, Section 4.3
- FCN-GoogLeNet lr = 5×10^-5 — txt line 351 ("5−5" in pdftotext, context confirms 5e-5), Section 4.3
- momentum = 0.9 — txt line 352, Section 4.3
- weight decay = 5×10^-4 (or 2×10^-4) — txt line 352-353 ("5−4 or 2−4"), Section 4.3
- minibatch = 20 images — txt line 350, Section 4.3
- fine-tuning time FCN-32s = 3 days on single GPU — txt line 390, Section 4.3
- fine-tuning time FCN-16s/8s = ~1 day each — txt line 391, Section 4.3
- at least 175 epochs to convergence — txt line 299, Section 4.1
- pool4 skip: zero-init, lr decreased by factor 100 — txt lines 338-340, Section 4.2
- FCN-32s-fixed mean IU val = 45.4 (only last layer fine-tuned) — txt line 332, Table 2
- FCN-32s mean IU val = 59.4 — txt line 333, Table 2
- FCN-16s mean IU val = 62.4 (+3.0 over FCN-32s) — txt lines 333, 342, Table 2 + Section 4.2
- FCN-8s mean IU val = 62.7 (+0.3 over FCN-16s) — txt lines 334, 353, Table 2 + Section 4.2
- 8498 training images (Hariharan extra annotations) — txt line 395, Section 4.3
- 1112 native PASCAL VOC 2011 training images — txt line 394, Section 4.3
- Augmentation (mirroring + jitter ≤32 px) yielded no improvement — txt lines 376-379, Section 4.3
- Max fusion impeded learning — txt line 371 (footnote 6), Section 4.2
- NYUDv2 FCN-32s RGB mean IU = 29.2 — txt line 454, Table 4
- NYUDv2 FCN-32s RGB-HHA mean IU = 32.8 — txt line 458, Table 4
- NYUDv2 FCN-16s RGB-HHA mean IU = 34.0 — txt line 460, Table 4
- SIFT Flow FCN-16s: pixel acc 85.2, mean IU 39.5, geometric acc 94.3 — txt line 464, Table 5
- SIFT Flow training split: 2488 train / 200 test — txt line 491, Section 5
- NYUDv2 standard split: 795 training / 654 testing — txt line 465-466, Section 5
- Zero-init for class scoring layer confirmed no performance advantage from random init — txt line 355-357, Section 4.3, Optimization paragraph
- "Fine-tuning the output classifier alone yields only 70% of the full fine-tuning performance" — txt lines 364-365, Section 4.3
- Deconvolution: final layer fixed to bilinear, intermediate layers learned — txt lines 371-374, Section 4.3, Dense Prediction paragraph
- Receptive field composition rule (composition formula) — txt lines 148 (fks ◦ g rule), Section 3
- AlexNet 227×227 inference 1.2 ms; FCN 500×500 22 ms (5× speedup) — txt lines 157-159, Section 3.1 (efficiency illustration, not the primary benchmark)
