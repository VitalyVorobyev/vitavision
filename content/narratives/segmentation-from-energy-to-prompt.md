---
title: Segmentation, from Energy to Prompt
summary: How image segmentation kept the same task for twenty years while its prior moved from a hand-written energy function to a trained dense predictor to a promptable pretrained model, and what the practitioner stopped having to supply at each move.
tagline: Same masks. The prior moved house three times.
tags:
  - segmentation
  - interactive
  - deep-learning
  - classical
date: 2026-09-15
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: energy-based
    label: Energy-based
  - id: dense-prediction
    label: Dense prediction
  - id: instance-query
    label: Instance and query
  - id: interactive
    label: Interactive
  - id: promptable
    label: Promptable
nodes:
  - id: energy-minimization
    page: energy-minimization
    area: energy-based
    role: origin
    takeaway: "A per-pixel data term plus a pairwise smoothness term over a pixel graph, minimised globally: the human writes the objective, the algorithm only finds its optimum."
    remark: Graph-cut solves this exactly via min-cut; GrabCut iterates it with a learned appearance model; Felzenszwalb keeps the same weighted graph but drops the global objective for a local greedy criterion.
  - id: graph-cut-segmentation
    page: graph-cut-segmentation
    area: energy-based
    role: origin
    takeaway: User-marked seeds become hard constraints; a single s-t min-cut then finds the global optimum of a hand-written region-plus-boundary energy, so any labelling error traces to the cost function, not to a local minimum.
    remark: The result can take any topology, since it comes from a graph cut rather than a fitted curve, but the boundary term's bias toward short cuts still forces per-image tuning of its weight.
  - id: grabcut-iterative-segmentation
    page: grabcut-iterative-segmentation
    area: energy-based
    role: milestone
    takeaway: "Cuts the required user input to a single bounding box by alternating colour-mixture re-fitting with min-cut until a hand-written energy stops decreasing: an appearance model learned per image, not per dataset."
    remark: Border matting extends refinement into a narrow boundary ribbon with a regularised 1-D transparency profile; soft transitions like hair or smoke outside that ribbon stay out of scope.
  - id: felzenszwalb-graph-segmentation
    page: felzenszwalb-graph-segmentation
    area: energy-based
    role: milestone
    takeaway: "Runs on the same dissimilarity-weighted pixel graph as graph-cut but minimises no global energy at all: a greedy merge with a size-adaptive threshold decides boundaries locally, trading a global guarantee for speed and no seeds."
  - id: fcn-semantic-segmentation
    page: fcn-semantic-segmentation
    area: dense-prediction
    role: origin
    takeaway: "Reinterprets a classifier's fully-connected layers as 1x1 convolutions, turning any ImageNet network into a dense predictor: the prior shifts from a hand-written energy to whatever the training set and backbone learned."
    remark: Its skip architecture fuses coarse semantic and fine spatial features by element-wise sum rather than concatenation; U-Net's later choice of concatenation is a direct response to that design point.
  - id: unet-segmentation
    page: unet-segmentation
    area: dense-prediction
    role: milestone
    takeaway: Keeps the fully-convolutional idea but makes the decoder symmetric, concatenating full encoder feature maps at every scale, and trains from scratch on only tens of images via heavy elastic-deformation augmentation.
  - id: deeplab-semantic-segmentation
    page: deeplab-semantic-segmentation
    area: dense-prediction
    role: milestone
    takeaway: Keeps the classifier-to-predictor conversion but swaps strided downsampling for atrous convolution, adds a multi-scale pooling head, and bolts on a dense conditional-random-field pass to sharpen boundaries the network smooths.
  - id: mask-rcnn
    page: mask-rcnn
    area: instance-query
    role: milestone
    takeaway: "Adds a parallel per-pixel mask branch, predicted separately for each detected instance, onto a two-stage detector: the learned prior now has to separate individual objects of the same class, not just label pixels."
  - id: segformer
    page: segformer
    area: dense-prediction
    role: milestone
    takeaway: "Replaces the convolutional encoder with a hierarchical Transformer that needs no positional encoding, paired with a plain multi-layer-perceptron decoder: attention itself takes over the role a hand-written smoothness term once played."
  - id: mask2former
    page: mask2former
    area: instance-query
    role: milestone
    takeaway: Reframes segmentation as predicting a set of masks plus a class label per mask through a DETR-style decoder, so one architecture handles semantic, instance, and panoptic segmentation without being redesigned for each.
  - id: ritm-interactive-segmentation
    page: ritm-interactive-segmentation
    area: interactive
    role: origin
    takeaway: Feeds the user's click and the previous prediction into a trained network as extra input channels instead of seeding a graph's constraints; one forward pass beats methods that optimise at test time.
    remark: A normalized focal loss keeps the training gradient's magnitude bounded as the model's accuracy improves across successive simulated clicks, which plain focal or cross-entropy losses do not.
  - id: focalclick
    page: focalclick
    area: interactive
    role: milestone
    takeaway: "Runs each click through a small local crop instead of the whole image, then merges back only the changed region: the same click-as-input-channel idea, but fast enough for a CPU and native at correcting an existing mask."
  - id: sam
    page: sam
    area: promptable
    role: frontier
    takeaway: "Trains one heavy image encoder once, then lets a lightweight decoder answer any point, box, or text prompt against a mask vocabulary learned from 1.1 billion examples: the click now conditions a decoder instead of seeding a unary term."
    remark: Those 1.1 billion masks came from a three-stage data engine rather than manual annotation alone, so the dataset is as much the contribution as the encoder-decoder split itself.
  - id: mobilesam
    page: mobilesam
    area: promptable
    role: frontier
    takeaway: "Distils a 632-million-parameter image encoder into a 5.78-million-parameter one in under a single GPU-day, while keeping the frozen prompt encoder and mask decoder unchanged: the prior stays exactly where it was, only its cost shrinks."
  - id: q-click-meaning
    question: Once the prior lives inside a pretrained decoder, what does the user's click still specify?
    area: promptable
