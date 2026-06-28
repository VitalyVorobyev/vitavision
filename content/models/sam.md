---
title: "SAM"
date: 2026-05-27
summary: "Promptable segmentation foundation model family — SAM (v1, 2023) introduces image-prompt segmentation with a heavy ViT-H encoder and lightweight transformer decoder trained on the 1.1B-mask SA-1B dataset; SAM 2 (2024) extends to video via a streaming memory module on a Hiera hierarchical-ViT encoder; SAM 3 (2025) generalises from single-object prompts to *concept* prompts (free-form noun phrases or visual exemplars) via a presence token, segmenting all matching instances on images and videos."
tags: ["deep-learning", "dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: vit
prerequisites: [convolutional-neural-network, attention-mechanism]
failureModes: []
relations:
  - type: learned_alternative_of
    target: grabcut-iterative-segmentation
    confidence: high
  - type: learned_alternative_of
    target: graph-cut-segmentation
    confidence: high
  - type: learned_alternative_of
    target: felzenszwalb-graph-segmentation
    confidence: high
  - type: compared_with
    target: mask-rcnn
    confidence: medium
    caution: "Different problem classes — Mask R-CNN is closed-set instance detection with category labels; SAM is class-agnostic promptable segmentation."
  - type: compared_with
    target: ritm-interactive-segmentation
    confidence: medium
    caution: "Both are click-prompted interactive segmenters; different sub-paradigms — SAM is a foundation model with a prompt-conditioned decoder, RITM is iterative-mask refinement on a per-image encoder."
  - type: compared_with
    target: focalclick
    confidence: medium
    caution: "Opposite design points — SAM is a heavy promptable foundation model with zero-shot generalisation but no preexisting-mask refinement; FocalClick is a small specialised network with native mask correction but no zero-shot."
  - type: extended_by
    target: mobilesam
    confidence: high
    caution: "MobileSAM is a lightweight derivative — distils SAM v1's ViT-H image encoder into a 5.78M-param TinyViT (~56× faster) while keeping SAM's prompt encoder + decoder frozen; MobileSAMv2 adds an object-aware prompt sampler for Segment-Everything."
sources:
  primary: kirillov2023-sam
  references:
    - ravi2024-sam2
    - carion2025-sam3
  notes: |
    SAM v1 (kirillov2023-sam): three-component pipeline — heavy MAE-pretrained
    ViT-H image encoder (1024 px longest side, 16 px patches, 64×64 token
    grid, run once per image); lightweight prompt encoder (positional
    encodings for points/boxes, conv embedding for mask prompts, CLIP text
    encoder for text); fast two-way cross-attention mask decoder producing
    3 candidate masks + IoU scores. Training: focal + dice loss on
    minimum-loss mask of 3 predictions; IoU head trained with MSE; 11
    rounds of random prompt simulation per mask. Dataset: SA-1B — 1.1B
    masks on 11M images, 400× more masks than Open Images, ~100 masks per
    image average. Browser-CPU latency ~50 ms for prompt encoder +
    decoder with precomputed image embedding.

    SAM 2 (ravi2024-sam2): four components — (1) MAE-pretrained Hiera
    image encoder (hierarchical ViT); (2) memory attention stack —
    transformer blocks performing self-attention on current-frame
    features then cross-attention to a memory bank of past-frame feature
    maps + object pointer vectors; (3) SAM-v1-compatible prompt encoder +
    mask decoder (minor modifications); (4) memory encoder that converts
    predicted mask + image embedding into a compact spatial memory
    entry. Streaming/causal: frame t uses only frames ≤ t. SA-V dataset
    — 50.9K videos, 642.6K masklets, 35.5M masks (53× scale-up vs prior
    largest video annotation set). Image-segmentation 6× faster than SAM
    v1: Hiera-B+ 130.1 FPS vs SAM ViT-H 21.7 FPS (Table 15). MOSE J&F
    60.3 vs 47.9 baseline (+12.4).

    SAM 3 (carion2025-sam3): introduces **Promptable Concept Segmentation
    (PCS)** — given an image/video and a *concept* (free-form noun
    phrase or visual exemplars), output ALL instances matching the
    concept. Distinct from v1/v2's single-object-per-prompt paradigm.
    Architectural novelty: **presence token** — a global learned query
    that decouples concept recognition $p(\text{NP is present})$ from
    per-instance localisation, especially effective with hard-negative
    training phrases. Dataset: SA-Co — 5.2M images, 4M unique NPs, 52M
    masks, plus 1.4B synthetic. Built with a 4-phase human+AI-verifier
    data engine where Llama 3.2 AI verifiers double annotation
    throughput. LVIS zero-shot mask AP 48.5 vs prior best 38.5;
    SA-Co/Gold cgF1 54.1 — 2× best baseline, 74% of human performance.
    PVS (VOS) also improves over SAM 2.1 L: MOSEv2 J&F 60.3 vs 47.9
    (+12.4).
implementations:
  - role: official
    repo: https://github.com/facebookresearch/segment-anything
    commit: dca509fe793f601edb92606367a655c15ac00fdf
    framework: pytorch
    license: Apache-2.0
  - role: official
    repo: https://github.com/facebookresearch/sam2
    commit: 2b90b9f5ceec907a1c18123530e92e794ad901a4
    framework: pytorch
    license: Apache-2.0
  - role: official
    repo: https://github.com/facebookresearch/sam3
    commit: 8e451d5eb43c817b64ae7577fb7b9ae223db88a9
    framework: pytorch
    license: LicenseRef-SAM-License
draft: false
---

# Motivation

Segment Anything (SAM) is a promptable segmentation foundation model family that accepts an image or video together with a prompt and returns binary instance masks. In SAM v1 and v2 the prompt specifies a single object — as one or more foreground/background clicks, an axis-aligned bounding box, a rough mask, or free-form text — and the model returns up to three candidate masks with associated IoU confidence scores. SAM v2 extends v1 to video: given prompts on any frame it tracks the object forward and backward through the clip using a streaming causal memory bank. SAM v3 introduces a qualitatively different prompt type — a *concept*, expressed as a free-form noun phrase (e.g., "striped cat") or a set of image exemplars — and shifts the output from one object per prompt to *all instances* matching the concept across every frame. This progression from single-object-per-prompt (Promptable Visual Segmentation, PVS) to all-instances-per-concept (Promptable Concept Segmentation, PCS) is a paradigm shift: where v1 and v2 are class-agnostic interactive tools, v3 is an open-vocabulary enumerator. All three variants stand in contrast to fully-supervised closed-vocabulary segmenters such as the Mask R-CNN family, which require category-label supervision, and to classical interactive methods such as GrabCut and graph-cut, which operate on hand-crafted energy functions without learned priors.

# Architecture

**Family & shape.** All three variants share a three-stage encoder–decoder topology: a heavy image encoder (run once per image or frame, cost amortised over all prompts), a lightweight prompt encoder, and a fast mask decoder. v1 uses an MAE-pretrained ViT-H image encoder; v2 replaces it with MAE-pretrained Hiera (hierarchical ViT) and adds a streaming memory attention stack; v3 shares a Perception Encoder (PE) backbone between a DETR-based concept detector and the SAM 2 memory-based tracker.

- **SAM v1 (2023).** Image encoder: MAE-pretrained ViT-H, input resized so the longest side is 1024 px, patch size 16 px, yielding a 64×64 token grid. Prompt encoder: positional encodings summed with learned type embeddings for points and boxes; convolutional embedding for dense mask prompts added element-wise to the image embedding; frozen CLIP text encoder for free-form text (proof-of-concept only). Mask decoder: two rounds of a two-way cross-attention transformer block followed by bilinear and transposed-convolution upsampling, producing 3 candidate masks and an IoU score per mask. Decoder latency with a precomputed image embedding: approximately 50 ms on CPU in a browser.

- **SAM 2 (2024).** Replaces ViT-H with MAE-pretrained Hiera. Adds a **memory attention stack** — $L$ transformer blocks each performing self-attention on the current-frame tokens then cross-attention to a memory bank of past-frame spatial feature maps and object pointer vectors, followed by an MLP. The **memory bank** is a FIFO queue of $N$ recent unprompted frame memories and $M$ prompted frame memories, plus object pointer vectors (lightweight semantic summaries derived from mask decoder output tokens); temporal position embeddings are applied to the $N$ recent-frame memories. A **memory encoder** — a lightweight convolutional network — converts each frame's predicted mask and image embedding into a compact memory entry. For image-only inference the memory is empty and the model reduces to SAM v1 behaviour.

- **SAM 3 (2025).** Adds a DETR-based **concept detector** that shares the Perception Encoder (PE) backbone with the SAM 2 tracker. The concept detector ingests text tokens (noun phrase encoded by PE) and exemplar tokens (position embedding + label embedding + ROI-pooled features, fused by a small transformer), cross-attends them to PE image features via a fusion encoder, and decodes instance proposals with a DETR-style decoder. A **presence token** — a dedicated global learned query — predicts $p(\text{NP is present in input})$ independently from the per-instance proposal queries; each proposal score is multiplied by the presence score:

$$
\text{score}(q_i) = p(q_i \text{ is a match} \mid \text{NP is present}) \times p(\text{NP is present in input})
$$

This decouples concept recognition (global) from per-instance localisation (local), and is especially effective when training with hard-negative noun phrases that should suppress all detections. A mask head adapted from MaskFormer predicts instance masks; a separate semantic head predicts a per-pixel binary presence label. In video mode the detector periodically re-prompts the SAM 2 tracker with high-confidence detections to keep the memory bank fresh.

**Blocks.** The load-bearing component shared by all three variants is the mask decoder's two-way cross-attention block. Prompt tokens attend to image tokens; image tokens attend back to prompt tokens; both representations are updated.

The two-way attention block in PyTorch:

```python
import torch
import torch.nn as nn


class TwoWayAttention(nn.Module):
    """Mask decoder block shared by SAM v1/v2/v3.
    Prompt tokens attend to image tokens, then image tokens attend back.
    Sec. 3 'Mask decoder', SAM (Kirillov et al. 2023).
    """

    def __init__(self, dim: int, num_heads: int = 8, mlp_dim: int = 2048):
        super().__init__()
        self.self_attn = nn.MultiheadAttention(dim, num_heads, batch_first=True)
        self.cross_attn_t_to_i = nn.MultiheadAttention(dim, num_heads, batch_first=True)
        self.cross_attn_i_to_t = nn.MultiheadAttention(dim, num_heads, batch_first=True)
        self.mlp = nn.Sequential(nn.Linear(dim, mlp_dim), nn.GELU(), nn.Linear(mlp_dim, dim))
        self.norms = nn.ModuleList([nn.LayerNorm(dim) for _ in range(4)])

    def forward(self, tokens: torch.Tensor, image_embed: torch.Tensor,
                token_pe: torch.Tensor, image_pe: torch.Tensor):
        tokens = self.norms[0](tokens + self.self_attn(tokens + token_pe, tokens + token_pe, tokens)[0])
        tokens = self.norms[1](tokens + self.cross_attn_t_to_i(tokens + token_pe, image_embed + image_pe, image_embed)[0])
        tokens = self.norms[2](tokens + self.mlp(tokens))
        image_embed = self.norms[3](image_embed + self.cross_attn_i_to_t(image_embed + image_pe, tokens + token_pe, tokens)[0])
        return image_embed, tokens
```

SAM v2 wraps this block inside the memory attention stack: each of the $L$ memory attention blocks first runs self-attention on current-frame tokens, then cross-attends to the memory bank (spatial frame memories and object pointer vectors), before passing tokens to the prompt encoder and the two-way decoder. SAM v3 extends this further with the presence token, which adds a global concept-recognition query that cross-attends to the concept encoder's fused text-and-exemplar tokens before the two-way decoder computes per-instance proposals.

**Training.** Training data and objectives differ across variants.

- *v1:* SA-1B — 1.1 B masks on 11 M licensed images (400× more masks than Open Images, approximately 100 masks per image on average). Loss: linear combination of focal loss and dice loss applied to the minimum-loss mask of the 3 predictions; IoU head trained with MSE between predicted and true IoU. Training simulates an interactive loop with 11 rounds of random prompt sampling per mask. Data collected via a three-stage human-in-the-loop engine: Stage 1 (assisted-manual, 4.3 M masks from 120k images, annotation time reduced from 34 s to 14 s/mask), Stage 2 (semi-automatic, 10.2 M masks from 300k images), Stage 3 (fully automatic, 32×32 grid of point prompts per image with stability filter at $\delta = 0.5$; 99.1% of SA-1B's 1.1 B masks generated automatically).

- *v2:* SA-V — 50.9K videos, 642.6K masklets, 35.5 M masks total (53× more masks than any prior video object segmentation dataset). Same focal + dice + MSE recipe extended to video. Training uses 8-frame subsequences with up to 2 frames randomly selected for interactive prompting; initial prompts sampled as ground-truth mask ($p = 0.5$), single positive click ($p = 0.25$), or bounding box ($p = 0.25$). The data engine reduced annotation time from 37.8 s/frame (Phase 1, SAM per frame) to 4.5 s/frame (Phase 3, SAM 2 fully in the loop) — an 8.4× speedup.

- *v3:* SA-Co — 5.2 M images, 4 M unique noun phrases, 52 M masks (SA-Co/HQ, Phase 1–4 combined), plus SA-Co/SYN (38 M unique noun phrases, 1.4 B synthetic masks) and SA-Co/VIDEO (52.5K videos, 24.8K unique noun phrases, 134K video–NP pairs). Four training stages: PE pre-training, detector pre-training, detector fine-tuning with hard-negative noun phrases, tracker training on frozen PE. The data engine uses Llama 3.2 AI verifiers that approximately double annotation throughput versus human-only annotation.

:::definition[Promptable Concept Segmentation (PCS)]
Given an image or short video $I$ (up to 30 s) and a concept prompt $c$ — a simple noun phrase, a set of positive/negative image exemplars, or both — return the set of all binary instance masks $\{M_i\}$ corresponding to instances of $c$ in every frame of $I$, each with a confidence score. Distinct from Promptable Visual Segmentation (PVS), which returns one object per prompt.
:::

**Complexity.** The prompt encoder and mask decoder run in approximately 50 ms on CPU in a browser (with a precomputed v1 image embedding). For image segmentation throughput, SAM v2 with Hiera-B+ reaches 130.1 FPS versus SAM v1 ViT-H at 21.7 FPS (approximately 6× faster); SAM v2 Hiera-L reaches 61.4 FPS (approximately 3.4× faster than ViT-H). SAM v3 processes a single image with 100+ objects in approximately 30 ms on an H200; near-real-time video segmentation is practical for approximately 5 concurrent objects.

# Implementations

Three official PyTorch repositories from Meta FAIR — `segment-anything` (v1), `sam2` (v2), and `sam3` (v3) — are all maintained and actively updated. The v1 and v2 code is released under Apache-2.0; v3 ships under a custom "SAM License" (Meta community licence) — see Limitations.

# Assessment

**Novelty.**

- *v1:* Establishes **promptable segmentation as a foundation-model paradigm**, decoupling a heavy amortised image encoder from a cheap prompt-conditioned decoder to enable sub-50 ms in-browser interaction. SA-1B (1.1 B masks, three-stage data engine) is itself a substantive data contribution — the first segmentation dataset at this scale.
- *v2:* Introduces a **streaming memory module** (FIFO spatial feature bank + object pointer vectors + temporal position embeddings) that extends promptable segmentation from images to videos with causal online inference. Establishes interactive video object segmentation as a capability for foundation models.
- *v3:* Introduces **Promptable Concept Segmentation (PCS)** — a paradigm shift from single-object-per-prompt to all-instances-per-concept. The **presence token** is the key architectural novelty: a global learned query that decouples concept recognition ($p(\text{NP present})$) from per-instance localisation, enabling hard-negative phrase suppression. SA-Co (52 M masks + 1.4 B synthetic, Wikidata-grounded ontology with 22.4 M nodes) is a substantive data contribution.

**Strengths.**

- SA-1B scale: 1.1 B masks on 11 M images, 400× more masks than Open Images, approximately 100 masks per image on average; 94% of automatically generated masks achieve above 90% IoU versus professional corrections.
- Image segmentation throughput: SAM v2 Hiera-B+ at 130.1 FPS versus SAM v1 ViT-H at 21.7 FPS — approximately 6× faster at equal or better accuracy on SA-23 benchmark.
- Video PVS: SAM v3 MOSEv2 J&F 60.3 versus SAM 2.1-L 47.9 (+12.4 absolute points); DAVIS17 J&F 92.2 versus 90.7.
- Open-vocabulary instance segmentation: SAM v3 LVIS zero-shot mask AP 48.5 versus prior best (DINO-X) 38.5 (+10 absolute points).
- Concept segmentation: SAM v3 SA-Co/Gold cgF1 54.1 — approximately 2.2× stronger than the best baseline (OWLv2 24.6) and 74% of human-level performance (human 72.8).
- 1-exemplar few-shot: SAM v3 COCO AP+ 76.8 versus T-Rex2 58.5 (+18.3 absolute points); ODinW AP+ 82.2 versus 61.8 (+20.5).

**Limitations.**

- *v1:* Text prompting is exploratory and substantially weaker than geometric prompts; failures require a fallback point click to recover. Fine-structure boundaries (cables, hair, tendrils at ViT-H's 16 px patch scale) are a known limitation acknowledged in the paper.
- *v2:* Causal streaming inference means the model cannot look ahead; after a long occlusion or shot change, the FIFO memory window no longer holds useful frames and re-prompting is required. Multiple objects are processed independently without inter-object communication, limiting consistency and efficiency in crowded scenes.
- *v3:* **License restriction** — SAM 3 is released under a custom "SAM License" (Meta community licence, `LicenseRef-SAM-License`), not Apache-2.0. Production or commercial pipelines built on v3 must review the SAM License terms before redistribution; this is a concrete blocker for a drop-in replacement of v1/v2 in Apache-licensed projects.
- Foundation-model compute cost: the ViT-H (v1) and Hiera-L (v2/v3) encoders are impractical for mobile or edge deployments; lightweight derivatives (MobileSAM family) exist for that regime but are not covered by this page.

# References

1. Kirillov, A. et al. *Segment Anything.* ICCV, 2023. [arxiv](https://arxiv.org/abs/2304.02643)
2. Ravi, N. et al. *SAM 2: Segment Anything in Images and Videos.* arXiv 2408.00714, 2024. [arxiv](https://arxiv.org/abs/2408.00714)
3. Carion, N. et al. *SAM 3: Segment Anything with Concepts.* arXiv 2511.16719, 2025. [arxiv](https://arxiv.org/abs/2511.16719)
