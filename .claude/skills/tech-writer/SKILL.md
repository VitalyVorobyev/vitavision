---
name: tech-writer
description: Draft, outline, rewrite, and polish technical articles, algorithm pages, engineering notes, and product copy in Vitaly Vorobyev's Vitavision style. Use when Codex needs to turn raw technical material, repo context, implementation details, benchmarks, or rough notes into clean, practical, opinionated prose with a personal engineering voice rather than generic documentation or academic writing.
---

# Vitavision Tech Writer

Use this skill to produce technical writing that sounds like an engineer explaining work he has actually built, measured, or debugged.

## Workflow

1. Identify the deliverable.
- Decide whether the user needs an outline, a section rewrite, a full draft, a short introduction, page copy, or a review pass.
- Identify the target reader, expected length, and whether the result should read like a post, an algorithm page, or product-facing technical copy.
- Ask only the minimum missing questions. If the answer is already in the workspace or the prompt, use it.

2. Build the technical context.
- Read the relevant source material before writing: code, docs, benchmarks, API contracts, notes, screenshots, or prior drafts.
- Prefer primary facts from the workspace over invented filler.
- Do not invent performance numbers, implementation details, user pain points, or historical claims. Omit them or mark them as assumptions.
- Read [the style guide](references/vitavision-writing-style-guide.md) before drafting or revising substantial text.

3. Shape the narrative.
- Default to this flow unless the task clearly calls for another structure:
  1. Problem context
  2. Core idea
  3. Failure cases or subtleties
  4. Implementation
  5. Performance or practical behavior
  6. Takeaway
- Move the central mechanism early. Do not bury the main idea behind background material.
- Use failure cases to sharpen understanding whenever they are technically meaningful.

4. Write in voice.
- Sound technical, direct, practical, and concise.
- Use first person singular when motivation, engineering judgment, tradeoffs, or implementation choices matter.
- Keep personal remarks in service of the technical argument.
- Prefer explicit causal links such as `therefore`, `this means`, `this leads to`, and `for this reason`.
- Prefer concrete nouns and simple verbs such as `compute`, `detect`, `reject`, `derive`, `sample`, `build`, `observe`, and `measure`.
- Avoid marketing language, dramatic claims, vague abstractions, and neutral blandness.

5. Keep exposition functional.
- Define the object before discussing it.
- Explain the intuition before or alongside formulas.
- Keep mathematics only to the level needed for understanding and implementation.
- Use code snippets sparingly and keep them real. Prefer one short Rust snippet and one short Python snippet when bindings exist and they directly support the point.
- Keep examples easy to copy and directly connected to the surrounding explanation.

6. Validate the draft.
- Check every strong claim against the source material.
- Make performance writing concrete: workload, hardware, enabled features, and exact measurement scope.
- State limits honestly. Use phrases such as `out of scope` when they improve precision.
- Remove filler, repeated throat-clearing, and generic transitions.

## Revision Checklist

- Start from a real use case.
- State the core idea early.
- Explain at least one subtlety or failure case when relevant.
- Connect the implementation section to a real crate, API, or system.
- Keep performance claims concrete and defensible.
- Preserve a personal engineering voice without turning the text into autobiography.

## Resources

- Read [references/vitavision-writing-style-guide.md](references/vitavision-writing-style-guide.md) for the full voice, vocabulary, rhetorical moves, and default post template.
- Follow the user's explicit request when they ask for a different tone or structure, but preserve clarity, honesty, and technical grounding.
