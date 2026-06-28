---
paper_id: leroy2024-mast3r
title: "Grounding Image Matching in 3D with MASt3R"
authors: [Vincent Leroy, Yohann Cabon, Jérôme Revaud]
year: 2024
url: https://arxiv.org/abs/2406.09756
created: 2026-06-27
relevant_atlas_pages: [feature-matching, feature-descriptors, epipolar-geometry, pose-estimation, local-feature-matching]
---

# Setting

**Problem class**: Dense pixel-to-pixel image matching for 3D vision — given two images, output a set of pairwise correspondences `{(i, j)}` where `i = (u_i, v_i)` and `j = (u_j, v_j)` are pixel coordinates.

**Inputs**: Two RGB images `I^1`, `I^2` of the same scene, captured by cameras with *unknown* intrinsics and extrinsics. Variable aspect ratios handled; largest image dimension capped at 512 px internally (coarse-to-fine for higher resolutions).

**Outputs**: A set of pixel correspondences `M ⊆ I^1 × I^2`, per-pixel 3D pointmaps `X^{v,1} ∈ R^{H×W×3}` expressed in camera C^1's coordinate system, per-pixel confidence maps `C^v`, and dense local feature maps `D^v ∈ R^{H×W×d}`. From these outputs focal length, relative pose, metric depth, and 3D reconstruction are all derivable — making MASt3R a standalone method for camera calibration, pose estimation, and 3D scene reconstruction.

**Preconditions**: Images share scene content. No calibration required. Method handles unconstrained viewpoint and illumination changes including up to 180° viewpoint difference.

# Core idea

MASt3R treats image matching as a 3D task rather than a 2D task. Pixels that correspond to the same 3D point are, by definition, observing the same physical location — so regressing a shared 3D pointmap representation provides geometric grounding that 2D descriptor matching inherently lacks.

The method extends DUSt3R [102] (a transformer-based 3D reconstruction framework) by adding a second prediction head, `Headdesc`, that outputs dense per-pixel local features alongside DUSt3R's existing `Head3D` pointmap head. Both heads attach to the same shared-weight ViT encoder and cross-attention decoder:

```
H^1 = Encoder(I^1)                     (Eq. 1)
H^2 = Encoder(I^2)                     (Eq. 2)
H'^1, H'^2 = Decoder(H^1, H^2)         (Eq. 3)

X^{1,1}, C^1 = Head^1_3D([H^1, H'^1])  (Eq. 4)
X^{2,1}, C^2 = Head^2_3D([H^2, H'^2])  (Eq. 5)

D^1 = Head^1_desc([H^1, H'^1])         (Eq. 8)
D^2 = Head^2_desc([H^2, H'^2])         (Eq. 9)
```

`Headdesc` is a 2-layer MLP with GELU activations; outputs are L2-normalized to unit norm. Feature dimension `d = 24`.

The network is trained with a combined objective:

```
L_total = L_conf + β * L_match         (Eq. 12)
```

where `L_conf` is DUSt3R's confidence-weighted pointmap regression loss (Eq. 7) and `L_match` is an InfoNCE contrastive matching loss (Eq. 10), described below.

At inference, dense correspondences are extracted via **fast reciprocal nearest-neighbour (NN) matching** in the descriptor space `D^1`, `D^2`, avoiding the O(W²H²) complexity of naive dense reciprocal matching.

# Assumptions

1. **Scene rigidity**: Correspondences are defined by shared 3D points — dynamic objects break the pointmap consistency used both in training and inference.
2. **Binocular input**: The method is formulated and evaluated pairwise; global alignment across >2 images is deferred to an optional post-hoc step (not used in this paper).
3. **Sufficient overlap**: Training data contains matching pairs; near-zero-overlap image pairs have no GT correspondences and no training signal from L_match.
4. **Resolution compatibility** (soft): The ViT backbone does not generalise well to resolutions beyond 512 px at the longest dimension [62, 65]. High-resolution images require the coarse-to-fine tiling scheme (§3.4) for full-resolution accuracy; skipping it leads to measurable accuracy drops (Table 5, Appendix C).
5. **Lambertian surfaces** (soft): MASt3R demonstrates robustness to specularities (DTU qualitative, Appendix A), but this is a soft assumption — strong non-Lambertian surfaces or transparent materials may still degrade correspondences.

