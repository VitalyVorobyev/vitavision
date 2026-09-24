---
paper_id: poudel2019-fast-scnn
title: "Fast-SCNN: Fast Semantic Segmentation Network"
authors: ["R. P. K. Poudel", "S. Liwicki", "R. Cipolla"]
year: 2019
url: https://arxiv.org/pdf/1902.04502
created: 2026-05-28
refreshed: 2026-09-24
relevant_atlas_pages: [fast-scnn, bisenet, deeplab-semantic-segmentation, segformer, hrnet, fcn-semantic-segmentation, convolutional-neural-network]
---

# Setting

Per-pixel semantic segmentation of high-resolution RGB images in real-time. The primary target domain is urban-scene understanding; all main experiments use Cityscapes at full 1024×2048 px resolution. Input: a single RGB image of arbitrary size. Output: a dense label map assigning one of 19 Cityscapes classes to every pixel. The design constraint is above-real-time throughput on a single GPU, targeting embedded and autonomous-system deployments where semantic segmentation is a preprocessing stage for latency-sensitive downstream tasks.

# Core idea

Fast-SCNN observes that two-branch real-time segmenters (BiSeNet, ContextNet, GUN) each pay the cost of independent initial downsampling in both branches. Because early DCNN layers extract generic low-level features (edges, corners) that are valid to share, Fast-SCNN replaces the two separate prefixes with a single **Learning to Downsample** (LtD) module whose output is simultaneously the spatial-detail skip path and the entry point for the deep global-context branch.

The LtD module consists of exactly three stride-2 layers: one regular Conv2d (3×3, 32 channels) and two depthwise-separable convolutions (DSConv, 3×3, channels 32→48→64). The standard conv is used first because with only 3 input channels DSConv offers negligible savings there. All three layers use stride 2, batch normalization, and ReLU; the nonlinearity between the depthwise and pointwise steps inside each DSConv is omitted following MobileNetV2 convention. After LtD the feature map is at 1/8 of the input resolution (128×256 for a 1024×2048 input) with 64 channels.

The **Global Feature Extractor** (GFE) takes the 1/8-resolution LtD output and applies nine MobileNetV2 inverted-residual bottleneck blocks arranged in three groups (expansion factor t=6 throughout): 3 blocks at 64→64 ch with initial stride 2 (output 1/16), 3 blocks at 64→96 ch with initial stride 2 (output 1/32), 3 blocks at 96→128 ch with stride 1 (stays at 1/32). A Pyramid Pooling Module (PPM) is appended at the end to aggregate multi-scale context. The GFE therefore operates at much lower resolution than the LtD skip path.

The **Feature Fusion Module** (FFM) merges the high-resolution skip from LtD and the upsampled GFE output. On the lower-resolution (GFE) branch: bilinear upsample ×4 to align with the LtD resolution, then dilated depthwise conv (3×3, dilation = upsample factor, stride 1) with nonlinearity f, then pointwise conv (no nonlinearity). On the skip (LtD) branch: pointwise conv (no nonlinearity). Both branches are added, then a final nonlinearity f is applied. The result stays at 1/8 input resolution with 128 channels.

The **Classifier** applies two DSConvs (128 ch) followed by a pointwise Conv2d projecting to 19 classes, then bilinear upsample ×8 back to full resolution. Softmax is used at training time; argmax (Fast-SCNN cls) may be substituted at inference for speed, since both are monotonically increasing.

# Claimed contributions

- C1: Above-real-time accuracy/speed on high-resolution images — "We propose Fast-SCNN, a competitive (68.0%) and above real-time semantic segmentation algorithm (123.5 fps) for high resolution images (1024×2048px)." (§1, "In summary our contributions are")
- C2: Shared learning-to-downsample module — "We adapt the skip connection, popular in offline DCNNs, and propose a shallow learning to downsample module for fast and efficient multi-branch low-level feature extraction." (§1)
- C3: Low-capacity design validated without ImageNet pre-training — "We specifically design Fast-SCNN to be of low capacity, and we empirically validate that running training for more epochs is equivalently successful to pre-training with ImageNet or training with additional coarse data in our small capacity network." (§1)
- C4: Robustness to subsampled input without redesign — "Moreover, we employ Fast-SCNN to subsampled input data, achieving state-of-the-art performance without the need for redesigning our network." (§1, sentence immediately following the numbered contribution list)

# Assumptions

