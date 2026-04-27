import { useState } from "react";
import { useChessResponse } from "./chess-response/useChessResponse";
import useChessResponseAnimation from "./chess-response/useChessResponseAnimation";
import ChessResponseDesktopA from "./chess-response/ChessResponseDesktopA";
import ChessResponseMobile from "./chess-response/ChessResponseMobile";
import type { ChessResponsePattern } from "./chess-response/types";

export default function ChessResponseDemo() {
    const [pattern, setPattern] = useState<ChessResponsePattern>("corner");
    const [rotationDeg, setRotationDeg] = useState(22.5);
    const [blur, setBlur] = useState(0.18);
    const [contrast, setContrast] = useState(1.08);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [showSampleLabels, setShowSampleLabels] = useState(true);
    const [showSrPairs, setShowSrPairs] = useState(true);
    const [showDrPairs, setShowDrPairs] = useState(true);
    const [showMrRegions, setShowMrRegions] = useState(true);

    useChessResponseAnimation({ playing, speed, onTick: setRotationDeg });

    const response = useChessResponse({ pattern, rotationDeg, blur, contrast });

    const props = {
        pattern,
        onPatternChange: setPattern,
        rotationDeg,
        onRotationChange: setRotationDeg,
        blur,
        onBlurChange: setBlur,
        contrast,
        onContrastChange: setContrast,
        playing,
        onPlayingChange: setPlaying,
        speed,
        onSpeedChange: setSpeed,
        showSampleLabels,
        onShowSampleLabelsChange: setShowSampleLabels,
        showSrPairs,
        onShowSrPairsChange: setShowSrPairs,
        showDrPairs,
        onShowDrPairsChange: setShowDrPairs,
        showMrRegions,
        onShowMrRegionsChange: setShowMrRegions,
        response,
    };

    return (
        <>
            <div className="hidden lg:block">
                <ChessResponseDesktopA {...props} />
            </div>
            <div className="lg:hidden">
                <ChessResponseMobile {...props} />
            </div>
        </>
    );
}
