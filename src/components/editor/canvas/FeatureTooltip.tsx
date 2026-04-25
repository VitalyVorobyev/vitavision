import type { DirectedPointFeature } from "../../../store/editor/useEditorStore";

export interface DirectedPointTooltipState {
    feature: DirectedPointFeature;
    left: number;
    top: number;
}

interface FeatureTooltipProps {
    tooltip: DirectedPointTooltipState | null;
}

function axisAngleDeg(axis: { dx: number; dy: number; angleRad?: number }): number {
    const rad = axis.angleRad !== undefined
        ? axis.angleRad
        : Math.atan2(axis.dy, axis.dx);
    return (((rad * 180) / Math.PI) % 360 + 360) % 360;
}

export default function FeatureTooltip(props: FeatureTooltipProps) {
    const { tooltip } = props;
    if (!tooltip) {
        return null;
    }

    const { feature } = tooltip;
    const a0 = axisAngleDeg(feature.axes[0]);
    const a1 = axisAngleDeg(feature.axes[1]);

    return (
        <div
            className="absolute z-30 pointer-events-none rounded-md border border-border bg-background/95 backdrop-blur-sm px-1.5 py-1 text-[10px] font-mono leading-none shadow-xs whitespace-nowrap"
            style={{ left: tooltip.left, top: tooltip.top }}
        >
            x {feature.x.toFixed(2)} y {feature.y.toFixed(2)} s {feature.score.toFixed(3)}
            {" "}θ₀ {a0.toFixed(1)}° θ₁ {a1.toFixed(1)}°
            {feature.contrast !== undefined && <> c {feature.contrast.toFixed(3)}</>}
            {feature.fitRms !== undefined && <> rms {feature.fitRms.toFixed(3)}</>}
        </div>
    );
}
