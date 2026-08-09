---
paper_id: potje2024-xfeat
title: "XFeat: Accelerated Features for Lightweight Image Matching"
authors: ["G. Potje", "F. Cadar", "A. Araujo", "R. Martins", "E. R. Nascimento"]
year: 2024
url: https://arxiv.org/pdf/2404.19174
created: 2026-05-01
relevant_atlas_pages: [xfeat]
---

# Setting

**Problem class.** Joint detection and description of local features in full-resolution grayscale images for relative pose estimation, visual localisation, and homography estimation, under a strict CPU compute budget. The distinguishing constraint is hardware-agnostic deployment: the model must run in real-time on a budget-grade laptop CPU (Intel i5-1135G7 @ 2.40 GHz) at VGA resolution without hardware-specific compilation or quantisation.

**Inputs.** Single-channel grayscale image $I \in \mathbb{R}^{H \times W \times 1}$. No calibration, no depth, no stereo pairing at inference time. The backbone is resolution-agnostic (fully-convolutional) but benchmarked at $800 \times 600$ (training) and VGA $640 \times 480$ (speed reporting). For XFeat* (semi-dense), the same model is run at two scales (internal rescales to $0.65\times$ and $1.3\times$) using a single pretrained checkpoint.

**Outputs.** Three simultaneous outputs from one forward pass:

1. **Keypoint logit map** $K \in \mathbb{R}^{H/8 \times W/8 \times 65}$ — 64 intra-cell positions + 1 dustbin, on a parallel branch that does not share the descriptor encoder.
2. **Dense descriptor map** $F \in \mathbb{R}^{H/8 \times W/8 \times 64}$ — L2-normalised 64-D feature vectors from a multi-scale fusion of backbone stages at $\{1/8, 1/16, 1/32\}$ resolution.
3. **Reliability map** $R \in \mathbb{R}^{H/8 \times W/8}$ — per-location matching confidence, supervised by dual-softmax probabilities during training.

An optional fourth output at inference time (XFeat* mode): an MLP refines coarse nearest-neighbour matches to pixel-level offsets within an $8 \times 8$ grid, consuming only the coarse 64-D descriptors, not high-resolution feature maps.

**Guarantees.** No geometric guarantees. Descriptor discriminability is empirically validated on MegaDepth-1500, ScanNet-1500, HPatches, and Aachen Day-Night, but not formally bounded. The reliability map correlates with matching confidence under training distribution but is not a calibrated probability.

# Core idea

XFeat identifies spatial resolution of early convolutional layers as the primary FLOP bottleneck in local feature CNNs (Eq. 1 of the paper: $F_{ops} = H_i \cdot W_i \cdot C_i \cdot C_{i+1} \cdot k^2$). The resolution $H_i \times W_i$ is large in early layers — so minimising channel count $C_i$ there minimises compute at lowest cost to representational capacity. The conventional VGG-style response is to halve channels when halving resolution, producing a constant-FLOPs backbone; XFeat instead **triples** the channel count on each spatial halving, producing an asymmetric schedule $\{4, 8, 24, 64, 64, 128\}$ that starves early (high-resolution, high-FLOPs) stages and concentrates depth in later (low-resolution, low-FLOPs) stages. This is confirmed by the ablation (Table 5, row ii): halving the last three blocks' channels to 32 degrades AUC@5° from 42.6 to 37.4 on MegaDepth-1500 sparse.

The second structural departure from SuperPoint is the **decoupled keypoint head**. SuperPoint applies its detector head to the shared encoder output: the same deep features that must be discriminative for description must also localise keypoints. For a compact backbone, this conflicts — the ablation (Table 5, row iii) shows that jointly training a descriptor and keypoint regressor on a single compact encoder degrades XFeat* from 50.2 to 39.7 AUC@5° (dense setting). XFeat's keypoint head operates on a **parallel branch**: the $H \times W$ input is unfolded into $8 \times 8$ pixel blocks, reshaped into a $H/8 \times W/8 \times 64$ tensor of raw pixel values, then passed through four $1 \times 1$ convolutions to produce the 65-way classification over intra-cell positions (§3.2, Figure 3). The keypoint head's receptive field is exactly 8 pixels — capturing only low-level corner/blob/line structures — while the descriptor encoder reaches $H/32$ depth with a large receptive field.

