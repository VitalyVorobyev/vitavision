# Practical Computer Vision Atlas — Obsidian + LLM Wiki + React Site Specification

## 1. Purpose

Build a modern, ergonomic, and maintainable **Computer Vision Algorithm Atlas** for `vitavision.dev`.

The atlas should not attempt to be a complete encyclopedia of computer vision. It should be a curated, practical knowledge map for engineers who want to understand, implement, compare, and apply computer vision algorithms.

The system should combine:

- a private Obsidian/Markdown knowledge base,
- LLM-assisted source ingestion and synthesis,
- reviewed canonical algorithm/concept pages,
- a public React/Vite website with rich navigation, search, graph-like relationships, and interactive demos.

The result should feel less like a blog and more like a **connected technical atlas**.

---

## 2. Core Product Positioning

The project should be positioned as:

> A practical atlas of computer vision algorithms, centered on implementation, geometry, calibration, and industrial vision.

It should avoid becoming:

- a generic “Wikipedia for computer vision,”
- a shallow generated paper summary database,
- a constantly outdated list of every modern model variant,
- a raw PDF-to-page conversion pipeline.

The site should prioritize depth, correctness, implementation value, and navigability.

---

## 3. Target Audience

Primary audience:

- computer vision engineers,
- robotics/perception engineers,
- calibration/metrology engineers,
- applied ML engineers working with visual models,
- advanced students who want implementation-level understanding.

Secondary audience:

- researchers looking for practical summaries,
- software engineers entering CV,
- users evaluating algorithm choices for production systems.

---

## 4. Scope

### 4.1 In Scope

The first version should focus on the following “spines”:

1. Image formation and filtering
   - convolution
   - gradients
   - pyramids
   - scale space
   - morphology

2. Local features
   - corners
   - blobs
   - descriptors
   - matching
   - RANSAC

3. Geometry
   - homographies
   - epipolar geometry
   - PnP
   - triangulation
   - bundle adjustment

4. Calibration
   - camera models
   - distortion models
   - calibration targets
   - Zhang calibration
   - fisheye calibration
   - hand-eye calibration
   - laser-plane calibration

5. Detection and segmentation
   - classical segmentation
   - connected components
   - contours
   - U-Net
   - Mask R-CNN
   - SAM-style foundation segmentation

6. Recognition and representation learning
   - CNNs
   - ResNet
   - ViT
   - CLIP
   - DINO
   - MAE

7. Industrial / metrology vision
   - calibration target detection
   - subpixel localization
   - structured light
   - line scan
   - inspection
   - robust geometric initialization

### 4.2 Out of Scope for Initial Version

Avoid trying to cover every variant of:

- YOLO,
- optical flow,
- NeRF,
- Gaussian splatting,
- visual language models,
- diffusion models,
- every segmentation architecture,
- every SLAM system,
- every paper in modern representation learning.

These topics may appear as anchor pages, but not as exhaustive timelines.

---

## 5. Guiding Principles

### 5.1 Dependency Graph over Encyclopedia

The atlas should map dependencies, not everything.

Example:

```text
Image gradients
  -> Harris
  -> Shi-Tomasi
  -> Lucas-Kanade
  -> SIFT orientation
  -> edge detection
  -> optical flow
```

Example:

```text
Homography
  -> planar calibration
  -> marker detection
  -> image stitching
  -> projective grids
  -> pose initialization
```

The user should be able to move through the field by following concepts and prerequisites.

### 5.2 Source-Grounded Content

Every substantial claim should be traceable to one of:

- original paper,
- canonical textbook or survey,
- widely used implementation,
- benchmark result,
- project-specific experiment,
- implementation note.

Generated content must not be published directly without review.

### 5.3 Public Pages Are Canonical, Not Raw

The public site should not expose raw LLM summaries.

Pipeline:

```text
source documents
  -> raw notes
  -> reviewed canonical notes
  -> public pages
```

### 5.4 Practicality over Exhaustiveness

Each page should answer:

