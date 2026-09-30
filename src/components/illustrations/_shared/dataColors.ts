/*
 * Data colours of the article illustrations: the hues that identify a term of a figure,
 * not chrome. The ChESS response figure draws each of the four sum-response (SR) phases,
 * the diff-response (DR) pairs and the mean-response (MR) regions in its own colour, and
 * the article text, the readouts and the overlay chips refer to them by that colour, so
 * they keep their hue in both themes. Everything else in an illustration is a token.
 */

/** One hue per SR phase φ0..φ3. */
export const CHESS_PHASE_COLORS = ["#0f766e", "#2563eb", "#9333ea", "#c2410c"] as const;

/** The DR (opposite-sample difference) pairs. */
export const CHESS_DR_COLOR = "#b91c1c";

/** The MR (local-mean) regions. */
export const CHESS_MR_COLOR = "#d97706";
