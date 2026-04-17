---
# Required
title: "<Display name of the algorithm>"
date: YYYY-MM-DD
summary: "<One sentence, index-card length. Declarative. No narrative opening.>"
tags: ["<primary>", "<secondary>"]
category: <corner-detection|calibration-targets|subpixel-refinement|explainers>
author: "Vitaly Vorobyev"

# Optional
difficulty: <beginner|intermediate|advanced>
draft: false
relatedPosts: ["<blog-slug>"]
relatedAlgorithms: ["<algo-slug>"]
relatedDemos: ["<demo-slug>"]
editorAlgorithmId: <chess-corners|chessboard|charuco|markerboard|ringgrid|radsym>
coverImage: "./images/<slug>/cover.png"
repoLinks: ["https://github.com/..."]
demoLinks: ["https://..."]
---

# Goal

<One paragraph. Input → output → defining property. Declarative.
No narrative opening, no rhetorical question, no named alternative tools,
no attribution — attribution lives in References.>

# Goal — example (delete)

> Detect <specific feature class> in <input domain>. Input:
> <input with domain and type>. Output: <output with type>.
> The algorithm is specific to <property that distinguishes it
> from generic alternatives>.

# Algorithm

<Define every symbol. One line per symbol. Use $...$ for inline math.>

Let $I: \Omega \to [0, 255]$ denote the grayscale image on pixel domain $\Omega$.
Let $<symbol>$ denote <meaning>.

<Define every named quantity with a display formula.>

$$
\text{<quantity name>}(x, y) = <expression>.
$$

<One sentence of glue at most between formulas. No intuition paragraphs.>

## Procedure

<Numbered procedure. Each step is one imperative sentence. No prose filler.>

1. <Step>.
2. <Step>.
3. <Step>.

<If the algorithm has multiple distinct terms or stages, use `## <Subsection>`
sections, each ending with a display formula and a one-line interpretation
of what the quantity measures. Keep it tight.>

# Implementation

<Core computation. Show the algorithm, not a library call. ≤ 40 lines.
One sentence lead-in of the form "The per-pixel response in Rust:".>

```rust
<Self-contained snippet. Imports only if essential. The code corresponds
line-by-line to the math in `# Algorithm`. No `main()`, no I/O,
no library entry-point calls. Show the computation itself.>
```

<Optional Python mirror. Use when the algorithm is naturally expressed
with NumPy-style vectorization.>

```python
<Core computation in Python. ≤ 30 lines.>
```

# Remarks

- <Declarative bullet. Complexity: $O(...)$ per frame / per iteration.>
- <Scale or parameter sensitivity.>
- <Known failure mode, one line.>
- <Scope: what the algorithm does not do.>
- <Measured performance, if numbers exist. Name workload, hardware,
  features, scope. Use verbatim data from the repo; do not invent.>
- <Common extension, named. Pointer to a follow-up post or repo if relevant.>

# References

1. <Primary source.> Authors. *Title.* Venue, Year. [link-text](url)
2. <Closest antecedent or extension, if relevant.>
3. <At most 5 entries total.>

<!-- Figures (illustration pass, SKILL §7.5). One per primitive below. Delete unused rows. -->

<!-- Mermaid pipeline — inline, no asset file. Place after the Procedure block. -->

```mermaid
flowchart LR
    A["Stage 1"] --> B["Stage 2"]
    B --> C["Stage 3"]
```

<!-- Static SVG — store at content/images/<slug>/<name>.svg. Place near the defining formula. -->

![Geometric arrangement described by the figure](./images/<slug>/<name>.svg)

<!-- Placeholder — use only when the figure depends on rendered data. -->

<!-- TODO figure: <one-line description of the missing figure> -->

<!-- Template for content/algorithms/*.md only. For blog posts, use tech-writer.
     Delete the "Goal — example" block and any placeholder text before publishing. -->
