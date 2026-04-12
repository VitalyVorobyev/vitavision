import { useEffect, useRef } from "react";

interface UseChessResponseAnimationOptions {
    playing: boolean;
    speed: number;
    onTick: (updater: (current: number) => number) => void;
}

export default function useChessResponseAnimation({
    playing,
    speed,
    onTick,
}: UseChessResponseAnimationOptions): void {
    const speedRef = useRef(speed);
    const onTickRef = useRef(onTick);

    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    useEffect(() => {
        onTickRef.current = onTick;
    }, [onTick]);

    useEffect(() => {
        if (!playing) return;

        let frameId = 0;
        let previous = performance.now();

        const step = (timestamp: number) => {
            const deltaSeconds = (timestamp - previous) / 1000;
            previous = timestamp;
            onTickRef.current(
                (current) => (current + deltaSeconds * 18 * speedRef.current) % 360,
            );
            frameId = window.requestAnimationFrame(step);
        };

        frameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(frameId);
    }, [playing]);
}
