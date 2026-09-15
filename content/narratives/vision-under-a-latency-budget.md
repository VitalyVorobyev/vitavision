---
title: Vision Under a Latency Budget
summary: A parallel history of computer vision driven by compute budgets rather than accuracy, from the integral image and binary descriptors to searched mobile backbones, two-branch segmentation, and distilled or searched foundation-era models, where the recurring move is a structural trick that removes work.
tagline: Never a smaller model. Always a trick that removes work.
tags:
  - efficiency
  - real-time
  - mobile
  - classical
  - deep-learning
date: 2026-09-15
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: cheap-scans-features
    label: Cheap scans and features
  - id: budgeted-backbones
    label: Budgeted backbones
  - id: budgeted-dense-prediction
    label: Budgeted dense prediction
  - id: foundation-era-budget
    label: Budget in the foundation era
nodes:
  - id: integral-image
    page: integral-image
    area: cheap-scans-features
    role: origin
    takeaway: A running-sum table over the whole image turns any rectangle's pixel sum into four array reads, no matter the rectangle's size. That constant-time primitive is what later makes exhaustive window scanning and patch smoothing affordable rather than prohibitive.
    remark: Originated in 1984 for texture-map antialiasing under the name summed-area table; Viola and Jones independently rediscovered the same structure in 2001 and renamed it the integral image for face detection.
  - id: viola-jones-detector
    page: viola-jones-detector
    area: cheap-scans-features
    role: milestone
    takeaway: Sliding a 24x24 window over every position and scale of an image is affordable because each window's rectangle features cost four reads apiece, and a cascade of increasingly strict stages rejects most background after evaluating about ten features per window.
    remark: "The cascade is the real budget trick: roughly ten of 6,061 trained features are evaluated per window on average, because early cheap stages reject almost all background before later, costlier stages ever run."
  - id: fast-corner-detector
    page: fast-corner-detector
    area: cheap-scans-features
    role: milestone
    takeaway: A corner test built from a handful of comparisons on a 16-pixel ring, with a four-point early-reject check, replaces the multiplications of gradient-based corner scores with integer comparisons cheap enough to run at every pixel in real time.
    remark: The four-point reject only generalises to the stricter N=12 variant; the paper's answer for the more repeatable N=9 variant is a trained decision tree that reaches a decision after about two ring reads on average.
  - id: brief
    page: brief
    area: cheap-scans-features
    role: milestone
    takeaway: Instead of computing a float descriptor and compressing it afterward, BRIEF builds a compact binary string directly from a fixed table of pixel-brighter-than-pixel tests, matched by an XOR-and-popcount that costs a fraction of a nearest-neighbour search on float vectors.
    remark: The Gaussian smoothing that precedes the binary tests dominates BRIEF's own runtime; approximating it with a box filter on an integral image is the descriptor's own remaining budget lever.
  - id: orb
    page: orb
    area: cheap-scans-features
    role: milestone
    takeaway: ORB pairs FAST corners with a rotation-steered version of BRIEF's binary tests, replacing BRIEF's random offset table with 256 tests chosen by a greedy search for low correlation, giving a phone-ready detect-and-describe pipeline built on integer comparisons alone.
    remark: Steering the offset table to keypoint orientation without also relearning it collapses the descriptor's variance; the learned, decorrelated test set is what lets rotation invariance and cheap computation coexist.
  - id: mobilenetv2
    page: mobilenetv2
    area: budgeted-backbones
    role: milestone
    takeaway: "Rather than trim layer widths on a standard backbone, MobileNetV2 restructures the block itself: expand into a wide interior, filter it depthwise, then project back to a thin bottleneck the residual connects, making the block's shape the object under a compute budget."
    remark: The bottleneck it keeps thin, unlike ResNet's, and drops the nonlinearity on the final projection, because squashing a low-dimensional feature through a ReLU loses information a linear projection would keep.
  - id: mnasnet
    page: mnasnet
    area: budgeted-backbones
    role: bridge
    takeaway: Rather than trust FLOPs as a stand-in for speed, MnasNet measures latency directly on a phone during architecture search and rewards each candidate for the accuracy it buys per millisecond, discovering the block-by-block design MobileNetV3 later inherits.
    remark: "FLOPs mislead in practice: a network with fewer multiply-adds than another still ran slower on the real device, because operation count and hardware latency are not the same currency."
  - id: mobilenetv3
    page: mobilenetv3
    area: budgeted-backbones
    role: milestone
    takeaway: MobileNetV3 fuses MobileNetV2's inverted-residual block, MnasNet's phone-latency search, and a per-layer filter trimmer into one pipeline, then hand-fixes two costly layers the automated search missed and swaps in a nonlinearity cheap enough for integer inference.
    remark: The two costly layers were fixed by inspection, not by search, showing that automated search and hand-tuned architectural judgment still work best combined rather than as substitutes for each other.
  - id: bisenet
    page: bisenet
    area: budgeted-dense-prediction
    role: milestone
    takeaway: "Real-time segmentation splits the work in two: a shallow, wide path keeps spatial detail while a separate, deep path builds receptive field, and a small fusion module merges them, so accuracy and detail no longer trade against each other on the same path."
    remark: The second version removes the ImageNet-pretrained backbone entirely and trains its context branch from scratch, cutting a dependency the first version still needed.
  - id: fast-scnn
    page: fast-scnn
    area: budgeted-dense-prediction
    role: milestone
    takeaway: Fast-SCNN notices that two-branch segmenters were paying for early downsampling twice, once per branch, and removes the duplication by sharing one shallow prefix as both the detail skip and the input to the deep context branch.
    remark: "Pretraining barely helps this network: fine-tuning from ImageNet weights improves accuracy by only about half a point, evidence that a small enough budgeted network does not need the crutches a large one relies on."
  - id: mobilesam
    page: mobilesam
    area: foundation-era-budget
    role: frontier
    takeaway: SAM's cost lives almost entirely in its encoder, so MobileSAM leaves the prompt encoder and mask decoder untouched and distils only that one component into a much smaller network, recovering most of the speedup for a fraction of the cost of retraining the whole model.
    remark: A later companion piece replaces SAM's brute-force grid of prompts with an object-aware detector that proposes far fewer boxes, cutting the segment-everything pipeline's end-to-end latency by more than sixteen times.
  - id: efficientad
    page: efficientad
    area: foundation-era-budget
    role: frontier
    takeaway: Instead of building a different student architecture to catch what a teacher cannot generalise to, EfficientAD shows the same architecture with a harder loss and a pretraining penalty is enough, keeping millisecond latency while still leading its own comparison table.
    remark: The student-teacher branch alone misses logical anomalies a local receptive field cannot see, so a second, feature-space autoencoder branch is added specifically for that failure mode rather than stretching one branch to cover both.
  - id: xfeat
    page: xfeat
    area: foundation-era-budget
    role: frontier
    takeaway: XFeat starves a VGG-style backbone at low resolution and pushes channel growth to the smallest stages instead, decouples keypoint detection from the descriptor entirely, and reaches CPU-grade real-time speed while targeting the classic FAST, BRIEF and ORB pipeline it replaces.
    remark: Its keypoint head is trained by distillation from a larger learned detector rather than from hand-labelled corners, borrowing that detector's sense of what a keypoint looks like rather than rediscovering it from scratch.
  - id: rf-detr
    page: rf-detr
    area: foundation-era-budget
    role: frontier
    takeaway: Rather than train one fixed-size detector, RF-DETR trains a single weight-sharing network once and searches thousands of sub-network configurations afterward, tracing an entire accuracy-latency frontier from one training run instead of one model per budget.
    remark: Its backbone is a self-supervised ViT pretrained at internet scale by someone else's compute; the search only picks the operating point on top of it, the resolution, patch size, decoder depth and query count.
  - id: q-borrowed-compute
    question: Once the cheap side of the frontier is a distilled or searched slice of a model someone else pretrained at scale, is budget discipline still winning, or is it spending compute it never paid for?
    area: foundation-era-budget
