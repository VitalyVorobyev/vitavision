import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { imageViewBox, useShapeDrag, useStage, type StagePointerEvent } from "@vitavision/stage2d";

import type { Point2 } from "./drawing";

/**
 * What a press means, as the active tool decides it. Displacements are from the press, in image
 * pixels, as `useShapeDrag` reports them.
 */
export interface Gesture {
    /** Runs at the press for a mouse; for a touch, at the release of a tap (a finger that moved is a pan or a pinch). */
    immediate?: (() => void) | undefined;
    /** The pointer has left the click slop. */
    onMove?: ((delta: Point2) => void) | undefined;
    /** The release. `moved` is false for a click or a tap, and `delta` is then zero. */
    onEnd?: ((delta: Point2, moved: boolean) => void) | undefined;
    /** The gesture was interrupted: a second finger, a lost pointer, an unmount. */
    onCancel?: (() => void) | undefined;
    /** The gesture owns a touch that starts on it (a shape move), so the stage neither pans nor pinches from it. */
    claimsTouch?: boolean | undefined;
}

/** The press a gesture is chosen for. */
export interface Press {
    /** Where, in image coordinates. */
    point: Point2;
    /** Where, in client coordinates (for anchoring a tooltip). */
    client: Point2;
    /** A touch press: the hit-test tolerance is a fingertip's, and selection waits for the tap. */
    touch: boolean;
    /** The hit-test tolerance, in screen pixels. */
    radius: number;
}

interface ToolSurfaceProps {
    /** Chooses the gesture for a press; `null` declines it (the stage then pans, with the buttons it was told to pan with). */
    begin: (press: Press) => Gesture | null;
    cursor?: string | undefined;
    /** The mouse moved over the image with no gesture in flight. */
    onHover?: ((point: Point2) => void) | undefined;
    onDoubleClick?: (() => void) | undefined;
}

const MOUSE_RADIUS_PX = 6;
const TOUCH_RADIUS_PX = 12;
/** How far a finger may travel, and how long it may stay, and still be a tap (the stage's own tap rule). */
const TAP_SLOP_PX = 3;
const TAP_MS = 500;

/**
 * The editor's one full-frame press target, in the place of `StageSurface`: the same job (one
 * surface per stage, under the layers' own handles, offering each press to the tool), but it
 * tells a touch from a mouse.
 *
 * - **Mouse and pen**: the press is claimed and followed as a drag (`useShapeDrag`), so the stage
 *   does not pan from it; only the left button comes here, the right one is left to the stage.
 * - **Touch**: the press is left to the stage as well (no `stopPropagation`), so a second finger
 *   still pinches and, in the tools where one finger pans, a drag still pans. The surface only watches
 *   the finger for a tap, or for a drag when the tool draws with one. A gesture that `claimsTouch`
 *   (moving a selected shape) takes the touch over instead.
 */
export default function ToolSurface({ begin, cursor, onHover, onDoubleClick }: ToolSurfaceProps) {
    const stage = useStage();
    const startShapeDrag = useShapeDrag();
    const cancelTouchRef = useRef<(() => void) | null>(null);

    // A gesture still being watched when the layer goes away is cancelled, not left listening.
    useEffect(() => () => cancelTouchRef.current?.(), []);

    const follow = useCallback(
        (event: StagePointerEvent, gesture: Gesture) => {
            startShapeDrag(event, {
                onMove: gesture.onMove,
                onEnd: (delta, moved) => gesture.onEnd?.(delta, moved),
                onCancel: gesture.onCancel,
            });
        },
        [startShapeDrag],
    );

    /** Watch a finger without claiming it: its moves and release are read from `window`. */
    const watchTouch = useCallback(
        (event: StagePointerEvent, press: Press, gesture: Gesture) => {
            const id = event.pointerId;
            const from = { x: event.clientX, y: event.clientY };
            const startedAt = event.timeStamp;
            let moved = false;
            const delta = (e: PointerEvent): Point2 => {
                const at = stage.toImage({ x: e.clientX, y: e.clientY });
                return { x: at.x - press.point.x, y: at.y - press.point.y };
            };
            const stop = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                window.removeEventListener("pointercancel", cancel);
                cancelTouchRef.current = null;
            };
            function move(e: PointerEvent) {
                if (e.pointerId !== id) return;
                if (!moved && Math.hypot(e.clientX - from.x, e.clientY - from.y) > TAP_SLOP_PX) moved = true;
                if (moved) gesture.onMove?.(delta(e));
            }
            function up(e: PointerEvent) {
                if (e.pointerId !== id) return;
                stop();
                const tap = !moved && e.timeStamp - startedAt <= TAP_MS;
                if (tap) gesture.immediate?.();
                gesture.onEnd?.(moved ? delta(e) : { x: 0, y: 0 }, moved);
            }
            function cancel(e: PointerEvent) {
                if (e.pointerId !== id) return;
                stop();
                gesture.onCancel?.();
            }
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
            window.addEventListener("pointercancel", cancel);
            cancelTouchRef.current = () => {
                stop();
                gesture.onCancel?.();
            };
        },
        [stage],
    );

    const onPointerDown = (event: ReactPointerEvent<SVGRectElement>) => {
        if (stage.panMode) return;
        const touch = event.pointerType === "touch";
        if (!touch && event.button !== 0) return;

        // A second finger turns the first one's gesture into a pinch: drop the draft and leave it to the stage.
        if (touch && cancelTouchRef.current) {
            cancelTouchRef.current();
            return;
        }

        const client = { x: event.clientX, y: event.clientY };
        const press: Press = {
            point: stage.toImage(client),
            client,
            touch,
            radius: touch ? TOUCH_RADIUS_PX : MOUSE_RADIUS_PX,
        };
        const gesture = begin(press);
        if (!gesture) return;

        if (touch && !gesture.claimsTouch) {
            watchTouch(event, press, gesture);
            return;
        }
        gesture.immediate?.();
        follow(event, gesture);
    };

    return (
        <svg
            viewBox={imageViewBox(stage.image)}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
        >
            <rect
                data-stage-surface=""
                x={-0.5}
                y={-0.5}
                width={stage.image.width}
                height={stage.image.height}
                fill="transparent"
                className="pointer-events-auto"
                style={{ cursor: stage.panMode ? undefined : cursor }}
                onPointerDown={onPointerDown}
                onPointerMove={(event) => {
                    if (event.pointerType !== "touch") onHover?.(stage.toImage({ x: event.clientX, y: event.clientY }));
                }}
                onDoubleClick={() => onDoubleClick?.()}
            />
        </svg>
    );
}
