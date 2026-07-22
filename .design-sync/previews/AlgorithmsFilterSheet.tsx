import { useState } from 'react';
import { AlgorithmsFilterSheet } from 'vitcv';

const FACETS = {
    kinds: { all: 52, algorithm: 33, model: 8, concept: 11 },
    problems: {
        "camera-calibration": 9,
        "chessboard-detection": 6,
        "corner-detection": 5,
        "feature-detection": 11,
        "fundamental-matrix-estimation": 3,
        "hand-eye-calibration": 3,
        "image-stitching": 4,
        "local-feature-matching": 6,
        "stereo-rectification": 3,
    },
    total: 33,
};

export const OpenAllAlgorithms = () => {
    const [filters, setFilters] = useState({
        kind: "all",
        tags: [],
        query: "",
        view: "grid",
        sort: "recent",
        problem: "all",
    });
    return (
        <div className="relative w-full bg-background" style={{ height: 560 }}>
            <AlgorithmsFilterSheet
                open
                onClose={() => {}}
                filters={filters}
                facets={FACETS}
                totalResults={FACETS.total}
                onKindChange={(kind) => setFilters((f) => ({ ...f, kind }))}
                onProblemChange={(problem) => setFilters((f) => ({ ...f, problem }))}
                onReset={() => setFilters({ kind: "all", tags: [], query: "", view: "grid", sort: "recent", problem: "all" })}
            />
        </div>
    );
};

export const OpenWithCameraCalibrationSelected = () => {
    const [filters, setFilters] = useState({
        kind: "algorithm",
        tags: [],
        query: "",
        view: "list",
        sort: "az",
        problem: "camera-calibration",
    });
    return (
        <div className="relative w-full bg-background" style={{ height: 560 }}>
            <AlgorithmsFilterSheet
                open
                onClose={() => {}}
                filters={filters}
                facets={FACETS}
                totalResults={9}
                onKindChange={(kind) => setFilters((f) => ({ ...f, kind }))}
                onProblemChange={(problem) => setFilters((f) => ({ ...f, problem }))}
                onReset={() => setFilters({ kind: "all", tags: [], query: "", view: "grid", sort: "recent", problem: "all" })}
            />
        </div>
    );
};
