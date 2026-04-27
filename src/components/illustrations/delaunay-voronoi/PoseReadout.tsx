import { PanelFlat, TinyBrow } from "../_shared/primitives";
import type { Pose } from "./cameraPose";

interface Props {
    pose: Pose;
}

function reprojTone(px: number, valid: boolean): string {
    if (!valid) return "text-rose-400";
    if (px <= 1) return "text-emerald-400";
    if (px <= 3) return "text-amber-400";
    return "text-rose-400";
}

function fmt(v: number, decimals: number, unit = ""): string {
    return `${v.toFixed(decimals)}${unit}`;
}

export default function PoseReadout({ pose }: Props) {
    const { yaw, pitch, roll, focalPx, reprojErrPx, valid } = pose;
    const dash = "—";

    return (
        <PanelFlat className={`p-2 text-[11px] font-mono${valid ? "" : " opacity-50"}`}>
            <div className="flex justify-between items-center">
                <TinyBrow>yaw</TinyBrow>
                <span>{valid ? fmt(yaw, 1, "°") : dash}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
                <TinyBrow>pitch</TinyBrow>
                <span>{valid ? fmt(pitch, 1, "°") : dash}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
                <TinyBrow>roll</TinyBrow>
                <span>{valid ? fmt(roll, 1, "°") : dash}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                <TinyBrow>f / focal</TinyBrow>
                <span>{valid ? `${Math.round(focalPx)} px` : dash}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
                <TinyBrow>reproj. err</TinyBrow>
                <span className={reprojTone(reprojErrPx, valid)}>
                    {valid ? fmt(reprojErrPx, 2, " px") : dash}
                </span>
            </div>
        </PanelFlat>
    );
}
