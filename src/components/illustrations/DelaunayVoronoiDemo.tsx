import { useDelaunayVoronoi } from "./delaunay-voronoi/useDelaunayVoronoi";
import DelaunayVoronoiCanvas from "./delaunay-voronoi/DelaunayVoronoiCanvas";
import DelaunayVoronoiControls from "./delaunay-voronoi/DelaunayVoronoiControls";
import DelaunayVoronoiReadouts from "./delaunay-voronoi/DelaunayVoronoiReadouts";

export default function DelaunayVoronoiDemo() {
    const demo = useDelaunayVoronoi();

    return (
        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-8 py-2">
            <div className="grid grid-cols-1 lg:grid-cols-[clamp(18rem,22vw,24rem)_minmax(0,1fr)_clamp(20rem,24vw,28rem)] gap-6">
                {/* Controls column */}
                <div className="order-2 lg:order-1 rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] px-4 py-4 sm:px-5 sm:py-5">
                    <DelaunayVoronoiControls demo={demo} />
                </div>

                {/* Canvas column */}
                <div className="order-1 lg:order-2 flex rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] px-4 py-4 sm:px-5 sm:py-5">
                    <DelaunayVoronoiCanvas demo={demo} />
                </div>

                {/* Readouts column */}
                <div className="order-3 rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] px-4 py-4 sm:px-5 sm:py-5 overflow-y-auto">
                    <DelaunayVoronoiReadouts demo={demo} />
                </div>
            </div>
        </div>
    );
}
