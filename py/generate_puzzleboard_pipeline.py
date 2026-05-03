#!/usr/bin/env python3
"""
PuzzleBoard detection pipeline diagram.

Generates an 8-stage pipeline SVG for content/algorithms/puzzleboard.md.
Run:  .venv/bin/python py/generate_puzzleboard_pipeline.py
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
    "Hessian\nf_xx, f_xy, f_yy",
    "Saddle response s\nlocal maxima",
    "Subpixel refine\n3×3 centroid",
    "9-NN + Kruskal\nMSF grid",
    "Bit read at\nedge midpoints",
    "Majority vote\n(3 repetitions)",
    "Cross-correlate\nA, A', B, B'",
    "Decode (u, v)\nmod 167",
]

OUTPUT = REPO_ROOT / "content" / "images" / "puzzleboard" / "pipeline.svg"
TITLE = "PuzzleBoard detection and decoding pipeline"
DESC = (
    "8-stage pipeline from Hessian computation through saddle response and "
    "subpixel refinement, 9-NN Kruskal grid reconstruction, edge-bit reading "
    "with majority voting, cross-correlation against factor maps, to absolute "
    "grid position decoding."
)

COLS = 4       # 8 stages → 4+4
BOX_W = 2.0
BOX_H = 0.92
H_GAP = 0.40
V_GAP = 0.60
FONT_PT = 12


def render(stages, output_path: Path, title: str, desc: str, cols: int = COLS) -> None:
    n = len(stages)
    rows = (n + cols - 1) // cols
    fig_w = cols * (BOX_W + H_GAP) - H_GAP + 0.7
    fig_h = rows * (BOX_H + V_GAP) - V_GAP + 0.7

    plt.rcParams["svg.hashsalt"] = "vitavision-puzzleboard-pipeline"
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
        description="Generate the PuzzleBoard pipeline SVG."
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
