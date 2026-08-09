#!/usr/bin/env python3
"""
BiSeNet bilateral architecture diagram.

Generates a two-branch topology SVG for content/models/bisenet.md: an input
image fanned into a detail-preserving branch and a context branch, merged by a
learned fusion module, then upsampled to a per-pixel label map. The labels
carry both the V1 and V2 component names so the single figure serves the
combined family page.

Run:  .venv/bin/python py/generate_bisenet_bilateral.py
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

OUTPUT = REPO_ROOT / "content" / "images" / "bisenet" / "bilateral.svg"
TITLE = "BiSeNet bilateral architecture"
DESC = (
    "An input RGB image fans into two parallel branches: a wide, shallow "
    "detail-preserving path (Spatial Path in V1, Detail Branch in V2) kept at "
    "1/8 resolution, and a deep, narrow context path (Context Path in V1, "
    "Semantic Branch in V2) that downsamples aggressively for a large "
    "receptive field. A learned fusion module (Feature Fusion Module in V1, "
    "Bilateral Guided Aggregation in V2) merges the two branches before "
    "upsampling to a per-pixel label map."
)

BOX_W = 3.2
BOX_H = 1.55
FONT_PT = 12

# (key, center_x, center_y, label)
NODES = [
    ("input", 1.8, 2.75, "RGB image\n(3 × H × W)"),
    ("detail", 6.2, 0.95,
     "Spatial Path (V1) /\nDetail Branch (V2)\nwide · shallow · 1/8"),
    ("context", 6.2, 4.55,
     "Context Path (V1) /\nSemantic Branch (V2)\ndeep · narrow · → 1/32\n+ global context"),
    ("fusion", 10.7, 2.75,
     "FFM (V1) /\nBGA (V2)\nlearned branch fusion"),
    ("output", 15.1, 2.75,
     "Upsample →\nper-pixel labels\n(N_cls × H × W)"),
]

EDGES = [
    ("input", "detail"),
    ("input", "context"),
    ("detail", "fusion"),
    ("context", "fusion"),
    ("fusion", "output"),
]


def render(output_path: Path, title: str, desc: str) -> None:
    plt.rcParams["svg.hashsalt"] = "vitavision-bisenet-bilateral"
    plt.rcParams["svg.fonttype"] = "none"

    centers = {k: (cx, cy) for k, cx, cy, _ in NODES}

    total_w = 17.0
    total_h = 5.5
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

    for src, dst in EDGES:
        x1, y1 = centers[src]
        x2, y2 = centers[dst]
        # exit the right edge of src, enter the left edge of dst
        start = (x1 + BOX_W / 2, y1)
        end = (x2 - BOX_W / 2, y2)
        arrow = FancyArrowPatch(
            start,
            end,
            arrowstyle="-|>",
            mutation_scale=12,
            linewidth=1.0,
            color="#475569",
            shrinkA=0.0,
            shrinkB=0.0,
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
        description="Generate the BiSeNet bilateral architecture SVG."
    )
    parser.add_argument(
        "output_path",
        nargs="?",
        type=Path,
        default=OUTPUT,
        help="Output SVG path",
    )
    args = parser.parse_args(argv)
    render(args.output_path, TITLE, DESC)
    print(f"wrote {args.output_path}")


if __name__ == "__main__":
    main()
