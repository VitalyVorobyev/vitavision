---
paper_id: mokhtar2025-velm
title: "Detect, Classify, Act: Categorizing Industrial Anomalies with Multi-Modal Large Language Models"
authors: ["S. Mokhtar", "A. Mousakhan", "S. Galesso", "J. Tayyub", "T. Brox"]
year: 2025
url: https://arxiv.org/pdf/2505.02626
created: 2026-10-03
relevant_atlas_pages: [visual-anomaly-detection, patchcore]
---

# Setting

**Task**: *anomaly classification* - given a query image that an unsupervised detector flags as anomalous, assign it to one of a closed set of user-defined anomaly classes (e.g. broken_large, broken_small, contamination for a bottle). This is a step after detection and localisation, which the paper says is "largely unexplored" (Abstract; §1).

**Inputs** (per query, §3, §4.2): a query image; one randomly chosen normal reference image from the training set; an annotated copy of the query with the detected anomaly outlined by a red contour (the visual prompt); a structured text prompt (normal-object description, anomaly-class definitions, classification strategy; Fig. 4). Images are resized to 448x448 for the MLLM (§4.2).

**Outputs**: one anomaly class label per anomalous image; normal images are filtered out before the LLM and never classified (§3.1).

**Benchmarks introduced**: MVTec-AC and VisA-AC, relabelled versions of MVTec AD and VisA (§3.3).
- MVTec-AC: 36 misclassified samples corrected; four overlapping class pairs merged (poke/crack for capsule, cut/hole for carpet, thread side/thread top for screw, broken teeth/rough for zipper); toothbrush removed (a single trivial class); four "combined" anomaly classes excluded (§3.3.1).
- VisA-AC: classes with fewer than 10 samples removed; four highly similar classes merged; three misclassified samples corrected after manual review (§3.3.2).

# Core idea

VELM ("Vision Expert + Language Model") is a two-stage pipeline (§3, Fig. 3):

1. A *vision expert* - a pixel-level unsupervised detector, DDAD in the main experiments, PatchCore as the alternative - scores the image. If it is judged normal the pipeline stops ("this filtering significantly reduces false positives" seen when LLMs classify images directly, §3.1). Otherwise its anomaly map is turned into a red contour overlaid on the query (visual prompting, "inspired by" Denner et al. 2024, ref [11], §3.1).
2. A multimodal LLM (GPT-4o, GPT-4o-mini) receives the normal reference, the query, the contour image and a three-part text prompt and names the anomaly class (§3.2). Because classes are given in the prompt, they are "dynamic, user-defined"; no task-specific training is performed (§3.2; Conclusion).

The pipeline also supports a three-way split normal / negligible anomaly / critical defect by marking some anomaly classes as negligible in the prompt (§4.3). The speed argument: DDAD inference takes 35 ms, "significantly faster than LLMs (e.g., GPT-4 requires 96 ms per token)" (§3.1), so the LLM is only invoked for flagged images.

Metrics (§4.1): macro accuracy as per-class TP/(TP+FP+FN) averaged over anomaly classes of each object and then over objects (Eq. 1), macro F1 averaged the same way (Eq. 2), and Cohen's kappa $\kappa=(p_o-p_e)/(1-p_e)$ (Eq. 3). Note that Eq. 1 as printed divides TP by (TP+FP+FN), which is the per-class Jaccard/IoU form rather than the usual accuracy; the text still calls it "accuracy" (§4.1) ?.

# Claimed contributions

- C1: "we propose VELM, a novel LLM-based pipeline for anomaly classification" (Abstract); "the first pipeline specifically designed for anomaly classification" (§1); "the first anomaly classification framework designed explicitly for anomaly classification using multimodal large language models" (Conclusion).
- C2: A vision-expert-first design that keeps inference fast and reduces LLM false positives on normal parts (§3, §3.1).
- C3: Two refined benchmarks, MVTec-AC and VisA-AC, "which include accurate anomaly class labels for rigorous evaluation" (Abstract; §3.3).
- C4: State-of-the-art anomaly classification: "80.4% on MVTec-AD, exceeding the prior baselines by 5%, and 84% on MVTec-AC" (Abstract). Body numbers differ: Table 1 and §4.2.1 give 81.4% on MVTec-AD (see inconsistencies below).
- C5: A demonstration that the pipeline can separate negligible anomalies from critical defects (mean 89.8% in a simulated split, §4.3, Table 4).
- C6 (implied by ablation): all prompt components matter; omitting anomaly descriptions lowers mean accuracy most (Table 5).

# Assumptions

