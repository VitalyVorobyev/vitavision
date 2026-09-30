import type { ChangeEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { choiceProps, fieldGridClass, numberInputProps, parseNumberText } from "./fieldBindings";

const change = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;

describe("parseNumberText", () => {
    it("reads an empty or blank field as unset", () => {
        expect(parseNumberText("")).toBeUndefined();
        expect(parseNumberText("   ")).toBeUndefined();
    });

    it("reads finite numbers, trimmed", () => {
        expect(parseNumberText("30")).toBe(30);
        expect(parseNumberText(" 0.25 ")).toBe(0.25);
        expect(parseNumberText("-4")).toBe(-4);
        expect(parseNumberText("1e3")).toBe(1000);
    });

    it("rejects text that is not a finite number", () => {
        expect(parseNumberText("-")).toBeNull();
        expect(parseNumberText("abc")).toBeNull();
        expect(parseNumberText("Infinity")).toBeNull();
    });
});

describe("numberInputProps", () => {
    it("shows an unset value as an empty field", () => {
        expect(numberInputProps(undefined, () => {}).value).toBe("");
        expect(numberInputProps(0, () => {}).value).toBe(0);
    });

    it("reports numbers, and an emptied field as undefined", () => {
        const onValueChange = vi.fn();
        const { onChange } = numberInputProps(3, onValueChange);
        onChange(change("12.5"));
        onChange(change(""));
        expect(onValueChange.mock.calls).toEqual([[12.5], [undefined]]);
    });

    it("ignores text that is not a number yet", () => {
        const onValueChange = vi.fn();
        numberInputProps(3, onValueChange).onChange(change("-"));
        expect(onValueChange).not.toHaveBeenCalled();
    });
});

describe("choiceProps", () => {
    const options = [
        { value: "sobel", label: "Sobel" },
        { value: "scharr", label: "Scharr" },
    ] as const;

    it("passes the value and plain options through", () => {
        const props = choiceProps<"sobel" | "scharr">("scharr", options, () => {});
        expect(props.value).toBe("scharr");
        expect(props.options).toEqual([
            { value: "sobel", label: "Sobel" },
            { value: "scharr", label: "Scharr" },
        ]);
    });

    it("shows the first option while the value is unset", () => {
        expect(choiceProps<"sobel" | "scharr">(undefined, options, () => {}).value).toBe("sobel");
        expect(choiceProps<string>(undefined, [], () => {}).value).toBe("");
    });

    it("passes on only strings that are one of the options", () => {
        const onValueChange = vi.fn();
        const { onValueChange: report } = choiceProps<"sobel" | "scharr">("sobel", options, onValueChange);
        report("scharr");
        report("roberts");
        report("");
        expect(onValueChange.mock.calls).toEqual([["scharr"]]);
    });
});

describe("fieldGridClass", () => {
    it("lays fields out in one column unless asked for two", () => {
        expect(fieldGridClass()).not.toContain("grid-cols-2");
        expect(fieldGridClass(1)).not.toContain("grid-cols-2");
        expect(fieldGridClass(2)).toContain("grid-cols-2");
    });
});
