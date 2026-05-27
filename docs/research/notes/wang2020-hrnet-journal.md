---
paper_id: wang2020-hrnet-journal
title: "Deep High-Resolution Representation Learning for Visual Recognition"
authors:
  - J. Wang
  - K. Sun
  - T. Cheng
  - B. Jiang
  - C. Deng
  - Y. Zhao
  - D. Liu
  - Y. Mu
  - M. Tan
  - X. Wang
  - W. Liu
  - B. Xiao
year: 2020
url: https://arxiv.org/pdf/1908.07919
created: 2026-05-27
relevant_atlas_pages:
  - hrnet
  - ritm-interactive-segmentation
  - mask-rcnn
  - faster-rcnn
  - deeplab-semantic-segmentation
  - fcn-semantic-segmentation
  - unet-segmentation
  - resnet
  - convolutional-neural-network
  - vgg
  - googlenet
---

# Setting

**Problem class:** General-purpose deep-learning backbone for spatially sensitive visual recognition. The paper is the TPAMI 2020 journal consolidation of the HRNet family — unifying HRNetV1 (pose estimation, CVPR 2019), HRNetV2/V2p (dense-prediction heads, arXiv 2019), and adding ImageNet-1k classification as a fifth downstream evaluation.

**Inputs:** RGB images. Resolution varies by task: 256×192 or 384×288 for pose estimation; 512–2048 px for segmentation; shorter-edge 800 for detection; 224×224 for ImageNet classification.

**Outputs:** Task-dependent:
- HRNetV1: heatmaps at 1/4 input resolution for keypoint detection.
- HRNetV2: dense 15C-dim feature maps (fused all four resolution streams) for per-pixel segmentation.
- HRNetV2p: multi-level FPN-style representation (five levels) for object detection.
- HRNet-C: 2048-dim global vector for ImageNet classification.

**Contributions unique to this journal version (beyond CVPR-2019 HRNetV1 and the V2/V2p arXiv):**
1. **V1/V2/V2p taxonomy canonicalised** — the paper provides the first single-source formal definition of all three head variants and their design rationale.
2. **ImageNet-1k classification results** (new downstream task not in either conference/arXiv version) — see §Numerical sensitivity.
3. **Expanded detection benchmarks** — adds FCOS, CenterNet, Cascade Mask R-CNN, Hybrid Task Cascade in addition to Faster R-CNN.
4. **Training/inference cost analysis** appendix (Appendix C) comparing HRNet vs PSPNet and DeepLabv3 at inference.
5. **Facial landmark detection** results (Appendix D, LIPmax / WFLW / 300W).

# Core idea

HRNet maintains high-resolution feature maps throughout the entire forward pass, rather than encoding to a low-resolution bottleneck and recovering. The network starts from a single high-resolution stream (1/4 input resolution) and adds lower-resolution parallel streams stage by stage (1/8, 1/16, 1/32 at stages 2, 3, 4 respectively). At each stage, multi-resolution fusion units exchange information between all concurrent streams via strided convolutions (high→low) and bilinear up-sampling followed by 1×1 convolution (low→high). This creates a "repeatedly fused multi-resolution" representation where even the low-resolution streams receive gradient signal from spatial detail.

The head variant taxonomy formalised in this paper:

- **HRNetV1** — output = high-resolution stream only (1/4 resolution). Used for pose estimation.
- **HRNetV2** — output = all four resolution streams upsampled to 1/4 and concatenated → 15C channels (C + 2C + 4C + 8C = 15C). Used for segmentation.
- **HRNetV2p** — output = HRNetV2 streams further rescaled to five FPN-style levels (1/4 through 1/64). Used for object detection.
- **HRNet-C** (new in this paper) — output = classification head with cascaded strided bottlenecks collapsing four streams to 1024 channels, then 1×1 to 2048, then global average pool → 2048-dim → classifier.

# Assumptions

1. (hard) Input images must be RGB; single-channel or atypical spectral inputs require re-training.
2. (soft) Performance advantage over encoder-decoder architectures grows with the importance of spatial precision in the target task. On pure image-level classification, the advantage is marginal (see §Failure regime).
3. (soft) The four-stage design assumes that a maximum of 4× resolution factor is sufficient (1/4, 1/8, 1/16, 1/32). Representing global context above 1/32 requires separate modules (ASPP, PPM, OCR).
4. (soft) ImageNet pretraining via the HRNet-C classification head improves fine-grained spatial tasks by ~1 AP point (Table I: ImageNet-pretrained HRNetV1-W32 gains +1.0 AP on COCO pose vs. training from scratch).
5. (hard) The multi-resolution fusion assumes aligned spatial grids between streams; arbitrary-aspect-ratio inputs require careful resizing to maintain this alignment.

