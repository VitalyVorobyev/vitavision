---
paper_id: xie2021-segformer
title: "SegFormer: Simple and Efficient Design for Semantic Segmentation with Transformers"
authors: ["E. Xie", "W. Wang", "Z. Yu", "A. Anandkumar", "J. M. Alvarez", "P. Luo"]
year: 2021
url: https://arxiv.org/pdf/2105.15203
created: 2026-05-28
relevant_atlas_pages: [segformer, focalclick, fcn-semantic-segmentation, deeplab-semantic-segmentation, unet-segmentation, hrnet, mask2former, vit, attention-mechanism]
---

# Setting

**Task**: semantic segmentation — assigning a per-pixel category label to an input RGB image.

**Input**: an RGB image of size $H \times W \times 3$; no constraint on resolution at inference time.

**Output**: a segmentation mask of size $\frac{H}{4} \times \frac{W}{4} \times N_\text{cls}$, where $N_\text{cls}$ is the number of semantic categories, subsequently upsampled to full resolution.

**Benchmarks**: ADE20K (150 categories, 20,210 images), Cityscapes (19 categories, 5,000 fine-annotated images), COCO-Stuff (172 labels, 164k images). Robustness evaluated on Cityscapes-C (16 algorithmically generated corruption types).

# Core idea

SegFormer combines a hierarchical Transformer encoder (Mix Transformer, MiT) with a lightweight all-MLP decoder.

The **MiT encoder** divides the image into $4 \times 4$ patches (not $16 \times 16$ as in ViT) and passes them through four transformer stages, producing feature maps at $\{1/4, 1/8, 1/16, 1/32\}$ of the original resolution with channel counts $\{C_1, C_2, C_3, C_4\}$. Two design choices distinguish it from ViT: (1) **overlapping patch merging** uses a convolution with kernel size $K$, stride $S$, padding $P$ ($K=7, S=4, P=3$ for stage 1; $K=3, S=2, P=1$ for stages 2–4) to preserve local continuity; (2) **Mix-FFN** replaces positional encoding with a 3×3 depthwise convolution inside the FFN:

$$x_\text{out} = \text{MLP}(\text{GELU}(\text{Conv}_{3\times3}({\text{MLP}(x_\text{in})}))) + x_\text{in} \tag{3}$$

This eliminates the resolution-dependent positional encoding that causes accuracy drops when inference resolution differs from training.

**Efficient self-attention** reduces sequence length before computing attention by a reduction ratio $R$. Given key $K$ of shape $N \times C$:

$$\hat{K} = \text{Reshape}\!\left(\frac{N}{R}, C \cdot R\right)(K), \quad K = \text{Linear}(C \cdot R, C)(\hat{K}) \tag{2}$$

resulting in $K$ of shape $\frac{N}{R} \times C$, reducing self-attention complexity from $O(N^2)$ to $O\!\left(\frac{N^2}{R}\right)$. Reduction ratios are $R = [64, 16, 4, 1]$ from stage-1 to stage-4.

The **all-MLP decoder** has four steps:

$$\hat{F}_i = \text{Linear}(C_i, C)(F_i), \quad \forall i \tag{4a}$$
$$\hat{F}_i = \text{Upsample}\!\left(\frac{W}{4} \times \frac{W}{4}\right)(\hat{F}_i), \quad \forall i \tag{4b}$$
$$F = \text{Linear}(4C, C)\!\left(\text{Concat}(\hat{F}_i)\right), \quad \forall i \tag{4c}$$
$$M = \text{Linear}(C, N_\text{cls})(F) \tag{4d}$$

where $M$ is the predicted mask. The MLP decoder works because Transformer encoders already produce a large effective receptive field (ERF) at deep stages (visualised in Figure 3/Figure 6 of the paper), making complex context modules (e.g. ASPP) unnecessary.

# Assumptions

