# Vitavision Writing Style Guide

This document defines the house style for technical posts written in the style of Vitaly Vorobyev for Vitavision.

## Contents

- [Core voice](#1-core-voice)
- [Narrative stance](#2-narrative-stance)
- [Preferred structure](#3-preferred-structure)
- [Sentence style](#4-sentence-style)
- [Technical exposition rules](#5-technical-exposition-rules)
- [Vocabulary preferences](#6-vocabulary-preferences)
- [Opinion handling](#7-opinion-handling)
- [Precision and honesty](#8-precision-and-honesty)
- [Code examples](#9-code-examples)
- [Performance writing](#10-performance-writing)
- [Typical rhetorical moves](#11-typical-rhetorical-moves)
- [Style constraints for future writing](#12-style-constraints-for-future-writing)
- [Default post template](#13-default-post-template)

## 1. Core voice

The voice is:

- technical
- direct
- first-person when experience matters
- practical rather than academic
- opinionated, but not arrogant
- concise, but not dry

The writer is an engineer explaining something he has actually built, used, tested, or struggled with.

The tone should feel like:

- "I worked on this because the available tools were not good enough."
- "Here is the idea, why it matters, and how it behaves in practice."
- "I care about accuracy, robustness, implementation detail, and performance."

## 2. Narrative stance

Use first person singular when describing motivation, experience, engineering judgment, or implementation choices.

Examples:

- "At some point it became clear to me that OpenCV was not good enough for this use case."
- "That is how I started building my own implementation."
- "In my view, this method is undervalued."

Do not overuse "I". The text should not become autobiographical. Personal remarks should frame the technical discussion, not replace it.

## 3. Preferred structure

Most posts should follow this flow:

1. **Problem context**
   - real engineering motivation
   - what practical task led to the algorithm or tool

2. **Core idea**
   - explain the central mechanism early
   - define what is being computed and why

3. **Failure cases / subtleties**
   - show why naive solutions are insufficient
   - explain what must be rejected, corrected, or refined

4. **Implementation**
   - connect the idea to an actual crate, API, or system
   - keep examples minimal and real

5. **Performance / practical behavior**
   - include timings, tradeoffs, limitations, and comparison where useful

6. **Takeaway**
   - summarize why this method matters in practice

## 4. Sentence style

Prefer:

- medium-length sentences
- clear logical progression
- explicit causal links: "therefore", "this means", "this leads to", "for this reason"
- concrete nouns over vague abstractions

Avoid:

- inflated marketing language
- overly dramatic claims
- generic filler such as "it is worth mentioning that"
- too many nested clauses

Good:

- "This problem cannot be solved from the ring samples alone."
- "The discriminating information lies near the center."
- "This makes the method attractive for parallel implementation."

Bad:

- "It is important to note that this fascinating and highly efficient approach may potentially offer promising opportunities."

## 5. Technical exposition rules

### 5.1 Define the object before discussing it

State clearly what is computed.

Example:

- "The detector computes a score for each pixel."
- "The response is built from 16 ring samples at radius 5."

### 5.2 Explain the intuition before or alongside the formula

Do not throw formulas at the reader without geometric or signal-level interpretation.

Preferred pattern:

- describe the local pattern
- explain what intensities are expected
- show the formula
- interpret what the formula does

### 5.3 Use failure cases to sharpen understanding

When relevant, explain not only why the method works, but also what can fool it.

Typical pattern:

- "This is not enough, because edges also produce high response."
- "This case is more subtle."
- "The required information is not on the ring, but near the center."

### 5.4 Keep mathematics functional

Math should support the explanation, not dominate it. Use only the formulas needed for understanding and implementation.

## 6. Vocabulary preferences

Prefer:

- "practical"
- "robust"
- "efficient"
- "accurate"
- "false positive"
- "signal"
- "response"
- "geometry"
- "implementation"
- "out of scope"
- "in my view"

Prefer simple verbs:

- "compute"
- "detect"
- "reject"
- "derive"
- "sample"
- "build"
- "observe"
- "measure"

Avoid excessive buzzwords:

- "cutting-edge"
- "revolutionary"
- "game-changing"
- "seamless"
- "powerful" used repeatedly without explanation

## 7. Opinion handling

Opinions are allowed, but they should be grounded in engineering experience.

Good:

- "In my view, this method is undervalued."
- "For my use cases, OpenCV was not good enough in accuracy, performance, or stability."

Bad:

- "This is obviously the best method."
- "Everyone else is doing it wrong."

## 8. Precision and honesty

Do not exaggerate.

When something is limited, say so:

- "This comparison is not directly relevant, because the functions solve different problems."
- "These topics are interesting too, but out of scope for this post."
- "The discussion follows the original paper closely."

The reader should feel that the author is careful, fair, and technically honest.

## 9. Code examples

Code examples should be:

- minimal
- real
- directly connected to the text
- easy to copy

Do not overload examples with setup details unless the post is specifically about setup.

Prefer:

- one short Rust snippet
- one short Python snippet if bindings exist

## 10. Performance writing

Performance claims should be concrete.

Include:

- image size or workload
- hardware
- enabled features
- what exactly is being measured
- what comparison is and is not meaningful

Good pattern:

- "On a 1024x576 image, on a MacBook Pro M4, the detector took 1.2 ms with SIMD and Rayon enabled."

Avoid vague statements:

- "The implementation is very fast."
- "It performs much better than alternatives."

## 11. Typical rhetorical moves

These are characteristic and should be reused:

- start from a real practical need
- contrast with existing tools
- isolate the key idea
- explain where naive reasoning fails
- connect theory to implementation
- end with why the method matters in practice

Useful phrases:

- "At some point it became clear to me that..."
- "The first question was..."
- "The core idea is..."
- "This is not yet the final solution..."
- "The second problem is more subtle."
- "That completes the definition..."
- "As one can see..."
- "These topics are interesting too, but out of scope for this post."

## 12. Style constraints for future writing

When generating new Vitavision text in this style:

- keep the prose clean and grammatical
- preserve a personal engineering voice
- do not make it sound like generic documentation
- do not make it sound like a formal journal paper unless explicitly requested
- prefer clarity over flourish
- prefer grounded judgment over neutral blandness
- preserve some individuality in phrasing

## 13. Default post template

Use this as a starting skeleton:

### Introduction

- real use case
- why the problem mattered
- why existing tools were insufficient

### Method / idea

- what is computed
- how it works
- why the design makes sense

### Failure modes / refinements

- what causes false positives or instability
- how the method addresses this

### Implementation

- crate or code
- API snippets
- practical notes

### Performance / limitations

- timings
- comparisons
- scope boundaries

### Final thoughts

- why this method is useful
- when it should be preferred
- link to demo / repo / interactive illustration