# Failure regime

**Classification — HRNet's weakest domain:** When the task does not require spatial precision (i.e., global image-level classification), the high-resolution streams add computation without clear benefit. Table XV (Appendix B) shows that HRNet-C variants are only marginally better than comparable ResNets at similar parameter/FLOP budgets:
- HRNet-W18-C (21.3M params, 3.99G FLOPs): top-1 error 23.1% vs. ResNet-38 (28.3M, 3.80G): 24.6% — HRNet wins but is lighter.
- HRNet-W44-C (21.9M, 3.90G) vs. ResNet-50 (25.6M, 3.82G): 23.0% vs. 23.3% — essentially tied.
- HRNet-W76-C (40.8M, 7.30G) vs. ResNet-101 (44.6M, 7.30G): 21.5% vs. 21.6% — essentially tied at identical FLOPs.
- HRNet-W96-C (57.5M, 10.2G) vs. ResNet-152 (60.2M, 10.7G): 21.0% vs. 21.2% — marginal edge.

**Conclusion from the paper's own framing (§Appendix B):** "One can see that under similar #parameters and GFLOPs, our results are comparable to and slightly better than ResNets." The improvement is consistently present but very small (~0.2–1.5 pp top-1 error reduction). The paper itself frames this as justifying ImageNet pretraining for the backbone, not claiming classification supremacy.

**Alternative head designs underperform the HRNet-C head:** The ablation (Table XVI) shows that naive alternatives — separate per-resolution global pooling and concatenation (HRNet-Ci), or cascaded bottlenecks to 512 and concatenation (HRNet-Cii) — are 1–3 pp worse than the hierarchical cascade head used in HRNet-C.

**Memory at training time for detection:** §8 (Discussion) acknowledges that training memory in object detection is "a little larger" than ResNet baselines due to maintaining high-resolution feature maps throughout.

**Small model, short schedule:** HRNetV2p-W18 underperforms ResNet-50-FPN under 1× schedule for detection (Table VIII, §6); the authors attribute this to insufficient optimisation iterations and note it recovers with longer training.

# Numerical sensitivity

## ImageNet-1k classification (224×224, single-crop, 100 epochs; Table XV, Appendix B)

### Residual branch = two 3×3 convolutions:
| Model         | #Params | GFLOPs | top-1 err | top-5 err |
|---------------|---------|--------|-----------|-----------|
| ResNet-38     | 28.3M   | 3.80   | 24.6%     | 7.4%      |
| HRNet-W18-C   | 21.3M   | 3.99   | **23.1%** | **6.5%**  |
| ResNet-72     | 48.4M   | 7.46   | 23.3%     | 6.7%      |
| HRNet-W30-C   | 37.7M   | 7.55   | **21.9%** | **5.9%**  |
| ResNet-106    | 64.9M   | 11.1   | 22.7%     | 6.4%      |
| HRNet-W40-C   | 57.6M   | 11.8   | **21.1%** | **5.6%**  |

### Residual branch = bottleneck:
| Model         | #Params | GFLOPs | top-1 err | top-5 err |
|---------------|---------|--------|-----------|-----------|
| ResNet-50     | 25.6M   | 3.82   | 23.3%     | 6.6%      |
| HRNet-W44-C   | 21.9M   | 3.90   | **23.0%** | **6.5%**  |
| ResNet-101    | 44.6M   | 7.30   | 21.6%     | 5.8%      |
| HRNet-W76-C   | 40.8M   | 7.30   | **21.5%** | **5.8%**  |
| ResNet-152    | 60.2M   | 10.7   | 21.2%     | 5.7%      |
| HRNet-W96-C   | 57.5M   | 10.2   | **21.0%** | **5.6%**  |

Training: SGD, weight decay 0.0001, Nesterov momentum 0.9, initial LR 0.1 decayed ×10 at epochs 30/60/90, batch size 256. Standard single-crop testing.

## COCO keypoint detection (Table I/II, §4)
- HRNetV1-W32, 256×192: AP **73.4** (val), **74.9** (test-dev)
- HRNetV1-W48, 256×192: AP **74.2** (val)
- HRNetV1-W48, 384×288: AP **76.3** (val), **75.5** (test-dev)
- With AI Challenger extra training data: AP **77.0** (test-dev, single model)