- What problem does this solve?
- What is the core idea?
- What are the assumptions?
- What are the failure modes?
- How would I implement it?
- What should I compare it against?
- Where is it still useful today?

### 5.5 Treat Knowledge as a Codebase

The Markdown knowledge base should be managed like software:

- clear file structure,
- stable identifiers,
- frontmatter schema,
- review statuses,
- diffs,
- linting,
- broken-link checks,
- provenance tracking,
- source metadata.

---

## 6. System Architecture

### 6.1 High-Level Architecture

```text
PDFs / papers / repos / notes
        |
        v
private Obsidian / Markdown vault
        |
        v
LLM-assisted ingestion + synthesis
        |
        v
reviewed canonical pages
        |
        v
export/build step
        |
        v
React/Vite public website
```

### 6.2 Repositories

Recommended structure:

```text
cv-atlas-vault/
  sources/
  papers/
  concepts/
  algorithms/
  models/
  implementations/
  comparisons/
  failure-modes/
  datasets/
  glossaries/
  indexes/
  templates/
  agent/
  public/

vitavision.dev/
  src/
  content/
    atlas/
      algorithms/
      concepts/
      models/
      comparisons/
  scripts/
  public/
```

Alternative: keep the vault inside the website repo under `knowledge/`, but this is less clean if private notes should stay private.

Recommended approach:

- private vault repo: full Obsidian/LLM workspace,
- public website repo: curated exported content only.

---

## 7. Obsidian Vault Design

### 7.1 Folder Structure

```text
vault/
  00-inbox/
  01-sources/
    papers/
    books/
    standards/
    repos/
    blog-posts/
  02-raw-notes/
  03-concepts/
  04-algorithms/
  05-models/
  06-implementations/
  07-comparisons/
  08-failure-modes/
  09-datasets/
  10-public-candidates/
  90-indexes/
  91-templates/
  92-agent/
  99-archive/
```

### 7.2 Folder Purpose

#### `00-inbox/`

Temporary unprocessed material.

Examples:

- newly downloaded papers,
- rough notes,
- extracted text,
- links,
- agent-generated drafts.

#### `01-sources/`

Source metadata and provenance notes.

Each source should have one note.

Example:

```text
01-sources/papers/harris-1988-combined-corner-edge-detector.md
```

#### `02-raw-notes/`

LLM-generated or human rough notes.

These are not public and not canonical.

#### `03-concepts/`

Reusable technical ideas.

Examples:

```text
image-gradient.md
structure-tensor.md
homography.md
epipolar-constraint.md
radial-distortion.md
```

#### `04-algorithms/`

Canonical algorithm pages.

Examples:

```text
harris-corner-detector.md
shi-tomasi-corner-detector.md
sift.md
ransac.md
zhang-camera-calibration.md
bundle-adjustment.md
```

#### `05-models/`

Deep learning model families and landmark models.

Examples:

```text
resnet.md
vision-transformer.md
unet.md
sam.md
clip.md
dino.md
detr.md
yolo-family.md
```

#### `06-implementations/`

Implementation-specific notes.

Examples:

```text
opencv-findchessboardcornerssb.md
vlfeat-sift.md
ceres-bundle-adjustment.md
rust-nalgebra-camera-models.md
```

#### `07-comparisons/`

Pages comparing related methods.

Examples:

```text
harris-vs-shi-tomasi.md
sift-vs-orb.md
zhang-vs-fisheye-calibration.md
chess-vs-duda-frese.md
```

#### `08-failure-modes/`

Reusable failure mode pages.

Examples:

```text
motion-blur.md
radial-distortion.md
repeated-texture.md
specular-highlights.md
low-resolution-targets.md
occluded-calibration-grids.md
```

#### `90-indexes/`

Human- and agent-readable indexes.

Examples:

```text
index.md
algorithm-index.md
concept-index.md
source-index.md
review-status.md
```

#### `91-templates/`

Markdown templates for different page types.

#### `92-agent/`

Instructions for LLM/code agents.

Examples:

