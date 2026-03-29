# ChESS Response Illustration

## Purpose

`src/components/illustrations/ChessResponseIllustration.tsx` is an educational React + SVG explainer for the ChESS detector response. It visualizes the synthetic pixel patch, the 16-sample ring, and the three response terms:

- `SR` — sum response over four phase-shifted opposite-pair comparisons
- `DR` — diff response over opposite sample differences
- `MR` — absolute difference between the local mean patch and the ring mean
- `R = SR - DR - 16 * MR`

The component is intended for article use, not benchmarking. The synthetic intensities are procedural and internally consistent with the rendered samples and reported numbers.

## Public props

- `preset?: "article" | "compact"` controls layout density
- `showControls?: boolean` hides or shows the control column
- `initialPattern?: "corner" | "edge" | "stripe"`
- `initialRotation?: number`
- `initialBlur?: number`
- `initialContrast?: number`
- `initialAnimateRotation?: boolean`
- `initialShowLabels?: boolean`
- `initialShowSrPairs?: boolean`
- `initialShowDrPairs?: boolean`
- `initialShowMrRegions?: boolean`
- `className?: string`

## Rendering model

- `patterns.ts` generates a procedural intensity field for `corner`, `edge`, and `stripe`
- `math.ts` samples that field on a `17 x 17` pixel grid, a 16-point ring, and a 5-pixel local-mean patch
- `ChessResponseSvg.tsx` renders the grid with SVG `rect`, `circle`, `line`, and `text` primitives
- `useChessResponse.ts` ties the computed response values to the UI copy and response status

Ring indexing uses `I0 ... I15`, starting at the top sample and continuing clockwise.

## Response computation

The implementation follows the ChESS paper structure:

- `SR = Σ_{n=0..3} |(I_n + I_{n+8}) - (I_{n+4} + I_{n+12})|`
- `DR = Σ_{n=0..7} |I_n - I_{n+8}|`
- `MR = |mean(ring) - mean(local patch)|`
- `R = SR - DR - 16 * MR`

The local mean region uses the center pixel plus its four axial neighbors. That keeps the mean term easy to visualize while staying aligned with the paper’s “few center pixels” teaching intent.

## Article embedding

Markdown and algorithm pages can mount the figure through:

```md
:::illustration[chess-response]{preset="article" pattern="corner" rotation="22.5"}
:::
```

`scripts/remark-vv-embeds.ts` converts the directive into a sanitized placeholder div. `src/lib/content/useArticleIllustrations.tsx` hydrates that placeholder on article pages and mounts `ChessResponseIllustration`.

## Assumptions

- The synthetic patterns are pedagogical, not camera-accurate
- Blur is modeled procedurally before sampling, not as a physical PSF
- Rotation changes the pattern field while the ring indexing stays fixed, which keeps the logic legible for readers
