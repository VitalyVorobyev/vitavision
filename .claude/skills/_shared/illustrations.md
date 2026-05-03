# Illustrations and diagram authoring

These rules apply to algorithm pages, model pages, and concept pages. The four primitives, the decision tree (Mermaid vs hand-authored SVG vs generated SVG), the hand-authored SVG rules, the generator-script requirements, the palette, the typography floor, and the Mermaid authoring notes are all binding.

Math and code carry the content, but a figure earns its place when it encodes a geometric arrangement, a functional surface, or a pipeline order that prose can only describe laboriously. Four native primitives are wired into the site; pick the right one for the job:

| Primitive | Syntax | Use for |
|---|---|---|
| **KaTeX** | `$...$`, `$$...$$` | All math. Already required for symbol lists and quantity definitions. |
| **Mermaid** | ` ```mermaid ` fence — `flowchart LR`, `graph`, `stateDiagram`, `sequenceDiagram` | Pipelines, procedure stages, control flow, state machines. Renders client-side to interactive SVG via `src/hooks/useMermaid.ts`. No asset file. |
| **Hand-authored SVG** | `![alt](./images/<slug>/file.svg)` | Simple geometric schemes with < ~15 primitives: sampling patterns on a pixel grid, a 1/3-edge circle placement, a saddle-shape sketch. Stored under `content/images/<slug>/`. |
| **Generated SVG** | `![alt](./images/<slug>/file.svg)` — **script at `py/generate_<slug>_<name>.py`** | Data-driven figures: functional surfaces, response regions, parametric sweeps, density/contour plots, anything with > ~20 plotted elements or a closed-form equation to evaluate. See the "Generated figures" subsection below. |

The two SVG primitives share the same markdown syntax and output location (`content/images/<slug>/`); they differ only in how the file is produced. The build (`scripts/content-build.ts`) rewrites relative paths to `/content/images/...` regardless.

**Blocked.** Inline `<svg>` markup in markdown is stripped by `rehype-sanitize` (`scripts/content-build.ts:57-120`). Paste raw SVG into a `.svg` file under `content/images/<slug>/` and reference it with markdown image syntax; do not paste it into the page body. Interactive React components are possible but hardcoded per algorithm (`src/lib/content/useArticleIllustrations.tsx` currently only knows `chess-response`); do not invent new ones from a skill pass — request a code change.

**Also blocked.** Embedding raster images inside SVG via `<image href="data:image/png;..."/>` is unacceptable. SVGs are vector primitives — if the figure is a photograph or a rasterized screenshot, use a PNG/JPEG with markdown image syntax directly. SVG is for vector content only.

## Choosing the primitive

**Good signals for including a figure:**

- The procedure has $\geq 3$ stages in a definite order with branching or filtering steps → Mermaid pipeline.
- The math references a geometric arrangement of samples, axes, or regions that a reader cannot reconstruct mentally from the formula alone (a 16-offset ring, an eigenvalue ellipse, a 1/3-edge circle placement) → SVG.
- A named quantity has a visual interpretation more compact than its formula (the shape of a saddle, the empty-circumcircle property, a response's zero-level contour) → SVG.

**Hand-authored vs generated:**

- If the figure is < ~15 strokes/labels and the geometry is fixed (integer offsets, named axes, a single labelled region), **hand-author** it.
- If the figure plots a function, evaluates an equation over a grid, encodes a parametric region, shows a contour / filled area between curves, a density, or anything that would be tedious to place by eye, **generate it from a Python script**. This also holds when parameters of the page (e.g. Harris $k = 0.04$, ChESS ring radius $= 5$) are baked into the figure — a generator makes the figure follow the page if a constant changes.

**Drop the figure when:**

- It restates what the formula already says (e.g. a bar chart of two numbers from a two-term definition).
- It shows the algorithm's output on a real photograph — that belongs in the demo (`editorAlgorithmId`), not in the reference card.
- It is a second restatement of Mermaid pipeline stages already written as the `:::algorithm[...]` procedure.

**Quality floor.** No draft-quality figures. If a figure is worth including, it must be either:

1. A clean Mermaid diagram that previews correctly at ≤ 360 px width; or
2. A hand-authored SVG following the authoring rules below; or
3. A generated SVG from a committed Python script that reproduces byte-identically on re-run.

If none of these is feasible under the current budget, omit the figure — do not commit a low-fidelity sketch, a raster screenshot of a notebook, or a "coming soon" caption. The one exception is the **placeholder convention** below, and only for figures that genuinely depend on algorithm output on a real image.

## Hand-authored SVG rules

- Author the file under `content/images/<slug>/<name>.svg`. Match the existing style in `content/images/01-chess/*.svg`: `viewBox`, `class="h-auto w-full text-foreground"`, inline `style="color:#…"` fallback, `role="img"`, `aria-label` with a one-sentence description.
- Every numerical label on the figure (offset coordinates, ellipse axes, ratios) must match the page's math verbatim. A `1/3` on the page must be `1/3` on the figure, not `0.33`.
- Plain strokes on white background; small semantic colour accents only (e.g. ring samples in one hue, central cross in another). No decorative gradients.
- Keep the viewBox aspect squareish (1:1 to 3:1 landscape). Tall-narrow figures overflow the content column badly on mobile.

## Generated figures

Data-driven plots are generated by a Python script committed under `py/`, and both the script and the output SVG are checked in. This keeps the plot reproducible, re-renderable when a page's parameters drift, and auditable — the script is the source of truth for every label and value in the figure.

**Canonical example.** `py/generate_harris_eigenvalue_regions.py` → `content/images/harris-corner-detector/eigenvalue-classification.svg`. It evaluates $R = \lambda_1 \lambda_2 - k(\lambda_1 + \lambda_2)^2$ on a grid, fills the corner/edge regions using `contourf`, overlays the $R = 0$ zero-level lines solved in closed form, and annotates the flat region, diagonal, and zero contours. Study this script before writing a new one.

**Setup.** Use the repo-root `.venv` for all generator scripts. It is preinstalled with matplotlib and numpy; extend with additional packages as needed. Do not create per-script venvs.

```bash
.venv/bin/python py/generate_<slug>_<name>.py
```

**Filesystem convention.**

- Script: `py/generate_<slug>_<name>.py`. The slug matches the page slug in `content/algorithms/`; the name matches the SVG filename.
- Output: `content/images/<slug>/<name>.svg`. The script must compute `REPO_ROOT = Path(__file__).resolve().parents[1]` and write to the derived absolute path so it runs from any cwd.
- CLI: accept an optional positional `output_path` argument plus the key parameters of the plot (e.g. `--k` for Harris's sensitivity), so a reviewer can re-render with alternative values without editing code. Default all parameters to the values used by the page.

**Tool choice.** matplotlib + numpy is the default — it covers contour plots, scatter plots, vector fields, parametric regions, filled areas, and LaTeX-rendered labels. Other tools are fine when they fit the figure better:

- **matplotlib** — default; best for 2-D functional plots, contour fills, eigenvalue / parameter spaces, marginal histograms.
- **scipy + matplotlib** — when the figure needs a numerical solver (ODE, optimisation, spline fit) to produce its data.
- **PIL / Pillow** — synthetic discrete pixel grids: FAST-16 sampling pattern overlaid on a checkerboard, integer neighbourhood stencils. Export to SVG via `cairosvg` or render a high-DPI PNG if vector is not essential.
- **`svgwrite` / direct SVG emission** — when the figure is mostly vector primitives (circles, polylines, labels) with no data dependency; this is the middle ground between hand-authored and matplotlib.
- **pycairo / svgwrite** — when matplotlib's layout engine fights the figure (e.g. a multi-panel schematic with text flowing between panels).

Any tool is acceptable as long as the three requirements below are satisfied.

**Requirements for every generator script** (non-negotiable):

1. **Deterministic output.** The same script on the same inputs produces byte-identical SVG, so git diffs of the output file track real content changes. With matplotlib this means setting `svg.hashsalt` in `plt.rcParams` and pinning `metadata={"Date": "<static date>"}` on `savefig`. With other tools, disable timestamp / random-id generation.
2. **Accessibility.** Inject `<title id="title">...</title>` and `<desc id="desc">...</desc>` children at the top of the `<svg>` element, and add `role="img" aria-labelledby="title desc"` to `<svg>`. The Harris script demonstrates this via a post-pass `add_svg_accessibility()` that rewrites the file after `savefig`. The `<title>` is the short figure name; the `<desc>` is the one-sentence visual summary used by screen readers.
3. **Typography passthrough.** Set `svg.fonttype: "none"` (matplotlib) or equivalent so text renders with the site's font stack instead of being converted to `<path>`. This also keeps file size small and lets KaTeX-rendered math inside the page and the SVG share styling.

**Colour palette.** Match the site's slate/indigo-on-white aesthetic. Good defaults: text `#111827`, muted text `#475569`, axis/tick `#475569`–`#64748b`, grid `#cbd5e1`, and fills from the Tailwind 200 / 300 family (`#bfdbfe`, `#bbf7d0`, `#e2e8f0`) with matched 600 / 700 strokes (`#2563eb`, `#047857`, `#64748b`). Never use a diverging viridis / plasma ramp unless the data is genuinely diverging.

**Background.** Do not hard-code pure white for the figure patch — a large white rectangle clashes with the article's dark theme. Render the whole figure as a soft light card: `fig.patch.set_facecolor("#f8fafc")` (Tailwind slate-50) and `ax.set_facecolor("#ffffff")` so the axes card reads one step brighter than the figure margin. Save with `facecolor=fig.get_facecolor()`. Keeping the figure patch opaque is essential: the title, axis labels, and any outside-axes annotations live in that margin, and a transparent patch would render dark text on the dark page background. The slate-50 card reads well in both themes; the site's `border border-border rounded-md` supplies the card edge.

**Every label is load-bearing.** A label on the figure is a claim, and the working-notes audit (Workflow §8) checks every label the same way it checks numerical constants in the page body. Prefer few, precisely-placed labels over dense annotation.

**Typography floor.** The smallest text on the figure must be ≥ 12 pt, not just the base `rcParams` size. Check each inner label, annotation, callout, and tick after `savefig`: anything under 12 pt in the rendered SVG will fall below 4 pt on a 320 px column and is illegible. If a label cannot fit at 12 pt, drop it or shrink what it annotates — do not downsize the type. Reserve 9–11 pt only for corner metadata (author tag on a standalone plot, etc.), never for load-bearing content. Axis labels and the title read at larger sizes (15 pt axes, 17 pt title are typical).

**Label pruning.** Every label on the figure is a claim; every duplicate claim is noise. Before finalizing:

- Drop any label that restates an axis label or the subtitle formula (e.g. a diagonal $\lambda_1 = \lambda_2$ line when both axes are already labelled, or a footer caption that repeats the page's `# Goal`).
- One word is better than a phrase; a phrase is better than a sentence. `flat` beats `flat\nsmall λ₁, λ₂`.
- No inside-the-figure caption paragraph. Captions belong in the markdown prose immediately after the `![alt](...)` image reference.

**Mobile check.** Aspect ratio roughly 4:3 or squarer. After rendering, view the SVG at 320 px wide and confirm every label is readable — not just the title.

## Placeholder convention

When a figure is genuinely valuable but depends on real-image data that the generator cannot synthesize (an algorithm heatmap on a specific photograph, a before/after demo on user-provided input), emit `<!-- TODO figure: <one-line description of the missing figure> -->` inline where it would go and add a bullet to working notes. Do not commit empty image files, broken image references, or "coming soon" captions. If you find yourself reaching for this for a mathematical plot, stop and write the generator script instead.

## Mermaid authoring notes

- **`flowchart LR` is forbidden for pipelines with >4 stages.** It produces a long horizontal strip that's unreadable at narrow viewports (≤768 px). Use `flowchart TB` (top-to-bottom) for short pipelines, OR a 2D matplotlib SVG (see `py/_templates/pipeline_2d.py.template`) for any pipeline with ≥5 stages where the structure is load-bearing.
- For pipelines with ≤4 stages, `flowchart LR` is fine if it fits within ~600 px width.
- Use `<br/>` for line breaks inside node labels; keep each label ≤ 3 short lines.
- Arithmetic symbols inside node labels can clash with Mermaid syntax; the usual fix is to wrap the label in double quotes: `A["s = f_xy² − f_xx·f_yy"] --> B`.
- Preview at mobile width (≤ 360 px). If the diagram doesn't fit, switch to a generated SVG.
