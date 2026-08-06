---
title: "Visual Anomaly Detection"
date: 2026-08-06
summary: "One-class detection and localisation of defects from defect-free training images only, organised by the structural-versus-logical anomaly distinction and surveying the student-teacher, memory-bank, and feature-space-autoencoder method families."
tags: ["survey", "deep-learning", "dense-prediction"]
author: "Vitaly Vorobyev"
domain: anomaly-detection
difficulty: intermediate
prerequisites:
  - convolutional-neural-network
sources:
  references:
    - bergmann2019-mvtec-ad
    - bergmann2022-mvtec-loco
    - zou2022-visa
    - bergmann2020-uninformed-students
    - roth2022-patchcore
    - batzner2023-efficientad
  notes: |
    Survey concept page per docs/README.md §4: three surveyed methods
    (uninformed-students, patchcore, efficientad), decision table near the
    top, >=800 words. AST and GCAD appear as context only — neither has a
    page.

    Metric attribution is deliberate. AU-PRO is defined in none of the
    cited papers: MVTec AD 2019 never uses the term, MVTec LOCO always
    spells out "area under the sPRO curve" and credits plain PRO to prior
    work, and VisA argues for AU-PR over AU-ROC without using AU-PRO. The
    AU-PRO definition lives in the 2021 IJCV MVTec AD extension, which is
    not ingested — the page must not attribute it to a source it cites.

    Latency figures are not cross-comparable: AST reports student-only
    inference on an RTX 1080 Ti, EfficientAD end-to-end on an RTX A6000,
    PatchCore seconds-per-image on unstated hardware. The decision table
    carries the measurement basis per row rather than ranking a single
    latency axis.
---
# Definition

Visual anomaly detection is framed as one-class learning: a detector is fit to a training set $D = \{I_1, I_2, \dots, I_N\}$ containing only defect-free images of a fixed object or scene category, with no anomalous images available at training time and none in the validation set used to fit any hyperparameter or threshold. At test time the detector classifies a new image as normal or anomalous and, in most formulations, produces a dense per-pixel anomaly score map for localization.

Training-set purity is not a convenience; it is the field's defining constraint. The benchmark protocol that anchors this framework states it directly: "The training set contains only images without defects." Hyperparameters and thresholds are likewise estimated without the knowledge of any anomalous images. No detector surveyed here is permitted to see a single defective example before test time.

Anomalies split into two classes that a single detector need not handle with equal skill:

:::definition[Structural vs. logical anomaly]
- **Structural** — a new, locally confined visual structure absent from the training distribution: a scratch, dent, contamination, or discoloration. Detectable in principle by an operator with a small receptive field.
- **Logical** — a violation of a compositional constraint of the training distribution's structure: a permissible object in an invalid location, or a required object missing or duplicated. Need not introduce any new local visual structure — only the joint arrangement is wrong.
:::

A minimal synthetic case makes the distinction concrete: on a background showing exactly one black circle, a colour-altered circle is a structural anomaly, but a second circle elsewhere in the frame is a logical anomaly — no individual local region in that second image is anomalous on its own, only the count is. The boundary is not always sharp, and corner cases exist where the label is ambiguous. The distinction matters because a detector's receptive field determines which class it can see at all: a detector that only compares small local patches to their nearest known-normal counterpart has no way to notice that a globally valid patch has appeared in the wrong place, or the wrong number of times.

# Mathematical Description

Three method families implement the one-class framework by different mechanisms: regressing a fixed teacher's dense features with a trained ensemble or a loss-shaped single network (student–teacher), matching test-image patches against a stored bank of nominal patch features (memory-bank / kNN), and reconstructing a frozen teacher's feature output through an information bottleneck (autoencoder-in-feature-space).

