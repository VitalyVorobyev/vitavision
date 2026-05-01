# Vision Atlas: Knowledge Graph and LLM Context Design
## 1. Product Definition
The Vision Atlas is not only a public collection of computer vision pages. It should become a structured knowledge system for:
- human navigation,
- source-grounded technical writing,
- LLM-assisted reasoning,
- safe page maintenance,
- implementation-oriented synthesis.
The system has three layers:
1. **Public Atlas**  
   Curated pages for algorithms, models, and concepts.
2. **Knowledge Graph**  
   Machine-readable relationships between pages, sources, claims, equations, demos, implementations, and failure modes.
3. **LLM Context System**  
   Generated context bundles that allow an LLM agent to reason about a topic without reading the whole repository.
## 2. Design Principles
The Atlas must optimize for correctness, maintainability, and practical engineering value.
It should not optimize for page count.
The system should answer questions like:
- What concepts are prerequisites for this algorithm?
- Which algorithms depend on this concept?
- Which papers support this page?
- Which claims are source-backed?
- Which pages should be updated when a new paper is added?
- What context should an LLM receive to safely edit this page?
- What implementation details are important for this algorithm?
The graph visualization should be useful for reasoning and navigation, not decorative.
## 3. Public Atlas Layer
The existing `/algorithms` route remains the canonical Atlas browser.
It should contain:
- algorithms,
- models,
- concepts.
It should not become a dump of every possible node type.
Failure modes, surveys, claims, and source notes may appear through relationship panels or specialized views later, but they should not pollute the main Atlas index by default.
Public pages must remain curated, readable, and source-grounded.
## 4. Private Research Layer
The private research layer stores non-public working material for LLM-assisted maintenance.
Recommended structure:
```text
docs/research/
  inbox/
  notes/
  update-plans/
  context-packs/
  generated/
  templates/

This layer is not part of the public site.

It must never be included in:

* public routes,
* sitemap,
* RSS,
* public search,
* prerendered pages,
* SEO metadata.

The purpose of this layer is to support source ingestion and page updates, not to create another public wiki.

5. Knowledge Graph Model

The graph should evolve from page-to-page links into a richer model.

Node Types

The system should support these node types:

* algorithm
* model
* concept
* paper
* implementation
* demo
* dataset
* benchmark
* claim
* equation
* failure-mode

Not every node type needs to be a public page.

Some nodes may exist only in private/generated graph artifacts.

Edge Types

The graph should support these relationships:

* depends_on
* uses_concept
* introduced_by
* extended_by
* implemented_by
* demonstrated_by
* evaluated_by
* fails_under
* mitigated_by
* compared_with
* has_equation
* supports_claim
* contradicts_claim

The most important edges for LLM reasoning are:

* page → source,
* page → claim,
* claim → source,
* page → prerequisite,
* page → implementation,
* page → demo.

6. Public and Private Graph Artifacts

The system should distinguish between public-safe graph data and private reasoning graph data.

Public Graph

Recommended artifact:

src/generated/content-graph.ts

Purpose:

* relationship panels,
* local page navigation,
* public Atlas browsing,
* future local graph UI.

It may include:

* public page nodes,
* public-safe relationships,
* titles,
* summaries,
* paths,
* tags,
* page types.

Private Graph

Recommended artifact:

docs/research/generated/knowledge-graph.json

Purpose:

* LLM context generation,
* source-grounded update planning,
* claim tracing,
* contradiction checks,
* research workflows.

It may include:

* private source notes,
* claims,
* uncertainty markers,
* update plans,
* source-to-page mappings,
* page maintenance metadata.

7. Visual Graph Requirements

A graph view should be added only when the graph data is useful enough.

The first graph UI should be local, not global.

Each page may show a local graph containing:

* current page,
* prerequisites,
* used-by pages,
* related pages,
* compared methods,
* source papers,
* demos,
* implementations.

Preferred visualizations:

1. Dependency tree
2. Local neighborhood graph
3. Source provenance view
4. Global graph explorer

The global graph is optional and should not be the first visualization.

The visual graph must help users answer:

* What should I read next?
* What does this page depend on?
* What uses this concept?
* Which sources support this topic?

8. LLM Context Packs

The system should generate compact Markdown context bundles for LLM agents.

A context pack is a curated extraction of the graph and relevant content around a topic.

Example command shape:

bun run atlas:context --node homography

Example output location:

docs/research/context-packs/homography.md

A context pack should include:

* page summary,
* key definitions,
* core equations,
* prerequisites,
* related pages,
* source IDs,
* key claims,
* limitations,
* implementation notes,
* demos or benchmarks,
* unresolved questions.

9. Context Pack Types

The system should eventually support several context-pack modes:

bun run atlas:context --node harris-corner-detector
bun run atlas:context --compare harris-corner-detector shi-tomasi-corner-detector
bun run atlas:context --source zhang-2000
bun run atlas:context --path camera-calibration

Required context-pack types:

* single-node context,
* comparison context,
* source-to-atlas context,
* implementation context,
* learning-path context.

Context packs are private artifacts. They are designed for LLM use, not public reading.

10. Source Ingestion Requirements

When a new paper or source is added, the system should support this workflow:

source
  -> private source note
  -> graph mapping
  -> update plan
  -> reviewed public edit

A source note should identify:

* main contribution,
* key equations,
* assumptions,
* limitations,
* relevant Atlas pages,
* new candidate pages,
* claims requiring verification.

An update plan should identify:

* existing pages to update,
* relationship changes,
* source IDs to add,
* uncertain claims,
* validation checks.

Public pages must not be generated directly from raw source notes.

11. Claim-Level Reasoning

The private graph should eventually support important claims as first-class entities.

A claim should include:

* stable claim ID,
* claim text,
* supporting source IDs,
* affected pages,
* confidence,
* uncertainty notes.

Example shape:

id: claim-homography-planar-scene
text: A homography maps points between two views of the same plane.
supportedBy:
  - hartley-zisserman-2004
affects:
  - homography
  - zhang-camera-calibration
confidence: high

Claim extraction should be selective.

Do not extract every sentence as a claim. Only extract claims that matter for public pages, implementation decisions, or contradictions.

12. Validation Requirements

Validation should enforce:

* all public relationship slugs resolve,
* reverse edges are derived, not authored,
* prerequisite cycles are rejected,
* public pages do not reference private research files,
* public graph contains only public-safe nodes,
* private graph may reference private notes,
* canonical pages satisfy stricter source and relationship requirements,
* context packs are generated from existing graph nodes only.

13. Non-Goals

The system should not:

* build a separate Obsidian vault,
* expose private research notes publicly,
* create a second public Atlas route,
* prioritize global graph visualization before local graph usefulness,
* index private notes in public search,
* generate public pages directly from PDFs,
* create many shallow pages,
* turn every claim into graph data,
* use graph visualization as decoration.

14. Success Criteria

The design is successful if:

* a reader can navigate the Atlas through meaningful relationships,
* an LLM can receive a compact context pack for a topic,
* a new paper can be mapped to existing pages before public edits are made,
* public claims can be traced to sources,
* agents can update pages without reading the whole repository,
* graph data improves maintenance and reasoning,
* visualizations clarify dependencies rather than just displaying a hairball.