# Failure regime

- **Textureless or low-contrast regions**: The descriptor head is trained with a classification-style InfoNCE loss that rewards getting the *exact* pixel right; purely textureless regions have no discriminative signal and may yield incorrect or absent matches. (§3.2 notes the regression head is "inherently affected by noise" in these regions, motivating the descriptor head, but the descriptor head is also limited by texture.)
- **Single retrieved image at scene scale**: Table 4 (Aachen InLoc top1) shows performance degrades when only one database image is available at large scene scale; this contrasts with the Map-free setting (compact scenes) where top1 is sufficient.
- **Extreme scale difference without coarse-to-fine**: The coarse-to-fine scheme is essential for high-res inputs; disabling it roughly doubles reconstruction errors on DTU (Table 5) and degrades night-time localization by up to 15% (Table 5).
- **Dense direct regression for localization**: Using predicted pointmaps directly (without feature matching + PnP) produces poor absolute pose at large scenes — Table 4 shows near-chance performance for direct regression on Aachen/InLoc, confirming that feature matching is critical for scale-aware localization.
- **Illustrated failure case**: Figure 4 (right, row 1) shows a failure on an extreme viewpoint pair where correspondences are coarsely estimated, though approximate poses are still recoverable.

# Numerical sensitivity

**Descriptor dimension `d = 24`**: Low-dimensional features are efficient for brute-force similarity but make K-d trees highly inefficient (curse of dimensionality [25]). The paper uses FAISS [24, 45] for NN search in descriptor space and K-d trees only for 3D point matching (3D points in R^3 are low-dimensional).

**Temperature `τ = 0.07`**: InfoNCE similarity score `s_τ(i,j) = exp(-τ * D^1_i^⊤ D^2_j)`. The temperature sharpens the softmax distribution; at `τ = 0.07` (standard in contrastive learning) the loss strongly penalises near-miss pixel errors.

**Confidence loss weight `α = 0.2`**: Inherited from DUSt3R. The confidence `C^v_i` acts as a learned weighting in `L_conf = Σ C^v_i * ℓ_regr(v,i) - α log C^v_i`, trading off per-pixel regression accuracy against over-confident predictions.

**Metric scale handling**: When GT pointmaps are metric, normalisation factors `z, ẑ` are set equal (`z := ẑ`), so `ℓ_regr(v,i) = ||X^{v,1}_i - X̂^{v,1}_i|| / ẑ`. This preserves metric information at the cost of increased regression difficulty for scenes with very different absolute scales.

**Fast NN subsampling**: Setting `k = 3000` achieves 64× speedup over naive dense matching while *improving* accuracy on Map-free (Figure 3 right). This counter-intuitive gain arises from the basin-biased sampling property of the FRM algorithm (§B.2): seeds in large convergence basins (areas with clear nearest-neighbour structure) are more likely to be selected, producing spatially uniform match distributions that benefit RANSAC pose estimation.

# Applicability

- **Use when**: Matching under extreme viewpoint change (up to 180°) where 2D-only methods (SIFT, SuperGlue, LoFTR) fail; camera calibration is unknown; metric depth and correspondences are needed simultaneously; zero-shot generalisation to new scenes without domain fine-tuning.
- **Don't use when**: Real-time applications requiring sub-100ms latency (even with fast NN the full pipeline including coarse-to-fine is not trivially fast on CPU); commercial products (CC-BY-NC-SA-4.0 license prohibits commercial use); tasks requiring only sparse feature detection and description without holistic scene understanding.
- **Compared against**: LoFTR [82] (detector-free 2D dense matching), LightGlue [51] (keypoint graph-matching), SuperGlue [72] (keypoint graph-matching), DUSt3R [102] (direct pointmap matching without descriptor head), DKM [27] (dense kernel matching), RayDiffusion [116] (camera-as-ray pose estimation).

# Connections