1. **ImageNet-1K pre-training** suffices for the MiT encoder; ViT-based competitors (SETR) require ImageNet-22K. Hard requirement; without pre-training performance degrades substantially.
2. **Input divisible by patch stride**: the encoder's four-stage downsampling requires the input to be divisible by $4 \times 2^3 = 32$; arbitrary resolutions are handled by padding at inference.
3. **Local positional information via zero-padding**: Mix-FFN encodes spatial information implicitly through the zero-padding of the $3 \times 3$ depthwise convolution. This is valid when the convolution receptive field is much smaller than the image. Soft assumption; performance is robust across tested resolutions.
4. **Transformer large-ERF assumption**: the MLP decoder's effectiveness depends on the encoder having captured global context at stage-4. Table 1d shows that substituting CNN encoders (ResNet50/101/ResNeXt101) for MiT with the same MLP decoder drops mIoU by 4–10 points on ADE20K, confirming the decoder is designed specifically for Transformer-induced features.

# Failure regime

- **Edge-device deployment**: smallest model (SegFormer-B0, 3.7M parameters) is still larger than typical 100k-memory edge chips; the paper explicitly notes this as a limitation (Section 5).
- **Extremely low-resolution inputs**: the hierarchical downsampling produces $H/32 \times W/32$ at stage-4; on very small images ($<64\times64$) this collapses to near-single-pixel feature maps.
- **CNN encoder + MLP decoder**: the all-MLP decoder does **not** transfer to CNN backbones — Table 1d shows MiT-B2 (S1–4) at 45.4% versus ResNeXt101 (S1–4) at 39.8% mIoU on ADE20K, confirming the decoder requires Transformer-level ERF.
- **Corruption types with fine spatial detail (glass blur, Gaussian noise)**: although SegFormer-B5 significantly outperforms DeepLabV3+ variants on Cityscapes-C (Table 5), all models degrade substantially on highest-severity glass blur and Gaussian noise; robustness is relative not absolute.

# Numerical sensitivity

- **MLP decoder channel $C$**: Table 1b shows performance plateaus above $C = 768$; $C = 256$ chosen for B0/B1 and $C = 768$ for B2–B5. Going wider than 768 yields diminishing returns at high cost.
- **Inference resolution vs. training resolution**: with positional encoding (PE), switching from 768×768 to 1024×2048 on Cityscapes drops mIoU 3.3 points (Table 1c: $77.3 \to 74.0$). Mix-FFN reduces this to 0.7 points ($80.5 \to 79.8$).
- **Reduction ratio $R$**: set to $[64, 16, 4, 1]$ across stages (Table 6); stage-4 uses $R=1$ (full self-attention) — the most expensive stage but also the smallest spatial map ($H/32 \times W/32$).
- **Overlapping patch merging parameters**: first-stage uses $K=7, S=4, P=3$; subsequent stages use $K=3, S=2, P=1$ (Section 3.1, Table 6).

# Applicability

- **Use when**: dense per-pixel semantic segmentation, especially when variable inference resolution is needed; when a parameter-efficient Transformer baseline is required; for safety-critical pipelines that need robustness to natural corruptions.
- **Don't use when**: instance or panoptic segmentation is needed (SegFormer is semantic-only in this formulation); edge chips with $<1$M parameter budgets.
- **Compared against in the paper**: SETR (ViT-Large + CNN decoders), DeepLabV3+ (ResNet-101 / MobileNetV2), OCRNet (HRNet-W48), FCN (ResNet-101 / MobileNetV2), PSPNet (ResNet-101 / MobileNetV2), GSCNN, Axial-DeepLab, Swin Transformer, PVT, Twins.

# Connections

