# Spec: Rich Technical Blog Content System and Reading-Focused Typography

## Purpose

Upgrade the Vitavision blog from a basic markdown renderer into a technical publication surface that supports richer semantic content and significantly better long-form reading comfort.

The blog should become a primary entry point for technical articles, algorithm notes, and implementation deep-dives. The result must feel closer to a serious technical journal or high-quality engineering publication than a generic app page.

## Why this change is needed

Current article rendering is functional but too plain. The main issues are:

- The typography is not optimized for long reading sessions.
- Body text contrast is too weak on the dark background.
- The visual rhythm of paragraphs, lists, links, and headings is not strong enough.
- The content system does not support technical semantic blocks such as definitions, theorems, proofs, or algorithms.
- Code and math content are not yet treated as first-class publication elements.

From the current screenshot, the page looks clean, but it reads more like a dark dashboard page than a publication page. For technical writing, that will reduce reading stamina and perceived authority.

## Goals

1. Make article pages comfortable for 10–20+ minute reading sessions.
2. Support rich technical blocks in plain author-friendly markdown.
3. Keep the content pipeline simple and static-first.
4. Avoid a premature full migration to MDX.
5. Create a foundation that can later support citations, cross-references, and selective interactive components.

## Non-goals

For the first implementation pass, do **not** aim to build:

- a full CMS
- a full scholarly citation engine with BibTeX
- a full MDX migration for all content
- automatic cross-references between theorem-like blocks
- complex client-side rendering for math or code

These can be added later if needed.

---

## Product decision

### Chosen direction

Keep the current **markdown-first static pipeline**, and extend it with:

- directive-based semantic content blocks
- math rendering
- high-quality code rendering
- a dedicated article typography system

This is preferred over an immediate MDX-first approach because it preserves simplicity and keeps content authoring fast and low-friction.

### Authoring model

Primary content format remains:

- frontmatter
- markdown body
- custom block directives for semantic technical structures

Later, a small number of special pages may optionally use MDX, but this is **not** phase 1.

---

## Functional requirements

## 1. Rich semantic content blocks

Support the following directive-style blocks in article markdown:

- `quote`
- `note`
- `warning`
- `definition`
- `statement`
- `theorem`
- `lemma`
- `proposition`
- `proof`
- `example`
- `algorithm`

### Example author syntax

```md
:::definition[Homography]
A homography is a projective transformation represented by a non-singular 3×3 matrix up to scale.
:::

:::theorem[Plane-induced image mapping]
If all observed points lie on a plane, the correspondence between two views is described by a homography.
:::

:::proof
Project the plane into each camera, eliminate depth, and derive the 3×3 mapping between image coordinates.
:::

:::algorithm[Normalized DLT]
:input: Corresponding image points
:output: Homography matrix H

1. Normalize image coordinates.
2. Assemble the linear system.
3. Solve using SVD.
4. Denormalize the solution.
:::

:::quote[Hartley & Zisserman]
A plane induces a homography between views.
:::
````

### Rendering rules

Each block should render into a predictable semantic wrapper with stable CSS classes.

Recommended HTML structure pattern:

```html
<section class="vv-block vv-block--theorem" data-kind="theorem">
  <div class="vv-block__title">Theorem</div>
  <div class="vv-block__label">Plane-induced image mapping</div>
  <div class="vv-block__body">...</div>
