import { TargetTypeSelector } from "vitcv";

// Real desktop usage (src/pages/TargetGenerator.tsx): a `w-40 lg:w-56`
// sidebar with `border-r border-border bg-muted/20`.
function Rail({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: 224 }} className="border-r border-border bg-muted/20">
            {children}
        </div>
    );
}

export const Chessboard = () => (
    <Rail>
        <TargetTypeSelector selected="chessboard" dispatch={() => {}} />
    </Rail>
);

export const CharucoGridLayout = () => (
    <Rail>
        <TargetTypeSelector selected="charuco" dispatch={() => {}} layout="grid" />
    </Rail>
);

export const MarkerBoardNoPresets = () => (
    <Rail>
        <TargetTypeSelector selected="markerboard" dispatch={() => {}} showPresets={false} />
    </Rail>
);

export const RingGrid = () => (
    <Rail>
        <TargetTypeSelector selected="ringgrid" dispatch={() => {}} />
    </Rail>
);

export const PuzzleBoardGridLayout = () => (
    <Rail>
        <TargetTypeSelector selected="puzzleboard" dispatch={() => {}} layout="grid" />
    </Rail>
);
