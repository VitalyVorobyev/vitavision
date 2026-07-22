import { DemoCover } from 'vitcv';

export const ChessResponseCover = () => (
    <div className="flex flex-col gap-1.5">
        <DemoCover slug="chess-response" className="w-80 aspect-video rounded-lg overflow-hidden border border-border" />
        <span className="text-[11px] text-muted-foreground font-mono">chess-response</span>
    </div>
);

export const DelaunayVoronoiCover = () => (
    <div className="flex flex-col gap-1.5">
        <DemoCover slug="delaunay-voronoi" className="w-80 aspect-video rounded-lg overflow-hidden border border-border" />
        <span className="text-[11px] text-muted-foreground font-mono">delaunay-voronoi</span>
    </div>
);

export const UnknownSlugFallback = () => (
    <div className="flex flex-col gap-1.5">
        <DemoCover slug="ransac-line-fit" className="w-80 aspect-video rounded-lg overflow-hidden border border-border" />
        <span className="text-[11px] text-muted-foreground font-mono">ransac-line-fit (falls back to DemoThumbnail)</span>
    </div>
);

export const CardRow = () => (
    <div className="flex gap-4">
        {["chess-response", "delaunay-voronoi"].map((slug) => (
            <div key={slug} className="w-40 rounded-lg border border-border overflow-hidden">
                <DemoCover slug={slug} className="w-full aspect-video" />
                <div className="p-2 border-t border-border">
                    <p className="text-xs font-semibold text-foreground">{slug}</p>
                </div>
            </div>
        ))}
    </div>
);
