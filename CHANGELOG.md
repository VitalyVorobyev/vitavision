## [Unreleased]

- feat(BLOG-004): add BlogPost page rendering pre-built HTML with metadata header, tag badges, repo/demo links, and heading anchors via rehype-slug
- feat(BLOG-003): replace placeholder Blog page with BlogIndex featuring PostCard, TagBadge, and TagFilter components with tag-based filtering
- feat(BLOG-002): add content processing pipeline (`scripts/content-build.ts`) with gray-matter frontmatter parsing, Zod validation, and unified markdown→HTML rendering; generates `src/generated/content-manifest.ts`
- feat(BLOG-001): add content directory structure (`content/blog/`, `content/algorithms/`, `content/images/`) and Zod frontmatter schemas for blog posts and algorithm pages

- feat(EDITOR-013): wire auto-transition to results after run, add segmented mode toggle, update left rail eye to use overlayVisibility
- feat(EDITOR-012): add ResultsPanel with run summary grid, diagnostics placeholder, run history list, and Configure back-button
- refactor(EDITOR-011): extract ConfigurePanel from EditorRightPanel; EditorRightPanel becomes a thin mode-switching shell reading panelMode from store
- refactor(EDITOR-010): add panelMode, runHistory, lastAlgorithmResult, and overlayVisibility state groups to Zustand editor store; backward-compatible showFeatures wrapper
- docs(DOCS-001): add `docs/backend.md` API reference for calibration-targets endpoint (full schemas, sample defaults, editor guided-workflow doc); expand README.dev.md smoke-test section with ChArUco and Marker Board examples and sample-defaults table
- test(QA-001): fix test isolation via conftest.py session-scoped fixture; pytest now passes on repeated runs without manual storage cleanup
- test(TEST-001): add API key enforcement tests (401/403 coverage for all /api/v1/* endpoints) and `lint-backend` CI job (ruff + mypy); fix pre-existing ruff/mypy violations in auth.py, main.py, test_chess.py, storage_service.py
- feat(CV-001): add unified calibration-target detection API (`POST /api/v1/cv/calibration-targets/detect`) supporting chessboard, ChArUco, and marker-board algorithms with full acceptance test coverage
- feat(EDITOR-001): add Chessboard, ChArUco, and Marker Board algorithm plugins with sample-aware config defaults and calibration feature overlays
- feat(EDITOR-002): replace editor tabs with guided workflow rail (hint → algorithm → config → run+summary → features); remove R2 mentions from public UI; add gallery card descriptions
- feat(EDITOR-003): wire curated gallery examples and algorithm recommendations; rename ChESS adapter title to "ChESS Corners" so recommendedAlgorithms buttons correctly select the algorithm
- feat(EDITOR-004): surface algorithm metadata (grid coords, ids, score, target position, marker/circle fields) in selected-feature detail card
- feat(CV-002): expand ChArUco and Marker Board config surfaces with chessboard detector, grid graph, and circle score sub-params; seed all defaults from public preset JSON files
