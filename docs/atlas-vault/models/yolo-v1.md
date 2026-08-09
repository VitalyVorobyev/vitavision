---
title: "YOLOv1"
type: model
slug: yolo-v1
---

> Generated stub — do not edit. Source: `content/models/yolo-v1.md`.

Single-stage CNN object detector that frames detection as one regression problem from full-image pixels to a 7×7×30 tensor of grid-cell box offsets, objectness, and 20-class probabilities — trained end-to-end and inferring 98 boxes per image at 45 fps on a Titan X.

## Practice

- **Compared with** — [[faster-rcnn]]
  > YOLO trades localization accuracy and small-object recall for ~3× throughput; same era, different design point.

## Cross-paradigm

- **Learned alternative of** — [[felzenszwalb-deformable-parts]]
  > Replaces sliding-window deformable templates with single-pass CNN regression; reframes detection as regression rather than classification of proposals.

## Sources

- Primary: [[redmon2016-yolo]]
- Reference: [[dalal2005-hog]]
- Reference: [[felzenszwalb2010-detection]]
- Reference: [[ren2015-faster]]
- Reference: [[simonyan2014-vgg]]
- Reference: [[szegedy2015-inception]]
