---
paper_id: zhou2023-anomalyclip
title: "AnomalyCLIP: Object-agnostic Prompt Learning for Zero-shot Anomaly Detection"
authors: ["Q. Zhou", "G. Pang", "Y. Tian", "S. He", "J. Chen"]
year: 2023
url: https://arxiv.org/pdf/2310.18961
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, clip, vit, patchcore, attention-mechanism]
---

# Setting

**Task**: zero-shot anomaly detection (ZSAD). A detector is trained once on *auxiliary* data (images with image-level labels and pixel-level anomaly masks, from a domain different from the target) and is then applied to a target dataset with no target training images at all (Abstract; §1). This differs from the one-class setting of the Atlas survey, where a detector is fit to defect-free images of the target category.

**Inputs**: one RGB image; at test time no class name, no anomaly-type vocabulary and no target-domain normal images are needed ("requiring no knowledge about the object name or anomaly types in a target dataset", §3.2). Images are resized to 518 (Appendix A.1).

**Outputs**: an image-level anomaly score $P(g_a, f_i)$ in $[0,1]$ and a pixel-level anomaly score map $Map \in \mathbb{R}^{H_{image}\times W_{image}}$ (§3.3, "Training and Inference").

**Evaluation**: 17 public datasets, 7 industrial (MVTec AD, VisA, MPDD, BTAD, SDD, DAGM, DTD-Synthetic) and 10 medical (HeadCT, BrainMRI, Br35H, COVID-19, ISIC, CVC-ColonDB, CVC-ClinicDB, Kvasir, Endo, TN3K); metrics AUROC, AP (image-level), AUROC and AUPRO (pixel-level) (§4.1).

# Core idea

CLIP is frozen (ViT-L/14@336px, §4.1). Instead of the usual class-name prompt "A photo of a [cls]", AnomalyCLIP learns two *object-agnostic* prompt templates $g_n=[V_1]\dots[V_E][object]$ and $g_a=[W_1]\dots[W_E][damaged][object]$, where $[V_i],[W_i]$ are learnable word embeddings and the class name is replaced by the literal word "object" (§3.2). The paper's hypothesis is that anomaly patterns (scratches, misplacement, tumours) are shared across object classes and domains while object semantics are not, so removing the class name lets the prompts encode generic normality and abnormality (§3.2).

Scoring follows CLIP's softmax over two classes with cosine similarity and temperature $\tau$ (Eq. 1): $P(g_c,f_i)=\exp(\langle g_c,f_i\rangle/\tau)/\sum_{c\in C}\exp(\langle g_c,f_i\rangle/\tau)$ ($C=\{n,a\}$ here); $P(g_a,f_i)$ is the image-level anomaly score, and applying the same formula to patch tokens $f_i^{m(j,k)}$ gives pixel maps $S_n,S_a$ (§2).

Training minimises a "glocal" loss (Eq. 2) $L_{total}=L_{global}+\lambda\sum_{M_l\in\mathcal{M}}L^{M_l}_{local}$, with $L_{global}$ a cross-entropy on image-level normal/abnormal labels and $L_{local}=\mathrm{Focal}(\mathrm{Up}([S_n,S_a]),S)+\mathrm{Dice}(\mathrm{Up}(S_n),I-S)+\mathrm{Dice}(\mathrm{Up}(S_a),S)$ computed per selected intermediate layer (§3.3). Two further modules help: (i) *text-space refinement* — learnable token embeddings replace the first $Q$ of $P$ token embeddings in each of the first layers of the text encoder, re-initialised at every layer (Eq. 3, §3.3); (ii) *DPAM* (Diagonally Prominent Attention Map) — in the frozen visual encoder, the Q-K self-attention of later blocks is replaced by a diagonally prominent variant (Q-Q, K-K or V-V; V-V is the default), improving local patch semantics without training the encoder (§3.3).

Inference: for pixel maps the per-layer $S_n,S_a$ are upsampled, combined as $\sum_{M_l}\big(\tfrac12(I-\mathrm{Up}(S_{n,M_l}))+\tfrac12\mathrm{Up}(S_{a,M_l})\big)$ and smoothed by a Gaussian filter $G_\sigma$ (§3.3). One forward pass produces both image score and map; the paper contrasts this with WinCLIP's multiple window passes (§5).

# Claimed contributions

