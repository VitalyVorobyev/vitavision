import { useState } from 'react';
import { AlgorithmsViewToggle } from 'vitcv';

export const GridSelected = () => {
    const [view, setView] = useState("grid");
    return (
        <div className="flex flex-col items-start gap-2">
            <AlgorithmsViewToggle view={view} onChange={setView} />
            <span className="text-[11px] text-fg-muted font-mono">view: {view}</span>
        </div>
    );
};

export const ListSelected = () => {
    const [view, setView] = useState("list");
    return (
        <div className="flex flex-col items-start gap-2">
            <AlgorithmsViewToggle view={view} onChange={setView} />
            <span className="text-[11px] text-fg-muted font-mono">view: {view}</span>
        </div>
    );
};

export const GraphSelected = () => {
    const [view, setView] = useState("graph");
    return (
        <div className="flex flex-col items-start gap-2">
            <AlgorithmsViewToggle view={view} onChange={setView} />
            <span className="text-[11px] text-fg-muted font-mono">view: {view}</span>
        </div>
    );
};

export const InToolbar = () => {
    const [view, setView] = useState("grid");
    return (
        <div className="flex items-center justify-between w-80 px-3 py-2 border border-line rounded-panel bg-surface">
            <span className="text-sm font-semibold text-fg">Algorithms register</span>
            <AlgorithmsViewToggle view={view} onChange={setView} />
        </div>
    );
};
