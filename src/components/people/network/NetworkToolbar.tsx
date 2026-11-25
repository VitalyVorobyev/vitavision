// NetworkToolbar — the card's own small toolbar row: person search + Era /
// Labels selects. The Atlas title / tabs / Directory|Network switch above
// this card belongs to a sibling agent's component, not this file.

import { Select } from "@vitavision/ui";
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-b border-line">
            <PersonCombobox scholarly={scholarly} authorsIdx={authorsIdx} onSelect={onSelectPerson} />
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                    <span aria-hidden="true">Era</span>
                    <Select
                        aria-label="Era"
                        className="w-40"
                        value={era}
                        options={ERA_OPTIONS}
                        onValueChange={(v) => onEraChange(v as Era)}
                    />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                    <span aria-hidden="true">Labels</span>
                    <Select
                        aria-label="Labels"
                        className="w-40"
                        value={labelMode}
                        options={LABEL_MODE_OPTIONS}
                        onValueChange={(v) => onLabelModeChange(v as LabelMode)}
                    />
                </div>
            </div>
        </div>
    );
}
