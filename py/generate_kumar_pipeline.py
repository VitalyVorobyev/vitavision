#!/usr/bin/env python3
"""
Kumar-Ahuja generalized RAC calibration pipeline diagram.

Generates a 9-stage pipeline SVG for content/algorithms/kumar-generalized-rac.md.
Run:  .venv/bin/python py/generate_kumar_pipeline.py
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

REPO_ROOT = Path(__file__).resolve().parents[1]

STAGES = [
    "Correspondences\n(P_w_i, I_i, J_i)",
    "Metric sensor points\nx_nf, y_nf",
    "Assemble A q = b\nper Eq. 7",
    "LS solve\nq ∈ ℝ⁷",
    "Decompose → S, R, t_x, t_y\n4-way sign ambiguity",
    "Solve (λ, t_z) via Eq. 35\nreject λ < 0",
    "Pick by\nradial-distortion fit",
    "Iterate CoD (I_0, J_0)\nresidual RAC search",
    "Nonlinear refine\nU* incl. k_1, k_2",
]

OUTPUT = REPO_ROOT / "content" / "images" / "kumar-generalized-rac" / "pipeline.svg"
TITLE = "Kumar-Ahuja generalized RAC calibration pipeline"
DESC = (
    "9-stage pipeline from world-image correspondences through metric sensor "
    "conversion, gRAC linear system assembly and solve, parameter decomposition "
    "with sign disambiguation, lambda/t_z solve, radial-distortion candidate "
    "selection, CoD iteration, and final nonlinear refinement."
)

COLS = 3       # 9 stages → 3+3+3
BOX_W = 2.2
BOX_H = 0.92
H_GAP = 0.40
V_GAP = 0.60
FONT_PT = 12


def render(stages, output_path: Path, title: str, desc: str, cols: int = COLS) -> None:
    n = len(stages)
    rows = (n + cols - 1) // cols
    fig_w = cols * (BOX_W + H_GAP) - H_GAP + 0.7
    fig_h = rows * (BOX_H + V_GAP) - V_GAP + 0.7

    plt.rcParams["svg.hashsalt"] = "vitavision-kumar-pipeline"
    plt.rcParams["svg.fonttype"] = "none"

    fig, ax = plt.subplots(figsize=(fig_w, fig_h))
    fig.patch.set_facecolor("#f8fafc")
    ax.set_facecolor("#ffffff")

    total_w = cols * (BOX_W + H_GAP) - H_GAP + 0.35
    total_h = rows * (BOX_H + V_GAP) - V_GAP + 0.35
    ax.set_xlim(0, total_w)
    ax.set_ylim(0, total_h)
    ax.invert_yaxis()
    ax.set_aspect("equal")
    ax.axis("off")

    centers = []
    for idx, label in enumerate(stages):
        row = idx // cols
        col_in_row = idx % cols
        col = col_in_row if row % 2 == 0 else (cols - 1 - col_in_row)
        x = 0.175 + col * (BOX_W + H_GAP)
        y = 0.175 + row * (BOX_H + V_GAP)
        cx = x + BOX_W / 2
        cy = y + BOX_H / 2
        centers.append((cx, cy, row, col))

        box = FancyBboxPatch(
            (x, y),
            BOX_W,
            BOX_H,
            boxstyle="round,pad=0.02,rounding_size=0.08",
            linewidth=1.0,
            edgecolor="#475569",
            facecolor="#e2e8f0",
        )
        ax.add_patch(box)
        ax.text(
            cx,
            cy,
            label,
            ha="center",
            va="center",
            fontsize=FONT_PT,
            color="#111827",
            linespacing=1.25,
        )

    for i in range(len(centers) - 1):
        cx1, cy1, r1, c1 = centers[i]
        cx2, cy2, r2, c2 = centers[i + 1]
        if r1 == r2:
            if c2 > c1:
                start = (cx1 + BOX_W / 2, cy1)
                end = (cx2 - BOX_W / 2, cy2)
            else:
                start = (cx1 - BOX_W / 2, cy1)
                end = (cx2 + BOX_W / 2, cy2)
        else:
            start = (cx1, cy1 + BOX_H / 2)
            end = (cx2, cy2 - BOX_H / 2)

        arrow = FancyArrowPatch(
            start,
            end,
            arrowstyle="-|>",
            mutation_scale=11,
            linewidth=1.0,
            color="#475569",
        )
        ax.add_patch(arrow)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(
        output_path,
        format="svg",
        facecolor=fig.get_facecolor(),
        bbox_inches="tight",
        metadata={"Date": None},
    )
    plt.close(fig)
    inject_accessibility(output_path, title, desc)


def inject_accessibility(svg_path: Path, title: str, desc: str) -> None:
    text = svg_path.read_text(encoding="utf-8")
    title_xml = f'<title id="title">{title}</title>'
    desc_xml = f'<desc id="desc">{desc}</desc>'
    text = re.sub(
        r"<svg([^>]*)>",
        rf'<svg\1 role="img" aria-labelledby="title desc">{title_xml}{desc_xml}',
        text,
        count=1,
    )
    svg_path.write_text(text, encoding="utf-8")


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(
        description="Generate the Kumar gRAC calibration pipeline SVG."
    )
    parser.add_argument(
        "output_path",
        nargs="?",
        type=Path,
        default=OUTPUT,
        help="Output SVG path",
    )
    args = parser.parse_args(argv)
    render(STAGES, args.output_path, TITLE, DESC)
    print(f"wrote {args.output_path}")


if __name__ == "__main__":
    main()