edges:
  - from: integral-image
    to: viola-jones-detector
    type: prerequisite
  - from: integral-image
    to: brief
    type: prerequisite
  - from: integral-image
    to: orb
    type: prerequisite
  - from: fast-corner-detector
    to: orb
    type: evolution
    label: detector to ORB
  - from: brief
    to: orb
    type: evolution
    label: steered and relearned
  - from: mobilenetv2
    to: mobilenetv3
    type: evolution
    label: shares the block
  - from: mobilenetv2
    to: fast-scnn
    type: evolution
    label: shares the block
  - from: mobilenetv2
    to: mnasnet
    type: evolution
    label: block as search space
  - from: mnasnet
    to: mobilenetv3
    type: evolution
    label: search plumbing
  - from: brief
    to: xfeat
    type: evolution
    label: learned replacement
  - from: orb
    to: xfeat
    type: evolution
    label: learned replacement
  - from: bisenet
    to: mobilenetv3
    type: contrast
  - from: bisenet
    to: fast-scnn
    type: contrast
  - from: mobilenetv3
    to: fast-scnn
    type: contrast
lenses:
  - id: overview
    title: Overview
    coords:
      integral-image:
        - 0.5
        - 1
      viola-jones-detector:
        - 2
        - 1
      fast-corner-detector:
        - 3.5
        - 1
      brief:
        - 5
        - 1
      orb:
        - 6.5
        - 1
      mobilenetv2:
        - 8
        - 2
      mnasnet:
        - 9.5
        - 2
      mobilenetv3:
        - 11
        - 2
      bisenet:
        - 8
        - 3
      fast-scnn:
        - 9.7
        - 3
      mobilesam:
        - 11.8
        - 4
      efficientad:
        - 13.2
        - 4
      xfeat:
        - 14.6
        - 4
      rf-detr:
        - 16
        - 4
      q-borrowed-compute:
        - 17.4
        - 4
