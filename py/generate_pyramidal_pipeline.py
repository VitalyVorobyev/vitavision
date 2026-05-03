#!/usr/bin/env python3
"""
Pyramidal blur-aware X-corner chessboard detector pipeline diagram.

Generates a 10-stage pipeline SVG for content/algorithms/pyramidal-blur-aware-xcorner.md.
Run:  .venv/bin/python py/generate_pyramidal_pipeline.py
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
    "Pyramid",
    "Per-level\nx-corner I",
    "2×2 box\n+ NMS",
    "Cascade\nfilters",
    "Mean-shift\nsubpixel",
    "Spokes:\norient + contrast",
    "Cross-level\nlevel select",
    "KNN +\nedge validate",
    "Vote +\ngraph rules",
    "Chessboard\ngraphs",
]

OUTPUT = REPO_ROOT / "content" / "images" / "pyramidal-blur-aware-xcorner" / "pipeline.svg"
TITLE = "Pyramidal blur-aware X-corner chessboard detector pipeline"
DESC = (
    "10-stage pipeline from image pyramid through per-level x-corner intensity, "
    "2×2 box filter and NMS, cascade filters, mean-shift subpixel refinement, "
    "spoke orientation, cross-level selection, KNN edge validation, vote and "
    "graph-rule enforcement, to chessboard graphs."
)

COLS = 4       # 10 stages → 4+4+2 snake
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

    plt.rcParams["svg.hashsalt"] = "vitavision-pyramidal-pipeline"
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
        description="Generate the pyramidal blur-aware X-corner pipeline SVG."
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
