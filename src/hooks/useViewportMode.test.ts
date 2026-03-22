import { describe, expect, it } from "vitest";

import { resolveViewportMode } from "./useViewportMode";

describe("resolveViewportMode", () => {
    it("classifies narrow screens as phone", () => {
        expect(resolveViewportMode({
            width: 390,
            hasTouch: true,
            hasFinePointer: false,
            canHover: false,
        })).toBe("phone");
    });

    it("keeps narrow mouse-first windows in desktop mode", () => {
        expect(resolveViewportMode({
            width: 612,
            hasTouch: false,
            hasFinePointer: true,
            canHover: true,
        })).toBe("desktop");
    });

    it("classifies touch-primary wide screens as touch tablets", () => {
        expect(resolveViewportMode({
            width: 1024,
            hasTouch: true,
            hasFinePointer: false,
            canHover: false,
        })).toBe("touch-tablet");
    });

    it("keeps mixed input desktop-class screens in desktop mode", () => {
        expect(resolveViewportMode({
            width: 1024,
            hasTouch: true,
            hasFinePointer: true,
            canHover: true,
        })).toBe("desktop");
    });

    it("keeps narrow mixed-input desktop-class screens in desktop mode", () => {
        expect(resolveViewportMode({
            width: 612,
            hasTouch: true,
            hasFinePointer: true,
            canHover: true,
        })).toBe("desktop");
    });
});
