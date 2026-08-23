---
title: "Foundation Models for Vision"
date: 2026-08-23
summary: "How attention became a substrate, images became tokens, labels became optional, and one frozen backbone came to power everything from segmentation prompts to industrial anomaly detection."
tagline: "Follow the bottleneck: from Attention Is All You Need to a single frozen encoder that transfers everywhere."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
areas:
  - id: substrate
    label: "Substrate"
  - id: backbone
    label: "Backbones"
  - id: representation
    label: "Representation learning"
  - id: language
    label: "Language & prompts"
  - id: anomaly
    label: "Anomaly detection"
nodes:
  - id: attention
    page: attention-mechanism
    area: substrate
    role: "origin"
    takeaway: "Differentiable soft lookup over a set of values. Born as a translation alignment fix, it became the universal communication fabric of modern networks."
  - id: transformer
    page: transformer
    area: substrate
    role: "origin"
    takeaway: "Remove recurrence, keep attention: every position talks to every other position in parallel. The block diagram nearly every model in this story reuses."
  - id: kd
    page: knowledge-distillation
    area: substrate
    role: "recurring device"
    takeaway: "Train a student on a teacher's softened outputs instead of hard labels. The idea resurfaces in this story four separate times, each time in a new costume."
    remark: "Watch this node: it bridges into DeiT (distillation token), DINO (self-distillation), DINOv2/v3 (model families), and student–teacher anomaly detection."
  - id: vit
    page: vit
    area: backbone
    role: "milestone"
    takeaway: "Cut the image into 16×16 patches, embed them as tokens, and run the standard transformer encoder. CNN inductive bias traded for data scale."
  - id: deit
    page: deit
    area: backbone
    role: "correction"
    takeaway: "Same architecture as ViT, made competitive on ImageNet-1k alone by a heavy training recipe and a distillation token supervised by a convnet teacher."
  - id: registers
    paper: darcet2023-registers
    area: backbone
    label: "Register tokens"
    role: "fix"
    takeaway: "Large ViTs recycle low-information patches as scratch space, creating high-norm artifact tokens. Adding dedicated register tokens gives that computation somewhere to live."
  - id: ssl
    page: self-supervised-learning
    area: representation
    role: "survey"
    takeaway: "Agreement between two augmented views, with or without negatives: SimCLR, MoCo, BYOL and DINO are four answers to the same collapse problem."
  - id: mae
    page: mae
    area: representation
    role: "alternative"
    takeaway: "Mask 75% of patches and reconstruct the pixels. Cheap to pretrain and superb after fine-tuning — but its frozen features trail the contrastive/distillation family."
  - id: dino
    page: dino
    area: representation
    role: "milestone"
    takeaway: "Self-distillation with no labels: an EMA teacher, multi-crop views, centering + sharpening. Segmentation structure emerges in attention maps nobody supervised."
  - id: dinov2
    page: dinov2
    area: representation
    role: "milestone"
    takeaway: "DINO plus iBOT at 142M curated images: the first self-supervised features that beat text-supervised rivals on dense tasks while staying frozen."
  - id: dinov3
    page: dinov3
    area: representation
    role: "frontier"
    takeaway: "7B teacher, 1.7B images, and gram anchoring to stop patch features degrading over long schedules. One frozen backbone now rivals specialized fine-tuned pipelines."
  - id: clip
    paper: radford2021-clip
    area: language
    label: "CLIP"
    role: "milestone"
    takeaway: "Contrastive image–text pretraining on 400M pairs makes natural language the interface to visual representations: classification by prompt, not by taxonomy."
    remark: "An atlas page for CLIP is planned (Wave 3); this stop is currently backed by the registered paper."
  - id: siglip2
    paper: tschannen2025-siglip2
    area: language
    label: "SigLIP 2"
    role: "frontier"
    takeaway: "The CLIP recipe matured: sigmoid loss, multilingual data, and dense-feature objectives narrow the gap to self-supervised backbones on localization tasks."
  - id: sam
    page: sam
    area: language
    role: "milestone"
    takeaway: "Segmentation reframed as a promptable interface over an MAE-pretrained encoder and a billion masks. A mature supervised task becomes a foundation interface."
  - id: vad
    page: visual-anomaly-detection
    area: anomaly
    role: "survey"
    takeaway: "The design space where every foundation idea gets stress-tested: embeddings, memory banks, student–teacher pairs, and prompts, all judged by pixel-level AUROC."
  - id: uninformed-students
    page: uninformed-students
    area: anomaly
    role: "origin"
    takeaway: "Distillation reversed: students regress a frozen teacher's descriptors, and where they fail to imitate is exactly where the anomaly is."
  - id: patchcore
    page: patchcore
    area: anomaly
    role: "milestone"
    takeaway: "No training on the target class at all — a coreset memory bank of pretrained patch features and a nearest-neighbour distance is enough for near-saturated MVTec scores."
  - id: efficientad
    page: efficientad
    area: anomaly
    role: "milestone"
    takeaway: "The student–teacher idea engineered to the millisecond regime: a distilled patch descriptor teacher and a loss-induced asymmetry, at industrial frame rates."
  - id: winclip
    paper: jeong2023-winclip
    area: anomaly
    label: "WinCLIP"
    role: "bridge"
    takeaway: "CLIP walks into the factory: windowed vision features matched against textual state descriptions give zero-shot anomaly classification and localization."
  - id: anomalyclip
    paper: zhou2023-anomalyclip
    area: anomaly
    label: "AnomalyCLIP"
    role: "frontier"
    takeaway: "Learn object-agnostic prompts for generic normality and abnormality, so one model transfers across objects and even from industrial parts to medical images."
  - id: simplenet
    paper: liu2023-simplenet
    area: anomaly
    label: "SimpleNet"
    role: "alternative"
    takeaway: "Replace the memory bank with a learned feature adaptor and a discriminator trained on synthetic feature-space anomalies — simpler, faster, and still accurate."
