import type { ConfigDocument } from "../types";

/*
 * The config is `{ board, config }`: the two documents a ring-grid detector is built from.
 * `board` is a target spec (`schemas/target_spec.json`, `ringgrid.target.v6`) and `config`
 * a detection config (`schemas/detect_config.json`).
 *
 * The detection config carries fields the library derives from the board when it loads one
 * (the marker radii in pixels, the codebook profile, ...). The schema marks them `readOnly`;
 * they are left out here and in the form, and the worker takes them from
 * `default_config_json(board)` underneath whatever the config says.
 */

/** `default_board_json()` of @vitavision/ringgrid: the classic coded hex target. */
export const RINGGRID_DEFAULT_BOARD: ConfigDocument = {
    schema: "ringgrid.target.v6",
    name: "ringgrid_200mm_hex",
    lattice: { kind: "hex", rows: 15, long_row_cols: 14, pitch_mm: 8 },
    marker: { outer_radius_mm: 4.8, inner_radius_mm: 3.2 },
    coding: { kind: "coded16", ring_width_mm: 1.152 },
};

/** `default_config_json(default_board_json())`, minus the `readOnly` fields derived from the board. */
export const RINGGRID_DEFAULT_CONFIG: ConfigDocument = {
    marker_scale: { diameter_min_px: 14, diameter_max_px: 66 },
    circle_refinement: "ProjectiveCenter",
    self_undistort: {
        enable: false,
        lambda_range: [-8e-07, 8e-07],
        max_evals: 40,
        min_markers: 6,
        improvement_threshold: 0.01,
        min_abs_improvement: 0.0001,
        trim_fraction: 0.1,
        min_lambda_abs: 5e-09,
        reject_range_edge: true,
        range_edge_margin_frac: 0.02,
        validation_min_markers: 24,
        validation_abs_improvement_px: 0.05,
        validation_rel_improvement: 0.03,
    },
    require_complete_board: false,
    advanced: {
        outer_estimation: {
            radial_samples: 64,
            aggregator: "median",
            grad_polarity: "dark_to_light",
            min_theta_coverage: 0.6,
            min_theta_consistency: 0.35,
            allow_two_hypotheses: true,
            second_peak_min_rel: 0.85,
            refine_halfwidth_px: 1,
        },
        proposal: { grad_threshold: 0.05, min_vote_frac: 0.1, max_candidates: null, radius_step: 1 },
        seed_proposals: { merge_radius_px: 3, seed_score: 1000000000000, max_seeds: 512 },
        edge_sample: { n_rays: 48, r_step: 0.5, min_ring_depth: 0.08, min_rays_with_ring: 16 },
        decode: {
            samples_per_sector: 5,
            n_radial_rings: 3,
            max_decode_dist: 3,
            min_decode_confidence: 0.3,
            min_decode_margin: 1,
            min_decode_contrast: 0.03,
            threshold_max_iters: 10,
            threshold_convergence_eps: 0.0001,
        },
        marker_spec: {
            inner_search_halfwidth: 0.08,
            inner_grad_polarity: "light_to_dark",
            radial_samples: 64,
            theta_samples: 96,
            aggregator: "median",
            min_theta_coverage: 0.6,
            min_theta_consistency: 0.25,
        },
        inner_fit: {
            min_points: 20,
            min_inlier_ratio: 0.5,
            max_rms_residual: 1,
            max_center_shift_px: 12,
            max_ratio_abs_error: 0.15,
            local_peak_halfwidth_idx: 3,
            ransac: { max_iters: 200, inlier_threshold: 1.5, min_inliers: 8, seed: 43 },
            miss_confidence_factor: 0.7,
            max_angular_gap_rad: 1.57079633,
            require_inner_fit: false,
        },
        outer_fit: {
            min_direct_fit_points: 6,
            min_ransac_points: 8,
            ransac: { max_iters: 200, inlier_threshold: 1.5, min_inliers: 6, seed: 42 },
            size_score_weight: 0.15,
            max_angular_gap_rad: 1.57079633,
        },
        projective_center: {
            use_expected_ratio: true,
            ratio_penalty_weight: 1,
            max_correction_shift_px: null,
            max_selected_residual: 0.25,
            min_eig_separation: 1e-06,
        },
        completion: {
            enable: true,
            reproj_gate_px: 3,
            min_fit_confidence: 0.45,
            min_arc_coverage: 0.35,
            max_attempts: null,
            image_margin_px: 10,
            require_perfect_decode: false,
            max_radii_std_ratio: 0.35,
        },
        max_aspect_ratio: 3,
        dedup_radius: 6,
        use_global_filter: true,
        geometric_verify: true,
        ransac_homography: { max_iters: 2000, inlier_threshold: 5, min_inliers: 6, seed: 0 },
        id_correction: {
            enable: true,
            auto_search_radius_outer_muls: [2.4, 2.9, 3.5, 4.2, 5],
            consistency_outer_mul: 3.2,
            consistency_min_neighbors: 1,
            consistency_min_support_edges: 1,
            consistency_max_contradiction_frac: 0.5,
            confirm_by_consistency: true,
            soft_lock_exact_decode: true,
            min_votes: 2,
            min_votes_recover: 1,
            min_vote_weight_frac: 0.55,
            h_reproj_gate_px: 30,
            homography_fallback_enable: true,
            homography_min_trusted: 24,
            homography_min_inliers: 12,
            max_iters: 5,
            remove_unverified: false,
            seed_min_decode_confidence: 0.7,
        },
        inner_as_outer_recovery: {
            enable: true,
            ratio_threshold: 0.75,
            k_neighbors: 6,
            min_theta_consistency: 0.18,
            min_theta_coverage: 0.4,
            min_ring_depth: 0.02,
            refine_halfwidth_px: 2.5,
            size_gate_tolerance: 0.25,
        },
        proposal_downscale: "off",
    },
};

/**
 * The library defaults throughout: the editor's long-standing board (15 rows of 14, 8 mm
 * pitch, 4.8 / 3.2 mm radii) is the library's default target.
 */
export const initialConfig: ConfigDocument = {
    // The library leaves `codebook_profile` out of a target that uses the baseline codebook; the
    // form needs the value to show which profile is chosen.
    board: { ...RINGGRID_DEFAULT_BOARD, coding: { ...(RINGGRID_DEFAULT_BOARD.coding as ConfigDocument), codebook_profile: "base" } },
    config: RINGGRID_DEFAULT_CONFIG,
};
