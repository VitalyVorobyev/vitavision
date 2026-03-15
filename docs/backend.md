# Backend API Reference — Calibration Targets

This document is the reference for `POST /api/v1/cv/calibration-targets/detect`.
For dev-setup, deployment, and environment variables see [`README.dev.md`](../README.dev.md).

---

## POST /api/v1/cv/calibration-targets/detect

Detect calibration target corners (and optionally markers and circle fiducials) in a stored image.

### Authentication

All `/api/v1/*` endpoints require the `X-API-Key` header when `API_KEY` is set on the server.
In local development without `API_KEY` set, the header is optional.

### Rate limit

10 requests per minute per IP.

### Request

The request body is a JSON object discriminated by the `algorithm` field.

**Shared fields (all algorithms):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `algorithm` | `"chessboard" \| "charuco" \| "markerboard"` | yes | Selects the detection algorithm |
| `key` | `string` | yes | Content-addressed storage key (`uploads/<sha256-64-hex>`) |
| `storage_mode` | `"r2" \| "local" \| null` | no | Storage backend override; `null` uses server default |
| `config` | object | see per-algorithm | Algorithm-specific configuration |

---

#### Algorithm: `chessboard`

Detects inner corners of a chessboard pattern using the `calib-targets` library.

```json
{
  "algorithm": "chessboard",
  "key": "uploads/<sha256>",
  "storage_mode": "local",
  "config": {
    "chess_cfg": {
      "params": {
        "use_radius10": null,
        "descriptor_use_radius10": null,
        "threshold_rel": null,
        "threshold_abs": null,
        "nms_radius": null,
        "min_cluster_size": null
      },
      "multiscale": {
        "pyramid": { "num_levels": null, "min_size": null },
        "refinement_radius": null,
        "merge_radius": null
      }
    },
    "detector": {
      "min_corner_strength": 0.2,
      "min_corners": null,
      "expected_rows": 7,
      "expected_cols": 11,
      "completeness_threshold": 0.1,
      "use_orientation_clustering": null,
      "orientation_clustering_params": null
    }
  }
}
```

All config fields are optional; `null` uses the library default. The sample defaults are:

| Parameter | Sample default | Description |
|-----------|----------------|-------------|
| `detector.expected_rows` | `7` | Expected inner-corner rows |
| `detector.expected_cols` | `11` | Expected inner-corner columns |
| `detector.min_corner_strength` | `0.2` | Minimum ChESS response to keep a corner candidate |
| `detector.completeness_threshold` | `0.1` | Fraction of expected corners required for a valid detection |

---

#### Algorithm: `charuco`

Detects corners and ArUco markers on a ChArUco board.
The `board` sub-object is **required**.

```json
{
  "algorithm": "charuco",
  "key": "uploads/<sha256>",
  "storage_mode": "local",
  "config": {
    "board": {
      "rows": 22,
      "cols": 22,
      "cell_size": 4.8,
      "marker_size_rel": 0.75,
      "dictionary": "DICT_4X4_1000",
      "marker_layout": "opencv_charuco"
    },
    "px_per_square": 40,
    "chess_cfg": null,
    "chessboard": null,
    "graph": null,
    "scan": null,
    "max_hamming": null,
    "min_marker_inliers": null
  }
}
```

The sample defaults match `public/board_charuco.json`:

| Parameter | Sample default | Description |
|-----------|----------------|-------------|
| `board.rows` | `22` | Board rows |
| `board.cols` | `22` | Board columns |
| `board.cell_size` | `4.8` | Cell size in mm |
| `board.marker_size_rel` | `0.75` | Marker size relative to cell size |
| `board.dictionary` | `"DICT_4X4_1000"` | ArUco dictionary name |
| `px_per_square` | `40` | Pixels per square in the reference image (hint for detector scale) |

Valid dictionary names are any entry in `calib_targets.DICTIONARY_NAMES`.

---

#### Algorithm: `markerboard`

Detects corners and circle fiducials on a Marker Board (checkerboard with circle markers).
All config fields are optional; defaults are derived from `public/marker_detect_config.json`.

```json
{
  "algorithm": "markerboard",
  "key": "uploads/<sha256>",
  "storage_mode": "local",
  "config": {
    "chess_cfg": null,
    "layout": {
      "rows": 22,
      "cols": 22,
      "circles": [
        { "i": 11, "j": 11, "polarity": "white" },
        { "i": 12, "j": 11, "polarity": "white" },
        { "i": 12, "j": 12, "polarity": "white" }
      ],
      "cell_size": null
    },
    "chessboard": null,
    "grid_graph": null,
    "circle_score": null,
    "match_params": null,
    "roi_cells": null
  }
}
```

