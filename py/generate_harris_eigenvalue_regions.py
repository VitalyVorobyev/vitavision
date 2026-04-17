from __future__ import annotations

import argparse
from math import sqrt
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = (
    REPO_ROOT
    / "content/images/harris-corner-detector/eigenvalue-classification.svg"
)


def harris_response(lambda_1: np.ndarray, lambda_2: np.ndarray, k: float) -> np.ndarray:
    return lambda_1 * lambda_2 - k * (lambda_1 + lambda_2) ** 2


def harris_zero_slopes(k: float) -> tuple[float, float]:
    if not 0.0 < k < 0.25:
        raise ValueError("k must be in (0, 0.25) for the positive Harris wedge")

    a = k
    b = 2.0 * k - 1.0
    c = k
    disc = b * b - 4.0 * a * c
    return (
        (-b - sqrt(disc)) / (2.0 * a),
        (-b + sqrt(disc)) / (2.0 * a),
    )


def configure_plot_style() -> None:
    plt.rcParams.update(
        {
            "axes.edgecolor": "#111827",
            "axes.labelcolor": "#111827",
            "axes.linewidth": 1.1,
            "font.family": "DejaVu Sans",
            "font.size": 10.5,
            "grid.color": "#cbd5e1",
            "grid.linewidth": 0.8,
            "mathtext.fontset": "dejavusans",
            "svg.fonttype": "none",
            "svg.hashsalt": "vitavision-harris-eigenvalue-regions",
            "xtick.color": "#475569",
            "ytick.color": "#475569",
        }
    )


def add_svg_accessibility(output_path: Path) -> None:
    svg = output_path.read_text(encoding="utf-8")
    svg = svg.replace(
        "<svg ",
        '<svg role="img" aria-labelledby="title desc" ',
        1,
    )

    title_desc = (
        "\n <title id=\"title\">Harris response regions in eigenvalue space</title>"
        "\n <desc id=\"desc\">Positive Harris response indicates corners, "
        "negative response indicates edges, and small eigenvalues near the "
        "origin correspond to flat image regions.</desc>"
    )
    svg_start = svg.find("<svg ")
    if svg_start == -1:
        raise ValueError(f"No SVG root found in {output_path}")
    insert_at = svg.find(">", svg_start) + 1
    output_path.write_text(svg[:insert_at] + title_desc + svg[insert_at:], encoding="utf-8")