edges:
  - from: energy-minimization
    to: graph-cut-segmentation
    type: prerequisite
  - from: energy-minimization
    to: grabcut-iterative-segmentation
    type: prerequisite
  - from: energy-minimization
    to: felzenszwalb-graph-segmentation
    type: prerequisite
  - from: graph-cut-segmentation
    to: grabcut-iterative-segmentation
    type: evolution
    label: extends
  - from: fcn-semantic-segmentation
    to: unet-segmentation
    type: evolution
    label: extends
  - from: fcn-semantic-segmentation
    to: deeplab-semantic-segmentation
    type: evolution
    label: extends
  - from: fcn-semantic-segmentation
    to: mask-rcnn
    type: evolution
    label: feeds into
  - from: mask2former
    to: sam
    type: evolution
    label: feeds into
  - from: segformer
    to: focalclick
    type: evolution
    label: feeds into
  - from: ritm-interactive-segmentation
    to: focalclick
    type: evolution
    label: extends
  - from: sam
    to: mobilesam
    type: evolution
    label: extends
  - from: graph-cut-segmentation
    to: sam
    type: evolution
    label: learned alt.
  - from: felzenszwalb-graph-segmentation
    to: sam
    type: evolution
    label: learned alt.
  - from: grabcut-iterative-segmentation
    to: ritm-interactive-segmentation
    type: evolution
    label: learned alt.
  - from: fcn-semantic-segmentation
    to: segformer
    type: contrast
  - from: deeplab-semantic-segmentation
    to: segformer
    type: contrast
  - from: mask-rcnn
    to: mask2former
    type: contrast
  - from: sam
    to: focalclick
    type: contrast
  - from: ritm-interactive-segmentation
    to: sam
    type: bridge
