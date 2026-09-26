---
paper_id: darcet2023-registers
title: "Vision Transformers Need Registers"
authors: [T. Darcet, M. Oquab, J. Mairal, P. Bojanowski]
year: 2023
url: https://arxiv.org/pdf/2309.16588
created: 2026-08-23
relevant_atlas_pages: [attention-mechanism, vit, dinov2, vggt]
---

# Setting

Problem: ViT feature maps (patch-token outputs, and the attention maps derived
from them) contain a small number of spatially-scattered "artifact" tokens
whose behavior corrupts both interpretability (attention-map visualisation,
object discovery) and, potentially, dense-prediction quality. Input: a frozen
or trainable ViT backbone (supervised: DeiT-III; text-supervised: OpenCLIP;
self-supervised: DINO / DINOv2) run on ordinary RGB images. Output: the paper
characterises the artifact tokens quantitatively (norm statistics, layer/
training-step/model-size onset, linear-probe content) and proposes an
architectural fix — extra learnable `[reg]` tokens appended to the input
sequence and discarded at the output — validated by re-training all three
model families with and without the change (§S2–§S3, ar5iv sections 2–3).

# Core idea

Some patch tokens in large, sufficiently-trained ViTs end up with an output
norm roughly 10x higher than typical patch tokens (§S1 "Introduction",
Fig. 3 caption: "average around 2.37% of tokens have norm > 150" for DINOv2
ViT-g/14). These "high-norm"/"outlier" tokens are diagnosed, not injected, by
the following battery of probes: (1) cosine similarity to their 4 spatial
neighbors right after patch embedding — high, meaning they sit on redundant/
low-information background patches (§S2.SS1.Px3, Fig. 5a); (2) a linear
position-prediction probe and a linear pixel-reconstruction probe trained on
patch embeddings — outlier tokens score far worse than normal tokens on both
(top-1 position accuracy 22.8 vs 41.7; reconstruction L2 error 25.23 vs
18.38, Fig. 5b / Table 1 row "normal"/"outlier"), i.e. they have discarded
local information; (3) a logistic-regression image-classification probe
trained on a single randomly-chosen patch token per image — outlier tokens
score much *higher* than normal tokens (e.g. IN1k top-1 69.0 vs 65.8; still
below the `[CLS]` token's 86.0, Table 1), i.e. they have absorbed *global*
image information instead. The paper's own interpretation (§S2.SS2, "Hypothesis
and remediation"): large, sufficiently-trained models learn to recognize
redundant/low-information patches and repurpose their tokens as internal
scratch space to store, process, and retrieve global information — which is
harmless as a mechanism but harmful because it happens *inside* patch tokens
that downstream dense-prediction heads also read, discarding their local
content in the process. The fix (§S2.SS2, Fig. 6): append `N` additional
learnable tokens to the sequence right after the patch-embedding layer,
initialised/treated like the `[CLS]` token, participating fully in every
transformer layer's attention, but discarded at the model's output — never
used as part of the image representation, at training or inference. This
mechanism was first proposed as "memory tokens" in Memory Transformers
(Burtsev et al. 2020, cited §S2.SS2.p2) for NLP translation; the paper's
contribution is showing the mechanism already emerges spontaneously inside
plain ViTs, and that giving it an explicit, dedicated outlet removes the
side effects on patch tokens (§S4.p2, "such tokens allow us not to create but
to isolate this existing behavior").

Editorial gloss (not the paper's literal framing, included for the Atlas
attention-mechanism update): softmax attention normalises to a probability
distribution over the whole sequence, so every query must place its mass
*somewhere* even absent a genuinely relevant key; when the image itself
supplies no natural "nothing to attend to" slot, the model creates one out of
whichever patches carry the least unique information. Registers make that
slot explicit and free of side effects on the real patch tokens. `?`
(interpretive synthesis — the paper does not discuss softmax normalisation
explicitly; it frames the mechanism via "recycling redundant tokens", §S2.SS2.p1–p2.)

# Assumptions

1. The effect is empirically observed in ViTs that are both *large enough*
   and *trained long enough*: for DINOv2 ViT (40-layer, i.e. ViT-g/14),
   outliers only appear in models ViT-Large and larger — Tiny/Small/Base do
   not exhibit them (Fig. 4c, §S2.SS1.Px2). Hard precondition for the
   phenomenon to manifest, not for the fix — registers are harmless to add
   regardless of scale (Table 2).
2. Outliers only appear after roughly one third of DINOv2 pretraining has
   elapsed (Fig. 4b) and differentiate from normal tokens starting around
   layer 15 of the 40-layer network (Fig. 4a). Soft/gradual onset, not a
   discrete switch.
3. The norm-150 threshold used throughout §S2 to label a token "high-norm" is
   a hand-picked cutoff read off a clearly bimodal norm histogram for the
   specific model studied (DINOv2 ViT-g/14) and "can vary across models"
   (§S2.SS1.Px1, explicit caveat) — not a universal constant.
4. Register tokens are appended once, right after the patch-embedding layer,
   and are trained jointly with the rest of the network from scratch in all
   reported experiments (§S3.SS1); the paper does not validate adding
   registers to an already-pretrained frozen backbone (only fine-tuning
   variants from prior "memory token" work, which the paper reports transfer
   poorly across tasks — Sandler et al. 2022, cited §S4.p2 — are cited as a
   contrast, not extended).
5. `N = 4` registers is the setting used in every DeiT-III / OpenCLIP /
   DINOv2 experiment in the paper outside the ablation itself (§S3.SS2.p3,
   final sentence).

# Failure regime

- Object discovery (LOST) with registers is *worse*, not better, for
  OpenCLIP specifically (VOC2007 corloc 38.8 → 37.1, VOC2012 44.3 → 42.0,
  COCO20k 31.0 → 27.9, Table 3) — the paper flags this as an exception
  requiring separate analysis in an appendix (§S3.SS3.p1, "Appendix C
  Analysis of LOST performance") which is not itself captured in this note's
  cached source (out of scope of the cached ar5iv sections read here). `?`
- Registers remove artifacts entirely (qualitatively, Fig. 7/8) but the paper
  explicitly says it could not fully determine *why* different pretraining
  paradigms produce artifacts to different degrees: OpenCLIP and DeiT-III show
  outliers at both B and L sizes (unlike DINOv2's large-model-only onset),
  suggesting the pretraining objective itself, not just scale, plays a role
  that is not mechanistically explained (§S2.SS2.p3).
- DINOv2+reg on LOST/VOC2007 (55.4 corloc) still falls short of the original
  DINO backbone's reported 61.9 corloc (Siméoni et al. 2021) even after the
  fix — registers close most but not all of the gap to DINO-quality
  object-discovery features (§S3.SS3.p1).
- Register-token behavior is not disentangled or regularised — some
  registers develop distinct, slot-attention-like attention patterns and
  some do not, and this differentiation is not enforced or explained, only
  observed post hoc (§S3.SS4, Fig. 9); the paper explicitly defers
  "regularization of registers" to future work.

# Numerical sensitivity

- The 150-norm threshold is dataset/model-specific (see Assumption 3); a
  reader applying this diagnostic to a different backbone must re-derive the
  cutoff from that model's own norm histogram rather than reusing 150
  verbatim.
- Register count is a real hyperparameter with task-dependent optimum, not a
  free win to maximize: the ablation (DINOv2 ViT-L/14, N ∈ {0,1,2,4,8,16},
  Fig. 8) shows qualitative artifact removal saturates at N=1 register, dense
  prediction (ADE20k mIoU, NYUd rmse) has an interior optimum (more registers
  past that point does not keep helping and can regress), while ImageNet
  classification accuracy keeps improving monotonically with more registers
  in the tested range. The paper fixes N=4 as a practical compromise for all
  non-ablation experiments (§S3.SS2.p3).
- No precision/conditioning discussion — this is an architectural, not
  numerical-method, contribution; no 32/64-bit or scale-normalization
  concerns are raised in the cached sections.

# Applicability

- Use when: training or reviewing large ViT backbones (≥ViT-L scale)
  intended for dense prediction (segmentation, depth) or for attention-map-
  based interpretability / unsupervised object discovery (LOST-style
  methods) — registers are a near-zero-cost architectural addition validated
  across supervised, text-supervised, and self-supervised training regimes
  (Table 2: no ImageNet/ADE20k/NYUd regression, sometimes a small gain).
- Don't use when: diagnosing artifacts in small ViT backbones (Tiny/Small/
  Base) where the paper's own evidence shows the phenomenon does not arise
  (Fig. 4c) — the fix would be solving a problem that is not present at that
  scale; also not validated for grafting registers onto an already-trained
  frozen backbone without joint retraining.
- Compared against: DINO (Caron et al. 2021) — the one baseline in the
  paper's own comparison set that does *not* exhibit the artifact at all,
  used throughout as the "clean" reference (Fig. 1, Fig. 2, §S1.p3);
  Memory Transformers (Burtsev et al. 2020) and its vision fine-tuning
  follow-up (Sandler et al. 2022) — prior "extra token" mechanisms this paper
  distinguishes itself from by (a) applying at pretraining, not fine-tuning
  time and (b) explaining *why* the mechanism is needed in ViTs rather than
  just proposing it as an architectural trick (§S4.p2).

# Connections

- Builds on: [dosovitskiy2020-vit, oquab2023-dinov2] — the diagnostic
  analysis in §S2 is performed primarily on DINOv2 ViT-g/14, and the paper's
  central puzzle is framed as "why does DINOv2 show these artifacts when its
  predecessor DINO does not" (§S1.p3–p4). `caron2021-dino` (referenced
  throughout as bib.bib5) is the un-afflicted baseline but is not itself an
  entry this note's cache confirms is registered in `docs/papers/index.yaml`
  under that id — verify before citing it as a source id elsewhere. `?`
- Enables: downstream — `docs/papers/index.yaml` records this paper's own
  citation edge only as `cites: [dosovitskiy2020-vit, oquab2023-dinov2]`
  (upstream), so no forward "enables" edge is independently verified from the
  index; the Atlas-side consumers identified for this note are the public
  pages `vggt` (uses 4 register tokens per frame, per its own architecture
  description, and currently cites `oquab2023-dinov2` but not this paper —
  dangling reference to fix) and `dinov2` (the flagship model exhibiting the
  artifact this paper diagnoses).
- Refutes / supersedes: none. This is an additive architectural fix applied
  on top of existing training recipes (DeiT-III, OpenCLIP, DINOv2), not a
  replacement for any of them.
- Forward note for future ingestion: DINOv3 is reported (by the vitavision
  Atlas roadmap, not by this paper — this paper predates DINOv3) to replace
  or augment register-token handling with "gram anchoring"; that claim is
  unverified against a DINOv3 source in this note and must be confirmed by a
  future ingestion pass before being asserted on any public page. `?`

# Atlas update plan

## UPDATE: attention-mechanism
Section: attention-in-vision (or equivalent "attention in vision
transformers" subsection)
- One paragraph: softmax attention forces every query's attention weights to
  sum to 1 across the sequence, so a query with no genuinely relevant key
  must still place mass somewhere; Darcet et al. (2023) show that in
  large, sufficiently-trained ViTs (supervised DeiT-III, text-supervised
  OpenCLIP, self-supervised DINOv2 — but not DINO) this surfaces as a small
  fraction (~2%) of patch tokens developing ~10x-higher output norm on
  low-information background patches, tokens which linear probes show have
  discarded local (position/pixel) information in favor of aggregated global
  (image-classification-relevant) information. The fix is architectural, not
  a training-time regularizer: append a handful of extra learnable tokens
  (`[reg]`, 4 is the paper's default) to the input sequence, used exactly
  like `[CLS]` inside the transformer but discarded at output; this removes
  the artifact entirely, improves dense-prediction linear-probe scores
  slightly, and substantially improves LOST-style unsupervised
  object-discovery corloc for DINOv2 and DeiT-III (worse for OpenCLIP,
  paper flags as an open exception).
- Source id: darcet2023-registers.
Relations: none — concept-page source; no typed relations (approved plan).

## UPDATE: vggt
Section: sources.references (frontmatter)
- Add `darcet2023-registers` to `sources.references` — the page's own
  architecture description already says "one learnable camera token ... and
  four register tokens ... are appended (§3.3)" without a registered source
  for the register-token mechanism itself; this paper is that source and the
  count (4) matches this paper's chosen default.
- No prose change required beyond the frontmatter addition unless the page's
  body wants a one-clause gloss on why register tokens exist (optional,
  author's call) — e.g. "(register tokens: extra scratch-space tokens
  discarded at output, Darcet et al. 2023)".
Relations: none — concept-page source; no typed relations (approved plan).

## UPDATE: dinov2
Section: body context for the planned Wave-2 rewrite (numerical
concerns / known limitations, or equivalent)
- DINOv2 is the paper's primary object of study and the flagship exhibitor
  of the high-norm artifact tokens (§S2.SS1, entire section is DINOv2-
  specific analysis on ViT-g/14): ~2.37% of output tokens exceed norm 150,
  onset around layer 15 of 40, only after roughly one third of pretraining,
  and only for ViT-Large and larger. DINOv2's predecessor DINO does *not*
  show this artifact, which the source paper treats as the anomaly needing
  explanation.
- These artifacts degrade DINOv2's suitability for LOST-style unsupervised
  object discovery specifically (VOC2007 corloc 35.3 without registers vs
  55.4 with, and still below DINO's reported 61.9) despite DINOv2's strong
  dense-prediction linear-probe numbers being largely unaffected either way.
- Forward-looking note for the rewrite: DINOv3 is understood (unverified
  here) to move past register tokens toward "gram anchoring" — flag as `?`
  and confirm via a dedicated DINOv3 paper ingestion before asserting on the
  public page.
Relations: none — concept-page source; no typed relations (approved plan).

# Provenance

- Abstract: artifact definition, high-norm outlier tokens, low-informative
  background areas, register-token fix, dense-prediction SOTA, object
  discovery, smoother attention maps.
- §S1 "Introduction", para 4 (S1.p4): "~10x higher norm at output", "~2% of
  total sequence", appear "around the middle layers", "only appear after a
  sufficiently long training of a sufficiently big transformer".
- §S1 "Introduction", para 5 (S1.p5): linear-probe summary — outlier tokens
  hold less position/pixel information, more global (classification)
  information; model interpretation stated here first.
- Fig. 2 caption / §S1.p1–p4: models compared — DeiT-III (label-supervised),
  OpenCLIP (text-supervised), DINO and DINOv2 (self-supervised); "all models
  but DINO exhibit peaky outlier values".
- §S2.SS1.Px1 ("Artifacts are high-norm outlier tokens"): norm-150 threshold,
  explicit statement the cutoff "can vary across models".
- Fig. 3 caption / §S2.SS1.Px2: 2.37% of DINOv2 ViT-g/14 tokens exceed
  norm 150.
- Fig. 4 + caption / §S2.SS1.Px2: onset around layer 15 of 40; onset after
  ~1/3 of training; onset only for ViT-Large and larger model sizes.
- §S2.SS1.Px3 ("High-norm tokens appear where patch information is
  redundant"), Fig. 5a: cosine-similarity-to-neighbors evidence for
  low-information/background location of artifacts.
- §S2.SS1.Px4 ("High-norm tokens hold little local information"), Fig. 5b /
  inline table: position-prediction top-1 41.7 (normal) vs 22.8 (outlier),
  avg. distance 0.79 vs 5.09; pixel-reconstruction L2 error 18.38 (normal)
  vs 25.23 (outlier).
- §S2.SS1.Px5 ("Artifacts hold global information"), Table 1: single-token
  logistic-regression classification probe, `[CLS]` 86.0 IN1k top-1 vs
  normal-patch 65.8 vs outlier-patch 69.0 (and similarly higher outlier vs
  normal across P205/Aircraft/CF10/CF100/CUB/Caltech101/Cars/DTD/Flowers/
  Food/Pets/SUN/VOC columns).
- §S2.SS2 ("Hypothesis and remediation"), para 1–2: mechanism hypothesis and
  proposed fix (registers appended after patch embedding, learnable like
  `[CLS]`, discarded at output); citation of Memory Transformers
  (Burtsev et al. 2020, bib.bib3) as prior origin of the mechanism in NLP.
  Fig. 6 caption: "N additional learnable input tokens ... registers ...
  only the patch tokens and [CLS] tokens are used".
- §S3.SS1 ("Training algorithms and data"): DeiT-III on ImageNet-22k
  ViT-B; OpenCLIP ViT-B/16 on a Shutterstock-derived corpus; DINOv2 on
  ImageNet-22k ViT-L, all per official reference repos.
- Fig. 7 + caption / §S3.SS2.p1: qualitative/quantitative norm-distribution
  confirmation that registers remove the outliers for all three algorithms.
- Table 2(a): linear-probe ImageNet/ADE20k mIoU/NYUd rmse with vs without
  registers per model (DeiT-III 84.7/38.9/0.511 → 84.7/39.1/0.512; OpenCLIP
  78.2/26.6/0.702 → 78.1/26.7/0.661; DINOv2 84.3/46.6/0.378 →
  84.8/47.9/0.366). Table 2(b): OpenCLIP zero-shot IN1k 59.9 → 60.1.
- §S3.SS2.p3 ("Number of register tokens"): ablation N ∈ {0,1,2,4,8,16} on
  DINOv2 ViT-L/14 (Fig. 8); "one register is sufficient to remove artefacts,
  using more leads to improved downstream performance" (dense tasks have an
  optimum; ImageNet keeps improving); final sentence fixes N=4 for all other
  experiments in the paper.
- §S3.SS3 ("Object discovery"), Table 3: LOST corloc on VOC2007/VOC2012/
  COCO20k, with vs without registers — DeiT-III 11.7/13.1/10.7 →
  27.1/32.7/25.1; OpenCLIP 38.8/44.3/31.0 → 37.1/42.0/27.9 (regression);
  DINOv2 35.3/40.2/26.9 → 55.4/60.0/42.0. Text: DINOv2 registers gain "+20.1
  corloc (55.4 vs 35.3)" on VOC2007, still short of DINO's reported 61.9
  (Siméoni et al. 2021).
- §S3.SS4 ("Qualitative evaluation of registers"), Fig. 9: registers develop
  differentiated, slot-attention-like attention patterns without explicit
  enforcement; regularization left to future work.
- §S4.p2 ("Additional tokens in transformers"): positioning against BERT
  `[SEP]`/`[MASK]`, ViT `[CLS]`, DETR object queries, AdaTape, Perceiver
  latent arrays, Memory Transformers, Bulatov et al. 2022, and Sandler et al.
  2022 (vision fine-tuning memory tokens, reported not to transfer well
  across tasks); key claim: "such tokens allow us not to create but to
  isolate this existing behavior".
- §S5 ("Conclusion"): summary restating artifact discovery, norm-outlier
  detection method, redundant-token-recycling interpretation, register fix,
  generality across DeiT-III/OpenCLIP/DINOv2.
- `docs/papers/index.yaml` entry for `darcet2023-registers` (lines
  1527–1535): confirms venue ICLR 2024, arXiv 2309.16588,
  `cites: [dosovitskiy2020-vit, oquab2023-dinov2]`.
- `content/models/vggt.md` line 49: "four register tokens $t^R_i$ ... are
  appended (§3.3)" — the dangling-reference site this note's `vggt` update
  plan addresses; frontmatter `sources.references` at time of writing
  (lines 14–17) lists `wang2023-dust3r`, `leroy2024-mast3r`,
  `oquab2023-dinov2` but not `darcet2023-registers`.
