import { useState } from 'react';
import { AtlasViewTabs } from 'vitcv';

// `view` is the Atlas view key: "grid" and "list" both light the Catalog tab; the other
// four keys are "graph", "narratives", "people" and "papers". The real type is
// `AlgorithmsView` in src/hooks/useAlgorithmsFilters.ts (prop types are not exported
// through the bundle), so the union below is kept honest by hand.
type View = "grid" | "list" | "graph" | "narratives" | "people" | "papers";

function Stateful({ initial, compact = false }: { initial: View; compact?: boolean }) {
    const [view, setView] = useState<View>(initial);
    return (
        <div className="flex flex-col items-start gap-2" style={compact ? { width: 360 } : undefined}>
            <AtlasViewTabs view={view} onChange={setView} compact={compact} />
            <span className="font-mono text-[11px] text-fg-muted">view: {view}</span>
        </div>
    );
}

export const CatalogSelected = () => <Stateful initial="grid" />;

export const GraphSelected = () => <Stateful initial="graph" />;

export const PapersSelected = () => <Stateful initial="papers" />;

// Below the desktop breakpoint: equal-width columns, icon over a small label.
export const Compact = () => <Stateful initial="narratives" compact />;
