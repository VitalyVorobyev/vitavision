import { describe, it, expect } from "vitest";
import { getStepPrecision, clampNumber, stepNumber, shouldUseSegmentedControl } from "../numberUtils";

describe("getStepPrecision", () => {
    it("returns 0 for non-finite or non-positive steps", () => {
        expect(getStepPrecision(Number.NaN)).toBe(0);
        expect(getStepPrecision(0)).toBe(0);
        expect(getStepPrecision(-1)).toBe(0);
    });

    it("returns 0 for integer steps", () => {
        expect(getStepPrecision(1)).toBe(0);
        expect(getStepPrecision(10)).toBe(0);
    });

    it("returns the number of decimal digits for fractional steps", () => {
        expect(getStepPrecision(0.1)).toBe(1);
        expect(getStepPrecision(0.01)).toBe(2);
        expect(getStepPrecision(0.125)).toBe(3);
    });
});

describe("clampNumber", () => {
    it("returns the value unchanged when no bounds are given", () => {
        expect(clampNumber(5)).toBe(5);
    });

    it("clamps to the minimum", () => {
        expect(clampNumber(-5, 0)).toBe(0);
    });

    it("clamps to the maximum", () => {
        expect(clampNumber(15, undefined, 10)).toBe(10);
    });

    it("clamps within both bounds", () => {
        expect(clampNumber(5, 0, 10)).toBe(5);
        expect(clampNumber(-5, 0, 10)).toBe(0);
        expect(clampNumber(15, 0, 10)).toBe(10);
    });
});

describe("stepNumber", () => {
    it("steps by whole increments for integer steps", () => {
        expect(stepNumber(5, 1, 1)).toBe(6);
        expect(stepNumber(5, -2, 1)).toBe(3);
    });

    it("respects decimal precision derived from the step", () => {
        expect(stepNumber(0.1, 1, 0.1)).toBeCloseTo(0.2, 10);
        expect(stepNumber(0.2, 1, 0.1)).toBe(0.3);
    });

    it("clamps the result to min/max", () => {
        expect(stepNumber(9, 5, 1, 0, 10)).toBe(10);
        expect(stepNumber(1, -5, 1, 0, 10)).toBe(0);
    });
});

describe("shouldUseSegmentedControl", () => {
    const shortOptions = [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
    ];
    const manyOptions = [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
        { value: "c", label: "C" },
        { value: "d", label: "D" },
        { value: "e", label: "E" },
    ];
    const longLabelOptions = [
        { value: "a", label: "A very long label indeed" },
        { value: "b", label: "B" },
    ];

    it("forces segmented when presentation is 'segmented'", () => {
        expect(shouldUseSegmentedControl(manyOptions, "segmented")).toBe(true);
    });

    it("forces select when presentation is 'select'", () => {
        expect(shouldUseSegmentedControl(shortOptions, "select")).toBe(false);
    });

    it("auto-selects segmented for few, short options", () => {
        expect(shouldUseSegmentedControl(shortOptions, "auto")).toBe(true);
        expect(shouldUseSegmentedControl(shortOptions, undefined)).toBe(true);
    });

    it("auto-selects select when there are too many options", () => {
        expect(shouldUseSegmentedControl(manyOptions, "auto")).toBe(false);
    });

    it("auto-selects select when a label is too long", () => {
        expect(shouldUseSegmentedControl(longLabelOptions, "auto")).toBe(false);
    });

    it("uses shortLabel length when present", () => {
        const options = [
            { value: "a", label: "A very long label indeed", shortLabel: "A" },
            { value: "b", label: "B" },
        ];
        expect(shouldUseSegmentedControl(options, "auto")).toBe(true);
    });
});