- C1: "We reveal for the first time that learning object-agnostic text prompts of normality and abnormality is a simple yet effective approach for accurate ZSAD." (§1, first bullet)
- C2: A new ZSAD method, AnomalyCLIP, combining an object-agnostic prompt template and a glocal (global + local) loss; "largely simplifies the prompt design", needs only two learned prompts versus WinCLIP's "hundreds of manually defined prompts" and no per-domain change. (§1, second bullet)
- C3: Comprehensive experiments on 17 industrial and medical datasets showing "superior ZSAD performance" in detecting and segmenting anomalies. (§1, third bullet; §4)
- C4 (secondary, from §3.3/§4.3): DPAM and learnable text-encoder tokens as modules each contributing to performance (Table 4 ablation).

# Assumptions

1. Anomaly patterns in the auxiliary data resemble those in target data even when object semantics differ (soft; §1 states the prompts recognise abnormality "that has similar abnormal patterns to those in auxiliary data"). Transfer degrades when this fails: tuning on industrial MVTec AD gives lower medical results than tuning on a medical auxiliary set (Tables 2 vs 3, §4.2).
2. Auxiliary data with *both* image-level labels and pixel-level masks is available (hard; needed for $L_{global}$ and $L_{local}$). The paper had to construct such a set from ColonDB for the medical study because "there are no available large 2D medical datasets that include both image-level and pixel-level annotations" (§4.2).
3. Frozen CLIP ViT-L/14@336px backbone and the CLIP patch-token / text-embedding space are used as-is (hard; §4.1).
4. Benchmark protocol caveat: AnomalyCLIP is fine-tuned on the *test* data of MVTec AD to evaluate on the other datasets, and on the test data of VisA to evaluate MVTec AD (§4.1, Appendix A.1). Zero-shot here means zero target-domain data, not "no anomalous labels in training".

# Failure regime

- Cross-domain gap: image-level COVID-19 AUROC is 80.1 when tuned on MVTec AD (Table 2) but 70.9 when tuned on the ColonDB-derived medical set (Table 3); ISIC (skin) similarly does not benefit because colon polyp appearance "differs significantly from that of diseased skin or chest" (§4.2). Medical performance is "relatively low" compared with industrial (§4.2).
- Versus training-based one-class methods on the same benchmark, AnomalyCLIP is clearly behind on object datasets with strong normal-data fitting: MVTec AD image-level (AUROC, AP) is (91.5, 96.2) versus PatchCore (99.0, 99.7) and RD4AD (98.7, 99.4); VisA (82.1, 85.4) versus (94.6, 95.9) and (95.3, 95.7) (Appendix D, Table 7). It is competitive or better on DAGM and SDD (Table 7).
- Over-long or over-deep prompt refinement hurts generalisation: performance declines for $E$ above 12 and when the text-refinement depth reaches 9 ("excessive and impairs the generalization", Appendix D, Fig. 7). ($E=12$ and depth 9 are listed as the chosen defaults in Appendix A.1, which seems at odds with the "drops ... when M equals 9" sentence — unclear; marked ?.)
- Pixel-level attention choice matters: Q-Q matches V-V on segmentation but loses image-level accuracy; K-K is good for classification but worse at segmentation (§4.3, Fig. 6).
- No Limitations section is present in this version (v12); failure cases are not discussed qualitatively beyond the medical-domain remarks above.

# Numerical sensitivity

- Hyper-parameters (Appendix A.1, §4.1): learnable word-embedding length $E=12$; learnable token embeddings attached to the first 9 text-encoder layers, each of length 4; $\lambda=4$; DPAM applied from the 6th visual layer; local features taken from the top layer only (the paper says multiple intermediate layers are supported, footnote 1 of §3.1); input 518, batch size 8, Adam, learning rate 0.001, 15 epochs; Gaussian smoothing $\sigma=4$ at test time; single RTX 3090.
- The anomaly-word is replaceable: swapping "damaged" for "anomalous", "flawed", "defective" or "blemished" changes MVTec AD image AUROC by at most ~0.2 points; larger swings elsewhere, e.g. BTAD image-level AUROC 88.3 (damaged) to 84.8 (anomalous/defective) and SDD 84.7 to 82.3 (Appendix D, Table 8).
- CLIP temperature $\tau$ is not stated in the paper text ("a temperature hyperparameter", Eq. 1) ?.
- Evaluation numbers throughout are dataset means over sub-categories (§4.1).

# Applicability