1. A closed set of anomaly classes with textual definitions is known in advance (hard). The authors name this the key limitation: "reliance on a closed set of user-defined classes" (§5.1).
2. A usable normal reference image exists (soft; removing it costs ~2.4 points, 84.0 -> 81.6, Table 5).
3. The vision expert localises anomalies well enough to draw a meaningful contour (hard for the pipeline's accuracy): oracle masks give 87.8% on MVTec-AC and 87.6% on VisA-AC, DDAD drops to 84.0% and 69.6%, PatchCore to 78.1% and 68.5% (Tables 2-3). "The performance drop ... suggests that noisy segmentation masks significantly impact classification accuracy" (§4.2.3).
4. The MLLM is a closed, external API model (GPT-4o / GPT-4o-mini), run with temperature 0 (§4.2); reproducibility depends on model versions ?.
5. Anomaly classes are visually distinguishable and consistently labelled; the paper's own relabelling shows the original MVTec AD labels were not (§3.3.1, Figs. 5-6).

# Failure regime

- Weak vision expert: VisA-AC accuracy falls from 87.6% (oracle) to 69.6% (DDAD) and 68.5% (PatchCore) (Table 3). PatchCore on MVTec-AC is 6 points below DDAD (78.1 vs 84.0, Table 2).
- Smaller MLLM: GPT-4o-mini lowers MVTec-AC accuracy to 75.7% and VisA-AC to 63.5% (DDAD as expert) (Tables 2-3).
- Hard categories: grid is the worst MVTec-AC class (66.7% with DDAD in Table 2 but 65.7% for the same configuration in Table 5, a small inconsistency; 67.9% with oracle masks), and VisA-AC candle/capsules/cashew sit near 50-75% with DDAD (Table 3 as extracted; per-class assignment partly garbled ?).
- Missing prompt parts hurt: without anomaly descriptions mean accuracy is 78.6%; without reference image 81.6%; without visual prompt 82.6%; without classification strategy 82.6%; without normal description 83.5% (Table 5; full VELM 84.0%).
- Open-set anomalies are not handled (§5.1).
- The "negligible vs defect" experiment is a simulation: 30% of anomaly classes per object are randomly designated negligible, five seeds (§4.3); it does not test real operator preferences.

# Numerical sensitivity

- MLLM input: 448x448; temperature 0; one random normal reference per query; thus results vary with the reference draw (§4.2) - number of repeats or seeds for Tables 1-3 is not stated ?.
- Detector choice dominates variance: for MVTec-AC the means are oracle 87.8 / DDAD 84.0 / PatchCore 78.1 / DDAD+GPT-4o-mini 75.7 accuracy, with F1 84.2 / 80.3 / 75.3 / 70.1 and kappa 84.6 / 79.7 / 72.1 / 68.8 (Table 2). VisA-AC accuracies: 87.6 / 69.6 / 68.5 / 63.5 (Table 3).
- MVTec-AD (original labels): Echo 72.9, MCAD 76.4, VELM 81.4 accuracy, F1 78.0, kappa 76.8 (Table 1).
- Ablation per-class numbers fluctuate by up to ~24 points between prompt variants (e.g. bottle 86.7 full prompt vs 62.7 without anomaly descriptions, Table 5), so per-class conclusions need caution; the means are more reliable.
- Internal inconsistencies to resolve before quoting: (a) Abstract says 80.4% on MVTec-AD while §4.2.1 and Table 1 say 81.4%; (b) §4.2.1 says VELM surpasses Echo and MCAD "by 9.5% and 5%", but Table 1 gives 81.4 - 72.9 = 8.5 and 81.4 - 76.4 = 5.0 (the 5% is consistent with Table 1; the 9.5% is not) ?; (c) the Abstract says "exceeding the prior baselines by 5%", consistent with the MCAD gap only.

# Applicability

- Use when: a detector already flags anomalies and downstream action depends on the *type* of anomaly (rework vs scrap vs accept); classes can be described in words; throughput can tolerate an API call per flagged image.
- Don't use when: no reliable localisation is available (accuracy falls by up to ~18 points on VisA-AC); the class set is open; data privacy or offline operation forbids sending images to a hosted MLLM (stated by inference from the use of GPT-4o, not discussed by the paper ?).
- Compared against: Echo (Chen et al. 2025), MCAD (Li et al. 2024) on MVTec-AD (Table 1); internal ablations with oracle, DDAD, PatchCore and GPT-4o / GPT-4o-mini (Tables 2-3).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| MCAD (Li et al. 2024) - not registered | "MCAD [19] employs relational knowledge distillation for anomaly classification, but its performance and convenience are limited by the lack of the semantic power and controllability of language models" (§2.2); Table 1 baseline | compared_with (medium) | medium | Peer on the same task (anomaly classification). No page, not registered, so no target. MCAD's relational knowledge distillation touches the `knowledge-distillation` concept only tangentially: no edge. |
| Echo (Chen et al. 2025, arXiv:2501.15795) - not registered | "Echo [7], which employs multiple language model components" (§4.2.1); "suffer from the absence of a specialized visual anomaly detector, or do not provide an automated pipeline without the need for test-time human input" (§2.2) | compared_with (medium) | medium | Same: no page. The paper's claim about Echo's weaknesses is promotional; verify against Echo before using. |
| `patchcore` (roth2022-patchcore) | PatchCore listed among example vision experts (Fig. 1 caption; §4.2.2 "testing two vision experts: DDAD and PatchCore") | none (data-flow, Rule C) | - | PatchCore is a swappable input to VELM, not a building-block idea; the Remarks fact "VELM accuracy with PatchCore as vision expert is lower than with DDAD (78.1 vs 84.0 on MVTec-AC)" is usable. |
| DDAD (Mousakhan et al. 2023, arXiv:2305.15956) - not registered | "we use DDAD [20] as the Vision Expert due to its high detection accuracy and efficiency ... inference time of 35 ms" (§3.1) | none | - | Same research group (Mousakhan, Brox, Tayyub). No page. |
| `zhou2023-anomalyclip` (no page yet), WinCLIP, AnomalyGPT, CLIP-AD, Myriad | "The power of large language models has been leveraged to perform few-shot or zero-shot anomaly detection ... However, while these methods incorporate language models, they predominantly focus on detecting the presence of anomalies rather than characterizing their attributes" (§2.2, refs [6, 13, 16, 18, 27]; AnomalyCLIP is [27]) | none (Rule B: detection vs. classification are different problems) | - | The paper contrasts itself with, rather than extends, these methods. |
| MMAD (Jiang et al. 2024), Chen et al. 2025 [7] | "Recent efforts [7, 17] have explored the use of multimodal LLMs for the retrieval of attributes of defects through question-answering" (§2.2) | none | - | Not registered; no pages. |
| `clip` (radford2021-clip) | cited for vision-language models (§2.2, ref [22]) | none | - | Background citation only. |

# Connections

- Builds on: [roth2022-patchcore, bergmann2019-mvtec-ad, zou2022-visa] (datasets and one vision-expert option), plus unregistered DDAD, Denner et al. (visual prompt engineering), GPT-4 technical report.
- Enables: anomaly-classification benchmarking on MVTec-AC / VisA-AC; user-defined defect-vs-anomaly policies.
- Refutes / supersedes: none claimed; it claims higher accuracy than Echo and MCAD on MVTec-AD only.

# Atlas update plan

Role: supplementary update. Not a new page: VELM is a prompting pipeline over existing detectors and a closed-weights MLLM with no new learned component; the substantive new artefact is two relabelled benchmarks (a dataset contribution, not a method). The survey `visual-anomaly-detection` does not currently cite it.

## UPDATE: visual-anomaly-detection
Section: Definition (scope) and a short closing paragraph
- Add one scope sentence: detection/localisation is not the end of an inspection pipeline; anomaly *classification* (naming the defect type, deciding negligible vs critical) is a separate stage and an open research direction, with this paper proposing the first MLLM pipeline and the MVTec-AC / VisA-AC relabelled benchmarks.
- Add a data-quality caveat to the dataset discussion: the original MVTec AD defect-class labels contain inconsistencies (36 samples relabelled, four overlapping class pairs merged, §3.3.1), which matters for any work that uses defect-type labels rather than binary labels.
- Add to References: Mokhtar, Mousakhan, Galesso, Tayyub, Brox, Detect, Classify, Act, CVPR VAND workshop 2025, arXiv:2505.02626.

## UPDATE: patchcore
Section: Remarks (optional)
- One bullet: as a vision expert in an MLLM classification pipeline PatchCore is ~6 accuracy points behind DDAD on MVTec-AC (78.1 vs 84.0) and about equal on VisA-AC (68.5 vs 69.6) (Tables 2-3). Frame it as third-party evidence about localisation-mask quality, not as a ranking of detectors.

# Provenance

1. Setting and claims - Abstract; §1; Figs. 1-3.
2. Related work (representation- vs reconstruction-based detectors; LLM/VLM-based AD; MCAD, Echo, AnomalyGPT, WinCLIP) - §2.1, §2.2.
3. Pipeline, vision expert, DDAD 35 ms and "96 ms per token" statement, visual prompting - §3, §3.1.
4. Prompt structure (normal description, anomaly descriptions, classification strategy) - §3.2, Fig. 4.
5. MVTec-AC and VisA-AC refinements - §3.3, §3.3.1, §3.3.2; Figs. 5-6.
6. Metrics and Eqs. (1)-(3) - §4.1.
7. Experimental settings (448x448, temperature 0, random reference) - §4.2.
8. MVTec-AD comparison (Echo 72.9, MCAD 76.4, VELM 81.4 / 78.0 / 76.8) - §4.2.1, Table 1.
9. MVTec-AC results (oracle 87.8, DDAD 84.0, PatchCore 78.1, DDAD+mini 75.7 accuracy; F1 and kappa) - §4.2.2, Table 2.
10. VisA-AC results (87.6, 69.6, 68.5, 63.5) - §4.2.3, Table 3.
11. Anomaly vs defect (30% negligible, five seeds, 89.8% mean) - §4.3, Table 4.
12. Ablation (means 84.0, 81.6, 82.6, 83.5, 82.6, 78.6) - §4.4, Table 5.
13. Limitations and future work - §5.1; Conclusion.
14. Abstract versus body numeric mismatches (80.4 vs 81.4; 9.5% vs 8.5%) - Abstract; §4.2.1; Table 1.
15. Reference list entries for [7], [11], [16], [17], [19], [20], [27] - References.