lenses:
  - id: overview
    title: Overview
    coords:
      energy-minimization:
        - 0
        - 0
      graph-cut-segmentation:
        - 1.5
        - 0
      grabcut-iterative-segmentation:
        - 3.5
        - 0
      felzenszwalb-graph-segmentation:
        - 5
        - 0
      fcn-semantic-segmentation:
        - 6
        - 1
      unet-segmentation:
        - 7.4
        - 1
      mask-rcnn:
        - 7.5
        - 2
      deeplab-semantic-segmentation:
        - 8.8
        - 1
      segformer:
        - 10.6
        - 1
      ritm-interactive-segmentation:
        - 10.6
        - 3
      mask2former:
        - 12.2
        - 2
      focalclick:
        - 12.2
        - 3
      sam:
        - 13.8
        - 4
      mobilesam:
        - 15.3
        - 4
      q-click-meaning:
        - 16.8
        - 4
  - id: dense-prediction
    title: Dense prediction lineage
    coords:
      energy-minimization:
        - 0
        - 0
      graph-cut-segmentation:
        - 1.5
        - 0
      felzenszwalb-graph-segmentation:
        - 5
        - 0
      fcn-semantic-segmentation:
        - 6
        - 1
      unet-segmentation:
        - 7.4
        - 1
      deeplab-semantic-segmentation:
        - 8.8
        - 1
      segformer:
        - 10.6
        - 1
      mask-rcnn:
        - 7.5
        - 2
      mask2former:
        - 12.2
        - 2
  - id: interactive
    title: Interactive to promptable
    coords:
      energy-minimization:
        - 0
        - 0
      graph-cut-segmentation:
        - 1.5
        - 0
      grabcut-iterative-segmentation:
        - 3.5
        - 0
      ritm-interactive-segmentation:
        - 10.6
        - 3
      focalclick:
        - 12.2
        - 3
      sam:
        - 13.8
        - 4
      mobilesam:
        - 15.3
        - 4
      q-click-meaning:
        - 16.8
        - 4
steps:
  - title: An Objective a Human Writes Down
    anchor: energy-as-objective
    claim: "Energy minimization poses segmentation as a single global optimum: a data term learned from a handful of seed pixels plus a hand-written pairwise smoothness term, solved exactly by one min-cut with no local minima to worry about."
    focus:
      - energy-minimization
      - graph-cut-segmentation
  - title: Trading Seeds for a Single Rectangle
    anchor: coordinate-descent-priors
    claim: GrabCut keeps the same energy but relearns its own appearance model per image, cutting required user input from dense seed strokes to one bounding box; Felzenszwalb, on the same graph, drops the global energy entirely for a local greedy merge rule.
    focus:
      - grabcut-iterative-segmentation
      - felzenszwalb-graph-segmentation
  - title: The Prior Moves Into the Weights
    anchor: dense-prediction-takes-over
    claim: FCN turns any pretrained classifier into a dense predictor, replacing the hand-written energy with whatever the training set taught the network; U-Net and DeepLab then disagree on how to keep spatial detail without a hand-tuned pairwise term.
    focus:
      - fcn-semantic-segmentation
      - unet-segmentation
      - deeplab-semantic-segmentation
  - title: Same Predictor, Two New Framings
    anchor: instance-and-token-mixing
    claim: Mask R-CNN keeps FCN's per-pixel mask idea but predicts it once per detected instance; SegFormer swaps the convolutional backbone for a positional-encoding-free Transformer; Mask2Former reframes the whole task as predicting a labelled set of masks.
    focus:
      - mask-rcnn
      - segformer
      - mask2former
  - title: The Click Becomes an Input Channel
    anchor: interactive-goes-feedforward
    claim: RITM feeds the click and the previous mask straight into a trained network instead of seeding a graph's constraints, beating methods that optimise at test time in a single forward pass; FocalClick then localises that computation to a small crop for CPU-speed correction.
    focus:
      - ritm-interactive-segmentation
      - focalclick
  - title: A Foundation Model Holds the Prior
    anchor: prompt-conditions-a-decoder
    claim: SAM trains one heavy encoder once and lets a lightweight decoder answer any prompt against a mask vocabulary learned from 1.1 billion examples; MobileSAM shows that encoder alone compresses 100x, leaving open what a click still supplies once the model already knows what objects look like.
    focus:
      - sam
      - mobilesam
      - q-click-meaning