The keypoint head is trained by **knowledge distillation** from ALIKE-tiny (Eq. 6): teacher keypoint coordinates are mapped to a linear index within each $8 \times 8$ cell and the NLL loss is applied over the 65-way softmax. The choice of ALIKE-tiny as teacher (rather than a hand-crafted detector) is strategic: the smaller backbone concentrates on low-level structures aligned with the keypoint head's 8-pixel receptive field (§3.3).

For semi-dense matching (XFeat*), an MLP receives the concatenated 64-D descriptor pair $(f_a, f_b)$ from a coarse nearest-neighbour match and outputs logits $\mathbf{o} \in \mathbb{R}^{64}$ reshaped to an $8 \times 8$ offset grid. The pixel-level match is recovered as:

$$
(x, y) = \arg\max_{i, j \in \{1,\ldots,8\}} \mathbf{o}(i, j), \quad \mathbf{o} = \mathrm{reshape}_{8 \times 8}\bigl(\mathrm{MLP}(\mathrm{concat}(f_a, f_b))\bigr).
$$

The MLP costs an additional 11% inference time over MNN matching for 10,000 descriptor pairs (§4.4 / Fig. 7), negligible because it never accesses high-resolution feature maps.

# Assumptions

1. (hard) Input is grayscale. The backbone has $C = 1$ input channel; RGB images must be converted.
2. (hard) The scene contains matchable texture at $H/8 \times W/8$ resolution or finer. Uniformly textureless regions return low reliability scores but no failure signal beyond zero matches.
3. (soft) Homographic correspondence is sufficient supervision for the descriptor head. Training uses MegaDepth (real 3D depth-guided correspondences, 60% of data) mixed with synthetically warped COCO pairs (40%). Ablation (Table 5, row i) shows the synthetic warp component is critical for XFeat* (AUC@5° drops from 50.2 to 33.9 without it), confirming that the training distribution matters.
4. (soft) The keypoint teacher (ALIKE-tiny) produces reliable corner/blob/line labels in the training domains. The keypoint head's recall ceiling is bounded by ALIKE-tiny's bias: if a scene type lacks structures detected by ALIKE-tiny (e.g. very smooth surfaces, infrared imagery), the keypoint head's coverage degrades.
5. (soft) Descriptor discriminability generalises across rotation ranges not seen during training. The paper does not characterise rotation robustness explicitly; training homographies include moderate rotations. Performance on extreme out-of-plane rotation is not reported.
6. (soft) $H/8 \times W/8$ descriptor resolution provides sufficient spatial granularity for the downstream task. For very narrow-baseline matching at sub-pixel accuracy, the $1/8$ resolution floor imposes a minimum matching error of 8 pixels before refinement (the MLP offset is confined to the $8 \times 8$ cell).

# Failure regime

