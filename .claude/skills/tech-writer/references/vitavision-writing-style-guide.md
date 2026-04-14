# Vitavision Writing Style Guide

This guide is organized around the concrete rhetorical moves visible in Vitaly Vorobyev's published posts. Every pattern below is paired with a real excerpt from `content/blog/01-chesscorners.md` so a drafter can compare intended output against an existing reference. Line numbers refer to that file.

Anything not present in the reference is marked as such.

## Contents

- [1. Voice in one paragraph](#1-voice-in-one-paragraph)
- [2. The opening move](#2-the-opening-move)
- [3. Framing questions](#3-framing-questions)
- [4. Handling existing tools fairly](#4-handling-existing-tools-fairly)
- [5. Naming the idea and its author](#5-naming-the-idea-and-its-author)
- [6. Layered failure cases](#6-layered-failure-cases)
- [7. Intuition around every formula](#7-intuition-around-every-formula)
- [8. Named building blocks](#8-named-building-blocks)
- [9. Landing each section](#9-landing-each-section)
- [10. Deferring with a promise](#10-deferring-with-a-promise)
- [11. Implementation block](#11-implementation-block)
- [12. Performance writing](#12-performance-writing)
- [13. Final-thoughts list](#13-final-thoughts-list)
- [14. Inline references to interactive material](#14-inline-references-to-interactive-material)
- [15. Related content — use frontmatter, not a See-also list](#15-related-content--use-frontmatter-not-a-see-also-list)
- [16. Sentence-level preferences](#16-sentence-level-preferences)
- [17. Precision and honesty](#17-precision-and-honesty)
- [18. What to avoid](#18-what-to-avoid)
- [19. Default post skeleton](#19-default-post-skeleton)

## 1. Voice in one paragraph

An engineer explaining something he actually built, measured, and shipped — not a tutorial writer and not an academic. First person where judgment or motivation matters, third person where mechanism does. Opinions are welcome when grounded in experience; hedges and softeners are not. The reader should finish a section with a concrete takeaway they can act on.

## 2. The opening move

Open from concrete professional context, not abstract problem framing. Name the work, then let the problem follow.

Reference (lines 14–16):

> Calibrating visual sensors in challenging setups is part of my job. In practice this means multi-camera rigs, significant lens distortion, tilted optics, and images where corner localization is expected to be both accurate and stable. At some point it became clear to me that the OpenCV calibration toolset was not good enough for my use cases: not only in terms of accuracy, but also in terms of performance, robustness, and control over the full pipeline.

Pattern:

1. One sentence stating the kind of work ("is part of my job", "we use X on Y", "I work on Z").
2. One sentence unpacking what that work looks like in practice — concrete objects, not abstractions.
3. The moment the existing tool fell short, with named dimensions (accuracy, performance, robustness, control).

Avoid openings that start with the algorithm or the abstract problem. The personal-professional frame is load-bearing.

## 3. Framing questions

A single posed question, answered immediately, beats two paragraphs of setup. Use sparingly — one per post, usually right after the opening.

Reference (line 16):

> The first question was simple: how should one detect chessboard corners?

Template: *"The first question was simple: <question>?"* or *"The natural question is: <question>?"*

## 4. Handling existing tools fairly

Give the existing tool a fair read before diverging. Acknowledge → differentiate. Never dismiss.

Reference (line 18):

> Classical detectors such as Harris, Shi-Tomasi, or FAST are designed to react to corner-like structures in general. That is exactly why they are broadly useful, and also why they are not ideal here.

The move is: state what the tool does well → use that same property to explain why it does not fit *this* problem. The contrast is structural, not evaluative.

### 4a. Parenthetical aside

For alternative approaches that deserve a mention but not a section, use a parenthetical paragraph. Keep it to one paragraph and end inside the parenthesis.

Reference (line 20):

> (OpenCV's chessboard detector follows a different route: it starts from segmenting black squares and then derives corners from the recovered geometry. That works well, but it couples the problem to global board structure and requires the whole pattern to be visible, which is not acceptable in my case.)

## 5. Naming the idea and its author

Attribute methods with named authors and a linked primary source, not a vague "has been shown" or an unlinked reference.

Reference (line 22):

> Bennett and Lasenby [proposed](https://arxiv.org/abs/1301.5491) an elegant, robust, and efficient detector, ChESS (Chess-board Extraction by Subtraction and Summation), designed specifically for chessboard-like X-junctions. In my view, this idea deserves more attention in the vision community.

Pattern:

- "<Authors> [proposed / introduced / showed](<link>) …"
- Optionally, one opinion sentence: "In my view, …" — grounded in use, not ranking.

## 6. Layered failure cases

This is the signature expository pattern. For each false-positive family or failure mode, use a subsection that follows the same five beats:

1. **Name the failure** — one sentence, one image if helpful.
2. **State the key observation** — what is characteristic of this failure on the measurement.
3. **Introduce a remediation term** — give it a name.
4. **Give the formula** — in a display block.
5. **Interpret the formula** — what it does to true positives vs. the failure.

Reference — "Rejecting edges" (lines 52–74):

- Name: *"Consider the edge case shown below."*
- Observation: *"on an edge, opposite samples often have opposite brightness"*
- Remediation name: *"the diff response"*
- Formula: `DR = sum |I_n - I_{n+8}|`
- Interpretation: *"This term is large on edges and relatively small on true chessboard corners."*

Reference — "Rejecting stripes" (lines 76–107) follows the identical shape.

When there is more than one failure family, stack the subsections in order of increasing subtlety. Use phrases like *"The second false-positive case is more subtle."* to mark the progression.

## 7. Intuition around every formula

Every display formula sits between verbal intuition and verbal interpretation. Never drop a formula cold.

Reference (lines 36–48):

> A chessboard corner creates an alternating pattern on the ring: bright, dark, bright, dark. This means that opposite samples tend to have similar intensity, while samples rotated by $90^\circ$ tend to be out of phase. This leads to the basic combination
>
> $$ I_n + I_{n+8} - I_{n+4} - I_{n+12}. $$
>
> When the ring is centered on a true X-junction, this quantity becomes large in magnitude.

Pattern:

1. Verbal description of the local pattern or expected intensities.
2. A bridging phrase: *"This leads to"*, *"This gives"*, *"The corresponding expression is"*.
3. The formula.
4. Interpretation: what happens in the wanted case, what happens otherwise.

Inline math uses `$...$`, display math uses `$$...$$`. A single Greek letter in prose still needs delimiters: write `$\pi$`, not `\pi`.

## 8. Named building blocks

Give each computed quantity a short name the reader can carry through the post. Names should be lowercase noun phrases, not acronyms unless the acronym is already in the literature.

Reference uses: *sum response* (SR), *diff response* (DR), *mean response* (MR), *ChESS response* (R).

Once named, the quantity can be referenced by its name instead of the formula, which keeps later paragraphs short.

## 9. Landing each section

Close each section with a **one-line practical implication**, not a summary of what was just covered. The last sentence should tell the reader why the section was worth reading.

References:

- Line 107: *"This is one of the reasons ChESS is so attractive in practice."*
- Line 158: *"This orientation becomes useful later when reconstructing board structure and filtering out geometrically inconsistent detections."*
- Line 133: *"That part deserves a separate discussion, so I will return to it in another post."*

Avoid closing sentences that merely recap. *"In this section, we saw …"* is the wrong register.

## 10. Deferring with a promise

When a topic is out of scope, **promise a future post or a document**, rather than waving it away.

Reference (line 133):

> In my implementation, I use several classical subpixel refinement methods, as well as a CNN-based refiner. That part deserves a separate discussion, so I will return to it in another post.

Template: *"<Thing> deserves a separate discussion, so I will return to it in another post."* or *"<Topic> is out of scope here; see <linked doc>."*

## 11. Implementation block

The implementation section exists to let the reader use the thing. Keep it minimal.

Reference shape (lines 162–196):

1. One sentence: where the code lives, with repo link.
2. Install command for the primary language:
   ```
   cargo add chess-corners
   ```
3. One short Rust snippet (≤ 10 lines) showing the primary entry point.
4. One sentence introducing the bindings, with install command:
   ```bash
   uv pip install chess-corners
   ```
5. One short Python snippet of equivalent behavior.
6. One sentence on configuration defaults: *"In most practical cases, however, the default settings should work well."*

Both snippets must actually run against the published package. Do not mix aliases — if the Python import is `import chess_corners as cc`, use `cc.` throughout. Code fences must carry a language tag (`rust`, `python`, `bash`).

## 12. Performance writing

Every performance claim names four things: **workload, hardware, enabled features, exact scope**.

Reference (line 204):

> Detecting features in the image above ($1024 \times 576$ pixels) takes about 1.2 ms on my MacBook Pro with an M4 chip, with the rayon and simd features enabled.

When comparing against another tool, state whether the comparison is apples-to-apples. If it is not, say so.

Reference (line 206):

> The last comparison is only partial, because `findChessboardCornersSB` is a full chessboard detector, while ChESS here covers only the corner-detection stage.

Vague claims like *"the implementation is very fast"* do not belong.

## 13. Final-thoughts list

The closing section is typically a bullet list of properties of the method. Each bullet is a **full self-contained sentence** with a reason — never a single adjective.

Reference (lines 214–217):

> * It provides orientation information for each corner. This is very useful for recovering global structure and rejecting false positives.
> * It does not require committing to a global board model at the response stage. This makes it attractive in the presence of strong lens distortion and other difficult imaging conditions.
> * It produces an interpretable quality score, which gives direct control over detection sensitivity and the recall-precision tradeoff.
> * It is computationally simple. That simplicity translates directly into fast implementations, parallel execution, and clean multiscale extensions.

Close with a one-line summary sentence:

> Overall, ChESS is a simple and practical detector. It is fast, robust, and well suited to demanding production pipelines.

## 14. Inline references to interactive material

Illustrations and interactive demos are referenced **inline with the surrounding text**, not appended after it. The surrounding sentence should tell the reader what the illustration is for.

Reference patterns:

- Captioned image:
  > `![Sum response on an ideal chessboard corner](./images/01-chess/chess-response-corner-sr.svg)`
- Interactive demo block:
  ```
  :::illustration[chess-response]{preset="compact" pattern="corner"}
  :::
  ```
- Inline introduction (line 109):
  > *"The demo below shows how the ChESS score behaves on three characteristic patterns: a true corner, an edge, and a narrow stripe."*

Alt text should describe what is depicted, not what the reader should conclude from it.

## 15. Related content — use frontmatter, not a See-also list

The site renders a "Related Algorithms" and "Related Demos" section below every blog post automatically, driven by the `relatedAlgorithms` and `relatedDemos` frontmatter arrays (see `src/pages/BlogPost.tsx` and `src/components/blog/RelatedPosts.tsx`). A hand-written `## See also` section at the bottom of a post is redundant and will drift.

Put related content in the frontmatter:

```yaml
relatedAlgorithms: ["chess-corners", "harris-corner-detector", "shi-tomasi-corner-detector", "fast-corner-detector"]
relatedDemos: ["chess-response"]
```

Do not end posts with a `## See also` markdown section. Use inline links in the body when a pointer needs prose context; use frontmatter for the trailing related-content navigation.

## 16. Sentence-level preferences

Prefer:

- Medium-length sentences with a clear logical spine.
- Explicit causal links: *therefore*, *this means*, *this leads to*, *for this reason*, *in particular*.
- Concrete nouns (*ring*, *corner*, *heat map*, *stripe*) over abstractions (*entity*, *construct*, *element*).
- Simple verbs: *compute*, *detect*, *reject*, *derive*, *sample*, *build*, *observe*, *measure*.

Vocabulary this voice likes:

*practical*, *robust*, *efficient*, *accurate*, *false positive*, *signal*, *response*, *geometry*, *implementation*, *out of scope*, *in my view*.

Avoid:

- Nested clauses three levels deep.
- Marketing vocabulary: *cutting-edge*, *revolutionary*, *game-changing*, *seamless*, *powerful* (used without a reason).
- Generic filler: *it is worth mentioning that*, *needless to say*, *as we all know*.

## 17. Precision and honesty

State limits as part of the technical description, not as apologies.

Useful phrases from the reference:

- *"This is an important limitation: the ambiguity cannot be resolved from the ring samples alone."* (line 82)
- *"The last comparison is only partial, because …"* (line 206)
- *"That part deserves a separate discussion, so I will return to it in another post."* (line 133)

Opinions must come with grounding — *"In my view, this idea deserves more attention in the vision community."* works because the post has just spent pages showing why. *"This is obviously the best method."* does not.

## 18. What to avoid

Each of these is a real failure mode observed in draft output; the fix is to rewrite rather than hedge.

- **Softeners at closing lines.** *"so attractive"* weakens a strong sentence. *"This is one reason ChESS is attractive in practice."* lands harder than *"This is one of the reasons ChESS is so attractive in practice."*
- **Marketing qualifiers in claims.** *"well suited to demanding production pipelines"* shades into product copy; *"well suited to production pipelines"* is enough when the evidence is already on the page.
- **Colloquial asides in otherwise formal prose.** *"a pixel is already a fairly large unit"* is out of register in a post that otherwise writes *"a pixel is a coarse unit"*.
- **Naked math symbols in prose.** A symbol defined in a display formula must appear in math delimiters when referenced in text: write `$M$`, not `M`.
- **Missing language tags on code fences.** Every fenced block must declare its language (`rust`, `python`, `bash`) so the site highlights it.
- **Alias drift in code examples.** If the Python import is `import chess_corners as cc`, every later reference must use `cc.`, never the full module name.
- **Redundant articles before possessives.** *"The OpenCV's detector"* — drop the article.
- **Recap closings.** *"In this section we saw that …"* — replace with a one-line practical implication (see §9).
- **Unlinked claims.** *"It has been shown that …"* — attribute to named authors with a link, or drop the claim.

## 19. Default post skeleton

Posts use numbered top-level sections (`# 1. Introduction`, `# 2. …`). Subheadings inside a section use `##`. The default skeleton:

```markdown
---
title: "<Title>"
date: YYYY-MM-DD
summary: "<One-sentence summary.>"
tags: [...]
author: "Vitaly Vorobyev"
repoLinks: [...]
relatedAlgorithms: [...]
difficulty: intermediate
---

# 1. Introduction
<opening move → framing question → acknowledge existing tools → name the idea and author>

# 2. <The method>
<define what is computed; core idea; intuition + formula + interpretation>

## <Failure mode 1>
<five-beat pattern from §6>

## <Failure mode 2>
<five-beat pattern from §6>

<final expression; landing sentence>

<inline illustration or demo>

# 3. <From dense signal to features> (optional)
<post-processing, refinement, orientation, or whatever glue the method needs>

# 4. <In <language>>
<implementation block per §11>

<benchmark paragraph per §12>

# 5. Final thoughts
<bulleted strengths per §13; one-line summary>
```

Related algorithms and demos are listed in frontmatter (`relatedAlgorithms`, `relatedDemos`) and rendered by the site — do not add a trailing `## See also` section.

Sections can be added or merged, but numbering should stay continuous and the skeleton should be recognizable across posts.
