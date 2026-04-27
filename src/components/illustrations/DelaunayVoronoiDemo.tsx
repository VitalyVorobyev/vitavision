import { useDelaunayVoronoi } from "./delaunay-voronoi/useDelaunayVoronoi";
import DelaunayVoronoiDesktopD from "./delaunay-voronoi/DelaunayVoronoiDesktopD";
import DelaunayVoronoiMobile from "./delaunay-voronoi/DelaunayVoronoiMobile";

export default function DelaunayVoronoiDemo() {
    const demo = useDelaunayVoronoi();

    return (
        <>
            <div className="hidden lg:block">
                <DelaunayVoronoiDesktopD demo={demo} />
            </div>
            <div className="lg:hidden">
                <DelaunayVoronoiMobile demo={demo} />
            </div>
        </>
    );
}
