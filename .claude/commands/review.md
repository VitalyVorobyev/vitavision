# /review

Review the current branch's changes against vitavision engineering and content standards
(`.claude/CLAUDE.md`).

---

## Steps

### 1 — Capture Changes
Run:
```bash
git diff --stat main...HEAD
git diff main...HEAD
git diff --name-only main...HEAD
git status
```

If there are no committed changes ahead of `main` and the working tree is clean, report
"Nothing to review — branch matches main."

### 2 — Review Against CLAUDE.md
Check the diff against `.claude/CLAUDE.md`:
- **Verification Checklist** — `bun run build`, `bun run lint`, `npx vitest run`; also
  `bun run scripts/test-wasm-schemas.ts` if an algorithm config schema changed, and
  `bun run ds:validate` if a component exported from `.design-sync/ds-entry.tsx` changed.
- **Atlas authoring policy** (if `content/**`, `docs/papers/**`, or `docs/research/notes/**`
  changed) — single global slug namespace, no hand-authored reverse edges (`usedBy`,
  `generalises`, etc.), correct `relations[].type` per the Rule A/B/C comparison discipline,
  `quality:` field gates satisfied, `sources` kinds valid with a matching research note, and
  `bun run content:validate` passes.
- **Touch & mobile interaction** (if an interactive SVG, canvas, or react-konva surface
  changed) — `touch-action: none` set on the interactive element; hover-only affordances have
  a tap-equivalent via `pointerType === "touch"`/`"pen"`.
- **WASM defaults-merge rule** (if `src/lib/wasm/wasmWorker.ts` or an algorithm adapter under
  `src/components/editor/algorithms/*/adapter.ts` changed) — config built from WASM module
  defaults deep-merged with user overrides, not a hand-rolled default object.
- **Never-guess rule** — any claim about a WASM/API schema or runtime behavior in the diff
  should be backed by a call to the real thing, not inferred from naming.

### 3 — Report Findings
Report grouped by severity:
- **Blocking** — must fix before merge
- **Important** — should fix
- **Minor** — optional
- **Verification Results** — build / lint / vitest / (wasm-schemas / ds:validate /
  validate-content, as applicable) pass/fail

If all gates pass and no blocking issues are found, state clearly: "Review passed — ready to
commit."
