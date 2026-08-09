import { useState } from 'react';
import { AlgorithmsSidebar } from 'vitcv';

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

export const AllAlgorithms = () => {
    const [filters, setFilters] = useState({
        kind: "algorithm",
        tags: [],
        query: "",
        view: "grid",
        sort: "recent",
        problem: "all",
    });
    return (
        <div className="border border-border rounded-lg overflow-hidden bg-background" style={{ width: 220, height: 420 }}>
            <AlgorithmsSidebar
                filters={filters}
                facets={FACETS}
                onKindChange={(kind) => setFilters((f) => ({ ...f, kind }))}
                onProblemChange={(problem) => setFilters((f) => ({ ...f, problem }))}
            />
        </div>
    );
};

export const ProblemSelected = () => {
    const [filters, setFilters] = useState({
        kind: "all",
        tags: [],
        query: "",
        view: "list",
        sort: "az",
        problem: "camera-calibration",
    });
    return (
        <div className="border border-border rounded-lg overflow-hidden bg-background" style={{ width: 220, height: 420 }}>
            <AlgorithmsSidebar
                filters={filters}
                facets={FACETS}
                onKindChange={(kind) => setFilters((f) => ({ ...f, kind }))}
                onProblemChange={(problem) => setFilters((f) => ({ ...f, problem }))}
            />
        </div>
    );
};

export const ModelsOnly = () => {
    const [filters, setFilters] = useState({
        kind: "model",
        tags: [],
        query: "",
        view: "grid",
        sort: "recent",
        problem: "all",
    });
    return (
        <div className="border border-border rounded-lg overflow-hidden bg-background" style={{ width: 220, height: 420 }}>
            <AlgorithmsSidebar
                filters={filters}
                facets={FACETS}
                onKindChange={(kind) => setFilters((f) => ({ ...f, kind }))}
                onProblemChange={(problem) => setFilters((f) => ({ ...f, problem }))}
            />
        </div>
    );
};