| Method | Family | Use when | Avoid when | Typical cost | Typical accuracy |
|---|---|---|---|---|---|
| **Uninformed Students** | Student–teacher ensemble | Anomaly-free data is abundant; anomaly scale is roughly known or can be swept via multi-scale ensembles; dense, high-resolution segmentation is the deliverable. | Only a handful of anomaly-free training images exist (a 1-NN baseline wins there); training $M$ full CNN ensembles per receptive-field scale is not affordable. | Trains $M=3$ students at each of typically 3 receptive-field scales $p \in \{17, 33, 65\}$; the teacher is pretrained once, off-domain, on ImageNet; no official inference-latency figures are reported. | Mean normalized PRO-curve area 0.857 at a single scale ($p=65$), 0.914 with multiscale averaging (MVTec AD); the paper does not report AU-ROC on MVTec AD. |
| **PatchCore** | Memory-bank / kNN | Genuinely cold-start deployment across many product categories with no gradient training per category; only a small number of nominal images exist for a new category. | The inspected domain is far from natural-image statistics, so frozen ImageNet features carry little signal and no feature adaptation is acceptable; a hard real-time budget well below ~0.17–0.6 s/image is required without approximate nearest-neighbour search. | One forward pass over nominal images to populate the memory bank, plus greedy coreset selection — no gradient-based training; inference 0.17–0.6 s/image depending on the coreset subsampling percentage retained. | MVTec AD image-level AU-ROC up to 99.6% (best multi-backbone ensemble); 99.1% at the default single-backbone, 25% coreset configuration; pixel-level AU-ROC 98.1%, PRO 93.5% at 10% coreset. |
| **EfficientAD** | Hybrid: student–teacher + autoencoder-in-feature-space | Per-image latency must be in the low-millisecond range or high throughput is required; both structural and logical anomalies must be covered by one model; ~20 minutes of training per scenario is acceptable. | Anomalies are sub-millimetre dimensional tolerances that need metrology-grade measurement instead of appearance scoring; a no-training, kNN-style deployment (PatchCore-style) is required. | 2.2 ms/image (EfficientAD-S) or 4.5 ms/image (EfficientAD-M), end-to-end, measured on an RTX A6000 at batch size 1; roughly 20 minutes of training per scenario. | 95.4% (S) / 96.0% (M) mean AU-ROC across MVTec AD + MVTec LOCO + VisA; 98.8% (S) / 99.1% (M) AU-ROC on MVTec AD alone under the paper's own clean, non-early-stopped protocol. |

## Student–teacher residual scoring

A fixed teacher network $T$ is a fully-convolutional feature extractor that emits a $d$-dimensional descriptor at every pixel, each descriptor summarizing a square receptive-field patch of side $p$ centered on that pixel. In Uninformed Students, $T$ outputs descriptors of dimension $d=128$, distilled from a pretrained classification network on ImageNet crops the target domain never appears in.

:::definition[Student ensemble regression error]
An ensemble of $M$ students $S_i$, sharing the teacher's architecture but randomly initialized, is trained only on anomaly-free images to regress the teacher's per-pixel output, normalized by the training-set descriptor mean $\mu$ and standard deviation $\sigma$. The per-pixel regression error is the squared distance between the students' mean prediction and the normalized teacher target:

$$
e_{(r,c)} = \left\| \frac{1}{M}\sum_{i=1}^{M} \mu^{S_i}_{(r,c)} - \big(y^T_{(r,c)} - \mu\big)\,\mathrm{diag}(\sigma)^{-1} \right\|_2^2 .
$$
:::

A second, independent signal is the ensemble's own disagreement: the predictive variance $v_{(r,c)}$, computed from the mixture-variance formula for a uniform-weight Gaussian mixture with constant per-component covariance. The two terms are z-normalized against a held-out anomaly-free validation set and summed, then averaged across receptive-field scales $p \in \{17, 33, 65\}$ to give the final multi-scale anomaly map. Regression error is high where the ensemble agrees but agrees *wrongly*; predictive variance is high where the students disagree with each other, independent of whether their consensus is close to the teacher.

EfficientAD's local branch reuses the student–teacher residual, but trains a single student — not an ensemble — with a *hard feature loss* rather than plain regression, and keeps the student architecturally identical to its teacher; the asymmetry is loss-induced, not structural. Per-channel squared error is

$$
D_{c,w,h} = \big(T(I)_{c,w,h} - S(I)_{c,w,h}\big)^2,
$$

and training restricts gradient signal to the hardest fraction of locations: the $p_{hard}$-quantile $d_{hard}$ of the error map sets the cutoff, with $p_{hard}=0.999$ corresponding, on average, to the hardest ten percent of the values — a construction analogized to Online Hard Example Mining. The local anomaly map averages $D$ over channels, $M_{w,h} = C^{-1}\sum_c D_{c,w,h}$. Asymmetric Student-Teacher (AST, not registered on this site) enforces the same generalization gap by an architectural route instead of a loss-induced one: its teacher is a bijective normalizing flow and its student a conventional, non-bijective CNN, so the student is structurally unable to follow the teacher's divergence on out-of-distribution inputs. Both routes attack the failure mode Uninformed Students exposed — an architecturally symmetric student generalizes too well to anomalies it never saw during training.

## Memory-bank / kNN scoring

