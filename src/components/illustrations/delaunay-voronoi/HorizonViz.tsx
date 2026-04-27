import type { Pose } from "./cameraPose";

interface Props {
    pose: Pose;
}

export default function HorizonViz({ pose }: Props) {
    const { roll, pitch, valid } = pose;
    // pitch tilts horizon up/down: positive pitch → horizon moves up (lower top% value)
    const pitchOffset = valid ? pitch * 4 : 0;
    const rollDeg = valid ? roll : 0;

    return (
        <div className="relative h-9 rounded-md overflow-hidden bg-[hsl(var(--surface-2))]">
            {/* Vertical centreline */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/30" />
            {/* Horizontal centreline */}
            <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/30" />
            {/* Horizon line — full-width, rotated by roll, shifted by pitch */}
            <div
                className="absolute left-0 right-0 h-px bg-primary"
                style={{
                    top: `calc(50% + ${pitchOffset}px)`,
                    transform: `rotate(${rollDeg}deg)`,
                    transformOrigin: "center",
                }}
            />
            {/* Label */}
            <span
                className="absolute left-1.5 bottom-1 font-mono text-muted-foreground"
                style={{ fontSize: 9 }}
            >
                horizon
            </span>
        </div>
    );
}