- **Repetitive texture without low-level structure.** Ablation §4.4 identifies this as the primary limitation of distillation-based keypoint learning: the ALIKE-tiny teacher's bias toward corners/blobs/lines means that structurally repetitive textures (regular grids, fabric, foliage) produce low-confidence keypoints and sparse inliers. Reported as degradation in MIR (mean inlier ratio) on such scenes.
- **Subpixel accuracy ceiling.** The descriptor and reliability map are computed at $H/8 \times W/8$; interpolation of descriptors to sparse keypoint locations is bicubic. The refinement MLP localises within an $8 \times 8$ intra-cell grid, but the coarse match must be correct to the right cell first. For tasks requiring sub-pixel localisation (calibration board detection, feature-based odometry), the error floor is higher than SIFT (which performs scale-space sub-pixel refinement) and comparable to SuperPoint.
- **Fixed descriptor dimensionality at 64-D.** Compact descriptors cause a measurable accuracy drop at wide baselines: XFeat sparse AUC@5° is 42.6 vs. DISK's 53.8 on MegaDepth-1500 (Table 1). The 64-D ceiling is architectural, not hyperparameter-tunable at inference time.
- **Extremely resource-constrained embedded hardware.** On an Orange Pi Zero 3 (Cortex-A53, ARM, $28 board) at $480 \times 360$, XFeat runs at 1.8 FPS and SuperPoint at 0.16 FPS (Supplementary §C). While XFeat is the only learned method breaking 1 FPS on this device, 1.8 FPS remains below real-time for live video; truly latency-critical embedded deployments may need ORB (44.3 FPS on an i5 CPU, Table 1).
- **Night-to-day localisation gap vs. DISK.** On Aachen Day-Night (Table 4), XFeat matches SuperPoint at all thresholds but DISK achieves 89.8% at 0.5m, 5° (night) vs XFeat's 89.8% — tied at that threshold, but DISK shows stronger coverage at the tighter 0.25m, 2° threshold (83.7 vs. 77.6 for night scenes).
- **Match refinement degrades without semi-dense extraction.** The MLP refinement module (Eq. 2) is designed for paired $8 \times 8$ coarse matches. When XFeat is run in sparse mode (without multi-scale re-extraction of XFeat*), the refinement step is not used. AUC improvements from refinement are not additive with sparse extraction (ablation Table 5, row iv: removing refinement drops XFeat* from 50.2 to 38.6).

# Numerical sensitivity

- **Triple-rate channel schedule sensitivity.** The specific schedule $\{4, 8, 24, 64, 64, 128\}$ is the result of empirical search, not a theorem. The ablation tests only the "halve last three blocks" variant. Intermediate schedules (e.g. $\{4, 8, 16, 48, 96, 128\}$) are not reported; robustness to schedule variation is unknown.
- **Keypoint score threshold.** At inference, sparse keypoints are extracted as $\text{score}_{i,j} = K_{i,j} \cdot R_{i,j}$ (keypoint confidence times reliability). The threshold on this combined score is a hyperparameter not fixed in the paper; the reported results use top-$N$ extraction (4096 for sparse, 10000 for semi-dense) rather than a fixed threshold, so the effective threshold varies with scene content.
- **Dual-softmax temperature.** The descriptor loss (Eq. 3) uses raw dot-product similarities as logits with no explicit temperature parameter; the training learning rate and batch size implicitly set the scale. The paper does not report sensitivity to temperature or whether a learnable temperature was considered.
- **Reliability map calibration.** The reliability map $R$ is supervised via $L_1$ loss against dual-softmax confidence products (Eq. 4). In practice this means $R$ is not a calibrated probability; using $R$ as a threshold for filtering matches requires empirical calibration per scene type.
- **Multi-scale extraction in XFeat*.** The two scale factors ($0.65\times$ and $1.3\times$) are fixed; changing the scale pair would affect coverage and inlier count. The paper reports no sensitivity analysis on scale factor choice.
- **Matching precision at $H/8$ resolution.** The refinement MLP produces an offset within an $8 \times 8$ grid of pixels at the original resolution. For images where $H/8$ is small (e.g. $80 \times 60$ for $640 \times 480$ VGA), the spatial sampling is coarse and the refinement offset covers the full $8 \times 8$ cell = one full descriptor cell's span.

# Applicability