```text
AGENTS.md
CLAUDE.md
ingestion-policy.md
citation-policy.md
public-export-policy.md
```

---

## 8. Content Model

### 8.1 Page Types

The atlas should support these page types:

- `source`
- `concept`
- `algorithm`
- `model`
- `implementation`
- `comparison`
- `failure-mode`
- `dataset`
- `demo`
- `index`

### 8.2 Common Frontmatter Schema

All canonical notes should include:

```yaml
---
id: harris-corner-detector
title: Harris Corner Detector
type: algorithm
status: draft
visibility: private
tags:
  - corner-detection
  - local-features
  - classical-cv
domains:
  - local-features
  - calibration
created: 2026-04-30
updated: 2026-04-30
sources:
  - harris-1988-combined-corner-edge-detector
related:
  concepts:
    - image-gradient
    - structure-tensor
    - non-maximum-suppression
  algorithms:
    - shi-tomasi-corner-detector
    - forstner-corner-detector
  implementations:
    - opencv-goodfeaturestotrack
review:
  owner: Vitaly
  status: draft
  last_checked: 2026-04-30
---
```

### 8.3 Status Values

Allowed `status` values:

```text
stub
draft
reviewed
implemented
benchmarked
canonical
deprecated
```

Meaning:

- `stub`: placeholder only
- `draft`: useful but not fully reviewed
- `reviewed`: checked against sources
- `implemented`: implementation notes or code exist
- `benchmarked`: has experimental or benchmark support
- `canonical`: high-quality public-ready page
- `deprecated`: kept for historical reasons

### 8.4 Visibility Values

Allowed `visibility` values:

```text
private
public-candidate
public
```

Only `public` pages should be exported to the website.

---

## 9. Algorithm Page Template

Each algorithm page should follow this structure:

```markdown
# Algorithm Name

## Summary

One-paragraph explanation of what the algorithm does and where it is useful.

## Problem

What problem does the algorithm solve?

## Core Idea

Explain the central idea without implementation noise.

## Mathematical Model

Equations, objective functions, geometric constraints, or model assumptions.

## Inputs and Outputs

### Inputs

- input image
- parameters
- calibration data
- feature sets
- etc.

### Outputs

- detected points
- descriptors
- camera parameters
- transformation
- mask
- etc.

## Assumptions

List assumptions explicitly.

## Algorithm Outline

High-level steps.

## Implementation Notes

Practical details needed to implement it robustly.

## Parameters

Important parameters and how they affect behavior.

## Failure Modes

Link to reusable failure-mode pages.

## Variants

Important variants or extensions.

## Related Algorithms

Links to related pages.

## Source Papers

Original and important follow-up sources.

## Implementations

Links to OpenCV, VLFeat, scikit-image, Rust/C++ implementations, or project-specific code.

## When to Use

Practical recommendation.

## When Not to Use

Practical limitations.

## Public Page Notes

Notes for rendering on the public website, demos, diagrams, or warnings.
```

---

## 10. Source Note Template

Each source note should describe one source: paper, book chapter, repo, standard, or article.

```markdown
# Source Title

## Metadata

- Type:
- Authors:
- Year:
- Venue:
- DOI:
- URL:
- PDF:
- Code:
- Local file:
- Added:
- Reviewed:

## Abstract / Short Summary

Brief summary in own words.

## Main Contribution

What did this source introduce or clarify?

## Key Technical Ideas

- idea 1
- idea 2
- idea 3

## Equations / Definitions

Important equations and definitions.

## Assumptions

Explicit and implicit assumptions.

## Limitations

Known limitations.

## Relevant Pages Updated

- [[algorithm-page]]
- [[concept-page]]
- [[comparison-page]]

## Quotes / Exact Claims

Use short quotes only when necessary.

## Review Notes

Human review comments.
```

---

## 11. Public Website Requirements

### 11.1 Main Pages

The public site should include:

```text
/algorithms
/models
/concepts
/comparisons
/atlas
```

Optional later:

```text
/demos
/papers
/failure-modes
```

