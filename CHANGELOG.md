## [Unreleased]

- feat(CV-001): add unified calibration-target detection API (`POST /api/v1/cv/calibration-targets/detect`) supporting chessboard, ChArUco, and marker-board algorithms with full acceptance test coverage
- feat(EDITOR-001): add Chessboard, ChArUco, and Marker Board algorithm plugins with sample-aware config defaults and calibration feature overlays
- feat(EDITOR-002): replace editor tabs with guided workflow rail (hint → algorithm → config → run+summary → features); remove R2 mentions from public UI; add gallery card descriptions
- feat(EDITOR-003): wire curated gallery examples and algorithm recommendations; rename ChESS adapter title to "ChESS Corners" so recommendedAlgorithms buttons correctly select the algorithm
- feat(EDITOR-004): surface algorithm metadata (grid coords, ids, score, target position, marker/circle fields) in selected-feature detail card
- feat(CV-002): expand ChArUco and Marker Board config surfaces with chessboard detector, grid graph, and circle score sub-params; seed all defaults from public preset JSON files
