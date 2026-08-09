import { AlgorithmGlyph } from 'vitcv';

const TILE = "w-16 h-16 rounded-lg border border-border overflow-hidden";

export const CornerDetectors = () => (
    <div className="flex gap-4">
        {[
            { slug: "harris-corner-detector", label: "Harris" },
            { slug: "shi-tomasi-corner-detector", label: "Shi-Tomasi" },
            { slug: "fast-corner-detector", label: "FAST" },
            { slug: "chess-corners", label: "Chess corners" },
        ].map(({ slug, label }) => (
            <div key={slug} className="flex flex-col items-center gap-1.5">
                <div className={TILE}>
                    <AlgorithmGlyph slug={slug} />
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">{label}</span>
            </div>
        ))}
    </div>
);

export const DomainFallback = () => (
    <div className="flex gap-4">
        {[
            { slug: "zhang-planar-calibration", domain: "calibration", label: "Zhang calibration" },
            { slug: "fundamental-matrix-eight-point", domain: "geometry", label: "Eight-point" },
            { slug: "brief", domain: "features", label: "BRIEF" },
            { slug: "ocpad", domain: "targets", label: "OCPAD" },
        ].map(({ slug, domain, label }) => (
            <div key={slug} className="flex flex-col items-center gap-1.5">
                <div className={TILE}>
                    <AlgorithmGlyph slug={slug} domain={domain} />
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">{label}</span>
            </div>
        ))}
    </div>
);

export const RegisterRow = () => (
    <div className="flex gap-3 p-3 bg-background rounded-lg border border-border">
        {[
            { slug: "chess-corners", domain: "detection", label: "Chess corners" },
            { slug: "harris-corner-detector", domain: "features", label: "Harris" },
            { slug: "shi-tomasi-corner-detector", domain: "features", label: "Shi-Tomasi" },
            { slug: "fast-corner-detector", domain: "features", label: "FAST" },
            { slug: "zhang-planar-calibration", domain: "calibration", label: "Zhang" },
        ].map(({ slug, domain, label }) => (
            <div key={slug} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-md border border-border overflow-hidden">
                    <AlgorithmGlyph slug={slug} domain={domain} />
                </div>
                <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
        ))}
    </div>
);
