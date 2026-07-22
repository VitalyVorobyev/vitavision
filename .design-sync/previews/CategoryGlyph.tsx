import { CategoryGlyph } from 'vitcv';

const TILE = "w-16 h-16 rounded-lg border border-border overflow-hidden";

export const CoreDomains = () => (
    <div className="flex gap-4">
        {[
            { domain: "features", label: "Features" },
            { domain: "geometry", label: "Geometry" },
            { domain: "targets", label: "Targets" },
            { domain: "calibration", label: "Calibration" },
        ].map(({ domain, label }) => (
            <div key={domain} className="flex flex-col items-center gap-1.5">
                <div className={TILE}>
                    <CategoryGlyph domain={domain} />
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">{label}</span>
            </div>
        ))}
    </div>
);

export const RemainingDomains = () => (
    <div className="flex gap-4">
        {[
            { domain: "stitching", label: "Stitching" },
            { domain: "depth", label: "Depth" },
            { domain: "detection", label: "Detection" },
            { domain: "segmentation", label: "Segmentation" },
        ].map(({ domain, label }) => (
            <div key={domain} className="flex flex-col items-center gap-1.5">
                <div className={TILE}>
                    <CategoryGlyph domain={domain} />
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">{label}</span>
            </div>
        ))}
    </div>
);

export const UndefinedDomain = () => (
    <div className="flex flex-col items-center gap-1.5">
        <div className={TILE}>
            <CategoryGlyph domain={undefined} />
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">No domain (ƒ fallback)</span>
    </div>
);