---

## Energy as Objective

[Energy Minimization](/atlas/energy-minimization) poses segmentation as a single scalar objective: a data term measuring how well a label fits observed evidence at each pixel, plus a pairwise smoothness term penalising label disagreement between neighbours. [Graph-Cut Interactive Segmentation](/atlas/graph-cut-segmentation) instantiates this directly. A user marks object and background seed pixels; those seeds become hard constraints on an s-t graph built over every pixel, with n-links carrying the boundary term and t-links carrying the region term learned from the seed histograms. A single minimum cut on that graph then returns the global optimum of the combined energy, so a labelling failure traces to the cost function a human wrote down, not to a local minimum the solver settled for.

The boundary term is not free of human input either. Its bias toward short cuts through the graph means the weight balancing region against boundary evidence needs tuning per image, since too small a value produces small segments and too large a value fragments the result through region competition. The practitioner supplies both a set of labelled pixels and a free parameter of the objective, in exchange for a global guarantee, but that guarantee comes at the price of a labour-intensive interaction: dense seed strokes across the whole image, not a single click.

## Coordinate Descent Priors

[GrabCut Iterative Segmentation](/atlas/grabcut-iterative-segmentation) keeps graph-cut's energy but stops asking the human to supply an appearance model directly. A colour-mixture model is fit and re-fit at every pass: assign each unlabelled pixel to its nearest Gaussian component, re-estimate the components from their assigned pixels, run a global min-cut over the resulting energy, and repeat. Because each full pass minimises the joint objective over one group of variables, the energy falls monotonically across the loop, though only to a local minimum that depends on where the rectangle was drawn. What the human now supplies is a single rectangle around the object, not the dense foreground and background strokes graph-cut required.

[Felzenszwalb–Huttenlocher Graph-Based Image Segmentation](/atlas/felzenszwalb-graph-segmentation) runs on the same dissimilarity-weighted pixel graph as graph-cut but answers a different question. Rather than minimising any global energy, it sorts every edge by weight and greedily merges two components whenever their cheapest cross-boundary edge does not exceed a size-adaptive internal-variation threshold. No seeds, no rectangle, no supervision of any kind: the algorithm partitions the whole image on its own. What it gives up in exchange is graph-cut's global guarantee, since the output is not the minimiser of any scalar energy, only a fixed merge rule a human designed, not one a network learned from data.

## Dense Prediction Takes Over

[FCN: Fully Convolutional Networks](/atlas/fcn-semantic-segmentation) removes the hand-written energy altogether. It reinterprets a classifier's fully-connected layers as 1x1 convolutions, so a network already trained on ImageNet becomes a dense predictor with no architectural change: the boundary between foreground and background is now whatever the training set and backbone learned. Earlier pooling stages are fused into the final prediction by element-wise sum, recovering some spatial detail that repeated pooling destroys, but the fusion stays coarse.

[U-Net](/atlas/unet-segmentation) keeps the fully-convolutional idea but disagrees with that fusion choice. Its decoder is symmetric to the encoder and concatenates the full, cropped encoder feature map at every resolution, carrying much more spatial detail forward than a summed score map does. The trade for that richer decoder is data: U-Net is trained from scratch on tens of images via heavy elastic-deformation augmentation, where FCN leans on ImageNet pretraining it cannot use in the same small-data regime.

