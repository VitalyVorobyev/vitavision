/*
 * The target generator's print colours: ink and paper of the printable document (SVG, PNG,
 * PDF). They are literal on purpose (and exempt from the tokens-only lint rule): a printed
 * calibration target is black and white on paper whatever theme the page is viewed in, and
 * the file it downloads must not depend on the viewer's stylesheet.
 */
export const PRINT_COLORS = {
    /** The sheet behind a rasterised page (PNG export). */
    paper: "#ffffff",
    /** The scale bar and its label, printed beside the target. */
    annotation: "#333",
    /** Default ink of a caption line (board parameters and the like). */
    caption: "#999",
} as const;
