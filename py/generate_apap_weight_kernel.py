from __future__ import annotations

import argparse
from math import sqrt, log
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = (
    REPO_ROOT
    / "content/images/apap-image-stitching/weight-kernel.svg"
)


def configure_plot_style() -> None:
    plt.rcParams.update(
        {
            "axes.edgecolor": "#111827",
            "axes.labelcolor": "#111827",
            "axes.linewidth": 1.1,
            "font.family": "DejaVu Sans",
            "font.size": 13,
            "grid.color": "#cbd5e1",
            "grid.linewidth": 0.8,
            "mathtext.fontset": "dejavusans",
            "svg.fonttype": "none",
            "svg.hashsalt": "vitavision-apap-weight-kernel",
            "xtick.color": "#475569",
            "xtick.labelsize": 12,
            "ytick.color": "#475569",
            "ytick.labelsize": 12,
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
        "\n <title id=\"title\">Moving-DLT weight kernel</title>"
        "\n <desc id=\"desc\">The Moving-DLT weight decays as a Gaussian "
        "in source-image distance, then is clipped from below by the "
        "floor parameter gamma so that distant correspondences still "
        "contribute a stable homography in extrapolation regions.</desc>"
    )
    svg_start = svg.find("<svg ")
    if svg_start == -1:
        raise ValueError(f"No SVG root found in {output_path}")
    insert_at = svg.find(">", svg_start) + 1
    output_path.write_text(svg[:insert_at] + title_desc + svg[insert_at:], encoding="utf-8")


def generate_kernel_svg(
    output_path: str | Path = DEFAULT_OUTPUT,
    *,
    sigma: float = 10.0,
    gamma_values: tuple[float, ...] = (0.025, 0.0025),
    max_distance: float = 50.0,
    samples: int = 600,
) -> Path:
    """Generate the APAP Moving-DLT weight kernel SVG."""

    configure_plot_style()

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    distance = np.linspace(0.0, max_distance, samples)
    gauss = np.exp(-(distance ** 2) / (sigma * sigma))

    fig, ax = plt.subplots(figsize=(7.4, 4.6), dpi=160)
    fig.patch.set_facecolor("#f8fafc")
    ax.set_facecolor("#ffffff")

    text = "#111827"
    muted = "#475569"
    gauss_colour = "#94a3b8"
    floor_palette = ["#2563eb", "#047857"]

    ax.plot(
        distance,
        gauss,
        color=gauss_colour,
        linewidth=1.6,
        linestyle=(0, (4, 4)),
        label=r"$\exp(-d^2/\sigma^2)$",
        zorder=2,
    )

    for gamma, colour in zip(gamma_values, floor_palette):
        clipped = np.maximum(gauss, gamma)
        cross = sigma * sqrt(-log(gamma))
        ax.plot(
            distance,
            clipped,
            color=colour,
            linewidth=2.2,
            label=fr"$w(d) = \max(\exp(-d^2/\sigma^2),\, {gamma})$",
            zorder=4,
        )
        ax.axhline(
            gamma,
            color=colour,
            linewidth=0.9,
            linestyle=(0, (2, 3)),
            zorder=1,
        )
        ax.annotate(
            fr"$\gamma = {gamma}$",
            xy=(max_distance * 0.97, gamma),
            xytext=(max_distance * 0.97, gamma * 2.2),
            color=colour,
            fontsize=12,
            ha="right",
            va="bottom",
            zorder=6,
        )
        ax.scatter(
            [cross], [gamma],
            color=colour,
            s=28,
            zorder=7,
        )

    ax.axvline(
        sigma,
        color=muted,
        linewidth=0.9,
        linestyle=(0, (2, 3)),
        zorder=1,
    )
    ax.annotate(
        r"$d = \sigma$",
        xy=(sigma, np.exp(-1.0)),
        xytext=(sigma + 1.4, np.exp(-1.0) * 1.3),
        color=muted,
        fontsize=12,
        ha="left",
        va="bottom",
        zorder=6,
    )
    ax.scatter([sigma], [np.exp(-1.0)], color=muted, s=22, zorder=7)

    ax.set_xlim(0.0, max_distance)
    ax.set_ylim(8e-4, 1.15)
    ax.set_yscale("log")
    ax.set_xlabel(r"source-image distance $\|x_* - x_i\|$ (pixels)", fontsize=14)
    ax.set_ylabel(r"weight $w_*^i$", fontsize=14)

    ax.grid(True, which="both", linewidth=0.6)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(length=0)

    ax.set_title(
        fr"Moving-DLT weight kernel  ($\sigma = {sigma:g}$ px)",
        loc="left",
        fontsize=16,
        fontweight="bold",
        color=text,
        pad=14,
    )

    legend = ax.legend(
        loc="upper right",
        fontsize=12,
        frameon=True,
        framealpha=0.96,
        edgecolor="#cbd5e1",
    )
    legend.get_frame().set_linewidth(0.8)

    fig.subplots_adjust(left=0.12, right=0.97, bottom=0.16, top=0.88)
    fig.savefig(
        out,
        format="svg",
        facecolor=fig.get_facecolor(),
        metadata={
            "Creator": "py/generate_apap_weight_kernel.py",
            "Date": "2026-04-26",
        },
    )
    plt.close(fig)

    add_svg_accessibility(out)
    print(f"Wrote {out}")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate the APAP Moving-DLT weight kernel SVG."
    )
    parser.add_argument(
        "output_path",
        nargs="?",
        default=DEFAULT_OUTPUT,
        help="Output SVG path. Defaults to the APAP article image asset.",
    )
    parser.add_argument("--sigma", type=float, default=10.0)
    parser.add_argument(
        "--gamma",
        type=float,
        action="append",
        help="Floor value(s); pass multiple times to plot several γ regimes.",
    )
    parser.add_argument("--max-distance", type=float, default=50.0)
    parser.add_argument("--samples", type=int, default=600)
    args = parser.parse_args()

    gamma_values = tuple(args.gamma) if args.gamma else (0.025, 0.0025)

    generate_kernel_svg(
        args.output_path,
        sigma=args.sigma,
        gamma_values=gamma_values,
        max_distance=args.max_distance,
        samples=args.samples,
    )


if __name__ == "__main__":
    main()