- **Builds on**: [wang2023-dust3r] — MASt3R is DUSt3R with an added descriptor head and matching loss; weights are initialised from the public DUSt3R checkpoint.
- **Enables**: [wang2025-vggt] — subsequent VGGT (Visual Geometry Grounded Transformer) builds on the pointmap+descriptor paradigm.
- **Peer matchers** (compared on the same matching/localization benchmarks): [sun2021-loftr] (LoFTR), [lindenberger2023-lightglue] (LightGlue).

# Atlas update plan

## NEW: mast3r
Type: model
Domain: geometry
arch_family: vit
Primary source: this paper (leroy2024-mast3r)

**Motivation**: Image matching is fundamentally a 3D problem — two pixels correspond iff they observe the same 3D point — yet virtually all prior methods (SIFT, SuperGlue, LoFTR) treat it as a 2D problem. DUSt3R demonstrated that 3D-grounded matching (via pointmap regression) is extremely robust to extreme viewpoint changes, but its correspondences are imprecise because regression is inherently noisy. MASt3R augments DUSt3R with a trained dense local-feature head, achieving both 3D robustness and pixel-accurate correspondences.

**Architecture**: Shared-weight ViT-Large Siamese encoder → two cross-attention ViT-Base decoders (one per view) → two heads per image: `Head3D` (pointmap + confidence, inherited from DUSt3R) and `Headdesc` (2-layer GELU MLP, L2-normalised features, d=24). The decoder exchanges information between views via cross-attention so both heads benefit from geometric context (Eqs. 1–5, 8–9).