def generate_harris_svg(
    output_path: str | Path = DEFAULT_OUTPUT,
    *,
    k: float = 0.04,
    max_lambda: float = 1.0,
    samples: int = 260,
) -> Path:
    """Generate the Harris response region plot used by the Harris article."""

    configure_plot_style()

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    lambda_values = np.linspace(0.0, max_lambda, samples)
    lambda_1, lambda_2 = np.meshgrid(lambda_values, lambda_values)
    response = harris_response(lambda_1, lambda_2, k)
    low_slope, high_slope = harris_zero_slopes(k)

    fig, ax = plt.subplots(figsize=(7.2, 5.4), dpi=160)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")

    edge_fill = "#bfdbfe"
    edge_stroke = "#2563eb"
    corner_fill = "#bbf7d0"
    corner_stroke = "#047857"
    flat_fill = "#e2e8f0"
    flat_stroke = "#64748b"
    text = "#111827"
    muted = "#475569"

    ax.contourf(
        lambda_1,
        lambda_2,
        response,
        levels=[response.min(), 0.0, response.max()],
        colors=[edge_fill, corner_fill],
        alpha=0.74,
        antialiased=True,
    )

    x = np.linspace(0.0, max_lambda, 500)
    ax.plot(x, low_slope * x, color=edge_stroke, linewidth=2.0)

    y = np.linspace(0.0, max_lambda, 500)
    ax.plot(y / high_slope, y, color=edge_stroke, linewidth=2.0)

    ax.plot(
        [0.0, max_lambda],
        [0.0, max_lambda],
        color="#94a3b8",
        linewidth=1.2,
        linestyle=(0, (4, 4)),
    )

    flat_radius = 0.16 * max_lambda
    flat_patch = Circle(
        (0.0, 0.0),
        flat_radius,
        facecolor=flat_fill,
        edgecolor=flat_stroke,
        linewidth=1.3,
        alpha=0.92,
        zorder=5,
    )
    ax.add_patch(flat_patch)

    ax.text(
        0.64 * max_lambda,
        0.68 * max_lambda,
        "corner\n$R > 0$",
        color=corner_stroke,
        fontsize=13,
        fontweight="bold",
        ha="center",
        va="center",
        zorder=6,
    )

    ax.annotate(
        "edge\n$R < 0$",
        xy=(0.72 * max_lambda, low_slope * 0.72 * max_lambda),
        xytext=(0.76 * max_lambda, 0.18 * max_lambda),
        color=edge_stroke,
        fontsize=10.5,
        fontweight="bold",
        ha="center",
        va="center",
        arrowprops={
            "arrowstyle": "->",
            "color": edge_stroke,
            "linewidth": 1.2,
            "shrinkA": 5,
            "shrinkB": 4,
        },
        zorder=6,
    )

    ax.annotate(
        "edge\n$R < 0$",
        xy=(0.72 * max_lambda / high_slope, 0.72 * max_lambda),
        xytext=(0.18 * max_lambda, 0.76 * max_lambda),
        color=edge_stroke,
        fontsize=10.5,
        fontweight="bold",
        ha="center",
        va="center",
        arrowprops={
            "arrowstyle": "->",
            "color": edge_stroke,
            "linewidth": 1.2,
            "shrinkA": 5,
            "shrinkB": 4,
        },
        zorder=6,
    )

    ax.text(
        0.073 * max_lambda,
        0.064 * max_lambda,
        "flat\nsmall $\\lambda_1, \\lambda_2$",
        color=muted,
        fontsize=8.6,
        fontweight="bold",
        ha="center",
        va="center",
        zorder=7,
    )

    ax.text(
        0.55 * max_lambda,
        0.49 * max_lambda,
        "$\\lambda_1 = \\lambda_2$",
        color="#64748b",
        fontsize=9,
        rotation=39,
        ha="center",
        va="center",
    )

    ax.set_xlim(0.0, max_lambda)
    ax.set_ylim(0.0, max_lambda)
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlabel("$\\lambda_1$")
    ax.set_ylabel("$\\lambda_2$", rotation=0, labelpad=16)

    ticks = np.linspace(0.0, max_lambda, 5)
    ax.set_xticks(ticks)
    ax.set_yticks(ticks)
    ax.set_xticklabels(["0", "0.25", "0.50", "0.75", "1.00"])
    ax.set_yticklabels(["0", "0.25", "0.50", "0.75", "1.00"])
    ax.grid(True)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(length=0)

    ax.set_title(
        "Harris response in eigenvalue space",
        loc="left",
        fontsize=15,
        fontweight="bold",
        color=text,
        pad=22,
    )
    ax.text(
        0.0,
        1.035,
        f"$R = \\lambda_1\\lambda_2 - k(\\lambda_1 + \\lambda_2)^2$,  $k = {k:.2f}$",
        transform=ax.transAxes,
        color=muted,
        fontsize=10.5,
        ha="left",
        va="bottom",
    )
    ax.text(
        0.0,
        -0.17,
        "Corners have two significant eigenvalues; edges have one dominant eigenvalue.",
        transform=ax.transAxes,
        color=muted,
        fontsize=9.5,
        ha="left",
        va="top",
    )

    fig.subplots_adjust(left=0.12, right=0.98, bottom=0.17, top=0.85)
    fig.savefig(
        out,
        format="svg",
        facecolor=fig.get_facecolor(),
        metadata={
            "Creator": "py/generate_harris_eigenvalue_regions.py",
            "Date": "2026-04-17",
        },
    )
    plt.close(fig)

    add_svg_accessibility(out)
    print(f"Wrote {out}")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate the Harris detector eigenvalue-region SVG."
    )
    parser.add_argument(
        "output_path",
        nargs="?",
        default=DEFAULT_OUTPUT,
        help="Output SVG path. Defaults to the Harris article image asset.",
    )
    parser.add_argument("--k", type=float, default=0.04)
    parser.add_argument("--max-lambda", type=float, default=1.0)
    parser.add_argument("--samples", type=int, default=260)
    args = parser.parse_args()

    generate_harris_svg(
        args.output_path,
        k=args.k,
        max_lambda=args.max_lambda,
        samples=args.samples,
    )


if __name__ == "__main__":
    main()