[DeepLab](/atlas/deeplab-semantic-segmentation) disagrees with both on preserving resolution in the first place. Atrous convolution enlarges the receptive field without discarding spatial resolution or adding parameters, replacing strided downsampling outright, and a multi-scale pooling head gathers context from several dilation rates in one pass. Dense CRF post-processing then tightens boundaries that the CNN over-smooths. Three networks, three answers, yet each still emits one class label per pixel across the whole image, unable to tell two touching instances of the same class apart.

## Instance and Token Mixing

[Mask R-CNN](/atlas/mask-rcnn) answers the instance problem directly. It extends a two-stage detector with a third parallel mask branch, a small FCN producing independent per-class binary masks at each region of interest, so the network outputs per detected instance: a class label, a score, a box, and its own mask. Detection now precedes segmentation, so two touching objects of the same class arrive as two separate regions, each earning a mask of its own.

[SegFormer](/atlas/segformer) instead questions the backbone. It eliminates positional encodings entirely, letting a small convolution inside the feed-forward block supply positional information via zero-padding, and pairs a hierarchical Transformer encoder with a lightweight all-MLP decoder that requires no ASPP, OCR, or other context modules. The convolutional inductive bias that shaped every network up to this point is no longer load-bearing.

[Mask2Former](/atlas/mask2former) changes the output itself. Instead of a class label per pixel or a mask per detected box, the model predicts a fixed set of masks paired with class labels, one per candidate segment, supervised by bipartite matching rather than per-pixel cross-entropy. The same architecture and loss train on semantic, instance, or panoptic supervision without changing the head structure. None of these three networks, though, accepts guidance from the user at inference time; each commits to its output the moment the forward pass finishes.

## Interactive Goes Feedforward

[RITM](/atlas/ritm-interactive-segmentation) returns interactivity to the pipeline, but not by seeding a graph. Its input is an accumulated positive-click map, a negative-click map, and a previous-mask channel, forming a five-channel tensor alongside the RGB image, and a single forward pass per user interaction produces the next mask, in contrast to inference-time-optimisation methods that run backward passes at test time to refine predictions. Training a model this way demands a loss that keeps the gradient bounded as accuracy improves click by click; a normalized focal loss renormalizes by its own total weight so that the aggregate gradient magnitude remains comparable to plain cross-entropy regardless of how well the model is doing.

[FocalClick](/atlas/focalclick) keeps the click-as-input-channel idea but changes where the forward pass runs. Each click triggers inference on two small local crops only, a Target Crop fed to a lightweight Segmentor and a Focus Crop fed to a Refiner, reaching sub-300 ms per click on a CPU. Its Progressive Merge step writes only the largest connected update region containing the new click back into the global mask, leaving the rest of a preexisting mask untouched, something RITM's whole-image forward pass does not target directly. Both networks, though, are trained end to end on one dataset's object distribution; a genuinely open vocabulary of objects means training something bigger, once, and reusing it everywhere.

## Prompt Conditions a Decoder

[SAM](/atlas/sam) is that bigger, once-trained thing. Its heavy image encoder runs once per image, and a lightweight prompt encoder together with a fast mask decoder then answer any point, box, or text prompt in about 50 ms on CPU with a precomputed embedding. What the decoder answers against is a mask vocabulary learned from SA-1B, 1.1 billion masks collected across 11 million licensed images, not from one dataset's category list. The click that once seeded a min-cut graph, or fed a trained network as an extra channel, now conditions a decoder that already encodes a general notion of what an object's boundary looks like.

[MobileSAM](/atlas/mobilesam) shows how much of that system is really the encoder. Distilling the image encoder from 632 million parameters down to 5.78 million, in less than one GPU-day on a fraction of SA-1B, while SAM's own prompt encoder and mask decoder remain frozen at their published weights, is enough to keep the same interface at a fraction of the cost. The prior itself does not move; only the size of the network holding it shrinks.

Once the prior lives inside a pretrained decoder, what does the user's click still specify?