edges:
  - from: attention
    to: transformer
    type: prerequisite
  - from: transformer
    to: vit
    type: evolution
    label: "images as tokens"
  - from: vit
    to: deit
    type: evolution
    label: "data efficiency"
  - from: kd
    to: deit
    type: bridge
    label: "distillation token"
  - from: kd
    to: dino
    type: bridge
    label: "self-distillation"
  - from: ssl
    to: dino
    type: evolution
    label: "drops negatives"
  - from: vit
    to: dino
    type: prerequisite
  - from: vit
    to: mae
    type: prerequisite
  - from: dino
    to: mae
    type: contrast
    label: "features vs pixels"
  - from: dino
    to: dinov2
    type: evolution
    label: "scale + curation"
  - from: dinov2
    to: dinov3
    type: evolution
    label: "gram anchoring"
  - from: dinov2
    to: registers
    type: bridge
    label: "artifact fix"
  - from: ssl
    to: clip
    type: bridge
    label: "contrastive to text"
  - from: vit
    to: clip
    type: prerequisite
  - from: clip
    to: siglip2
    type: evolution
    label: "matured recipe"
  - from: mae
    to: sam
    type: bridge
    label: "pretrained encoder"
  - from: clip
    to: winclip
    type: bridge
    label: "zero-shot AD"
  - from: winclip
    to: anomalyclip
    type: evolution
    label: "learned prompts"
  - from: dinov2
    to: efficientad
    type: bridge
    label: "foundation features"
  - from: kd
    to: uninformed-students
    type: bridge
    label: "students as sensors"
  - from: uninformed-students
    to: efficientad
    type: evolution
    label: "made fast"
  - from: patchcore
    to: simplenet
    type: evolution
    label: "learned, not stored"
lenses:
  - id: overview
    title: "Overview"
    coords:
      kd: [0, 0]
      attention: [1, 0]
      transformer: [1.6, 0]
      vit: [3, 1]
      deit: [3.6, 1]
      ssl: [3.3, 2]
      uninformed-students: [3.4, 4]
      dino: [4, 2]
      clip: [4.2, 3]
      mae: [4.4, 2]
      patchcore: [5, 4]
      vad: [5.6, 4]
      dinov2: [6, 2]
      winclip: [6.1, 4]
      sam: [6.2, 3]
      efficientad: [6.3, 4]
      simplenet: [6.4, 4]
      registers: [6.5, 1]
      anomalyclip: [6.6, 4]
      dinov3: [8, 2]
      siglip2: [8, 3]
  - id: ssl-lineage
    title: "Self-supervised lineage"
    coords:
      kd: [0, 1]
      vit: [1, 0]
      ssl: [1, 2]
      mae: [2, 2]
      dino: [2, 1]
      dinov2: [3, 1]
      registers: [3.6, 0]
      dinov3: [4.6, 1]
  - id: distillation
    title: "Distillation everywhere"
    coords:
      kd: [0, 1]
      deit: [1, 0]
      uninformed-students: [1.3, 2]
      dino: [1.6, 1]
      dinov2: [2.6, 1]
      efficientad: [2.9, 2]
      dinov3: [3.6, 1]
  - id: anomaly-bridge
    title: "Bridges into anomaly detection"
    coords:
      kd: [0, 0]
      uninformed-students: [1, 0]
      clip: [1.2, 2]
      patchcore: [1.8, 1]
      dinov2: [2.2, 3]
      winclip: [2.4, 2]
      simplenet: [2.6, 1]
      efficientad: [2.8, 0]
      anomalyclip: [3, 2]
      vad: [3.6, 1]
