#!/usr/bin/env python3
"""
Fast-SCNN architecture diagram.

Generates a topology SVG for content/models/fast-scnn.md showing the defining
idea: a single shared "Learning to Downsample" prefix whose 1/8-resolution
output feeds BOTH the deep Global Feature Extractor branch and the
high-resolution detail skip, merged by the Feature Fusion Module before the
classifier. This contrasts with the two separate branch prefixes of BiSeNet.

Run:  .venv/bin/python py/generate_fast_scnn_architecture.py
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

OUTPUT = REPO_ROOT / "content" / "images" / "fast-scnn" / "architecture.svg"
TITLE = "Fast-SCNN architecture"
DESC = (
    "An input RGB image enters a shared Learning to Downsample prefix that "
    "produces a single 1/8-resolution feature map. That map feeds two paths: "
    "a deep Global Feature Extractor branch (nine inverted-residual "
    "bottlenecks down to 1/32, ending in a pyramid pooling module) and a "
    "high-resolution detail skip carrying the shared features unchanged. The "
    "Feature Fusion Module merges the two paths at 1/8 resolution, and the "
    "classifier upsamples to a per-pixel label map."
)

BOX_W = 3.2
BOX_H = 1.55
FONT_PT = 12

# (key, center_x, center_y, label)
NODES = [
    ("input", 1.8, 2.85, "RGB image\n(3 × H × W)"),
    ("ltd", 5.8, 2.85, "Learning to\nDownsample\n(shared · 1/8)"),
    ("gfe", 9.8, 0.95,
     "Global Feature\nExtractor\n9× bottleneck (t=6)\n→ 1/32, PPM"),
    ("skip", 9.8, 4.75,
     "Detail skip\n(shared LtD\nfeatures · 1/8)"),
    ("ffm", 13.8, 2.85, "Feature Fusion\nModule (1/8)"),
    ("output", 17.8, 2.85, "Classifier →\nlabels (19×H×W)"),
]

EDGES = [
    ("input", "ltd"),
    ("ltd", "gfe"),
    ("ltd", "skip"),
    ("gfe", "ffm"),
    ("skip", "ffm"),
    ("ffm", "output"),
]


def render(output_path: Path, title: str, desc: str) -> None:
    plt.rcParams["svg.hashsalt"] = "vitavision-fast-scnn-architecture"
    plt.rcParams["svg.fonttype"] = "none"

    centers = {k: (cx, cy) for k, cx, cy, _ in NODES}

    total_w = 19.6
    total_h = 5.7
    fig, ax = plt.subplots(figsize=(total_w * 0.62, total_h * 0.62))
    fig.patch.set_facecolor("#f8fafc")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, total_w)
    ax.set_ylim(0, total_h)
    ax.invert_yaxis()
    ax.set_aspect("equal")
    ax.axis("off")

    for _key, cx, cy, label in NODES:
        x = cx - BOX_W / 2
        y = cy - BOX_H / 2
        box = FancyBboxPatch(
            (x, y),
            BOX_W,
            BOX_H,
            boxstyle="round,pad=0.02,rounding_size=0.10",
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

    def arrow(start, end):
        ax.add_patch(FancyArrowPatch(
            start, end, arrowstyle="-|>", mutation_scale=12,
            linewidth=1.0, color="#475569", shrinkA=0.0, shrinkB=0.0))

    for src, dst in EDGES:
        x1, y1 = centers[src]
        x2, y2 = centers[dst]
        arrow((x1 + BOX_W / 2, y1), (x2 - BOX_W / 2, y2))

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
        description="Generate the Fast-SCNN architecture SVG."
    )
    parser.add_argument("output_path", nargs="?", type=Path, default=OUTPUT,
                        help="Output SVG path")
    args = parser.parse_args(argv)
    render(args.output_path, TITLE, DESC)
    print(f"wrote {args.output_path}")


if __name__ == "__main__":
    main()
