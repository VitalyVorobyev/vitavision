---
name: tech-writer
description: Draft, outline, rewrite, and polish technical articles, algorithm pages, engineering notes, and product copy in Vitaly Vorobyev's Vitavision style. Use when Codex needs to turn raw technical material, repo context, implementation details, benchmarks, or rough notes into clean, practical, opinionated prose with a personal engineering voice rather than generic documentation or academic writing.
---

# Vitavision Tech Writer

Produce technical writing that sounds like an engineer explaining work he has actually built, measured, and shipped. The voice is first-person where judgment matters, third-person where mechanism does; opinionated without hedging; concrete without being dry.

The canonical reference is `content/blog/01-chesscorners.md`. The style guide in [references/vitavision-writing-style-guide.md](references/vitavision-writing-style-guide.md) is built entirely from patterns visible in that post, with line-numbered quotes. Read it before drafting anything substantial.

## Workflow

1. **Identify the deliverable.**
   - Outline, section rewrite, full draft, short intro, algorithm-page copy, or review pass?
   - Know the reader, the expected length, and where the piece will live (blog post, algorithm page, README section, product copy).
   - Ask only the minimum missing questions. If the answer is in the workspace, read for it first.

2. **Build the technical context from the workspace.**
   - Read the primary sources: the crate, the paper, the benchmark script, prior drafts, related algorithm pages.
   - Do not invent performance numbers, implementation details, or historical claims. If a fact is not in the workspace, either ask or mark it as an assumption.
   - Re-read the style guide's "signature moves" sections before writing.

3. **Draft using the signature moves.**
   - The 19 sections of the style guide are a menu, not a template — pick the moves the material calls for, but preserve the overall shape.
   - Move the central mechanism early. Never bury the main idea behind two paragraphs of background.
   - Use layered failure cases when the method has real false-positive modes; each gets its own subsection with the five-beat pattern (§6 of the style guide).
   - Every display formula sits between verbal intuition and verbal interpretation (§7).
   - Close each section with a one-line practical implication, not a recap (§9).

4. **Validate against the Signature Moves Checklist** below, then hand off.

## Signature Moves Checklist

Run this pass after every substantive draft. Items come from the style guide; square-bracketed numbers reference its sections.

- [ ] **Opening move** [§2] — opens from concrete professional context, not abstract problem framing.
- [ ] **Framing question** [§3] — at most one, answered immediately.
- [ ] **Existing tools acknowledged fairly** [§4] — state what they do well before explaining why they do not fit.
- [ ] **Attribution with link** [§5] — named authors, primary source linked.
- [ ] **Failure cases layered** [§6] — each subsection follows name → observation → remediation name → formula → interpretation.
- [ ] **No naked formulas** [§7] — verbal intuition before, interpretation after; all math symbols in text are wrapped in `$...$`.
- [ ] **Named building blocks** [§8] — every computed quantity has a short lowercase name.
- [ ] **Section landings** [§9] — each section closes with a one-line practical implication.
- [ ] **Deferrals include a promise** [§10] — "out of scope" comes with a pointer or a future-post commitment.
- [ ] **Implementation block runs** [§11] — install command + minimal Rust snippet + minimal Python snippet, consistent aliases, language tags on every fence.
- [ ] **Performance claims fully specified** [§12] — workload, hardware, enabled features, exact scope; partial comparisons marked partial.
- [ ] **Final-thoughts bullets are full sentences** [§13] — each strength includes a reason.
- [ ] **Illustrations introduced inline** [§14] — surrounding sentence explains what to look at.
- [ ] **Related content in frontmatter, not in prose** [§15] — `relatedAlgorithms` / `relatedDemos` populated; no `## See also` section in the body.
- [ ] **No softeners in closing lines** [§18] — strip `so`, `quite`, `fairly`, `really` from last sentences of sections.
- [ ] **No marketing vocabulary** [§18] — no *cutting-edge*, *powerful*, *seamless*, *game-changing*.
- [ ] **No recap closings** [§18] — "In this section we saw …" is wrong; replace with an implication.

## When not to use this skill

This voice is narrative and opinionated. It is **not** the right register for:

- API reference documentation (use neutral, declarative docstrings instead).
- Commit messages and PR descriptions (see the `commit` workflow).
- README files for open-source libraries aimed at a general audience.
- Changelogs, issue templates, or support boilerplate.

Use the skill for blog posts, algorithm pages, engineering notes, long-form READMEs that serve as introductions to a method, and product-facing technical copy that should read like a real engineer is behind it.

## Resources

- [references/vitavision-writing-style-guide.md](references/vitavision-writing-style-guide.md) — full 19-section guide with line-numbered references into `content/blog/01-chesscorners.md`.
- `content/blog/01-chesscorners.md` — the canonical example. When in doubt, read it.
