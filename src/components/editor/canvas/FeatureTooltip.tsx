import type { DirectedPointFeature } from "../../../store/editor/useEditorStore";

export interface DirectedPointTooltipState {
    feature: DirectedPointFeature;
    left: number;
    top: number;
}

interface FeatureTooltipProps {
    tooltip: DirectedPointTooltipState | null;
}

export default function FeatureTooltip(props: FeatureTooltipProps) {
    const { tooltip } = props;
    if (!tooltip) {
        return null;
    }

    const directionDegRaw = tooltip.feature.orientationRad !== undefined
        ? (tooltip.feature.orientationRad * 180) / Math.PI
        : (Math.atan2(tooltip.feature.direction.dy, tooltip.feature.direction.dx) * 180) / Math.PI;
    const directionDeg = ((directionDegRaw % 360) + 360) % 360;

    return (
        <div
            className="absolute z-30 pointer-events-none rounded-md border border-border bg-background/95 backdrop-blur px-1.5 py-1 text-[10px] font-mono leading-none shadow-sm whitespace-nowrap"
            style={{ left: tooltip.left, top: tooltip.top }}
        >
            x {tooltip.feature.x.toFixed(2)} y {tooltip.feature.y.toFixed(2)} θ {directionDeg.toFixed(1)}° s {tooltip.feature.score.toFixed(3)}
        </div>
    );
}