**Training**: Joint pointmap regression (`L_conf`, DUSt3R's confidence-weighted loss, Eq. 7, α=0.2) + InfoNCE matching loss (`L_match`, Eq. 10, τ=0.07, β=1); total `L_total = L_conf + β L_match` (Eq. 12). GT correspondences sampled from GT pointmaps (4096 pairs/image pair, padded with random negatives). Initialised from public DUSt3R checkpoint. 14 diverse training datasets, 650k pairs/epoch, 35 epochs, AdamW lr=1e-4, cosine decay. Metric-scale datasets: z:=ẑ (no scale normalisation). Ablation (Table 1): removing L_conf and training only with L_match degrades rotation accuracy from 3.0° to 10.8° median, confirming 3D grounding is essential.

**Fast Reciprocal Matching**: Naive dense reciprocal matching is O(W²H²) — prohibitive at runtime. MASt3R introduces the Fast Reciprocal Matching (FRM) algorithm (§3.3): starting from k ≪ WH seed pixels U^0 (sampled on a grid in I^1), iteratively apply NN2 then NN1 alternately (Eq. 15), collecting cycles (reciprocal matches) and filtering converged points after each step. Complexity O(kWH), proven to converge to reciprocal matches regardless of starting point (Corollary B.3). k=3000 achieves 64× speedup over full matching while *improving* VCRE AUC on Map-free (Figure 3), because FRM implicitly performs basin-biased sampling producing more uniform spatial coverage of matches — benefiting RANSAC.

**Coarse-to-fine for high resolution** (§3.4): ViT attention is quadratic in image area, so MASt3R is limited to 512-px inputs. For higher resolutions: (1) run coarse matching on downscaled images to get M^{k0}; (2) tile each image into 512-px overlapping windows (50% overlap); (3) greedily select window pairs covering 90% of coarse correspondences; (4) run MASt3R on each tile pair independently; (5) map back to full-resolution coordinates and concatenate. Disabling this step degrades Aachen night localization by up to 15% and doubles DTU Chamfer errors (Table 5).

**Implementations**: https://github.com/naver/mast3r — CC-BY-NC-SA-4.0, NON-COMMERCIAL only.

**Assessment**: State-of-the-art on Map-free relocalization: 93.3% VCRE AUC (+30% absolute vs. LoFTR+KBR at 63.4%), median translation error 36cm (vs. ~2m for 2D matchers). CO3Dv2 mAA(30) = 81.8 vs. DUSt3R pairwise 77.2; RealEstate10K mAA(30) = 76.4 vs. DUSt3R 61.2 (+15.2 pts). Competitive on Aachen Day-Night and InLoc (Table 4). DTU zero-shot MVS: Chamfer 0.374mm vs. DUSt3R 1.741mm. Non-commercial license limits production use. Peer/alternative to detector-free 2D matchers (LoFTR, LightGlue) for extreme-viewpoint matching; supersedes DUSt3R for matching accuracy while preserving its robustness.

**References**: leroy2024-mast3r (primary); wang2023-dust3r (DUSt3R backbone); sun2021-loftr (LoFTR baseline); lindenberger2023-lightglue (LightGlue baseline).

# Provenance

All equations cited by number refer to the paper's arXiv version (arXiv:2406.09756v1, 14 Jun 2024).

- **Eqs. 1–5**: §3.1 (DUSt3R encoder/decoder/Head3D formulation, pp. 3–4)
- **Eq. 6**: §3.1 regression loss `ℓ_regr`; Eq. 7: confidence-weighted `L_conf` (p. 4)
- **Metric modification**: §3.1 "Metric predictions", z:=ẑ for metric GT (p. 4)
- **Eqs. 8–9**: §3.2 `Headdesc` definition (p. 4); "2-layers MLP interleaved with a non-linear GELU activation" (p. 5); "normalize each local feature to unit norm" (p. 5)
- **Eqs. 10–11**: §3.2 InfoNCE `L_match` (p. 5); temperature τ
- **Eq. 12**: §3.2 `L_total = L_conf + β L_match` (p. 5)
- **Eqs. 13–14**: §3.3 full reciprocal matching set M and NN definition (p. 5); "naive implementation... O(W²H²)" (p. 5)
- **Eq. 15**: §3.3 FRM iterative step (p. 5); "fixed number of times, until most correspondences converge" (p. 5)
- **Complexity claim**: §3.3 "overall complexity of the fast matching is O(kWH), which is WH/k ≫ 1 times faster than the naive approach" (p. 5)
- **k=3000, 64× speedup**: §4.2 "k = 3000, we can accelerate matching by a factor of 64 while significantly improving the performance" (p. 7); Figure 3 right
- **Coarse-to-fine**: §3.4 (pp. 5–6); Eq. 16–17 (window pair matching); "90% of correspondences are covered" (p. 6)
- **Training hyperparameters**: §4.1 (p. 6) + Table 6 (p. 17): d=24, β=1, α=0.2, τ=0.07, AdamW, lr=1e-4, weight decay=0.05, 650k pairs/epoch, 35 epochs, cosine decay, 7 warmup epochs
- **Ablation (Table 1)**: §4.2 validation set ablation (p. 7); MASt3R-M (Lmatch only) = 10.8° rotation vs. 3.0° for full model
- **Map-free results (Table 2)**: p. 7; MASt3R (auto) 93.3% AUC, median translation 36cm; LoFTR+KBR 63.4% → "+30% absolute improvement" (Abstract, p. 1)
- **CO3Dv2 / RealEstate (Table 3)**: §4.3, p. 8; MASt3R mAA(30) CO3D=81.8, RE=76.4
- **Aachen / InLoc (Table 4)**: §4.4, p. 9
- **DTU MVS (Table 3 right)**: §4.5, p. 9; MASt3R zero-shot Chamfer 0.374mm
- **Coarse-to-fine ablation (Table 5)**: Appendix C, p. 16; Aachen night top1 drops from 70.2/88.0/97.4 to 55.5/82.2/95.8 without C2F
- **Convergence proofs**: Appendix B.1, Propositions B.1–B.4, Lemma B.2, Corollary B.3 (pp. 13–15)
- **Basin-biased sampling**: Appendix B.2 (pp. 15–16); Figure 12
- **Architecture backbone**: §4.1 "ViT-Large encoder and ViT-Base decoder" (p. 6)
- **Repo**: https://github.com/naver/mast3r (paper title page, p. 1)
- **License**: CC-BY-NC-SA-4.0 (? — stated as non-commercial in the Atlas brief; not quoted verbatim in the .txt cache but consistent with NAVER LABS Europe policy for MASt3R/DUSt3R family)