:::definition[PatchCore memory bank]
Every nominal training image contributes a dense grid of locally-aware patch features, extracted from an ImageNet-pretrained CNN backbone at mid-level hierarchy depth (WideResNet-50, blocks 2 and 3 by default). The union of all such features, from every nominal training image, forms the memory bank $M$. Because $M$ grows with dataset size, it is reduced by greedy coreset subsampling — a minimax facility-location selection that keeps a small subset covering the same region of feature space, made tractable on high-dimensional CNN features by a Johnson–Lindenstrauss random projection to a lower dimension before the greedy search runs.
:::

At test time, each patch feature of a query image is matched to its nearest neighbour in the (subsampled) memory bank by L2 distance; the maximum such distance over all patches is the raw image-level anomaly score. The raw score is then reweighted by how isolated the *matched nominal feature itself* is relative to its own neighbours in the bank, rewarding matches to borderline nominal regions over matches to well-supported ones. The same per-patch distances, realigned to their spatial position and upsampled, give the segmentation map.

## Autoencoder reconstruction in feature space

Reconstructing the raw image is not the target in this family — the reconstruction target is the teacher's *feature output*, because raw-pixel reconstruction blurs high-frequency texture regardless of whether the input is normal or anomalous. EfficientAD's global branch trains a convolutional autoencoder $A$ to reconstruct the teacher's feature map through a 64-dimensional bottleneck:

$$
L_{AE} = (CWH)^{-1}\sum_c \big\|T(I)_c - A(I)_c\big\|_F^2 .
$$

The bottleneck is narrow enough that $A$'s reconstructions are flawed even on normal images, so using the raw autoencoder-vs-teacher residual directly would false-positive on ordinary background texture. EfficientAD's fix gives the student network a second output head trained to predict $A$'s output as well as $T$'s; the global anomaly map is the squared difference between $A$'s output and this second student head, because the student learns to reproduce the autoencoder's *systematic* errors on normal images — which then cancel in the residual — but cannot reproduce its behaviour on inputs it never trained on. The two branches' score maps are combined after independent quantile normalization, $M = 0.5\hat{M}^{ST} + 0.5\hat{M}^{AE}$.

A predecessor two-branch design, GCAD (Global Context Anomaly Detection, not registered on this site), splits the same local/global responsibility differently: a local branch $E_{loc}/R_{loc}$ that reuses the Student-Teacher architecture and pretraining protocol covers structural anomalies, and a global branch compresses the whole image through a bottleneck encoder $E_{glo}$, matched by an unconstrained regression network $R_{glo}$, to cover logical constraints:

$$
L_{loc}(I)=\|E_{loc}(I)-R_{loc}(I)\|_F^2, \qquad
L_{glo}(I)=\|E_{glo}(I)-R_{glo}(I)\|_F^2,
$$

with a knowledge-distillation term $L_{kd}(I)=\|E_{loc}(I)-U(E_{glo}(I))\|_F^2$ tying the global bottleneck to the local branch's descriptors, combined per-branch-depth-normalized as $L(I)=\frac{1}{d_{loc}}L_{kd}(I)+\frac{1}{d_{glo}}L_{glo}(I)+\frac{1}{d_{loc}}L_{loc}(I)$. Scores are combined analogously to EfficientAD's, but with per-branch z-score normalization rather than quantile normalization: $A=\frac{A_{loc}-\mu_{loc}}{\sigma_{loc}}+\frac{A_{glo}-\mu_{glo}}{\sigma_{glo}}$.

## Evaluation metrics

Image-level anomaly detection is scored by AU-ROC — the area under the true-positive-rate-vs-false-positive-rate curve as the classification threshold sweeps — because it is threshold-independent and therefore comparable across categories without picking an operating point. Under the severe class imbalance typical of pixel-level anomaly maps, where most pixels are normal, AU-ROC can look strong even when precision at any usable operating point is poor: a toy two-model comparison at a 1:1,000 imbalance ratio contrasts a model at AU-ROC 99.5% but AU-PR only 10.5% against a second model at a lower AU-ROC (98.5%) but far better AU-PR (90.6%), motivating AU-PR as a complementary pixel-level metric under imbalance.

Pixel-level localization is scored by per-region overlap rather than raw pixel AU-ROC, because a single large false-positive region and many small missed regions can otherwise produce the same pixel-level score. The saturated per-region overlap (sPRO) metric is defined as

$$
sPRO(P)=\frac{1}{m}\sum_{i=1}^m \min\!\left(\frac{|A_i\cap P|}{s_i},1\right),
$$

