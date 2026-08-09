import { useState } from 'react';
import { TagFilter } from 'vitcv';

const CORE_TAGS = ["calibration", "corner-detection", "distortion-models", "wasm", "hand-eye"];

export const NoneSelected = () => {
    const [selected, setSelected] = useState<string | null>(null);
    return <TagFilter tags={CORE_TAGS} selected={selected} onSelect={setSelected} />;
};

export const TagActive = () => {
    const [selected, setSelected] = useState<string | null>("corner-detection");
    return <TagFilter tags={CORE_TAGS} selected={selected} onSelect={setSelected} />;
};

export const ManyTagsWrapping = () => {
    const [selected, setSelected] = useState<string | null>("wasm");
    const tags = [
        "calibration",
        "corner-detection",
        "distortion-models",
        "wasm",
        "hand-eye",
        "epipolar-geometry",
        "optical-flow",
        "segmentation",
    ];
    return <TagFilter tags={tags} selected={selected} onSelect={setSelected} />;
};
