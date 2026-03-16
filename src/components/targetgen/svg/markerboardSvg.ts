import type { MarkerBoardConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { svgDocument, rect, circle } from "./svgUtils";

interface CircleSpec {
    i: number;
    j: number;
    polarity: "white" | "black";
}

/** Default circle layout matching the backend's default_circles(). */
function defaultCircles(innerRows: number, innerCols: number): CircleSpec[] {
    const totalRows = innerRows + 1;
    const totalCols = innerCols + 1;
    const circles: CircleSpec[] = [];

    // Top-left: white circle on a white (even-parity) square
    circles.push({ i: 0, j: 0, polarity: "white" });

    // Top-right: black circle on a black (odd-parity) square
    const trJ = totalCols - 1;
    const trParity = (0 + trJ) % 2 === 0 ? "white" : "black";
    circles.push({ i: 0, j: trJ, polarity: trParity === "white" ? "black" : "white" });

    // Bottom-left: black circle on a black square
    const blI = totalRows - 1;
    const blParity = (blI + 0) % 2 === 0 ? "white" : "black";
    circles.push({ i: blI, j: 0, polarity: blParity === "white" ? "black" : "white" });

    return circles;
}

export function markerboardSvg(
    config: MarkerBoardConfig,
    page: PageDimensions,
): string {
    const totalCols = config.innerCols + 1;
    const totalRows = config.innerRows + 1;
    const sq = config.squareSizeMm;
    const boardW = totalCols * sq;
    const boardH = totalRows * sq;

    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;

    const parts: string[] = [];
    parts.push(rect(ox, oy, boardW, boardH, "#ffffff"));

    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            if ((r + c) % 2 === 0) {
                parts.push(rect(ox + c * sq, oy + r * sq, sq, sq, "#000000"));
            }
        }
    }

    // Draw circles
    const circles = defaultCircles(config.innerRows, config.innerCols);
    const circR = (sq * config.circleDiameterRel) / 2;

    for (const circ of circles) {
        const cx = ox + circ.j * sq + sq / 2;
        const cy = oy + circ.i * sq + sq / 2;
        const fill = circ.polarity === "white" ? "#ffffff" : "#000000";
        parts.push(circle(cx, cy, circR, fill));
    }

    return svgDocument(page.widthMm, page.heightMm, parts.join(""));
}