with ground-truth defect regions $\{A_1,\dots,A_m\}$, predicted anomalous pixels $P$, and per-region saturation thresholds $0 < s_i \le |A_i|$ chosen per defect type: the full region area for structural defects, an estimated typical-object area for a missing object, the area of the extraneous instance(s) for an additional object, and the minimal sufficient sub-region for other logical violations. When $s_i=|A_i|$ for every region, $sPRO(P)=PRO(P)$ — the earlier, unsaturated per-region overlap metric used by student–teacher-family papers before the structural/logical taxonomy required saturation. The reported score is the normalized area under the (s)PRO curve, integrated only up to a bounded false-positive-rate limit, because segmentation results at high false-positive rates are not practically meaningful — but the limit itself is not a fixed constant: MVTec LOCO integrates to $L=0.05$ by default, and Uninformed Students integrates its PRO curve to an average per-pixel false-positive rate of 30%. Scores computed at different integration limits are not directly comparable.

None of the sources surveyed here use the abbreviation "AU-PRO." MVTec AD's original benchmark protocol never mentions per-region overlap at all; Uninformed Students reports "normalized area under the PRO-curve" and does not use the term "AU-PRO" anywhere in its text; MVTec LOCO always spells out "area under the sPRO curve" or "area under the PRO curve" and credits plain PRO to prior work rather than originating it; VisA argues for AU-PR instead of any PRO-family metric and never mentions AU-PRO. The abbreviation, and its associated false-positive-rate-cutoff convention, originates in the 2021 IJCV extension of MVTec AD — the cited source of the AU-PRO metric in later papers, but a paper not covered by any note behind this page.

# Numerical Concerns

**Score-map normalization.** Raw anomaly scores from different branches or scales are not on comparable numerical ranges and cannot be summed directly. EfficientAD normalizes each map type independently, mapping the 0.9-quantile of its normal-image validation score distribution to a fixed output value of 0 and its 0.995-quantile to 0.1, before averaging the two branches. Replacing this quantile normalization with a mean/variance Gaussian normalization on the same validation scores costs 0.7 AU-ROC points on EfficientAD-S (95.4 → 94.7): raw score distributions vary in shape between deployment scenarios, and quantile normalization is distribution-free where a Gaussian assumption is not. The exact quantile levels chosen matter far less than the choice of normalization family — sweeping either quantile across a wide range moves AU-ROC by only a few tenths of a point. GCAD's z-score combination and Uninformed Students' per-term z-normalization before summing regression error and predictive variance are both instances of the Gaussian-family alternative that EfficientAD's own ablation shows quantile normalization outperforming.

**Threshold portability.** None of the surveyed scores are calibrated probabilities; each is meaningful only for ranking or thresholding within one trained model on one scenario. A threshold fit from anomaly-free-only validation data — the only data the one-class protocol allows — can produce a high ranking-quality AU-ROC while the thresholded segmentation at that same threshold performs poorly on a per-region basis: MVTec AD's own benchmark documents this gap directly, noting that a high ROC AUC does not necessarily coincide with a high per-region overlap of the segmentation at the estimated threshold. A threshold fit on one scenario, one backbone, or one image resolution does not transfer to another without refitting.

**Evaluation-protocol validity.** EfficientAD's own paper documents an invalid benchmarking practice in a competing method (SimpleNet): the model is repeatedly evaluated on all test images during training, and the maximum test score obtained is reported afterward — a technique the authors disable in their comparison because it overestimates the actual performance on unseen images and would require anomalous validation data the one-class benchmark protocol does not provide. EfficientAD's own headline numbers (95.4% / 96.0% overall AU-ROC; 98.8% / 99.1% on MVTec AD alone) are reported with this technique disabled. With early stopping enabled, EfficientAD itself achieves an image-level detection AU-ROC of 99.8% on MVTec AD — obtained under exactly the practice the paper disqualifies for SimpleNet, and not comparable to its own clean-protocol numbers.

**Precision.** EfficientAD's inference is reported robust to half precision: switching inference from float32 to float16 does not change the anomaly detection results across the scenarios the paper evaluates, and float16 is what its headline latency numbers (2.2 ms / 4.5 ms) use. No comparable precision-sensitivity study appears in the Uninformed Students or PatchCore sources.

**Memory-bank size vs. latency (kNN methods).** PatchCore's accuracy degrades gracefully as the memory bank shrinks — 99.1% / 99.0% / 99.0% image-level AU-ROC at 25% / 10% / 1% coreset subsampling — but naive, non-coreset random subsampling loses significant information available in the bank and can drop entire clusters of a multi-modal feature distribution; coreset selection exists specifically to avoid this. Reported inference time ranges 0.17–0.6 s/image depending on the coreset percentage retained. Coarsening the patch grid stride instead of subsampling the bank trades accuracy for a smaller bank more directly: stride $s=2$ gives an image anomaly detection AUROC of 97.6%, and $s=3$ gives 96.8%, against the $s=1$ default's higher accuracy.