- **Builds on**: `dosovitskiy2020-vit` (tokens + self-attention paradigm; MiT inherits patch tokenisation and multi-head self-attention from ViT), `long2015-fcn` (FCN is cited as the foundational dense-prediction baseline; SegFormer's per-pixel output follows FCN's end-to-end pipeline), `chen2018-deeplab` (DeepLabV3+ is the primary CNN-decoder comparison baseline)
- **Enables**: `chen2022-focalclick` (SegFormer-B0 and SegFormer-B3 used explicitly as backbone variants in FocalClick's Segmentor component, Table 3 of the FocalClick paper)
- **Refutes / supersedes**: SETR (demonstrated to be 4× smaller and $\ge 1.6\%$ mIoU better on ADE20K, 5× faster on Cityscapes with comparable accuracy; SETR is not registered as an Atlas slug so no slug reference)

# Atlas update plan

## NEW: segformer

Type: model
Category: semantic-segmentation
Primary source: this paper

**Motivation**:
- ViT-based segmentation (SETR) proved Transformers work for dense prediction but outputs only single-scale low-resolution features and requires ImageNet-22K pre-training, making it slow (5.4 FPS) and large (318M parameters).
- CNN backbones with context modules (ASPP, OHEM) are complex and scale poorly.
- SegFormer unifies a hierarchical Transformer encoder (MiT) with a deliberately lightweight all-MLP decoder to achieve high accuracy with 4–5× fewer parameters and 2–5× faster inference than SETR.

**Architecture**:
- **MiT encoder**: 4-stage hierarchy producing feature maps at $\{1/4, 1/8, 1/16, 1/32\}$ resolution. Stage $i$ produces $F_i$ of shape $\frac{H}{2^{i+1}} \times \frac{W}{2^{i+1}} \times C_i$.
  - Overlapping patch merging (convolution, $K=7, S=4, P=3$ at stage 1; $K=3, S=2, P=1$ at stages 2–4) preserves local continuity.
  - Efficient self-attention with sequence-reduction ratio $R$ (per stage: $[64, 16, 4, 1]$) reduces complexity from $O(N^2)$ to $O(N^2/R)$.
  - Mix-FFN: $x_\text{out} = \text{MLP}(\text{GELU}(\text{Conv}_{3\times3}(\text{MLP}(x_\text{in})))) + x_\text{in}$ (Eq. 3). Replaces positional encoding; encodes position via zero-padding of the depthwise convolution, enabling variable-resolution inference with only 0.7% mIoU degradation across resolution changes.
  - Model variants MiT-B0 to MiT-B5 (parameters: 3.7M / 14.0M / 25.4M / 45.2M / 62.6M / 82.0M on ImageNet; see Table 7).
- **All-MLP decoder**: four steps — (1) per-stage Linear to unify channels to $C$; (2) upsample all to $H/4 \times W/4$; (3) concatenate and fuse with Linear($4C, C$); (4) Linear($C, N_\text{cls}$) for final prediction. Decoder parameters range from 0.4M (B0) to 3.3M (B2–B5), representing $\le 4\%$ of total model size.
- **Why MLP decoder works**: Effective Receptive Field (ERF) analysis (Figure 3) shows that SegFormer's stage-4 Transformer blocks already cover the full image context non-locally. The MLP decoder adds the complementary strong local attention from the MLP head (Figure 3 blue box), rendering both local and global information without ASPP or other context modules.

**Training**:
- Pre-train MiT encoder on ImageNet-1K (not 22K). Decoder randomly initialised.
- AdamW optimiser, initial lr $6\times10^{-5}$, "poly" LR schedule, factor 1.0.
- 160K iterations on ADE20K and Cityscapes; 80K on COCO-Stuff. Batch size 16 (ADE20K, COCO-Stuff), 8 (Cityscapes).
- Augmentation: random resize (ratio 0.5–2.0), random horizontal flip, random crop to $512\times512$ (ADE20K/COCO-Stuff), $1024\times1024$ (Cityscapes). Crop size $640\times640$ for B5 on ADE20K.
- No OHEM, auxiliary losses, or class-balance loss.

**Headline numbers** (Table 1a, Table 2, Table 3, Table 4):
- SegFormer-B0: ADE20K 37.4% mIoU SS / 3.8M params / 8.4G FLOPs / 50.5 FPS; Cityscapes val 76.2% mIoU (short-side 1024) / 15.2 FPS.
- SegFormer-B2: ADE20K 46.5% mIoU SS / 27.5M params / 62.4G FLOPs / 24.5 FPS.
- SegFormer-B4: ADE20K 50.3% mIoU SS (51.1% MS) / 64.1M params / 95.7G FLOPs / 15.4 FPS. Previous best was 50.2% (SETR, 318M params).
- SegFormer-B5: ADE20K 51.0% SS / 51.8% MS; Cityscapes val 84.0% mIoU MS / 84.7M params / 1447.6G FLOPs; COCO-Stuff 46.7% mIoU / 84.7M params.
- SegFormer-B5 Cityscapes test: 82.2% mIoU (ImageNet-1K only), 83.1% (+ Mapillary Vistas).
- Robustness: SegFormer-B5 on Cityscapes-C shows up to 588% relative improvement over DeepLabV3+ variants on Gaussian Noise (Table 5).

**Implementations** (to be filled by deep-model-page skill from open-source repos):
- Official: `NVlabs/SegFormer` (PyTorch, mmsegmentation-based). License to verify.
- `open-mmlab/mmsegmentation` includes SegFormer configs.
- Hugging Face `transformers` library: `SegformerForSemanticSegmentation`.

**Assessment**:
- Strengths: best accuracy-efficiency trade-off on ADE20K/Cityscapes at time of publication; no positional encoding means variable-resolution inference works out of the box; strong zero-shot corruption robustness; conceptually clean (no ASPP, no auxiliary heads, no OCR).
- Weaknesses: semantic segmentation only in the original formulation (no instance/panoptic); still requires GPU for real-time at B2+ scales; MLP decoder is not effective with CNN backbones (Table 1d).

**Relations** (direction note — see CLAUDE.md "Relations field"):
`feeds_into` is asymmetric A→B, meaning A's idea is incorporated into B. The convention (from examples: "VGG → fcn-semantic-segmentation") is to author the edge on the **upstream (A) side** with `target: B`. SegFormer builds on ViT (ViT is A, SegFormer is B), so this edge belongs on the **ViT page** as `{ type: feeds_into, target: segformer, confidence: high }`. Do NOT author a `feeds_into` edge on the SegFormer page — that would be backwards. When the `segformer` model page is created, it should carry no `feeds_into` edge; the ViT page update below should add `feeds_into → segformer`.

Relations to author on the **SegFormer model page**:
```yaml
relations:
  - { type: compared_with, target: fcn-semantic-segmentation, confidence: high }
  - { type: compared_with, target: deeplab-semantic-segmentation, confidence: high }
  - { type: compared_with, target: hrnet, confidence: high }
  - { type: compared_with, target: unet-segmentation, confidence: medium, caution: "UNet is the encoder-decoder ancestor; SegFormer is not a direct UNet variant but shares the skip-connection philosophy" }
  - { type: compared_with, target: mask2former, confidence: medium, caution: "Mask2Former 2022 adopts mask-classification paradigm vs SegFormer per-pixel; different formulation, not a peer per-pixel choice" }
```

## UPDATE: vit

Section: Relations
Bullets:
- Add `{ type: feeds_into, target: segformer, confidence: high, caution: "MiT inherits ViT's patch tokenisation and multi-head self-attention but replaces positional encoding with Mix-FFN and adds a 4-stage hierarchy" }` to ViT's `relations[]`.
- This edge must be authored on the ViT page (upstream), not the SegFormer page. The build will derive the reverse `fedBy: segformer` bucket on the SegFormer page.

## UPDATE: focalclick

Section: sources.references and Relations
Bullets:
- Add `xie2021-segformer` to `sources.references[]` (currently lists `sofiiuk2021-ritm` and `sun2019-hrnet`).
- FocalClick's Segmentor component uses SegFormer-B0 and SegFormer-B3 as explicit backbone variants (FocalClick paper Table 3). This is genuine compositional lineage.
- Add to FocalClick's `relations[]`: `{ type: feeds_into, target: focalclick, confidence: high, caution: "SegFormer-B0/B3 are named backbone choices in FocalClick Segmentor (Table 3)" }` — but since `feeds_into` is authored on the upstream (A) side, this edge belongs on the **SegFormer page** pointing to FocalClick: `{ type: feeds_into, target: focalclick, confidence: high, caution: "SegFormer-B0/B3 used as explicit Segmentor backbone in FocalClick Table 3" }`. Verify FocalClick slug exists before adding.

  Wait — direction check: SegFormer (A) feeds into FocalClick (B). Author on SegFormer page with `target: focalclick`. This is the SegFormer model page's relation, not the FocalClick page's.

## UPDATE: fcn-semantic-segmentation

Section: Remarks or Relations
Bullets:
- FCN will receive the mirror of SegFormer's `compared_with` edge (symmetric, build mirrors it). No manual update required on the FCN page for the relation edge.
- Optional: in FCN Remarks, note that SegFormer (2021) is the prominent Transformer-based dense-prediction descendant that achieves 37.4–51.8% mIoU on ADE20K vs. FCN's baseline 36.1% (MobileNetV2) at 3.8M params — a concrete marker of progress since FCN.

## UPDATE: deeplab-semantic-segmentation

Section: Remarks or Relations
Bullets:
- DeepLab will receive the mirror of SegFormer's `compared_with` edge automatically.
- Per CLAUDE.md tiebreaker: DeepLab (2017/2018) is older than SegFormer (2021), so **DeepLab hosts** the `## When to choose DeepLab over SegFormer` comparison section. Defer writing this until both research notes exist (both do now: `chen2018-deeplab` and `xie2021-segformer`).
- Key comparison data for that section: DeepLabV3+/R101 = 44.1% mIoU ADE20K / 62.7M params / 255.1G FLOPs / 14.1 FPS vs. SegFormer-B2 = 46.5% / 27.5M / 62.4G FLOPs / 24.5 FPS (Table 2).

## UPDATE: hrnet

Section: Remarks or Relations
Bullets:
- HRNet will receive the mirror of SegFormer's `compared_with` edge automatically.
- Per CLAUDE.md tiebreaker: HRNet (2019) is older than SegFormer (2021), so **HRNet hosts** the comparison section. Defer.
- Key data: OCRNet (HRNet-W48) = 45.6% ADE20K / 70.5M params / 164.8G FLOPs / 17.0 FPS vs. SegFormer-B3 = 49.4% / 47.3M / 79.0G FLOPs (Table 2).

## UPDATE: attention-mechanism

Section: Where it appears
Bullets:
- Add SegFormer's efficient self-attention (Eq. 2) as an example of sequence-reduction attention: reduces $O(N^2)$ standard multi-head self-attention to $O(N^2/R)$ by reshaping the key sequence from $N \times C$ to $\frac{N}{R} \times (C \cdot R)$ and projecting back to $C$. Per-stage ratios $R = [64, 16, 4, 1]$ in SegFormer adapt the reduction to the feature map scale. This is a practical trade-off variant of the standard attention for dense-prediction backbones where $N = H \times W$ is very large.

# Provenance

All numerical values below are traceable to the paper text file (`xie2021-segformer.txt` lines referenced where possible) or the ar5iv HTML rendering.

- **Abstract**: "SegFormer-B5, achieves 84.0% mIoU on Cityscapes validation set"; "SegFormer-B4 achieves 50.3% mIoU on ADE20K with 64M parameters, being 5× smaller and 2.2% better than the previous best method"; "Code will be released at: github.com/NVlabs/SegFormer" — txt lines 29, 27–28, 30.
- **Abstract**: SegFormer-B5 ADE20K 51.8% = "our best model, SegFormer-B5 … 51.8% mIoU" — confirmed Table 2, line 470 of txt.
- **Section 3**: patch size $4 \times 4$ — txt line 213; feature resolutions $\{1/4, 1/8, 1/16, 1/32\}$ — txt line 216.
- **Section 3.1** Overlapping Patch Merging: $K=7, S=4, P=3$ and $K=3, S=2, P=1$ — txt lines 249–250.
- **Section 3.1** Efficient Self-Attention, Eq. (1): standard attention — txt lines 254–256. Eq. (2): sequence reduction — txt lines 261–263. Reduction ratios $[64, 16, 4, 1]$ — txt line 270.
- **Section 3.1** Mix-FFN, Eq. (3): $x_\text{out} = \text{MLP}(\text{GELU}(\text{Conv}_{3\times3}(\text{MLP}(x_\text{in})))) + x_\text{in}$ — txt lines 280.
- **Section 3.2** All-MLP decoder, Eq. (4): four-step formulation — txt lines 301–306.
- **Section 3.2** ERF analysis: "ERF of DeepLabv3+ is relatively small even at Stage-4"; "SegFormer's encoder naturally produces local attentions which resemble convolutions at lower stages, while able to output highly non-local attentions … at Stage-4" — txt lines 328–331.
- **Section 3.3**: comparison with SETR — "only ImageNet-1K for pre-training"; "Our MLP decoder is more compact and less computationally demanding" — txt lines 348, 357.
- **Section 4.1**: training details (AdamW, lr $6\times10^{-5}$, poly schedule, 160K iterations, batch 16/8, crops $512^2$/$1024^2$/$512^2$) — txt lines 379–384.
- **Table 1a** (txt lines 417–422): full per-model mIoU / encoder params / decoder params / FLOPs table across three datasets.
- **Table 1b** (txt lines 428–434): MLP channel dimension ablation; $C=256$ → 44.9%, $C=768$ → 45.4%, plateau beyond 768.
- **Table 1c** (txt lines 429–434): Mix-FFN vs. PE — PE at $768\times768$ = 77.3%, at $1024\times2048$ = 74.0% (drop 3.3%); Mix-FFN at $768\times768$ = 80.5%, at $1024\times2048$ = 79.8% (drop 0.7%).
- **Table 1d** (txt lines 427–434): CNN encoder + MLP decoder: ResNet50 34.7%, ResNet101 38.7%, ResNeXt101 39.8%; MiT-B2(S4) 43.1%, MiT-B2(S1-4) 45.4%.
- **Table 2** (txt lines 449–470): full ADE20K + Cityscapes comparison; SegFormer-B0 (3.8M, 8.4G, 50.5 FPS, 37.4% ADE20K, 76.2% CS-val); SegFormer-B4 (64.1M, 95.7G, 15.4 FPS, 51.1% ADE20K-MS); SegFormer-B5 (84.7M, 183.3G, 9.8 FPS, 51.8% ADE20K-MS, 84.0% CS-val-MS).
- **Table 3** (txt lines 517–529): Cityscapes test results; SegFormer-B5 82.2% (IM-1K only), 83.1% (IM-1K + MV).
- **Table 4** (txt lines 540–544): COCO-Stuff; SegFormer-B5 46.7% / 84.7M.
- **Table 5** (txt lines 574–589): Cityscapes-C robustness comparison.
- **Table 6** (txt lines 658–699): Full MiT hyperparameter table (Ki, Si, Pi, Ci, Li, Ri, Ni, Ei per stage per variant).
- **Table 7** (txt lines 708–715): MiT ImageNet-1K classification performance; B0=70.5%/3.7M, B1=78.7%/14.0M, B2=81.6%/25.4M, B3=83.1%/45.2M, B4=83.6%/62.6M, B5=83.8%/82.0M.
- **Section 5** (txt lines 599–601): edge-device limitation — "it is unclear whether it can work well in a chip of edge device with only 100k memory".
- **Reference [1]** = Long et al. FCN (CVPR 2015) — txt line 836.
- **Reference [6]** = Dosovitskiy et al. ViT (arXiv 2020) — txt line 853.
- **Reference [20]** = Chen et al. DeepLabV3+ (ECCV 2018) — txt line 895.