### 11.2 Algorithm Index

The algorithm index should support:

- category filtering,
- tag filtering,
- search,
- status indicators,
- difficulty level,
- classical vs modern label,
- implementation availability,
- demo availability,
- relationship links.

Example cards:

```text
Harris Corner Detector
Type: algorithm
Tags: corners, local features, classical CV
Status: reviewed
Related: Shi-Tomasi, Förstner, FAST
Has demo: yes
Has implementation notes: yes
```

### 11.3 Algorithm Page UX

Each public algorithm page should include:

- title,
- compact summary,
- “what problem it solves,”
- visual explanation,
- core formula or model,
- implementation section,
- failure modes,
- related algorithms,
- source references,
- optional interactive demo,
- optional benchmark section.

### 11.4 Graph-Like Navigation

The website should expose relationships in a practical way.

Minimum viable version:

- “Prerequisites”
- “Used by”
- “Related algorithms”
- “Compared with”
- “Common failure modes”

Example:

```text
Harris Corner Detector

Prerequisites:
- Image gradients
- Structure tensor
- Non-maximum suppression

Related:
- Shi-Tomasi
- Förstner
- FAST

Used by:
- local feature pipelines
- calibration target detection
- tracking initialization
```

A full visual graph is optional. Good relationship lists are more important than eye candy.

### 11.5 Search

The site should support search across:

- titles,
- summaries,
- tags,
- concepts,
- aliases,
- related methods.

Preferred lightweight options:

- static search index generated at build time,
- Fuse.js or MiniSearch,
- later upgrade to server-side search if needed.

### 11.6 Content Rendering

Preferred content format:

- MDX for public pages,
- frontmatter for metadata,
- generated JSON index for navigation/search.

The build should convert reviewed vault notes into public MDX/JSON.

---

## 12. LLM Wiki Workflow

### 12.1 Ingestion Workflow

For each new source:

```text
1. Add source PDF/link/repo metadata.
2. Create source note.
3. Extract main contributions.
4. Extract equations and assumptions.
5. Identify affected concept/algorithm/model pages.
6. Update private draft notes.
7. Add unresolved questions.
8. Mark pages requiring human review.
```

The agent should not publish directly.

### 12.2 Synthesis Workflow

When updating an algorithm page:

```text
1. Read current canonical page.
2. Read linked source notes.
3. Identify new or conflicting claims.
4. Update only the relevant sections.
5. Preserve existing reviewed content where possible.
6. Add source references.
7. Add review notes for uncertain claims.
8. Update backlinks and related pages.
```

### 12.3 Review Workflow

Human review should check:

- source correctness,
- mathematical correctness,
- misleading simplifications,
- implementation realism,
- missing assumptions,
- overclaiming,
- citation quality,
- public-readiness.

Only after review should `visibility` become `public`.

---

## 13. Agent Instructions

Create an `AGENTS.md` file in the vault with rules like:

```markdown
# Agent Instructions

You are maintaining a practical computer vision atlas.

Do not write public-facing pages directly from PDFs.
Always create or update source notes first.

When extracting from a paper:
- identify the core contribution,
- extract assumptions,
- extract equations,
- identify limitations,
- link to existing concepts and algorithms,
- add unresolved questions if uncertain.

When updating canonical pages:
- preserve reviewed content unless clearly wrong,
- avoid unsupported claims,
- cite source notes,
- mark uncertain statements,
- do not invent implementation details,
- do not overstate modern relevance.

Every new canonical page must include:
- frontmatter,
- summary,
- problem,
- core idea,
- assumptions,
- failure modes,
- related pages,
- sources.

Never set `visibility: public` unless explicitly instructed by the human owner.
```

---

## 14. Source Selection Policy

For each important algorithm page, aim for this source stack:

```text
Tier 1: original paper
Tier 2: canonical textbook or survey
Tier 3: widely used implementation
Tier 4: modern practical variant
Tier 5: own implementation notes or experiments
```

Do not overload pages with excessive sources.