steps:
  - title: "The substrate"
    anchor: the-substrate
    focus: [attention, transformer, kd]
  - title: "Images become tokens"
    anchor: images-become-tokens
    focus: [vit, deit]
  - title: "From classifier to representation"
    anchor: from-classifier-to-representation
    focus: [ssl, mae, dino]
  - title: "Distillation expands"
    anchor: distillation-expands
    focus: [kd, dino, dinov2, dinov3, registers]
  - title: "Vision meets language"
    anchor: vision-meets-language
    focus: [clip, siglip2, sam]
  - title: "Three bridges into anomaly detection"
    anchor: three-bridges-into-anomaly-detection
    focus: [kd, uninformed-students, clip, winclip, dinov2, efficientad]
  - title: "The anomaly-detection design space"
    anchor: the-anomaly-detection-design-space
    focus: [vad, patchcore, simplenet, winclip, anomalyclip, efficientad]
---

The story of modern computer vision is best told backwards from a strange fact: the strongest general-purpose image features available today were trained without a single label, and most of the systems built on them never update the backbone at all. Getting there took a decade of removing bottlenecks one at a time — an information bottleneck between encoder and decoder, a sequential-computation bottleneck, a labeled-data bottleneck, a taxonomy bottleneck, and finally the stability bottlenecks of scale itself. This narrative walks that chain, and ends where it currently pays rent: industrial anomaly detection, where every foundation idea in the story gets stress-tested against the pixel.

## The substrate

Three ideas from before 2018 supply everything that follows. [Attention](/atlas/attention-mechanism) began as a fix for a translation problem — a decoder that could look back at any encoder state instead of squeezing a sentence through a fixed vector — and turned out to be something much more general: a differentiable, content-addressed lookup. The [transformer](/atlas/transformer) then made the radical subtraction: remove recurrence entirely and let attention alone carry information between positions, in parallel, at every layer. What had been a patch on RNNs became the substrate on which nearly every model in this story is built.

The third idea looks unrelated at first. [Knowledge distillation](/atlas/knowledge-distillation) — training a small student on a large teacher's softened output distribution — was published as a model-compression trick in 2015. Keep it in view as this story unfolds: it reappears as DeiT's distillation token, as DINO's label-free teacher, as the mechanism that turns one 7B flagship into a family of deployable backbones, and — reversed — as an anomaly sensor on the factory floor. Few ideas in this atlas resurface as many times in as many costumes.

## Images become tokens

For a decade, convolutional inductive bias — locality, weight sharing, hierarchy — was considered the price of admission for vision. [ViT](/atlas/vit) called that bluff: cut the image into 16×16 patches, embed each patch as a token, and hand the sequence to a standard transformer encoder. The catch was data. Trained on ImageNet-1k alone, ViT lost to ResNets; it needed the 300M-image JFT corpus to justify discarding the convolutional prior.

[DeiT](/atlas/deit) closed that gap without touching the architecture. A carefully engineered recipe of augmentation and regularization — and a distillation token, a learnable slot in the sequence supervised by a convnet teacher's decisions through every layer of self-attention — made the same ViT-B competitive using ImageNet-1k only, trained on one node in three days. The lesson was not "inductive biases are unnecessary"; it was that biases can be *bought back* through data augmentation and a teacher, at training time, without changing the model. The field learned which biases are worth reintroducing and where they should live.

## From classifier to representation

The next bottleneck was the label itself. Between 2019 and 2021, [self-supervised learning](/atlas/self-supervised-learning) converged on a deceptively simple recipe: create two augmented views of an image and demand the network represent them the same way — while somehow avoiding the trivial solution where everything maps to the same point. SimCLR held collapse off with in-batch negatives, MoCo with a momentum-updated queue of negatives, BYOL with an asymmetric predictor and a slow-moving target network. Each answer traded a different resource: batch size, memory, architectural asymmetry.

Two 2021 papers then split the road. [MAE](/atlas/mae) went the reconstruction way — mask 75% of the patches, rebuild the pixels — buying cheap pretraining and superb fine-tuned accuracy, at the cost of frozen features that lag the alternatives. [DINO](/atlas/dino) went the distillation way: a student matching an EMA teacher of itself on multi-crop views, collapse held off by nothing more than centering and sharpening of the teacher's softmax. Two properties emerged that nobody explicitly asked for — k-NN classification on frozen features that nearly matches a linear probe, and attention maps that segment objects without ever seeing a mask. That second property is the first hint of the frozen-backbone era: the representation itself, not the classifier on top, had become the product.