1. Low-level features extracted in the first few layers are general enough to be shared between the spatial-detail and global-context paths. (Soft: the paper empirically validates the LtD skip is beneficial, § 4.2.)
2. A single skip connection at 1/8 resolution is sufficient to preserve object boundary quality. Multiple or denser skip connections would recover more detail at the cost of runtime. (Soft: zeroing the skip drops val mIoU from 69.22% to 64.30%, Table in § 4.2.)
3. The model operates on images in a urban driving distribution (Cityscapes). Transfer to radically different domains (medical, aerial) is not demonstrated.
4. Batch normalization statistics are valid at inference, requiring representative batch statistics during training (batch size 12, § 4.1). Runtime BN folding is expected for embedded deployment.
5. Low model capacity (1.11 M parameters) means the network does not require ImageNet pre-training; in fact, capacity is too low to learn a good ImageNet representation (60.71% top-1, §4.3).

# Failure regime

- **Object boundaries at small-scale**: zeroing the skip connection reduces val mIoU by ~5 pp and qualitatively degrades boundary sharpness and small-object recall (Figure 3, § 4.2). The LtD skip is the primary mechanism for boundary recovery; if it is removed or too heavily regularized, fine boundary detail is lost.
- **Small objects and fine structures**: the global feature extractor operates at 1/32 resolution; objects smaller than roughly 32×32 px in the input may be lost in the GFE and can only be recovered through the skip. This is inherent to the architecture's depth–speed trade-off.
- **Quarter-resolution input degradation**: at 256×512 input, mIoU drops to 51.9% (from 68.0% at full resolution), a 16 pp gap (Table 7, § 4.4). The architecture handles reduced resolution without retraining, but accuracy loss is substantial.
- **Domain shift**: no coarse Cityscapes pre-training or ImageNet pre-training significantly helps (≤+0.6 pp, Table 6, § 4.3); this also implies that for a new target domain the model will need full fine-tuning rather than just classifier replacement.
- **Context at very low resolution**: GFE bottleneck blocks operate at 1/32 of input, so very large-scale context relationships (scene-level layout across the full 2048 px width) are only approximately captured through the PPM pooling.

# Numerical sensitivity

- **Batch normalization**: All activations pass through BN before the nonlinearity (§ 4.1). Depthwise layers skip ℓ₂ regularization (following MobileNetV2); other layers use ℓ₂ = 0.00004 (§ 4.1). Omitting BN or wrong decay on non-depthwise layers will measurably degrade accuracy.
- **Learning rate schedule**: poly schedule, base lr = 0.045, power = 0.9 (§ 4.1). The exponent is sensitive; the paper found this schedule with SGD momentum = 0.9 and batch size = 12. Deviating significantly (e.g., Adam without schedule tuning) may require re-tuning.
- **Training length**: without pre-training, the model needs ~1,000 epochs on Cityscapes to converge to its full accuracy; the pre-trained version reaches comparable accuracy by ~400 epochs (Figure 4, § 4.3). Training fewer epochs from scratch leaves 1–2 pp on the table.
- **Auxiliary losses**: auxiliary cross-entropy heads at the end of LtD and GFE with weight 0.4 are beneficial (§ 4.1). Removing them will degrade training-time gradient signal to the early modules.
- **ReLU vs ReLU6**: the paper finds ReLU trains slightly faster and yields marginally better accuracy than ReLU6 for this architecture, contrary to MobileNet experience (§ 4.1).
- **Dropout**: applied only on the final layer before softmax; broader dropout would hurt the already-low-capacity model.
- **Input resolution**: FPS scales super-linearly — 123.5 fps (1024×2048), 285.8 fps (512×1024), 485.4 fps (256×512) — because the GFE operates at 1/32 of input, so halving input resolution shrinks the most expensive convolutions by 4× (Table 7, § 4.4).

# Applicability