## Semantic segmentation
- Cityscapes test (train+val): HRNetV2-W48 **81.6** mIoU, +OCR **82.5** mIoU (Table IV)
- PASCAL-Context 59 classes: HRNetV2-W48 **54.0**, +OCR **56.2** mIoU (Table V)
- PASCAL-Context 60 classes: HRNetV2-W48 **48.3**, +OCR **50.1** mIoU (Table V)
- LIP human parsing: HRNetV2-W48 **55.90** mIoU, +OCR **56.48** mIoU (Table VI)

## Object detection (Faster R-CNN, COCO test-dev, §6)
- HRNetV2p-W32 vs. ResNet-101-FPN: HRNet superior
- HRNetV2p-W40 vs. ResNet-152-FPN: HRNet superior
- HRNetV2p-W48 vs. ResNeXt-101-64×4d-FPN: HRNet superior at 28e schedule, marginally worse at 20e

## Training details for detection (§6): shorter edge 800, horizontal flip augmentation, MMDetection platform, 2× LR schedule.

# Applicability

- **Use when:** the task requires accurate spatial localisation — keypoint/pose estimation, semantic segmentation, instance segmentation, object detection, facial landmark detection. The multi-resolution parallel design delivers both semantic strength and spatial precision.
- **Use when:** memory budget allows maintaining four concurrent feature-map streams; HRNet activation memory during training is slightly higher than ResNet for detection heads.
- **Use when:** ImageNet pretraining is desired — the HRNet-C head provides a principled pretraining path while keeping the same parallel-stream backbone, giving ~1 AP improvement on downstream spatial tasks.
- **Don't use when:** the downstream task is pure image-level classification — ResNets or EfficientNets are simpler and match HRNet accuracy.
- **Don't use when:** extremely low GFLOPs budgets are required — HRNet-W18 is competitive (23.1% top-1 error on ImageNet), but for pure classification tasks simpler architectures are more practical.
- **Compared against:** ResNet (primary), ResNeXt, VGGNet, GoogLeNet (on ImageNet), PSPNet, DeepLabv3/v3+, U-Net (on segmentation), SimpleBaseline (on pose), Faster R-CNN/Cascade R-CNN/FCOS/CenterNet (on detection).

# Connections

- Builds on: [sun2019-hrnet, sun2019-hrnetv2] — HRNetV1 (CVPR 2019 pose paper) and HRNetV2/V2p head designs (earlier arXiv version)
- Enables: [ritm-interactive-segmentation] — RITM uses HRNet+OCR as its backbone; this paper is the consolidated family reference
- Compared against: ResNet [he2016-resnet], VGGNet [simonyan2014-vgg], GoogLeNet [szegedy2015-googlenet] on ImageNet classification

# Atlas update plan

## UPDATE: hrnet
Reason: this paper is the TPAMI 2020 journal consolidation of the HRNet family, adding ImageNet classification results and expanded downstream benchmarks. To be applied together with `sun2019-hrnetv2` in a single `hrnet` family-page extension.
Relations: (no new typed relations — the existing `feeds_into → ritm-interactive-segmentation` and `compared_with → resnet` edges on the hrnet page already capture the meaningful structure)