</section>
```

### Styling requirements for blocks

* Each block type must be visually distinct without being noisy.
* The design should fit both light and dark theme.
* Blocks should look publication-grade, not like generic alert cards.
* `proof` blocks should have a quieter style than warnings/notes.
* `algorithm` blocks should support list content and optional input/output metadata.
* `quote` blocks should support optional attribution label.

### Numbering

Phase 1: numbering is optional.

Preferred behavior:

* theorem-like blocks may show a simple per-page counter later
* do not block implementation on numbering if it complicates the pipeline

---

## 2. Math support

Add support for:

* inline math: `$H = K(R - tn^T/d)K^{-1}$`
* display math: `$$ ... $$`

### Requirements

* Render math at build time
* No client-side math runtime for phase 1
* Math output must look good in article body and inside theorem/proof blocks
* KaTeX is a good default choice

---

## 3. Code block rendering

Code is central to the site and must look much better than default markdown output.

### Requirements

* syntax highlighting at build time
* consistent styling in dark and light themes
* good spacing and readable font sizing
* support for titles or captions later
* support inline code styling that clearly differs from body text

Optional later:

* copy button
* line highlighting
* filename headers

---

## 4. Article typography refresh

Article pages need a dedicated reading system separate from the app shell.

### Main principle

The article body should feel like a publication surface. Navigation and app chrome can stay product-like, but the content area should optimize for reading.

### Typography requirements

#### Layout

* Limit body text width to roughly `68–72ch`
* Keep headings and metadata aligned with article content width
* Avoid overly wide lines on desktop
* Keep comfortable left/right breathing room on mobile and tablet

#### Font system

Recommended approach:

* keep UI, navigation, and labels in the existing sans-serif
* introduce a reading-focused body font for article prose

Recommended body font candidates:

* `Source Serif 4`
* `Literata`
* `Newsreader`

Fallback: `Georgia`, serif

Recommended code font:

* existing mono if already good
* otherwise `JetBrains Mono` or `IBM Plex Mono`

If adding a serif body font is too invasive for phase 1, improve the current sans-serif prose first, but the serif body option is strongly recommended.

#### Body text

Desktop target:

* font size around `18px`
* line height around `1.75`

Tablet:

* font size around `17px`

Mobile:

* font size around `16px`
* maintain generous line height

The current body text appears too dim and too small for dark-mode long-form reading. Increase readability through:

* stronger foreground contrast
* slightly larger body text
* more stable paragraph rhythm
* better spacing after headings and lists

#### Paragraph spacing

* clear separation between paragraphs
* avoid cramped vertical rhythm
* first paragraph after title may be styled as a lead paragraph

#### Headings

* stronger hierarchy between `h1`, `h2`, `h3`
* more generous top spacing before section starts
* tighter spacing between heading and the paragraph immediately below
* headings must feel editorial, not dashboard-like

#### Links

Current inline links are too visually weak for technical reading.

Improve by:

* stronger underline or underline-on-hover behavior
* clearer contrast from surrounding body text
* preserve tasteful style; avoid noisy bright links

#### Lists

* improve list indentation and spacing
* better bullet appearance
* ensure nested lists remain readable

#### Blockquotes

* use a publication-style quote treatment
* stronger left rule or offset layout
* optional attribution styling

#### Tables

* readable borders or separators
* compact but comfortable padding
* horizontal overflow handling on mobile

#### Inline code

* improve contrast and background treatment
* make inline code feel integrated, not like an accidental badge

---

## 5. Build pipeline changes

Extend the current markdown pipeline rather than replacing it.

### Target pipeline

Recommended components:

* markdown parser
* GFM support
* directive parsing
* math parsing
* custom Vitavision directive transformer
* rehype conversion
* heading slugging
* KaTeX rendering
* code highlighting
* sanitize with extended schema
* HTML stringification

### Requirements

* keep generation static
* keep article output deterministic
* extend sanitization to preserve classes/data-attributes needed by custom blocks
* avoid unsafe raw HTML dependence where possible

### Custom plugin

Add a small custom plugin that maps supported directives to stable output structures and class names.

Suggested namespace:

* `vv-article`
* `vv-block`
* `vv-block--definition`
* `vv-block--theorem`
* `vv-block--proof`
* etc.

This namespace should stay stable so the design can evolve without rewriting content.

---

## 6. CSS / styling architecture

Introduce a dedicated article styling layer instead of mixing everything into generic app styles.

### Requirements

* article styles must be scoped to content pages
* the blog should not rely on default browser prose styles
* typography should be intentional and tested in both themes
* styles should cover:

  * paragraphs
  * headings
  * lists
  * blockquotes
  * links
  * tables
  * inline code
  * code blocks
  * custom semantic blocks
  * math

If using Tailwind, a dedicated article prose layer or article component class is fine. Avoid relying only on the default typography plugin preset without customization.

---

## 7. Sample content and author documentation

Create one internal demo article that exercises all supported content features.

It should include:

* headings at multiple levels
* paragraph prose
* inline math
* display math
* code block
* quote
* definition
* theorem
* proof
* algorithm
* note/warning
* table
* list

Also add a short authoring guide documenting supported syntax and block usage.

---

## 8. Acceptance criteria

The implementation is successful when:

1. A long article is noticeably more comfortable to read than the current version.
2. Custom blocks render consistently and look intentional.
3. Math renders correctly at build time.
4. Code blocks look polished and readable.
5. The article surface feels distinct from the surrounding app UI.
6. No unsafe HTML regressions are introduced.
7. The content pipeline remains simple enough for fast iteration.

---

## 9. Suggested implementation phases

### Phase 1 — Typography foundation

* improve article width, font sizing, spacing, contrast, heading rhythm, link styling
* introduce article-specific styling layer
* validate on existing blog posts

### Phase 2 — Semantic blocks

* add directive parsing
* implement custom block transformer
* style all supported block types
* add sample article fixture

### Phase 3 — Math and code polish

* add build-time math rendering
* add build-time syntax highlighting
* refine inline code and code block styling

### Phase 4 — Authoring docs and cleanup

* document supported syntax
* remove dead styles
* confirm dark/light theme consistency
* finalize with visual review on desktop and mobile

---

## 10. Discussion points for review

Before implementation, discuss these decisions:

1. Should the article body move to a serif reading font, while UI remains sans-serif?
2. Should theorem-like blocks be numbered in phase 1 or postponed?
3. Should proof blocks be collapsible when long, or always expanded?
4. Do we want bibliography/citation support in the next phase after this one?
5. Should a few future flagship articles be allowed to use MDX for interactive figures?