## Distillation expands

Scaling DINO's recipe was not a matter of turning up the dials. [DINOv2](/atlas/dinov2) needed a curated 142M-image corpus assembled without human annotation, an added patch-level masked objective borrowed from iBOT, Sinkhorn-Knopp centering for stability, and — completing the circle back to Hinton — distillation from the expensive ViT-g flagship down to the S/B/L variants people actually deploy. The result was the first self-supervised backbone whose *frozen* features beat text-supervised rivals on dense tasks like segmentation and depth.

Scale then exposed two failure modes worth their own stops. In large ViTs, low-information patches get quietly recycled as computation scratch space, producing high-norm artifact tokens that corrupt dense feature maps — the fix, dedicated [register tokens](https://arxiv.org/abs/2309.16588) that give that computation somewhere legitimate to live, is now standard in the family. And over very long schedules, patch features slowly lose locality even as image-level accuracy keeps climbing. [DINOv3](/atlas/dinov3) diagnosed and repaired that drift with gram anchoring — pinning the *pairwise similarity structure* of patch features to an early, dense-consistent teacher checkpoint while letting the features themselves keep moving. With a 7B teacher, 1.7B curated images, and a multi-student distillation into ViTs and ConvNeXts, one frozen encoder now competes with specialized fine-tuned pipelines on detection, segmentation, depth and 3D correspondence.

## Vision meets language

A parallel line attacked a different bottleneck: the closed taxonomy. CLIP trained an image encoder and a text encoder contrastively on 400M web image–text pairs, so that classification became retrieval — embed the image, embed a sentence describing each candidate class, take the nearest. Language became the interface to the visual representation, and "zero-shot" stopped being a parlor trick. SigLIP 2 is the same idea grown up: a sigmoid loss, multilingual data, and dense-feature objectives that pull the recipe toward the localization quality the self-supervised family had claimed as its own turf.

[SAM](/atlas/sam) generalized the interface move to a task rather than a taxonomy. Built on an MAE-pretrained encoder and a billion masks, it turned segmentation into a promptable service: a point, a box, or a mask sketch in, a mask out, for anything. The pattern deserves attention because it recurs: a mature supervised task, given a foundation-scale encoder, tends to stop being a task and become an *interface*.

## Three bridges into anomaly detection

Industrial anomaly detection is the perfect stress test for foundation features, because its central constraint is that anomalies cannot be enumerated in advance — you have normal samples, a pixel-level accuracy bar, and often a real-time budget. Three separate bridges carried foundation ideas into this domain. The oldest is distillation, inverted: [Uninformed Students](/atlas/uninformed-students) trained students to regress a frozen teacher's patch descriptors on normal data only, so that the *failure* of imitation becomes the anomaly score. [EfficientAD](/atlas/efficientad) engineered that idea to the millisecond regime — a small distilled teacher, a loss that keeps the student from generalizing too well, industrial frame rates.

The second bridge is the frozen embedding itself: if pretrained patch features are good enough, normality can simply be *remembered* rather than learned — the insight [PatchCore](/atlas/patchcore) pushed to near-saturation on MVTec with a coreset memory bank and nearest-neighbour distances, with no training on the target class at all. As backbones improved from ImageNet-supervised to DINOv2-class features, this bridge widened: better features move anomaly detection forward without a single change to the detector. The third bridge is language: WinCLIP matched windowed CLIP features against textual descriptions of normal and damaged states, making anomaly detection zero-shot — no defect examples, just words.

## The anomaly-detection design space

Seen together — the [survey page](/atlas/visual-anomaly-detection) maps this in detail — the modern design space sorts by what you have and what you can afford. Plenty of normal images and a tight latency budget favors the student–teacher line (EfficientAD). A handful of normal images and no training budget favors memory banks over frozen features (PatchCore). SimpleNet marks a middle path: replace the memory bank with a learned feature adaptor and a discriminator trained on synthetic feature-space anomalies — simpler and faster, and evidence that the field keeps re-litigating the store-versus-learn question. And when even normal samples are scarce or the object family is open-ended, the language bridge takes over: WinCLIP for zero-shot state descriptions, AnomalyCLIP for learned object-agnostic prompts that transfer across objects and even from industrial parts to medical scans.

The punchline of the whole narrative sits here. None of these systems trains a backbone. The decade-long chain — attention to transformer to ViT, labels traded for self-supervision, distillation compressing flagships into deployable families, language attached as an interface — converges on a single operational fact: on the factory floor, the model that finds the scratch on the casting is a frozen inheritance from every stop on this map.