- Use when: no normal or anomalous training images exist for the target (privacy-restricted data, new product line), a coarse anomaly map plus image score is acceptable, and an auxiliary dataset with masks is available (§1).
- Don't use when: a few hundred normal target images are available and best accuracy on MVTec/VisA-style categories matters — the one-class memory-bank and student-teacher methods score markedly higher (Appendix D, Table 7).
- Compared against: CLIP, CLIP-AC, WinCLIP, VAND, CoOp (Tables 1 and 2: industrial and medical groups); PatchCore and RD4AD as "full-shot" references (Table 7).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| `clip` (radford2021-clip) | "we introduce a novel approach, namely AnomalyCLIP, to adapt CLIP for accurate ZSAD" (§1); backbone frozen, ViT-L/14@336px (§4.1) | feeds_into (CLIP -> AnomalyCLIP) | high | Chronology OK (2021 <= 2023). Intellectual lineage: CLIP's two-encoder, text-prompt scoring (Eq. 1) is the method's core component, not just a data-flow input. Follow the upstream convention: authored on `clip`'s page only if/when a target page `anomalyclip` exists. |
| jeong2023-winclip (registered in index, no research note, no page) | "WinCLIP ... is a seminal work in the ZSAD line, which designs a large number of artificial text prompts"; "involves multiple forward passes of image patches for anomaly segmentation" (§1, §5); AnomalyCLIP "can obtain segmentation results with just a single forward pass" (§5) | compared_with (medium); not generalized_by | medium | Same problem (ZSAD). Not a clean Rule A case: WinCLIP needs no training data while AnomalyCLIP needs auxiliary data with masks, so AnomalyCLIP does not "recover everything" WinCLIP does. Cannot commit a target: ingest WinCLIP and give it a page first. |
| VAND (Chen et al. 2023, arXiv:2305.17382) - not registered | "VAND introduces learnable linear projection techniques to enhance the modeling of local visual semantics. However, these approaches suffer from insufficiently generalized textual prompt embeddings" (§5) | compared_with (medium) | medium | No page, not registered. Table 1-2 baseline. |
| CoOp (Zhou et al. 2022b) - not registered | "CoOp introduces learnable text prompts for few-shot classification"; "Instead, AnomalyCLIP proposes object-agnostic prompt learning for anomaly detection" (§5); Fig. 1e shows CoOp prompts fail to generalise | none (different problem: classification prompt learning) | - | Rule B; the learned-prompt idea is the technique being repurposed, but there is no Atlas page to link. |
| `patchcore` (roth2022-patchcore) | "AnomalyCLIP achieves comparable anomaly detection and segmentation performance compared to PatchCore and RD4AD, and it even outperforms them in some datasets" (Appendix D, Table 7) | none (Rule B) | - | Different setting (zero-shot with auxiliary data versus one-class with target normal images), and the same table shows PatchCore far ahead on MVTec AD / VisA. The paper itself calls them "full-shot". A reader choosing between them is deciding by data availability, not by method preference; if the user wants an edge, `compared_with` low confidence with a `caution:` is the only defensible option. |
| AnomalyGPT (Gu et al. 2023) - not registered | "concurrent work in utilizing foundation models for AD, but it is designed for unsupervised/few-shot AD with manually crafted prompts" (§5) | none | - | Concurrent, different setting; no page. |
| DenseCLIP (Rao et al. 2022), ACR (Li et al. 2023a), CLIP-AD, ZOC - not registered | §5 positioning (extra decoder network; requires target-relevant tuning; classification only) | none | - | No pages. |

# Connections