steps:
  - title: The primitive that pays for itself
    anchor: the-primitive-that-pays-for-itself
    claim: A single precomputed table turns any rectangle's pixel sum into four array reads, and that constant-time trick alone is what turns scanning every window at every scale of an image into a real-time operation instead of a lab curiosity, first cashed in by a 38-stage face-detection cascade.
    focus:
      - integral-image
      - viola-jones-detector
  - title: Cheap tests replace expensive ones
    anchor: cheap-tests-replace-expensive-ones
    claim: A corner test made of pixel comparisons on a ring, and a descriptor made of pixel-brighter-than-pixel tests on a patch, both trade continuous gradient math for integer comparisons; combined and steered for rotation, they become a single detect-and-describe pipeline cheap enough for a 2011 phone.
    focus:
      - fast-corner-detector
      - brief
      - orb
  - title: The backbone becomes a budgeted object
    anchor: the-backbone-becomes-a-budgeted-object
    claim: Once latency is measured on a real device and put directly into the design objective rather than approximated by FLOPs, the backbone itself stops being a fixed shape trimmed after the fact and becomes something searched and rebuilt block by block for a target millisecond count.
    focus:
      - mobilenetv2
      - mnasnet
      - mobilenetv3
  - title: The same trick for dense prediction
    anchor: the-same-trick-for-dense-prediction
    claim: Two-branch segmenters split spatial detail from receptive field into separate paths so neither has to be sacrificed for the other, and the next iteration finds that even the two branches were duplicating early work, sharing one shallow prefix between them instead.
    focus:
      - bisenet
      - fast-scnn
  - title: Distillation and search as the new discipline
    anchor: distillation-and-search-as-the-new-discipline
    claim: "Once the expensive thing is a foundation-scale encoder or a large learned detector, the budget trick changes shape but not spirit: distil only the costly component while freezing the rest, borrow a teacher's keypoint sense, or split one job into a specialised branch per failure mode."
    focus:
      - mobilesam
      - efficientad
      - xfeat
  - title: Who pays for cheap
    anchor: who-pays-for-cheap
    claim: A single training run that searches thousands of latency-accuracy configurations still starts from a self-supervised backbone pretrained at internet scale by someone else's compute, raising the question of whether the frontier is being discovered or simply rented from an upstream model.
    focus:
      - rf-detr
      - q-borrowed-compute