- Use when: CPU-grade or embedded deployment is required and a learned detector+descriptor is needed. XFeat is the only learned method achieving >1 FPS on a $28 ARM Cortex-A53 board at VGA resolution (Supplementary §C).
- Use when: semi-dense matching is needed on resource-constrained hardware. XFeat* at 19.2 FPS on an i5-1135G7 CPU is the only semi-dense method capable of operating in real-time without GPU on budget hardware (vs. LoFTR, which requires GPU for practical throughput).
- Use when: replacing ORB or hand-crafted features in an existing pipeline is the goal. XFeat's Apache-2.0 license, compact checkpoint (6.0 MB), and standard PyTorch interface make drop-in replacement straightforward.
- Use when: descriptor size is constrained (64-D vs. SIFT/SuperPoint's 128/256-D). At 64 dimensions, MNN matching at $H/8 \times W/8$ grid density is bandwidth-efficient for large-scale SfM retrieval.
- Don't use when: maximum absolute pose accuracy is required regardless of latency. DISK achieves AUC@5° 53.8 vs XFeat's 42.6 (Table 1, MegaDepth-1500 sparse); LoFTR and ASpanFormer reach still higher accuracy at ~5-10 FPS on GPU.
- Don't use when: subpixel keypoint localisation accuracy is the primary requirement (calibration, metrology). SIFT's scale-space sub-pixel interpolation and ROCHADE's cone-filter saddle fit provide analytically bounded localisation; XFeat's $H/8$ grid and 8-pixel offset cell do not.
- Don't use when: the scene type is strongly out-of-distribution from MegaDepth + COCO (e.g. underwater, medical, satellite). No domain-generalisation evaluation beyond Aachen and ScanNet is reported.
- Compared against (paper's own experiments):
  - **SuperPoint** [7] — direct architectural ancestor. XFeat sparse: 9× faster (27.1 vs 3.0 FPS), AUC@5° 42.6 vs 37.3 (Table 1). XFeat* on ScanNet-1500: AUC@5° 18.4 vs 12.5 (Table 2). SuperPoint uses a shared VGG encoder (8 layers, 256-D descriptors, ~1.3M params); XFeat separates keypoint head from descriptor encoder and uses 64-D descriptors.
  - **ALIKE** [46] — nearest prior in the fast-learned-feature class. XFeat: 5× faster (27.1 vs 5.3 FPS), AUC@5° 42.6 vs 49.4 (Table 1). XFeat trades ~7 AUC points for 5× throughput. ALIKE uses the original image resolution for its final feature map, which constrains compute; XFeat keeps features at $H/8$.
  - **DISK** [42] — highest-accuracy CNN baseline. XFeat sparse: 22× faster, AUC@5° 42.6 vs 53.8 (Table 1). XFeat*: 16× faster, AUC@5° 50.2 vs 55.2 (semi-dense). DISK uses policy-gradient training and 128-D descriptors; XFeat uses supervised dual-softmax and 64-D.
  - **ORB** [34] — fastest hand-crafted baseline. ORB: 44.3 FPS CPU (no GPU needed, no training) but AUC@5° 17.9 vs XFeat's 42.6 (Table 1). ORB binary descriptors (256-b) match faster but with lower discriminability; XFeat floating-point 64-D descriptors at 27.1 FPS dominate on accuracy while remaining real-time CPU.
  - **SiLK** [9] — another recent efficient learned approach. SiLK: 2.8 FPS, AUC@5° 14.7 (Table 1). SiLK's dependence on original image resolution for feature extraction makes it slower than XFeat despite comparable parameter counts.

# Connections

- Builds on:
  - `detone2018-superpoint` — primary architectural ancestor. XFeat inherits the cell + dustbin keypoint output convention ($H/8 \times W/8$ grid, 65-way classification) and the fully-convolutional two-head paradigm. The key departures are: (a) the keypoint head is decoupled from the descriptor encoder; (b) the descriptor encoder uses triple-rate channel scaling instead of VGG double-rate; (c) descriptors are 64-D instead of 256-D; (d) training uses supervised correspondences (MegaDepth + synthetic COCO) rather than self-supervised Homographic Adaptation; (e) the keypoint head is trained by distillation from ALIKE-tiny rather than from MagicPoint pseudo-labels.
  - ALIKE (Zhao et al., 2022) [46] — teacher for keypoint distillation. ALIKE-tiny's keypoint positions supervise XFeat's keypoint head via NLL distillation (Eq. 6). Not yet in `docs/papers/index.yaml`.
  - Feature Pyramid Networks (Lin et al., 2017) [19] — multi-scale descriptor fusion at $\{1/8, 1/16, 1/32\}$ spatial resolutions follows the FPN pattern. Not yet indexed.
  - VGG (Simonyan & Zisserman, 2014) [39] — the reference backbone architecture that XFeat explicitly departs from in channel scheduling (§3.1). Not yet indexed.

- Enables (in the atlas):
  - `xfeat` — primary source.
  - Potential survey concept page: a page covering learned interest-point matching methods (SuperPoint, XFeat, and successors such as R2D2, DISK, ALIKE) is now a viable concept-page candidate — see Atlas update plan below.

- Refutes / supersedes:
  - SuperPoint in the hardware-constrained deployment regime: XFeat sparse is 9× faster at comparable or better accuracy on MegaDepth and ScanNet (Tables 1–2). The paper explicitly frames XFeat as a replacement for SuperPoint on resource-limited platforms (§2, §5).
  - ALIKE in the fast-learned-feature class: XFeat is 5× faster than ALIKE (the previous fastest learned method) with competitive accuracy on all benchmarks (Tables 1–3).

# Atlas update plan

## UPDATE: xfeat

The existing `content/models/xfeat.md` page is substantive and well-grounded. The frontmatter notes block (§3.1–§3.3 equations, training details, benchmark table references) and the body (Motivation, Architecture, Assessment) are accurate and internally consistent. The following targeted additions would strengthen the page.

### Section: `# Architecture` — Blocks sub-block

- The current description of the keypoint head correctly identifies the "direct unfold of the 8×8 image grid into a 64-channel tensor, then applies four 1×1 convolutions." Add a one-sentence motivation: the 8-pixel receptive field is deliberate — it aligns with the low-level corner/blob/line structures ALIKE-tiny detects, making the distillation signal reliable (§3.2 paragraph on "key insight," §3.3 on distillation rationale).
- The paper confirms the backbone has **23 convolutional layers** total (Supplementary Fig. 6 caption: "Our backbone is comprised of 23 convolutional layers"). The current page does not state this count; it is the only layer-count figure in the paper and useful for deployment sizing.
- One skip connection (AvgPool 4×4 + 1×1 conv) is incorporated in the final backbone design (Supplementary §A: "Preliminary experiments revealed that adding a single skip connection to the model as shown in Fig. 6 slightly increased performance"). This detail is absent from the current page; it explains why the backbone is not a pure feedforward stack.

### Section: `# Architecture` — Training sub-block

- The paper reports training convergence at 160,000 iterations, 36 hours on a single RTX 4090 at 6.5 GB VRAM (§B). The current page correctly states these figures.
- The batch size is 10 image pairs (§B, §4 Training paragraph). The current page does not state this; it is useful for reproducing the training setup.
- The training data mix is 6:4 MegaDepth/synthetic-COCO, with MegaDepth images resized such that maximum dimension is 1200 pixels for evaluation (§4.1) and $800 \times 600$ for training (§B). The current page states "$800 \times 600$" for training — correct.

### Section: `# Assessment` — Novelty sub-block

- Strengthen the bullet on keypoint head decoupling: "XFeat's keypoint head is decoupled from the descriptor encoder via a parallel branch operating on raw $8 \times 8$ pixel blocks; the ablation (Table 5, row iii) shows that a shared encoder degrades XFeat* from AUC@5° 50.2 to 39.7 on MegaDepth-1500 dense — the structural departure from SuperPoint is load-bearing, not cosmetic."
- Add a bullet on the triple-rate channel schedule ablation: "Halving the last three encoder blocks' channels from 64 to 32 (Table 5, row ii) drops sparse AUC@5° from 42.6 to 37.4, confirming that channel count at late stages — not early stages — is the accuracy-limiting resource."

### Section: `# Assessment` — Strengths sub-block

- Add the ScanNet-1500 result with the "no retraining" qualifier: XFeat*/XFeat AUC@5°/@10°/@20° = 18.4/32.6/47.8 vs. SuperPoint 12.5/24.4/36.7 and DISK-4k 9.6/19.3/30.4 (Table 2). The current page correctly cites these figures for XFeat*.
- Add the embedded device result: "On an Orange Pi Zero 3 (Cortex-A53 ARM, $28), XFeat achieves 1.8 FPS at $480 \times 360$ — the only learned method exceeding 1 FPS on this class of device without hardware-specific optimisation (Supplementary §C, SuperPoint: 0.16 FPS, ALIKE: 0.58 FPS)."

### Section: `# Assessment` — Limitations sub-block

- Strengthen the keypoint-distillation limitation: "The keypoint head is trained by distillation from ALIKE-tiny; its recall ceiling is bounded by the teacher's bias toward low-level corner/blob/line structures. The paper identifies repetitive texture without such structures as an explicitly ablation-identified weak regime (§4.4)." The current page mentions this but without citing the specific ablation section.

### Section: `# References`

- Once `content/models/superpoint.md` exists as a non-draft, add entry 2 for SuperPoint (replacing any placeholder). As the direct architectural ancestor, it warrants explicit placement in the reference list. The current page already cites DeTone 2018 as reference entry 2.

### Comparison policy — `relations[type=compared_with]`

The `xfeat` page currently has no `compared_with` entry in `relations[]`. The most important comparison edge is `xfeat ↔ superpoint`:
- SuperPoint is the older paper (2018 vs. 2024) → SuperPoint hosts the `## When to choose SuperPoint over XFeat` section, per the "older paper hosts" tiebreaker.
- Preconditions for authoring comparison content: `docs/research/notes/detone2018-superpoint.md` ✓ exists; `docs/research/notes/potje2024-xfeat.md` ✓ exists (this note). Both required research notes are now present — the comparison section can be written when the `superpoint` model page is authored.
- The non-host page (`xfeat`) should carry a single Remarks bullet: "Compared with SuperPoint: see [When to choose SuperPoint over XFeat](/atlas/superpoint#when-to-choose-superpoint-over-xfeat). SuperPoint hosts the comparison as the older paper."

**Survey concept page candidate.** With research notes for both `detone2018-superpoint` (2018) and `potje2024-xfeat` (2024) now complete, and given that ALIKE, R2D2, and DISK are referenced in `content/models/xfeat.md`, the prerequisites for a survey concept page on learned local feature matching are approaching. The page criterion requires ≥3 surveyed methods' primary papers to have research notes before drafting. At present, two of three required notes exist. Flag: when a third learned-feature method's note is ingested (ALIKE, DISK, or R2D2), the survey page `learned-local-feature-matching` becomes a viable concept-page candidate covering SuperPoint, XFeat, and at minimum one additional method with a decision table.

# Provenance

Paper source: `docs/papers/.cache/potje2024-xfeat.txt` (arXiv:2404.19174v1, 14 pages main + supplementary, CVPR 2024).

Key section and equation citations:

- Abstract: "up to 5× faster" than ALIKE; "surpassing current deep learning-based local features in speed with comparable or better accuracy." Framing: hardware-agnostic, CPU-grade deployment.
- §3.1 (pp. 3–4): Featherweight backbone. Eq. 1: $F_{ops} = H_i \cdot W_i \cdot C_i \cdot C_{i+1} \cdot k^2$. Triple-rate channel schedule $\{4, 8, 24, 64, 64, 128\}$; six basic blocks halving resolution per block; basic layer = 2D conv $k \in \{1, 3\}$ + ReLU + BatchNorm; stride 2 for spatial halving. Quote: "we propose tripling the channel count as the spatial resolution decreases, until a sufficient number of channels is reached (usually 128 for local feature backbones)."
- §3.2 (p. 4): Local Feature Extraction. Descriptor head: FPN-style merge at $\{1/8, 1/16, 1/32\}$, bilinear upsample + element-wise sum, fusion block → $F \in \mathbb{R}^{H/8 \times W/8 \times 64}$. Reliability head: $R \in \mathbb{R}^{H/8 \times W/8}$ from additional convolutional block. Keypoint head: unfold $8 \times 8$ blocks → reshape to $H/8 \times W/8 \times 64$; four $1 \times 1$ conv layers → $K \in \mathbb{R}^{H/8 \times W/8 \times 65}$ (64 positions + dustbin). Dense matching: MLP on $\mathrm{concat}(f_a, f_b) \in \mathbb{R}^{128}$ → 64 logits → reshape $8 \times 8$ → $(x, y) = \arg\max$ (Eq. 2). Refinement cost: 11% overhead over MNN for 10,000 pairs.
- §3.3 (p. 5): Training. Dual-softmax descriptor loss $\mathcal{L}_{ds}$ (Eq. 3). Reliability $L_1$ loss $\mathcal{L}_{rel}$ (Eq. 4). Fine-offset NLL $\mathcal{L}_{fine}$ (Eq. 5). Keypoint NLL $\mathcal{L}_{kp}$ distilled from ALIKE-tiny (Eq. 6). Combined: $\mathcal{L} = \alpha \mathcal{L}_{ds} + \beta \mathcal{L}_{rel} + \gamma \mathcal{L}_{fine} + \delta \mathcal{L}_{kp}$ (Eq. 7). Dataset: MegaDepth + synthetic-COCO 6:4, resized $800 \times 600$. Optimiser: Adam, lr $3 \times 10^{-4}$, decay $0.5$ per 30k steps. 160k iterations, 36 h on RTX 4090, 6.5 GB VRAM.
- §4 + Table 1 (p. 6): MegaDepth-1500 relative pose. XFeat: AUC@5°/10°/20° = 42.6/56.4/67.7, 27.1 FPS. XFeat*: 50.2/65.4/77.1, 19.2 FPS. SuperPoint: 37.3/50.1/61.5, 3.0 FPS. DISK: 53.8/65.9/75.0, 1.2 FPS. ALIKE: 49.4/61.8/71.4, 5.3 FPS. ORB: 17.9/27.6/39.0, 44.3 FPS.
- Table 2 (p. 6): ScanNet-1500. XFeat/XFeat*: AUC@5°/10°/20° = 16.7/32.6/47.8 and 18.4/34.7/50.3. SuperPoint: 12.5/24.4/36.7. DISK-4k: 9.6/19.3/30.4.
- Table 3 (p. 7): HPatches homography MHA. XFeat viewpoint @3/5/7 px: 68.6/81.1/86.1. SuperPoint: 71.1/79.6/83.9. DISK: 66.4/77.5/81.8. XFeat illumination @3/5/7 px: 95.0/98.1/98.8.
- Table 4 (p. 7): Aachen Day-Night visual localisation. XFeat day 0.5m/5°: 91.5%; night 0.5m/5°: 89.8% (matches DISK on night threshold). SuperPoint night 0.5m/5°: 85.7%.
- Table 5 (p. 7): Ablation. Default XFeat/XFeat* AUC@5° = 42.6/50.2. (i) No synthetic data: 41.5/33.9. (ii) Smaller model (halve last 3 block channels): 37.4/40.7. (iii) Joint keypoint extraction (SuperPoint-style on encoder): 42.9/39.7. (iv) No match refinement: -/38.6.
- Supplementary §A (p. 11): 23 convolutional layers total. Single skip connection (AvgPool 4×4 + 1×1 conv) incorporated after empirical performance gain.
- Supplementary §B (p. 11): Batch size 10. Adam lr $3 \times 10^{-4}$, decay 0.5 per 30k steps, 160k iterations. Disk I/O is the training bottleneck (loading MegaDepth original-resolution images + depth maps).
- Supplementary §C (p. 11): Orange Pi Zero 3 (Cortex-A53, $28) at $480 \times 360$: XFeat 1.8 FPS, SuperPoint 0.16 FPS, ALIKE 0.58 FPS.
- Figure 3 caption (p. 4): "Contrary to typical methods, it separates keypoint detection into a distinct branch, using 1×1 convolutions on an 8×8 tensor-block-transformed image for fast processing."
- §4.4 Ablation (p. 8): "joint training a descriptor and a keypoint regressor within a single neural network backbone significantly degrades the performance of semi-dense matching for compact CNN architectures."