---

### Response

All three algorithms return the same top-level shape.

```json
{
  "status": "success",
  "key": "uploads/<sha256>",
  "storage_mode": "local",
  "algorithm": "chessboard",
  "image_width": 1920,
  "image_height": 1080,
  "frame": {
    "name": "image_px_center",
    "origin": "top_left",
    "x_axis": "right",
    "y_axis": "down",
    "units": "pixels"
  },
  "summary": {
    "corner_count": 77,
    "marker_count": null,
    "circle_candidate_count": null,
    "circle_match_count": null,
    "alignment_inliers": null,
    "runtime_ms": 42.1
  },
  "detection": {
    "kind": "chessboard",
    "corners": [
      {
        "id": "<uuid>",
        "x": 123.4,
        "y": 56.7,
        "x_norm": 0.064,
        "y_norm": 0.052,
        "score": 0.87,
        "grid": { "i": 0, "j": 0 },
        "corner_id": null,
        "target_position": null
      }
    ]
  },
  "markers": null,
  "alignment": null,
  "circle_candidates": null,
  "circle_matches": null
}
```

**Frame semantics:** coordinates are in pixels, origin at top-left, x right, y down. The `frame` object is always `"image_px_center"`.

**Algorithm-specific response fields:**

| Field | `chessboard` | `charuco` | `markerboard` |
|-------|-------------|-----------|---------------|
| `detection.kind` | `"chessboard"` | `"charuco"` | `"checkerboard_marker"` |
| `markers` | `null` | `list[MarkerResponse]` | `null` |
| `alignment` | `null` | `null` | `AlignmentResponse \| null` |
| `circle_candidates` | `null` | `null` | `list[CircleCandidateResponse]` |
| `circle_matches` | `null` | `null` | `list[CircleMatchResponse]` |
| `summary.marker_count` | `null` | integer | `null` |
| `summary.circle_candidate_count` | `null` | `null` | integer |
| `summary.circle_match_count` | `null` | `null` | integer |
| `summary.alignment_inliers` | `null` | `null` | integer |

**Corner fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique ID for this run |
| `x`, `y` | float | Pixel coordinates |
| `x_norm`, `y_norm` | float | Coordinates normalized to [0, 1] by image dimensions |
| `score` | float | Detector response / quality score |
| `grid` | `{i, j} \| null` | Grid position on the calibration target |
| `corner_id` | `int \| null` | Integer id for ChArUco corners |
| `target_position` | `{x, y} \| null` | Known target position in target frame |

### Error cases

| Status | Condition |
|--------|-----------|
| `400` | Image cannot be decoded, dimensions exceed limit, or key format is invalid |
| `400` | Detection algorithm raised a non-"not detected" error |
| `401` | Missing `X-API-Key` header (when `API_KEY` is configured) |
| `403` | Wrong `X-API-Key` value |
| `422` | Request body fails Pydantic validation |
| `429` | Rate limit exceeded (10/min per IP) |
| `500` | Detector returned non-finite coordinate values |

A detection that finds zero corners returns `status: "success"` with an empty `detection.corners` list and all counts at 0 — **not** a 4xx error.

---

## Editor — Guided Workflow

The editor at `/editor` exposes a single right-side workflow rail ordered as:

1. **Hint card** — sample-specific guidance based on the active image
2. **Algorithm selection** — choose from Chessboard, ChArUco, Marker Board, or ChESS Corners
3. **Config form** — editable parameters seeded from sample defaults
4. **Run / Summary** — execute detection and view counts + timing
5. **Features** — list of all detected and manual features; click a feature to inspect metadata

### Sample guidance

| Sample | Primary algorithm | Hint focus |
|--------|------------------|------------|
| `chessboard.png` | Chessboard | `expected_rows`, `expected_cols`, `min_corner_strength`, `completeness_threshold`; ChESS Corners is also recommended as an alternative |
| `charuco.png` | ChArUco | `px_per_square`, `max_hamming`, `min_marker_inliers`, graph spacing |
| `markerboard.png` | Marker Board | circle positions/polarities, graph spacing, patch size, minimum contrast |
| Uploaded image | (generic) | Choose the algorithm matching your target board geometry |

### Storage copy

The editor and all public-facing UI labels do not mention the underlying storage vendor. Upload progress, error messages, and storage-mode indicators use vendor-neutral language (e.g., "saved", "upload failed") regardless of whether the backend uses local or object storage.