Sections to extend (bullets specific to this paper's unique contribution beyond sun2019-hrnetv2):

- **Architecture — Family & shape (canonical taxonomy source):** This paper is the single authoritative source for the V1/V2/V2p taxonomy. V1 = high-res stream only (pose). V2 = all streams fused to 15C (segmentation). V2p = five FPN-style levels (detection). HRNet-C = classification head (cascaded strided bottlenecks to 2048 + GAP; new in this paper).

- **Architecture — ImageNet classification head (new in this paper):** Four resolution streams → per-stream bottleneck to (128, 256, 512, 1024) channels → cascaded 2-strided 3×3 convolutions collapsing to 1024 → 1×1 conv to 2048 → global average pool → 2048-dim → linear classifier. Fig. 11, Appendix B.

- **Assessment — Strengths (ImageNet top-1 accuracy):** HRNet-C variants consistently match or slightly exceed ResNets at equal #params and GFLOPs on ImageNet-1k. Notable: HRNet-W18-C (21.3M, 3.99G FLOPs) achieves 76.9% top-1 vs. ResNet-38 (28.3M, 3.80G) 75.4% — HRNet is more parameter-efficient. HRNet-W76-C matches ResNet-101 at equal 7.30G FLOPs. Numbers from Table XV, Appendix B.

- **Assessment — Limitations:** ImageNet advantage is small (≤1.5 pp top-1) and the network costs more activation memory than ResNets. The HRNet-C classification head is non-standard and not drop-in equivalent to ResNet feature extraction in classification-optimised frameworks.

- **References:** Append arXiv 1908.07919 (this paper) as the journal/primary-reference slot. Antecedents unique to this version not in sun2019-hrnetv2: Cascade R-CNN [cai2018-cascade-rcnn], FCOS [tian2019-fcos], CenterNet [zhou2019-centernet], Hybrid Task Cascade [chen2019-htc], OCR [yuan2020-ocr] — add only if these paper IDs are registered in docs/papers/index.yaml.

## REFS:
- `fcn-semantic-segmentation` — cited as baseline for removing FC layers from VGGNet to obtain segmentation maps (§2, Related Work); also the fully-convolutional approach this paper supersedes spatially.
- `deeplab-semantic-segmentation` — compared against on Cityscapes/PASCAL-Context (Tables III–V); DeepLabv3 is a primary baseline.
- `unet-segmentation` — cited as a representative encoder-decoder "high-resolution recovery" architecture (§1, Fig. 1b); conceptual contrast with HRNet's parallel-streams design.
- `mask-rcnn` — used as one of the joint detection+segmentation evaluation frameworks in §6; HRNetV2p is plugged in as backbone.
- `faster-rcnn` — primary detection framework for HRNetV2p comparison (§6, Table VIII/IX).
- `resnet` — main classification and detection baseline throughout; ImageNet head-to-head in Table XV.
- `convolutional-neural-network` — parent concept; HRNet is a CNN with a novel parallel-multi-resolution structure.
- `vgg` — cited as the prototypical high-to-low series network design being replaced (§1, Abstract).
- `googlenet` — listed alongside AlexNet/VGGNet/ResNet as a prior classification network following the LeNet-5 series design (§1, p1.2).

# Provenance

- Abstract: two-sentence characterisation of HRNet — "Connect the high-to-low resolution convolution streams in parallel; Repeatedly exchange the information across resolutions." Source: HTML §abstract (p. id1.id1).
- §1, S1.p4: "The resulting network consists of several (4 in this paper) stages … the nth stage contains n streams corresponding to n resolutions."
- §3.4, S3 (paraphrased from extracted text): four stages, main body width C/2C/4C/8C, first stage 4 bottleneck residual units, stages 2/3/4 have 1/4/3 modularised blocks, each block branch has 4 residual units of two 3×3 convolutions.
- §4 extracted text: HRNetV1-W32 trained from scratch AP 73.4 (COCO val 256×192); ImageNet-pretrained +1.0 AP; HRNetV1-W48 384×288 AP 76.3 (val), 75.5 (test-dev). AI Challenger extra data: 77.0 AP.
- §4, Table I extracted text: SimpleBaseline ResNet-50 AP 70.4, ResNet-152 AP 72.0 (256×192).
- §5 extracted text (Cityscapes test): HRNetV2-W48 81.6 mIoU, +OCR 82.5 (Table IV).
- §5 extracted text (PASCAL-Context): HRNetV2-W48 54.0/48.3 mIoU (59/60 classes), +OCR 56.2/50.1 (Table V).
- §5 extracted text (LIP): HRNetV2-W48 55.90 mIoU, +OCR 56.48 (Table VI).
- §6 (S6.p5, S6.p6): object detection summary — HRNetV2p outperforms ResNet/ResNeXt at similar params/FLOPs; marginal loss under 20e vs. ResNeXt-101-64×4d-FPN under HTC framework.
- Appendix B (Table XV): ImageNet classification table — all numbers extracted verbatim. Training: 100 epochs, batch 256, SGD LR 0.1 → 0.01 → 0.001 → 0.0001 at epochs 30/60/90, weight decay 0.0001, Nesterov momentum 0.9, single-crop 224×224 test.
- Appendix B (Table XVI): ablation of classification head — HRNet-Ci (separate-stream pool+concat) 26.0% top-1 for W27; HRNet-Cii (cascaded to 512+concat) 24.1% for W25; HRNet-C (proposed) 23.1% for W18 — all at ~21M params.
- §8 (Discussion): "the memory cost of the HRNet for all the three applications … is comparable to state-of-the-arts except that the training memory cost in object detection is a little larger."
- §8 (Future works): OCR [bib.bib170] combined results reported; ASPP/PPM did not improve on Cityscapes but gave slight improvement on PASCAL-Context/LIP (footnote 6).
- §8 (p7): "COCO DensePose challenge winner and almost all the COCO keypoint detection challenge participants adopted the HRNet" (ICCV 2019).