---

## The Primitive That Pays for Itself

A single precomputed table turns the cost of window scanning into arithmetic. The [Integral Image](/atlas/integral-image) accumulates a running sum across the whole image, so the pixel sum inside any axis-aligned rectangle, of any size, comes back in exactly four array reads. Frank Crow built the same structure in 1984 for texture-map antialiasing under the name summed-area table; Viola and Jones reintroduced it in 2001 for face detection, and that reintroduction is the ancestor every later use in this history descends from.

The [Viola–Jones Object Detector](/atlas/viola-jones-detector) spends the budget the table buys on an exhaustive search: a 24×24 sub-window slides across every position and scale, and each candidate rectangle feature costs the same four reads no matter its size. What makes the search real-time is not the primitive alone but a 38-stage cascade trained by AdaBoost, where cheap early stages reject almost all background before costlier stages ever run, so an average of ten of the cascade's 6,061 trained features are evaluated per sub-window. The features themselves are still weighted sums of raw intensities compared against boosted thresholds; the next problem is whether even that per-pixel comparison can be made cheaper.

## Cheap Tests Replace Expensive Ones

Two more constructions attack the same problem from the comparison side rather than the summation side. The [FAST Corner Detector](/atlas/fast-corner-detector) tests a candidate pixel against a 16-pixel Bresenham ring of radius three: an arc of contiguous ring pixels uniformly brighter or darker than the centre by a margin marks a corner. No gradient is ever computed, and a four-point check on the ring's cardinal positions rejects most non-corners before the rest of the ring is read. [BRIEF](/atlas/brief) applies the same discipline to description: instead of building a continuous descriptor and compressing it afterward, it runs a fixed table of pixel-pair brighter-than tests on a smoothed patch and packs the results into a binary string, matched by XOR and a population count rather than a nearest-neighbour search over floats.

[ORB](/atlas/orb) fuses the two. FAST-9 candidates ranked by Harris cornerness supply the keypoints, and a version of BRIEF's tests, steered to each keypoint's orientation and replaced by 256 tests chosen by a greedy search for low correlation, supplies the descriptor. The result is a detect-and-describe pipeline of integer comparisons alone, fast enough for a 2011 phone. Steering the offset table without relearning it collapses the descriptor's variance; the learned, decorrelated table restores it. Detection and description are now nearly free; the backbone consuming their output is still an unbudgeted stack of full convolutions.

## The Backbone Becomes a Budgeted Object

[MobileNetV2](/atlas/mobilenetv2) does not shrink a standard backbone's layer widths; it restructures the block. The inverted-residual block expands a thin bottleneck into a wide interior, filters that interior with a depthwise convolution, then projects back down to a thin bottleneck with no nonlinearity, and the residual connects the thin ends rather than the wide middle. Dropping the final nonlinearity is deliberate: squashing a low-dimensional feature through a ReLU destroys information a linear projection would keep.

[MnasNet](/atlas/mnasnet) changes what the budget is measured in. Rather than trust FLOPs as a stand-in for speed, it measures latency directly on a Pixel phone during search and rewards each sampled network for the accuracy it buys per millisecond, motivated by cases where two networks with nearly identical multiply-add counts ran at very different real speeds. The search builds its candidates from MobileNetV2's inverted-residual block.

[MobileNetV3](/atlas/mobilenetv3) fuses both lines and adds a third step: MnasNet-style search sets the coarse block structure, a per-layer filter-trimming pass tunes it further, and two costly layers the search still missed are redesigned by hand. A new nonlinearity, h-swish, is piecewise-linear and exact under the arithmetic quantized runtimes use, avoiding the quantisation loss a soft sigmoid would cost. The backbone is now searched, budgeted, and hand-corrected; the next question is whether the discipline survives a decoder that must reconstruct a full-resolution label map instead of a single class score.

