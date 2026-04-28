import type { AlgorithmDefinition } from "./types";

export interface AlgorithmManifestEntry {
    id: string;
    title: string;
    description: string;
    blogSlug?: string;
}

/** Lightweight static manifest — no adapter modules imported. */
export const ALGORITHM_MANIFEST: AlgorithmManifestEntry[] = [
    {
        id: "chess-corners",
        title: "ChESS Corners",
        description: "Detect ChESS X-junction keypoints with subpixel positions and two-axis orientation descriptors.",
        blogSlug: "pyramidal-blur-aware-xcorner",
    },
    {
        id: "chessboard",
        title: "Chessboard",
        description: "Detect labeled chessboard corner grid with subpixel accuracy.",
    },
    {
        id: "charuco",
        title: "ChArUco",
        description: "Detect ChArUco board corners and embedded ArUco markers.",
    },
    {
        id: "markerboard",
        title: "Marker Board",
        description: "Detect checkerboard corners and fiducial circle markers.",
    },
    {
        id: "ringgrid",
        title: "Ring Grid",
        description: "Detect concentric ring markers on a hex-lattice grid with binary code bands.",
    },
    {
        id: "radsym",
        title: "Radial Symmetry",
        description: "Detect radial symmetry centers via response map voting (FRST / RSD).",
    },
    {
        id: "puzzleboard",
        title: "PuzzleBoard",
        description: "Self-identifying checkerboard with absolute (u,v) grid via embedded edge-bit pattern.",
        blogSlug: "puzzleboard",
    },
];

export const DEFAULT_ALGORITHM_ID = "chess-corners";

// Per-id dynamic import map. Each import() creates its own chunk.
const LOADERS: Record<string, () => Promise<AlgorithmDefinition>> = {
    "chess-corners": () =>
        import("./chessCorners/adapter").then((m) => m.chessCornersAlgorithm),
    chessboard: () =>
        import("./calibrationTargets/chessboardAdapter").then((m) => m.chessboardAlgorithm),
    charuco: () =>
        import("./calibrationTargets/charucoAdapter").then((m) => m.charucoAlgorithm),
    markerboard: () =>
        import("./calibrationTargets/markerboardAdapter").then((m) => m.markerboardAlgorithm),
    ringgrid: () =>
        import("./ringgrid/adapter").then((m) => m.ringgridAlgorithm),
    radsym: () =>
        import("./radsym/adapter").then((m) => m.radsymAlgorithm),
    puzzleboard: () =>
        import("./puzzleboard/adapter").then((m) => m.puzzleboardAlgorithm),
};

// Promise cache — guarantees each adapter module is loaded at most once.
const pendingLoads = new Map<string, Promise<AlgorithmDefinition>>();

// Resolved cache — populated when the promise settles.
const loadedAlgorithms = new Map<string, AlgorithmDefinition>();

/**
 * Dynamically loads the adapter for the given algorithm id.
 * Subsequent calls for the same id return the cached promise.
 */
export function loadAlgorithm(id: string): Promise<AlgorithmDefinition> {
    const cached = pendingLoads.get(id);
    if (cached) return cached;

    const loader = LOADERS[id] ?? LOADERS[DEFAULT_ALGORITHM_ID];
    const resolvedId = LOADERS[id] ? id : DEFAULT_ALGORITHM_ID;

    const promise = loader().then((algo) => {
        loadedAlgorithms.set(resolvedId, algo);
        return algo;
    });

    pendingLoads.set(resolvedId, promise);
    return promise;
}

/**
 * Sync access to an already-loaded algorithm.
 * Returns null if the algorithm has not been loaded yet.
 */
export function getLoadedAlgorithm(id: string): AlgorithmDefinition | null {
    return loadedAlgorithms.get(id) ?? null;
}

/**
 * @deprecated Use loadAlgorithm() + getLoadedAlgorithm() instead.
 * Kept for backward compatibility — synchronously returns the cached definition,
 * or falls back to the default algorithm manifest entry as a stub.
 * Callers that use this during render should migrate to the async pattern.
 */
export function getAlgorithmById(id: string): AlgorithmDefinition {
    const loaded = loadedAlgorithms.get(id);
    if (loaded) return loaded;
    // Kick off load in the background for next render cycle.
    loadAlgorithm(id);
    // Return a minimal stub so callers don't crash before the load resolves.
    const manifest = ALGORITHM_MANIFEST.find((e) => e.id === id) ?? ALGORITHM_MANIFEST[0];
    return {
        id: manifest.id,
        title: manifest.title,
        description: manifest.description,
        blogSlug: manifest.blogSlug,
        initialConfig: {},
        ConfigComponent: () => null,
        run: () => Promise.reject(new Error("Algorithm not yet loaded")),
        toFeatures: () => [],
        summary: () => [],
    };
}

/**
 * @deprecated Use ALGORITHM_MANIFEST for listing. Kept only for legacy callers
 * that need the full AlgorithmDefinition array (e.g. tests loading all adapters).
 */
export async function loadAllAlgorithms(): Promise<AlgorithmDefinition[]> {
    return Promise.all(ALGORITHM_MANIFEST.map((e) => loadAlgorithm(e.id)));
}
