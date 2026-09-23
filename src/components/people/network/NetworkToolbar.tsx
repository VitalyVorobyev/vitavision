// NetworkToolbar — the card's own small toolbar row: person search + Era /
// Labels selects. The Atlas title / tabs / Directory|Network switch above
// this card belongs to a sibling agent's component, not this file.

import { PersonCombobox } from "./PersonCombobox.tsx";
import { ERA_OPTIONS, LABEL_MODE_OPTIONS, type Era, type LabelMode } from "../../../lib/atlas/peopleNetwork.ts";
import type { ScholarlyIndex } from "../../../lib/atlas/scholarlyTypes.ts";
import type { AuthorsIndex } from "../../../generated/authors-index.ts";

export interface NetworkToolbarProps {
    scholarly: Pick<ScholarlyIndex, "authors">;
    authorsIdx: Pick<AuthorsIndex, "authors">;
    onSelectPerson: (id: string) => void;
    era: Era;
    onEraChange: (era: Era) => void;
    labelMode: LabelMode;
    onLabelModeChange: (mode: LabelMode) => void;
}

const selectCls =
    "h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground";

export function NetworkToolbar({
    scholarly,
    authorsIdx,
    onSelectPerson,
    era,
    onEraChange,
    labelMode,
    onLabelModeChange,
}: NetworkToolbarProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-b border-border">
            <PersonCombobox scholarly={scholarly} authorsIdx={authorsIdx} onSelect={onSelectPerson} />
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    Era
                    <select
                        value={era}
                        onChange={(e) => onEraChange(e.target.value as Era)}
                        className={selectCls}
                    >
                        {ERA_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    Labels
                    <select
                        value={labelMode}
                        onChange={(e) => onLabelModeChange(e.target.value as LabelMode)}
                        className={selectCls}
                    >
                        {LABEL_MODE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    );
}