## The Same Trick for Dense Prediction

Semantic segmentation must produce a label for every pixel, and doing so had forced a tradeoff between spatial detail and receptive field onto a single path. [BiSeNet](/atlas/bisenet) removes the tradeoff by refusing to share a path: a wide, shallow Spatial Path preserves detail while a separate, deep Context Path with global pooling builds receptive field, and a small fusion module merges the two afterward, so accuracy and detail no longer compete for the same layers. The later version of the network goes further, removing the ImageNet-pretrained backbone its context branch depended on and training that branch from scratch instead.

[Fast-SCNN](/atlas/fast-scnn) notices that two-branch segmenters still pay for early downsampling twice, once per branch, and removes the duplication: a single shared shallow prefix feeds both the high-resolution detail skip and the entry point of the deep global-feature branch. Fine-tuning this network from ImageNet weights improves its accuracy by only about half a point, evidence that a small enough budgeted network does not need the pretraining crutch a larger one relies on. Both networks are compared directly against [MobileNetV3](/atlas/mobilenetv3)'s own segmentation head in the same real-time mobile segmentation regime, peer choices at a shared budget rather than one replacing the other. Every trick so far has been designed by hand or discovered by searching a space built from scratch; the next stage inherits a network someone else already paid to train at far larger scale, and has to decide what to keep.

## Distillation and Search as the New Discipline

Once the expensive thing is a foundation-scale encoder, the budget trick changes shape. [MobileSAM](/atlas/mobilesam) does not build a new architecture from scratch: Segment Anything's cost lives almost entirely in its image encoder, so MobileSAM leaves the prompt encoder and mask decoder frozen at their published weights and distils only the encoder into a much smaller student trained to reproduce the frozen teacher's image embedding. A companion piece keeps the same three-part interface but replaces the dense grid-of-prompts stage with an object-aware detector that proposes far fewer boxes, a swap that alone delivers a greater-than-16x total pipeline speedup.

[EfficientAD](/atlas/efficientad) makes the analogous move for anomaly detection. Rather than design a different, more constrained student architecture to stop it from generalising past the teacher, student and teacher share one architecture and a hard feature loss plus a pretraining penalty alone keep the student from copying the teacher on anomalous input, reaching millisecond latency while still leading its own comparison table. A second branch, a plain autoencoder with no skip connections, is added specifically to target the logical and compositional anomalies the local branch's small receptive field cannot see.

[XFeat](/atlas/xfeat) targets the classical pipeline of [FAST](/atlas/fast-corner-detector) corners and [BRIEF](/atlas/brief)-style, [ORB](/atlas/orb)-steered binary description directly. It starves a VGG-style backbone at high resolution and concentrates channel growth at the smallest stages instead, decouples keypoint detection from the descriptor encoder entirely, and trains its keypoint head by distillation from ALIKE-tiny rather than from a hand-crafted ground truth. Distillation and search have replaced hand design as the mechanism, but each one still narrows a single, already-trained expensive thing down to what one target device can afford.

## Who Pays for Cheap

[RF-DETR](/atlas/rf-detr) pushes the same discipline one step further. Instead of training one fixed-size detector, or distilling one teacher into one fixed student, it trains a single weight-sharing network once, sampling a different random sub-network configuration at every training step. After training, thousands of configurations, varying resolution, patch size, decoder depth, query count, and window count, are evaluated with no retraining, tracing an entire accuracy-latency Pareto frontier from one run instead of one model per budget.

That frontier is not free. RF-DETR's backbone is a pre-trained DINOv2 checkpoint, a vision transformer trained at internet scale by someone else's compute; the weight-sharing search only picks the operating point on top of it, the resolution, patch size, decoder depth and query count a given latency budget can afford. Once the cheap side of the frontier is a distilled or searched slice of a model someone else pretrained at scale, is budget discipline still winning, or is it spending compute it never paid for?