- Builds on: [radford2021-clip, jeong2023-winclip]. (The index lists `cites: [radford2021-clip, jeong2023-winclip]`.) Also builds on visual-prompt/text-prompt tuning (Jia et al. 2022; Khattak et al. 2023), focal loss (Lin et al. 2017) and dice loss (Li et al. 2019), none registered.
- Enables: later CLIP-based zero-shot AD work; cited by `mokhtar2025-velm` as one of the LLM/VLM zero-/few-shot detection methods that "predominantly focus on detecting the presence of anomalies rather than characterizing their attributes" (VELM §2.2, ref [27]).
- Refutes / supersedes: none claimed (claims better ZSAD performance than WinCLIP, VAND, CoOp on the paper's benchmark).

# Atlas update plan

Role: new page candidate (model) plus a supplementary update to the survey. The survey `visual-anomaly-detection` does not currently cite this paper, so the strict "sources.references" test for a supplementary update is not met; the survey's scope is one-class learning from defect-free images, so AnomalyCLIP sits at its boundary rather than inside it.

## NEW: anomalyclip
Type: model
Category: anomaly-detection (follow whatever `domain:` the survey and the three method pages use; `domain: anomaly-detection` in `visual-anomaly-detection`)
Primary source: this paper

Page-creation criterion: met for a model page. There is a clear technical contribution not on any existing page: a two-prompt object-agnostic template, a glocal loss (Eq. 2), per-layer learnable text tokens (Eq. 3) and the V-V DPAM modification. Hard blockers before authoring: (a) WinCLIP is registered but has no note or page, so the main comparison counterpart is missing - `paper-ingest` jeong2023-winclip first; (b) the reference implementation (github.com/zqhang/AnomalyCLIP, stated in the Abstract) needs a licence check for `implementations[]`.

- Goal/Motivation: ZSAD with a frozen CLIP; why class-name prompts fail (CLIP aligns object semantics, not abnormality; Fig. 1; §1).
- Architecture: the two templates $g_n,g_a$; Eq. 1 scoring; DPAM with V-V attention from layer 6; text-encoder token replacement (E=12, first 9 layers, 4 tokens); Eq. 2 glocal loss with focal + dice; inference map formula with $\sigma=4$.
- Training: auxiliary data protocol (train on MVTec AD test split to evaluate others; VisA for MVTec AD), 15 epochs, Adam lr 0.001, batch 8, 518 px.
- Assessment: Table 1 headline numbers (MVTec AD image 91.5/96.2, pixel 91.1/81.4; VisA image 82.1/85.4, pixel 95.5/87.0); ablations (Table 4: DPAM, object-agnostic prompts, text tuning each add; Table 5: both loss terms); Table 7 gap to PatchCore/RD4AD; protocol caveat (test split used as auxiliary data).
- Prerequisites to propose: `clip`, `vit`; consider `attention-mechanism` for DPAM.

## UPDATE: visual-anomaly-detection
Section: Definition (scope sentence) and Where it appears / a closing "beyond one-class" paragraph
- Add one sentence marking the zero-shot setting (auxiliary-data-trained, no target images) as outside the one-class framework, citing this paper as the example, so the survey's one-class claim stays precise.
- If the new `anomalyclip` page is written, list it under the "not registered" / adjacent-methods note and add this paper to `sources.references`.
- Optional: one sentence from Table 7 that a zero-shot CLIP-based method trails one-class PatchCore by ~7.5 AUROC points on MVTec AD image-level (91.5 vs 99.0) - useful as a calibration for the "Use when: only a handful of normal images" row.

## UPDATE: clip
Section: Assessment / downstream use
- One bullet: CLIP adapted to anomaly detection by learning two object-agnostic prompts and replacing Q-K with V-V attention in the frozen visual encoder (this paper); pointer to the new page once it exists. No `Relations:` line recorded (needs confirmation; see Stated relations row 1).

# Provenance

1. Setting: ZSAD definition, auxiliary data - Abstract, §1 first paragraph.
2. 17 datasets, split 7 industrial / 10 medical, metrics - §4.1 "Datasets and Evaluation Metrics".
3. Eq. 1 (CLIP class probability with temperature) - §2 Preliminary, Eq. (1).
4. Object-agnostic templates $g_n,g_a$ - §3.2 (two displayed template lines).
5. Eq. 2 and $L_{local}$ definition - §3.3 "Glocal context optimization", Eq. (2) and the following display.
6. Eq. 3 (layer-wise token refinement, $P,Q$ notation) - §3.3 "Refinement of the textual space", Eq. (3).
7. DPAM, V-V default - §3.3 "Refinement of the local visual space"; Appendix C (V-V rationale).
8. Inference map formula with $G_\sigma$ - §3.3 "Training and Inference".
9. Hyper-parameters $E=12$, 9 layers, $\lambda=4$, ViT-L/14@336px - §4.1 "Implementation details"; token length 4, DPAM from layer 6, 518 px, batch 8, Adam lr 0.001, $\sigma=4$, 15 epochs - Appendix A.1.
10. Test-data fine-tuning protocol - §4.1 and Appendix A.1.
11. Table 1 numbers (industrial), Table 2 (medical, MVTec-tuned), Table 3 (medical, ColonDB-tuned) - §4.2.
12. Ablations: Table 4 (T1/T2/T3), Table 5 (local/global) - §4.3; Fig. 6 (Q-Q, K-K, V-V) - §4.3.
13. Table 7 vs PatchCore, RD4AD - Appendix D "Comparison with SOTA full-shot methods".
14. Hyper-parameter trends ($E$, depth, length, $\lambda$) - Appendix D "Hyparameter analysis", Fig. 7.
15. Prompt-word ablation - Appendix D, Table 8.
16. Related-work positioning (WinCLIP, VAND, CoOp, DenseCLIP, ACR, AnomalyGPT) - §5.
17. Citation in VELM - `mokhtar2025-velm` §2.2 (ref [27]).
