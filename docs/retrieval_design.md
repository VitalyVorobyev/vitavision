Below is a complete Markdown spec you can give to a coding agent.
# Atlas Dialog Augmentation System — Design Specification
## 1. Purpose
Build a dialog augmentation layer on top of the existing Computer Vision Atlas.
The goal is not to create a generic wiki chatbot. The goal is to make LLM-assisted computer vision discussions more accurate, grounded, constraint-aware, and useful for engineering/research decisions.
The system should use the Atlas as a structured reasoning substrate for a coding/research agent.
---
## 2. Product Goal
Given a user question, the system should:
1. Understand the intent of the question.
2. Extract relevant constraints.
3. Retrieve relevant Atlas nodes and relations.
4. Build a compact, structured context pack.
5. Provide the context pack to an LLM/coding agent.
6. Produce a grounded answer that:
   - uses Atlas facts,
   - cites sources where possible,
   - separates factual claims from engineering judgment,
   - exposes assumptions and uncertainty,
   - avoids generic LLM hallucination.
---
## 3. Non-Goals
The system is not intended to be:
- a full paper-ingestion pipeline;
- a general computer vision encyclopedia;
- a replacement for search engines;
- a full autonomous research agent;
- a graph database project for its own sake;
- an RDF/OWL ontology system in the MVP;
- a generic RAG over raw Markdown.
---
## 4. Existing Assets
Assume the project already has:
- Atlas content in Markdown/MDX;
- frontmatter metadata;
- pages for algorithms, models, and concepts;
- existing build-time content validation;
- a generated or generatable content graph;
- a coding agent capable of modifying the repository.
The implementation should extend this system rather than replace it.
---
## 5. Core Idea
The Atlas should augment dialog by producing a **Context Pack**.
A Context Pack is a small, machine-facing JSON/YAML object containing:
- detected user intent;
- extracted constraints;
- relevant Atlas nodes;
- relevant relation edges;
- short factual summaries;
- known assumptions;
- known failure modes;
- implementation notes;
- canonical references;
- answer rules.
The LLM should not receive random page dumps. It should receive a compact reasoning scaffold.
---
## 6. Target Dialog Modes
The system should support these initial intents:
```yaml
intents:
  explain:
    description: Explain a concept, method, model, or paper.
  compare:
    description: Compare two or more methods, models, concepts, or approaches.
  recommend:
    description: Recommend a method or design under given constraints.
  debug:
    description: Diagnose why a method or implementation may fail.
  design:
    description: Help design an algorithm, pipeline, experiment, or system.
  find_references:
    description: Find relevant papers, sources, implementations, or reading paths.

The most valuable intents are recommend, compare, debug, and design.

⸻

7. High-Level Architecture

User Question
    ↓
Intent Classifier
    ↓
Constraint Extractor
    ↓
Atlas Retriever
    ↓
Graph Expander
    ↓
Context Pack Builder
    ↓
Answer Policy Builder
    ↓
LLM / Coding Agent
    ↓
Grounded Answer

⸻

8. Main Components

8.1 Intent Classifier

Input:

type UserQuestion = string;

Output:

type DialogIntent =
  | "explain"
  | "compare"
  | "recommend"
  | "debug"
  | "design"
  | "find_references";

Initial implementation may be rule-based.

Example rules:

"what is", "explain", "tell me about" → explain
"compare", "vs", "difference" → compare
"what should I use", "best", "recommend" → recommend
"why does it fail", "problem", "bug" → debug
"how would you design", "architecture", "pipeline" → design
"paper", "doi", "reference", "publication" → find_references

Later implementation may use an LLM classifier.

⸻

8.2 Constraint Extractor

Extract task/domain constraints from the question.

Example output:

constraints:
  task: calibration_target_detection
  target: checkerboard
  distortion: high
  occlusion: partial
  false_positives: structured
  implementation_language: rust
  evidence_level: practical_engineering

Constraints should be best-effort. Unknown values should remain explicit:

constraints:
  distortion: unknown
  occlusion: unknown

Do not invent constraints.

⸻

8.3 Atlas Retriever

Retrieves nodes relevant to:

* direct keyword matches;
* semantic matches;
* task membership;
* relation edges;
* tags;
* aliases;
* references.

Initial retrieval may use:

* generated search index;
* MiniSearch;
* frontmatter tags;
* explicit relation graph.

Later retrieval may add embeddings.

The retriever should return scored candidates:

interface RetrievedNode {
  id: string;
  type: "algorithm" | "model" | "concept" | "task" | "paper" | "dataset" | "implementation";
  title: string;
  score: number;
  reasons: string[];
}

Example:

retrieved_nodes:
  - id: shu-topological-grid-detection
    type: algorithm
    score: 0.91
    reasons:
      - matches task calibration_target_detection
      - related to checkerboard
      - robust_to occlusion
      - failure_modes mention structured false positives

⸻

8.4 Graph Expander

Given initial retrieved nodes, expand to nearby relevant nodes.

Expansion rules:

expand_relations:
  high_priority:
    - uses
    - assumes
    - fails_when
    - robust_to
    - improves_on
    - alternative_to
    - implemented_in
    - introduced_by
  medium_priority:
    - related_to
    - often_combined_with
    - specializes
    - generalizes
  low_priority:
    - mentioned_with

Limit graph expansion aggressively.

Default:

max_hops: 1
max_nodes: 12
max_edges: 30

For explain, prefer fewer nodes.
For compare, include alternatives.
For recommend, include failure modes and assumptions.
For debug, include failure modes, assumptions, and implementation notes.

⸻

9. Required Atlas Schema Extensions

Each Atlas node should eventually support a machine-facing block.

Example:

id: shu-topological-grid-detection
type: algorithm
title: Shu Topological Grid Detection
aliases:
  - topological grid detection
  - Shu Brunton Fiala grid detector
solves:
  - regular_grid_reconstruction
  - calibration_target_detection
use_when:
  - candidate points mostly correspond to true grid corners
  - grid is partially occluded
  - false positives are sparse or not grid-like
avoid_when:
  - structured false positives form plausible local grid cells
  - severe distortion breaks local neighborhood assumptions
  - only thin disconnected bridges exist between components
assumptions:
  - local neighborhood structure is recoverable
  - Delaunay triangulation gives useful candidate adjacency
  - most true grid points are detected
failure_modes:
  - Delaunay triangulation is not projective invariant
  - wrong local neighbors may appear under oblique views
  - structured marker interiors can create plausible false cells
  - disconnected components may not merge without enough local evidence
robust_to:
  - partial_occlusion
  - missing_corners
  - moderate_lens_distortion
weak_against:
  - structured_false_positives
  - extreme_projective_views
  - severe_fisheye_distortion_without_undistortion
relations:
  uses:
    - delaunay-triangulation
    - grid-topology
  alternative_to:
    - graph-growth-grid-reconstruction
  often_combined_with:
    - chess-corner-detector
  introduced_by:
    - shu-brunton-fiala-2009
references:
  - shu-brunton-fiala-2009
implementations:
  - opencv
  - local-rust-prototype
llm:
  summary: >
    A topology-driven approach for reconstructing regular calibration grids
    from detected candidate points using local adjacency and grid consistency.
  recommendation_note: >
    Useful for simple chessboards and puzzleboard-like targets, but weaker
    when false positives form locally plausible grid cells.

⸻

10. Suggested Node Types

Current node types:

- algorithm
- model
- concept

Recommended additional machine-facing types:

- task
- paper
- dataset
- implementation
- failure_mode
- metric

Not all need public pages immediately.

At minimum, add task and paper.

⸻

11. Relation Vocabulary

Keep relation vocabulary small.

Initial recommended set:

relations:
  uses:
    description: Method depends on concept, method, or tool.
  assumes:
    description: Method requires this condition to hold.
  fails_when:
    description: Method is known or expected to fail under this condition.
  robust_to:
    description: Method is designed to tolerate this condition.
  weak_against:
    description: Method may degrade under this condition.
  improves_on:
    description: Method explicitly improves an earlier method.
  alternative_to:
    description: Method solves a similar problem by a different approach.
  generalizes:
    description: Method extends another method to broader conditions.
  specializes:
    description: Method is a narrower case of another method.
  often_combined_with:
    description: Commonly used together in pipelines.
  introduced_by:
    description: Main source introducing the method.
  evaluated_by:
    description: Source that evaluates or compares the method.
  implemented_in:
    description: Known implementation source.
  belongs_to_task:
    description: Method/concept/paper belongs to a task area.

Avoid creating too many relation types early.

⸻

12. Context Pack Format

The Context Pack is the central artifact.

Example:

version: 1
question: >
  What should I use for checkerboard detection under fisheye distortion,
  partial occlusion, and many false positive corners?
intent: recommend
constraints:
  task: calibration_target_detection
  target: checkerboard
  distortion: high
  occlusion: partial
  false_positives: many
  false_positive_structure: unknown
  evidence_level: engineering_judgment
retrieved_nodes:
  - id: shu-topological-grid-detection
    type: algorithm
    title: Shu Topological Grid Detection
    relevance: 0.88
    summary: >
      Topology-based regular grid reconstruction from candidate points.
    use_when:
      - false positives are sparse
      - partial grid visibility
    avoid_when:
      - structured false positives form plausible cells
    failure_modes:
      - Delaunay adjacency may break under extreme views
  - id: graph-growth-grid-reconstruction
    type: algorithm
    title: Graph-Growth Grid Reconstruction
    relevance: 0.84
    summary: >
      Incrementally grows a grid using local geometric consistency.
    use_when:
      - false positives are structured
      - local homography checks are available
  - id: fisheye-projection
    type: concept
    title: Fisheye Projection
    relevance: 0.77
    summary: >
      Strong lens distortion invalidates direct global homography assumptions
      in distorted image coordinates.
relations:
  - source: shu-topological-grid-detection
    relation: alternative_to
    target: graph-growth-grid-reconstruction
  - source: shu-topological-grid-detection
    relation: weak_against
    target: structured-false-positives
  - source: graph-growth-grid-reconstruction
    relation: uses
    target: local-homography-consistency
  - source: fisheye-projection
    relation: weakens
    target: global-homography-in-distorted-image
answer_policy:
  cite_sources: true
  separate_facts_from_judgment: true
  state_missing_evidence: true
  do_not_invent_benchmarks: true
  prefer_constraint_based_recommendation: true
  mention_failure_modes: true
expected_answer_shape:
  - direct recommendation
  - reasoning from constraints
  - method comparison
  - caveats
  - suggested next experiment

⸻

13. Answer Policy

The generated answer should follow these rules:

answer_policy:
  - Use retrieved Atlas context as primary grounding.
  - Do not claim benchmark superiority unless Atlas context contains evidence.
  - Separate source-backed facts from engineering judgment.
  - Mention relevant assumptions.
  - Mention important failure modes.
  - Prefer decision-oriented answers for recommend/debug/design intents.
  - Ask a clarifying question only if the missing information changes the answer materially.
  - If evidence is weak, say so directly.

For recommendation questions, answer structure should be:

1. Direct recommendation
2. Why this fits the constraints
3. What not to use / when it fails
4. Evidence level
5. Suggested next validation step

⸻

14. CLI Interface

Implement a CLI first.

Example:

atlas-dialog ask "What should I use for checkerboard detection under fisheye distortion and occlusion?"

Useful flags:

atlas-dialog ask "<question>" \
  --show-context-pack \
  --format markdown
atlas-dialog context "<question>" \
  --format yaml
atlas-dialog retrieve "<question>" \
  --show-scores
atlas-dialog validate-context-pack ./context-pack.yaml

Required commands:

atlas-dialog retrieve
atlas-dialog context
atlas-dialog ask
atlas-dialog validate

The ask command may initially output only the context pack and a prompt for an external LLM, if direct LLM integration is not available.

⸻

15. API Interface

Optional MVP HTTP API:

POST /api/dialog/context
POST /api/dialog/ask

Request:

{
  "question": "What should I use for robust checkerboard detection?",
  "options": {
    "maxNodes": 12,
    "maxEdges": 30,
    "includeAnswerPolicy": true
  }
}

Response:

{
  "contextPack": {},
  "prompt": "...",
  "answer": "..."
}

⸻

16. Prompt Template

The system should generate a prompt for the LLM/coding agent.

Template:

You are answering a computer vision question using the provided Atlas Context Pack.
Rules:
- Use the context pack as primary grounding.
- Do not invent benchmark results, citations, or implementation details.
- Separate source-backed facts from engineering judgment.
- State assumptions and uncertainty.
- Prefer a decision-oriented answer when the intent is recommend, debug, or design.
User question:
{{question}}
Atlas Context Pack:
{{context_pack}}
Write the answer in Markdown.

For coding agents, add:

If implementation changes are requested:
- inspect existing schemas and generated graph files;
- preserve existing content format unless migration is necessary;
- add tests for schema validation, retrieval, and context pack generation;
- document all new fields.

⸻

17. MVP Implementation Plan

MVP 1: Static Context Pack Generator

Implement:

* schema for machine-facing Atlas metadata;
* parser for existing Markdown frontmatter;
* generated graph artifact;
* simple intent classifier;
* simple constraint extractor;
* keyword/tag-based retrieval;
* graph expansion;
* context pack builder;
* CLI command:
    * atlas-dialog context "<question>".

Acceptance:

* Given a question, system returns a valid context pack.
* Context pack includes relevant nodes, relations, assumptions, and failure modes.
* No LLM integration required.

⸻

MVP 2: Prompt Builder

Implement:

* prompt template;
* atlas-dialog ask "<question>" --dry-run;
* output includes:
    * detected intent;
    * context pack;
    * final LLM prompt.

Acceptance:

* Generated prompt is compact enough to paste into Claude/ChatGPT.
* Prompt uses context pack, not raw page dumps.

⸻

MVP 3: Local Answer Generation

Implement optional provider abstraction:

interface LlmProvider {
  complete(prompt: string): Promise<string>;
}

Possible providers:

providers:
  - openai
  - anthropic
  - ollama
  - none

Acceptance:

* atlas-dialog ask "<question>" can generate an answer.
* Provider config is optional.
* System still works in dry-run mode.

⸻

MVP 4: Evaluation Harness

Implement a small benchmark set.

Example file:

questions:
  - id: checkerboard-fisheye-occlusion
    question: >
      What should I use for checkerboard detection under fisheye distortion
      and partial occlusion?
    expected_nodes:
      - fisheye-projection
      - checkerboard-detection
      - graph-growth-grid-reconstruction
    expected_answer_traits:
      - mentions distortion caveat
      - does not claim global homography works directly
      - separates recommendation from evidence

CLI:

atlas-dialog eval ./dialog-eval.yaml

Acceptance:

* Evaluation checks retrieval quality.
* Optional manual scoring for answer quality.

⸻

18. Evaluation Criteria

Compare three modes:

A: plain LLM
B: raw Markdown RAG
C: Atlas Context Pack + LLM

Score each answer on:

correctness: 1-5
specificity: 1-5
constraint_awareness: 1-5
hallucination_resistance: 1-5
implementation_usefulness: 1-5
citation_quality: 1-5

The project is justified only if mode C clearly beats A and B on hard domain-specific questions.

⸻

19. Example Test Questions

Use real hard questions from the Atlas domain:

- What should I use for checkerboard detection under fisheye distortion and occlusion?
- Is Shu-style topological grid reconstruction enough for ChArUco targets with many false positive corners?
- When is a homography valid for calibration target detection, and when does lens distortion break the assumption?
- Compare Duda-Frese style saddle-point detection with ChESS-style ring response.
- Should I use RANSAC, MAGSAC, or PROSAC for homography initialization in calibration?
- How should I reconstruct a regular grid from oriented corners when some internal corners are missing?
- What are the practical failure modes of Delaunay-based grid reconstruction?
- Which references should I cite for modern checkerboard detection?

⸻

20. Repository Structure Proposal

Suggested structure:

src/
  atlas/
    schema/
      node-schema.ts
      relation-schema.ts
      context-pack-schema.ts
    graph/
      build-graph.ts
      graph-types.ts
      graph-expand.ts
    dialog/
      classify-intent.ts
      extract-constraints.ts
      retrieve.ts
      build-context-pack.ts
      build-prompt.ts
      answer-policy.ts
    cli/
      atlas-dialog.ts
content/
  algorithms/
  models/
  concepts/
  tasks/
  papers/
generated/
  atlas-graph.json
  atlas-search-index.json
dialog-eval/
  questions.yaml

Adapt paths to the existing project.

⸻

21. Validation

Add validation for:

* node IDs are unique;
* relation targets exist;
* relation types are valid;
* machine-facing fields use known enum values where applicable;
* context packs conform to schema;
* context packs do not exceed configured size;
* references exist;
* task IDs exist.

Example:

bun run validate:atlas
bun run build:atlas-graph
bun run atlas-dialog context "..."

⸻

22. Content Authoring Guidelines

Each important Atlas page should include:

solves: []
use_when: []
avoid_when: []
assumptions: []
failure_modes: []
robust_to: []
weak_against: []
relations: {}
references: []
implementations: []
llm:
  summary: ""
  recommendation_note: ""

The llm section should be short and factual.

Avoid long prose in machine fields.

Bad:

use_when:
  - This is a very interesting method that can sometimes be useful...

Good:

use_when:
  - candidate corners are mostly true positives
  - local grid adjacency is recoverable

⸻

23. Important Design Principle

Do not optimize for maximum retrieval.

Optimize for useful reasoning.

A smaller context pack with the right assumptions and failure modes is better than a large dump of vaguely related pages.

⸻

24. Risks

Risk 1: The system becomes just RAG

Mitigation:

* context packs must include typed assumptions, failure modes, and relations;
* do not dump raw Markdown as primary context.

Risk 2: Too much schema work

Mitigation:

* start with minimal fields;
* add fields only when they improve dialog quality.

Risk 3: Bad extracted metadata

Mitigation:

* prefer hand-authored metadata for important nodes;
* use extraction only as draft generation;
* validate relation targets.

Risk 4: LLM still gives generic answers

Mitigation:

* stronger answer policies;
* better context pack shape;
* evaluation harness;
* include explicit expected answer shape.

Risk 5: Graph grows but does not help

Mitigation:

* evaluate against hard questions;
* remove unused relation types;
* track which nodes/edges were used in answers.

⸻

25. Success Criteria

The system is successful if, for hard CV questions, it consistently produces answers that are:

* more specific than plain LLM answers;
* less hallucinated;
* more explicit about assumptions;
* better at comparing methods;
* better at recommending methods under constraints;
* better grounded in Atlas references;
* useful for implementation decisions.

⸻

26. First Implementation Target

The first useful implementation should be:

atlas-dialog context "Is Shu-style topological grid reconstruction enough for ChArUco targets?"

Expected output:

intent: recommend
constraints:
  task: calibration_target_detection
  target: charuco
  false_positives: structured
  occlusion: unknown
  distortion: unknown
retrieved_nodes:
  - shu-topological-grid-detection
  - charuco-target
  - structured-false-positives
  - graph-growth-grid-reconstruction
  - local-homography-consistency
answer_policy:
  separate_facts_from_judgment: true
  mention_failure_modes: true
  state_missing_evidence: true

This is the first proof that the Atlas can shape dialog better than generic LLM memory.

⸻

27. Agent Instruction

The coding agent should:

1. Inspect the existing Atlas content system.
2. Identify current schema, generated graph, and validation flow.
3. Propose minimal schema extensions.
4. Implement context pack generation before LLM integration.
5. Add CLI commands.
6. Add tests.
7. Add 5–10 hand-authored metadata examples.
8. Add evaluation questions.
9. Document the workflow.

Do not implement embeddings, graph databases, or autonomous paper extraction in the first iteration.

The first milestone is a deterministic Context Pack Generator.