- **Use when**: real-time or above-real-time semantic segmentation is required on high-resolution (≥720p) images; GPU memory is constrained; embedded deployment is the target; training from scratch without ImageNet pre-training is preferred or necessary.
- **Don't use when**: highest possible mIoU is the primary objective (BiSeNet at 71.4% vs Fast-SCNN at 68.0% on Cityscapes test, Table 4); fine-grained small-object segmentation is critical; domain is far from urban driving without access to large fine-annotated domain data.
- **Compared against**: BiSeNet (71.4% mIoU, ~57 fps at 1024×2048); ContextNet (66.1% mIoU, ~42 fps); ICNet (69.5% mIoU, ~30 fps); ENet (58.3% mIoU, ~20 fps); GUN (70.4% mIoU, ~33 fps); SegNet (56.1% mIoU, ~1.6 fps); DeepLab-v2 (70.4% mIoU, offline); PSPNet (78.4% mIoU, offline). All fps figures from Table 5, § 4.2, on Nvidia Titan Xp (Pascal) at 1024×2048 unless noted.

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| bisenet | "The state-of-the-art real-time models (ContextNet [21], BiSeNet [34] and GUN [17]) use two-branch networks. Our learning to downsample module is equivalent to their spatial path, as it is shallow, learns from full resolution, and is used in the feature fusion module... Our global feature extractor module is equivalent to the deeper low-resolution branch of such approaches. In contrast, our global feature extractor shares its computation of the first few layers with the learning to downsample module." (§3.3.1 "Relation with Two-branch Models") | compared_with | high | Peer trade-off, not supersession: Fast-SCNN is faster (123.5 vs 57.3 fps, Table 5) but less accurate (68.0% vs 71.4% mIoU, Table 4). Matches the already-authored `compared_with→bisenet` edge. ContextNet and GUN make the identical collective claim but have no Atlas page and are not registered in `docs/papers/index.yaml` — no edge possible for them. |
| fcn-semantic-segmentation | "Proposed Fast-SCNN can be viewed as a special case of an encoder-decoder framework, such as FCN [29] or U-Net [26]. However, unlike the multiple skip connections in FCN and the dense skip connections in U-Net, Fast-SCNN only employs a single skip connection..." (§3.3.2 "Relation with Encoder-Decoder Models") | feeds_into (A=FCN upstream, authored on FCN's page, target: fast-scnn) | medium | General "special case of" framing rather than a named-component reuse (contrast with the MobileNetV2 row below). Matches this note's own `## UPDATE: fcn-semantic-segmentation` plan below and the edge already present in `content/models/fcn-semantic-segmentation.md`'s reverse `fedBy`. |
| unet-segmentation | Same quote as the FCN row: "...such as FCN [29] or U-Net [26]. However, unlike the multiple skip connections in FCN and the dense skip connections in U-Net, Fast-SCNN only employs a single skip connection." (§3.3.2) | compared_with | low | Single one-line architectural contrast (skip-connection density); no quantitative benchmark row anywhere in the paper pits Fast-SCNN against U-Net directly. No edge currently authored between fast-scnn and unet-segmentation. |
| mobilenetv2 | "We use efficient bottleneck residual block introduced by MobileNet-V2 [28] (Table 2)." (§3.2.2 "Global Feature Extractor") | feeds_into (A=MobileNetV2 upstream, target: fast-scnn) | high | Named-component reuse (inverted-residual bottleneck block forms the entire Global Feature Extractor). Already captured: reverse relations show `fedBy→mobilenetv2` confidence high. |
| — (no Atlas page; PSPNet not registered in `docs/papers/index.yaml`) | "Also, a pyramid pooling module (PPM) [37] is added at the end to aggregate the different-region-based context information." (§3.2.2 "Global Feature Extractor") | feeds_into (A=PSPNet, target: fast-scnn), Rule C named-component lineage | high | Same pattern as the MobileNetV2 row — PSPNet's PPM is a named, direct component of the Global Feature Extractor, not a data-flow or scoring mention. No edge can be authored until PSPNet is ingested and gets a page. |
| deeplab-semantic-segmentation | "While we use 1.11 million parameters, most offline segmentation methods (e.g. DeepLab [4] and PSPNet [37])... require much more than this." (§1 Introduction) plus Table 4: DeepLab-v2 70.4% mIoU / 44M+ params (offline) vs. Fast-SCNN 68.62% mIoU / 1.11M params (§4.2). | compared_with | high | Offline-vs-real-time capacity/accuracy trade-off, empirically tabulated (Table 4). Matches the already-authored `compared_with→deeplab-semantic-segmentation` edge. Citation [4] (Chen et al., DeepLab with atrous convolution + CRFs) is the same paper registered as `chen2018-deeplab`. |
| — (no Atlas page; ContextNet, ICNet, ENet, SegNet, GUN not registered in `docs/papers/index.yaml`) | Quantitative real-time/offline comparison table entries, e.g. "BiSeNet (57.3 fps) and GUN (33.3 fps) are significantly slower than Fast-SCNN (123.5 fps). Compared to ContextNet... Fast-SCNN significantly improves upon state-of-the-art runtime." (§4.2, discussing Tables 4–5) | compared_with (peer, same real-time-segmentation benchmark) | medium | Same "ingest first" gate as the PSPNet row — genuine peer-comparison claims with no resolvable target. |
| — (chronologically impossible; not mentioned in text) | n/a — `grep -i "hrnet\|mobilenetv3\|segformer\|transformer"` over `poudel2019-fast-scnn.txt`/`.html` returns zero hits | none | — | The three currently-authored forward/reverse edges to `hrnet`, `mobilenetv3` (mirrored), and `segformer` are not stated anywhere in this paper. HRNet (Sun et al. 2019) and SegFormer (2021) postdate or are contemporaneous-but-uncited; MobileNetV3 (Howard et al., arXiv May 2019) postdates this paper's Feb 2019 submission. These edges rest on other evidence (editorial/benchmark comparison), not this paper's own positioning — leave as-is, just noting the source of confidence is not this note. |

# Connections

- Builds on: FCN (fully-convolutional dense-prediction framing, skip connections), MobileNetV2 (inverted-residual bottleneck blocks, expansion factor t=6, no nonlinearity before last pointwise conv), PSPNet (Pyramid Pooling Module appended to GFE), BiSeNet / ContextNet / GUN (two-branch real-time segmentation motivation).
- Refutes / supersedes: the claim that ImageNet pre-training is necessary for competitive segmentation accuracy in low-capacity networks; Fast-SCNN trains from scratch to within 0.53 pp of its pre-trained variant (Table 6, § 4.3).

# Atlas update plan

## NEW: fast-scnn
Type: model
Category: segmentation
Primary source: this paper (poudel2019-fast-scnn)

- **Motivation**: real-time semantic segmentation of high-resolution images (1024×2048 px) for autonomous systems and embedded devices. Prior two-branch methods (BiSeNet, ContextNet) pay duplicate downsampling costs in both branches; Fast-SCNN eliminates this by sharing the early layers through the "Learning to Downsample" (LtD) module — its output serves as both the spatial-detail skip and the input to the deep global-context branch.
- **Architecture**: four sequential modules.
  - *Learning to Downsample (LtD)*: Conv2d 3×3 stride-2 (32 ch) + DSConv 3×3 stride-2 (48 ch) + DSConv 3×3 stride-2 (64 ch). Output at 1/8 input resolution. Features shared between skip path and GFE.
  - *Global Feature Extractor (GFE)*: nine MobileNetV2 inverted-residual bottleneck blocks (all t=6): 3× (64→64, init stride 2), 3× (64→96, init stride 2), 3× (96→128, stride 1). Followed by a Pyramid Pooling Module. Operates down to 1/32 resolution.
  - *Feature Fusion Module (FFM)*: bilinear upsample ×4 of GFE + dilated DWConv + 1×1 conv on GFE side; 1×1 conv on LtD skip side; element-wise add + ReLU. Fused at 1/8 resolution, 128 channels.
  - *Classifier*: 2× DSConv (128 ch) + Conv2d 1×1 (19 ch) + bilinear upsample ×8 to full resolution. Softmax (training) or argmax (inference cls mode).
  - Total: 1.11 M parameters.
- **Implementations**: original TensorFlow implementation by authors (Toshiba Research Europe); PyTorch re-implementations available in community segmentation toolboxes (e.g., pytorch-fast-scnn on GitHub, license varies by fork — verify before use).
- **Assessment**: 68.0% mIoU at 123.5 fps on Cityscapes test at 1024×2048 on Nvidia Titan Xp (Pascal) (Table 5, §4.2). Roughly 2× faster than BiSeNet with ~3.4 pp lower mIoU. 1.11 M parameters vs BiSeNet's 5.8 M (5× smaller). ImageNet pre-training not necessary (+0.53 pp only, Table 6 §4.3). Degrades to 62.8% mIoU at 285.8 fps (512×1024) and 51.9% at 485.4 fps (256×512) without retraining (Table 7, §4.4). Strongest weakness: small objects and fine boundaries depend critically on the single skip connection.

Relations:
- { type: compared_with, target: bisenet, confidence: high }
- { type: compared_with, target: deeplab-semantic-segmentation, confidence: high }
- { type: compared_with, target: segformer, confidence: medium }
- { type: compared_with, target: hrnet, confidence: medium }

## UPDATE: fcn-semantic-segmentation
Section: Relations

- Add forward edge: `{ type: feeds_into, target: fast-scnn, confidence: medium }`. FCN (Long et al., 2015) established the fully-convolutional dense-prediction template — encoder features passed through a learned decoder with a single skip connection to recover spatial detail at full resolution. Fast-SCNN (2019) directly inherits this structural pattern: its LtD skip path is explicitly described as a reinterpretation of FCN's skip connection (§ 3.3.2), and its classifier head emits dense per-pixel logits upsampled to full input resolution following the FCN pipeline; chronology 2015 ≤ 2019 holds.

# Provenance

- Abstract (§ Abstract): "68.0% mean intersection over union at 123.5 frames per second on Cityscapes" at "1024×2048px".
- §1 Introduction, paragraph 4: "1.11 million parameters"; "twice as fast as prior art i.e. BiSeNet (71.4% mIoU)".
- §1 Introduction, paragraph 5: "results only insignificantly improve with pre-training or additional coarsely labeled training data (+0.5% mIoU on Cityscapes)".
- Table 1 (§3): Full architecture table — LtD rows (Conv2D c=32 s=2, DSConv c=48 s=2, DSConv c=64 s=2); GFE rows (bottleneck t=6 c=64 n=3 s=2; bottleneck t=6 c=96 n=3 s=2; bottleneck t=6 c=128 n=3 s=1; PPM); FFM row; Classifier rows (DSConv n=2 s=1; Conv2D c=19 s=1).
- Table 2 (§3.2.2): Bottleneck residual block steps — Conv2D 1×1 (expand to tc), DWConv 3×3/s (spatial mixing), Conv2D 1×1 (project to c′, no nonlinearity).
- Table 3 (§3.2.3): FFM steps — upsample ×X on low-res branch; DWConv (dilation X) 3×1 with f; Conv2D 1×1 (no nonlinearity); Conv2D 1×1 (no nonlinearity) on high-res branch; add + f.
- §3.2.1: "three layers"; "first layer is a standard convolutional layer (Conv2D)… remaining two layers are depthwise separable"; "All three layers … use stride 2, followed by batch normalization and ReLU"; kernel size 3×3; "omit the nonlinearity between depthwise and pointwise convolutions".
- §3.2.2: GFE input is "1/8-resolution of the original input"; uses "efficient bottleneck residual block introduced by MobileNet-V2"; PPM added at end.
- §3.3.1: LtD shares first few layers with GFE; GFE uses 1/8-resolution vs prior-art 1/4-resolution for global branch.
- §3.3.2: "Fast-SCNN can be viewed as a special case of an encoder-decoder framework, such as FCN"; "only employs a single skip connection".
- §4.1 (Implementation): SGD, momentum 0.9, batch 12; poly lr base 0.045 power 0.9; ℓ₂ = 0.00004 (non-depthwise layers); 1,000 training epochs; auxiliary losses weight 0.4; data augmentation (random resize 0.5–2, crop, flip, color noise, brightness); ReLU preferred over ReLU6.
- Table 4 (§4.2): Cityscapes test mIoU — Fast-SCNN 68.0% class / 84.7% category, 1.11 M params; BiSeNet 71.4%, 5.8 M; ContextNet 66.1%, 0.85 M; DeepLab-v2 70.4%, 44+M; PSPNet 78.4%, 65.7 M; ENet 58.3%, 0.37 M; ICNet 69.5%, 6.68 M.
- Table 5 (§4.2): FPS at 1024×2048 (Titan Xp): Fast-SCNN cls* 123.5, Fast-SCNN prob* 106.2; BiSeNet* 57.3; GUN* 33.3; ContextNet 41.9; ENet 20.4; ICNet 30.3; SegNet 1.6. Asterisk (*) = Titan Xp (Pascal, 3,840 CUDA cores); others on Titan X (Maxwell, 3,072 CUDA cores).
- Table 6 (§4.3): Cityscapes val mIoU — Fast-SCNN 68.62%; + ImageNet 69.15% (+0.53 pp); + Coarse 69.22% (+0.60 pp); + Coarse + ImageNet 69.19%.
- §4.2: "mIoU reduced from 69.22% to 64.30% on the validation set" when skip connection is zeroed (ablation).
- §4.3: ImageNet top-1 accuracy of Fast-SCNN: 60.71% top-1, 83.0% top-5.
- Table 7 (§4.4): mIoU vs FPS at sub-resolutions — 1024×2048: 68.0%/123.5 fps; 512×1024: 62.8%/285.8 fps; 256×512: 51.9%/485.4 fps (all Titan Xp cls mode).