Minimum viable source set per canonical page:

- original paper,
- one reliable explanatory/reference source,
- one practical implementation reference.

For deep learning model family pages:

- original paper,
- official implementation if available,
- one high-quality survey or benchmark reference,
- one practical implementation/framework reference.

---

## 15. Initial Canonical Node Set

Start with 30–50 high-value nodes.

### 15.1 Classical / Local Features

- Image gradients
- Structure tensor
- Harris corner detector
- Shi-Tomasi corner detector
- Förstner operator
- FAST
- SIFT
- ORB
- Canny edge detector
- Hough transform
- Lucas-Kanade optical flow
- RANSAC
- Non-maximum suppression
- Image pyramids
- Scale space

### 15.2 Geometry

- Homography
- Fundamental matrix
- Essential matrix
- Epipolar geometry
- PnP
- Triangulation
- Bundle adjustment
- Hartley normalization
- Robust estimation

### 15.3 Calibration

- Pinhole camera model
- Brown-Conrady distortion
- Fisheye camera models
- Zhang camera calibration
- Planar calibration targets
- Checkerboard detection
- ChArUco detection
- ChESS corner detector
- Duda-Frese checkerboard detector
- Hand-eye calibration
- Laser-plane calibration
- Scheimpflug camera model

### 15.4 Deep Learning / Models

- CNN
- ResNet
- U-Net
- Vision Transformer
- DETR
- YOLO family
- CLIP
- DINO
- MAE
- SAM

### 15.5 Industrial / Metrology

- Subpixel localization
- Calibration target design
- Structured light
- Line scan imaging
- Robust geometric initialization
- Occluded grid reconstruction

---

## 16. Export Pipeline

### 16.1 Input

The export tool should read from the private vault.

It should select only notes with:

```yaml
visibility: public
```

or optionally:

```yaml
visibility: public-candidate
```

when building preview deployments.

### 16.2 Output

Exported content should include:

```text
content/atlas/algorithms/*.mdx
content/atlas/concepts/*.mdx
content/atlas/models/*.mdx
content/atlas/comparisons/*.mdx
content/atlas/index.json
content/atlas/graph.json
```

### 16.3 Generated Index

The build should generate a JSON index containing:

```json
{
  "id": "harris-corner-detector",
  "title": "Harris Corner Detector",
  "type": "algorithm",
  "status": "reviewed",
  "tags": ["corner-detection", "local-features"],
  "summary": "Detects corners using the second-moment matrix of image gradients.",
  "path": "/algorithms/harris-corner-detector",
  "related": {
    "concepts": ["image-gradient", "structure-tensor"],
    "algorithms": ["shi-tomasi-corner-detector", "forstner-operator"]
  }
}
```

### 16.4 Validation

The export step should fail on:

- missing `id`,
- duplicate `id`,
- missing `title`,
- missing `type`,
- invalid `status`,
- invalid `visibility`,
- broken internal links,
- public page referencing private-only page,
- missing source references for public pages.

---

## 17. Technical Implementation Notes

### 17.1 Frontend Stack

Assume existing stack:

- React
- Vite
- TypeScript
- MDX or Markdown rendering
- static deployment via Cloudflare Pages

### 17.2 Suggested Libraries

Candidate libraries:

- `gray-matter` for frontmatter parsing
- `remark` / `rehype` for Markdown/MDX processing
- `Fuse.js` or `MiniSearch` for static search
- `react-router` or existing routing solution
- `mermaid` for diagrams if already supported
- custom components for relationship cards and algorithm metadata

### 17.3 Public Page Components

Create reusable components:

```text
AlgorithmHeader
StatusBadge
TagList
RelationshipPanel
SourceList
FailureModeList
EquationBlock
ImplementationNotes
DemoEmbed
ComparisonTable
```

### 17.4 Graph Data

Generate graph data from frontmatter relationships.

Initial graph schema:

```json
{
  "nodes": [
    {
      "id": "harris-corner-detector",
      "title": "Harris Corner Detector",
      "type": "algorithm"
    }
  ],
  "edges": [
    {
      "source": "harris-corner-detector",
      "target": "structure-tensor",
      "relation": "depends_on"
    }
  ]
}
```

Graph visualization is optional for MVP.

Relationship panels are required.

---

## 18. MVP Definition

The MVP should include:

1. Private vault structure.
2. Templates for:
   - source,
   - concept,
   - algorithm,
   - model,
   - comparison.
3. `AGENTS.md` with ingestion and update rules.
4. 10 reviewed public pages.
5. Export script from vault to website content.
6. Frontend algorithm index page.
7. Frontend algorithm detail page.
8. Static search.
9. Relationship panel.
10. Validation script.

### 18.1 Suggested First 10 Public Pages

Start with pages close to existing strengths:

1. Harris corner detector
2. Shi-Tomasi corner detector
3. ChESS corner detector
4. Duda-Frese checkerboard detector
5. Homography
6. Zhang camera calibration
7. Brown-Conrady distortion
8. Bundle adjustment
9. ChArUco detection
10. Subpixel localization

---

## 19. Phased Delivery Plan

### Phase 1: Knowledge Base Foundation

Deliver:

- vault folder structure,
- frontmatter schemas,
- templates,
- AGENTS.md,
- source selection policy,
- initial index pages.

### Phase 2: Export Pipeline

Deliver:

- Markdown parser,
- schema validator,
- internal link validator,
- public content exporter,
- JSON index generator,
- graph JSON generator.

### Phase 3: Public Atlas UI

Deliver:

- `/algorithms` index,
- `/concepts` index,
- algorithm detail layout,
- search,
- tag filters,
- relationship panel,
- source list rendering.

### Phase 4: First Canonical Content Batch

Deliver:

- 10 reviewed pages,
- source notes for each page,
- related concept pages,
- relationship graph,
- public deployment.

### Phase 5: Interactive / Visual Enhancements

Deliver selectively:

- diagrams,
- small demos,
- visual explanations,
- comparison tables,
- benchmark snippets.

### Phase 6: Scaling and Governance

Deliver:

- content linting,
- review dashboard,
- stale page detection,
- orphan page detection,
- missing-source detection,
- agent workflows for new sources.

---

## 20. Quality Gates

A page may be published only if:

- it has valid frontmatter,
- it has at least one source,
- it has a clear summary,
- it lists assumptions or states that assumptions are unknown,
- it lists failure modes or links to them,
- it has related pages,
- it has been human-reviewed,
- it does not contain unsupported claims,
- it does not expose private notes.

A page should be marked `canonical` only if:

- it is reviewed,
- it is technically accurate,
- it is useful without reading the original paper,
- it links to prerequisites and related algorithms,
- implementation notes are realistic,
- limitations are explicit.

---

## 21. Anti-Goals

Do not:

- generate public pages directly from PDFs,
- create hundreds of shallow pages,
- chase every new model release,
- publish unreviewed LLM summaries,
- rely on visual graph navigation alone,
- hide assumptions,
- overstate algorithm performance,
- mix private research notes into public content,
- make source selection purely popularity-based.

---

## 22. Success Criteria

The project is successful if:

- users can discover related algorithms naturally,
- algorithm pages are useful for implementation,
- source provenance is clear,
- new papers improve existing pages instead of creating isolated summaries,
- the public atlas feels curated and trustworthy,
- the private vault compounds knowledge over time,
- adding a new source has a repeatable workflow,
- the system supports demos and benchmarks without requiring every page to have them.

---

## 23. Recommended Immediate Next Step

Implement the MVP around the first 10 pages:

```text
Harris
Shi-Tomasi
ChESS
Duda-Frese
Homography
Zhang calibration
Brown-Conrady distortion
Bundle adjustment
ChArUco
Subpixel localization
```

Do not expand the scope until the full workflow works end-to-end:

```text
source -> vault note -> canonical page -> export -> public React page
```

Once this path is solid, scale by adding more nodes and relationships.