**Sensitivity to the frozen backbone.** All three families depend on a pretrained, frozen feature extractor, and that dependency is not equally consequential across them. PatchCore's accuracy has a clear optimum in backbone hierarchy depth — mid-level features (blocks 2+3) are the default, both shallower and deeper choices measurably hurt, and the optimal depth is itself domain-relative: a pedestrian-surveillance dataset needs deeper hierarchy levels 3+4 instead of the industrial default 2+3. EfficientAD is comparatively backbone-robust on MVTec AD (AU-ROC in the 98.8–99.2 range across WideResNet-101, ResNeXt-101, and DenseNet-201 distillation targets) but markedly more sensitive on MVTec LOCO (EfficientAD-M: 90.7% / 89.9% / 88.3% across the same three backbones). On that same backbone-robustness comparison, PatchCore is *more* backbone-sensitive than EfficientAD specifically on MVTec LOCO (80.3% / 78.9% / 76.5%) — a same-table, same-protocol comparison EfficientAD's own authors ran, not a cross-paper inference. Uninformed Students reports no backbone-choice ablation at all: its teacher is distilled once from a fixed pretrained classification network and never varied.

# Where it appears

- **uninformed-students** instantiates student–teacher residual scoring in its original ensemble form: $M=3$ students per receptive-field scale, trained by squared-$\ell_2$ regression against a fixed, off-domain teacher, scored by the sum of regression error and predictive variance.
- **patchcore** instantiates memory-bank / kNN scoring: a coreset-subsampled bank of mid-level WideResNet-50 patch features, scored by reweighted nearest-neighbour distance at test time, with no gradient-based training on the target domain at all.
- **efficientad** instantiates a hybrid of student–teacher residual scoring and autoencoder-in-feature-space reconstruction in a single model: a loss-induced-asymmetric student–teacher pair for structural anomalies, and a teacher-feature autoencoder plus a second student head for logical ones, combined by quantile-normalized averaging.

Two further methods shape this framework but are not registered on this site. Asymmetric Student-Teacher (AST) is the direct architectural counterpoint to EfficientAD's local branch, achieving the same generalization-suppression goal through a bijective normalizing-flow teacher instead of a shaped training loss; its own reported latency figures are a student-network-depth ablation (3.4–29.4 ms depending on depth, teacher-only 4.5 ms) measured on a different GPU (RTX 1080 Ti) than EfficientAD's end-to-end RTX A6000 numbers above, and the two are not directly comparable on that basis. GCAD, from the MVTec LOCO benchmark paper, is the direct architectural predecessor to EfficientAD's global branch: the first two-branch local/global design built specifically to separate structural from logical anomaly detection, using z-score rather than quantile score combination.

# References

1. P. Bergmann, M. Fauser, D. Sattlegger, C. Steger. *MVTec AD — A Comprehensive Real-World Dataset for Unsupervised Anomaly Detection.* CVPR, 2019. [PDF](https://openaccess.thecvf.com/content_CVPR_2019/papers/Bergmann_MVTec_AD_--_A_Comprehensive_Real-World_Dataset_for_Unsupervised_Anomaly_CVPR_2019_paper.pdf)
2. P. Bergmann, K. Batzner, M. Fauser, D. Sattlegger, C. Steger. *Beyond Dents and Scratches: Logical Constraints in Unsupervised Anomaly Detection and Localization.* IJCV, 2022. [PDF](https://mediatum.ub.tum.de/download/1782820/1782820.pdf)
3. P. Bergmann, M. Fauser, D. Sattlegger, C. Steger. *Uninformed Students: Student-Teacher Anomaly Detection With Discriminative Latent Embeddings.* CVPR, 2020. [arXiv:1911.02357](https://arxiv.org/pdf/1911.02357)
4. K. Roth, L. Pemula, J. Zepeda, B. Schölkopf, T. Brox, P. Gehler. *Towards Total Recall in Industrial Anomaly Detection.* CVPR, 2022. [arXiv:2106.08265](https://arxiv.org/pdf/2106.08265)
5. K. Batzner, L. Heckler, R. König. *EfficientAD: Accurate Visual Anomaly Detection at Millisecond-Level Latencies.* arXiv, 2023. [arXiv:2303.14535](https://arxiv.org/pdf/2303.14535)
