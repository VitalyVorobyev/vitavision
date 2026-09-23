// PersonCombobox — "Find a person" combobox for the network toolbar.
//
// A local sibling of `src/components/atlas/graph/NodeFinder.tsx` rather than
// a reuse of it: NodeFinder renders itself absolutely positioned
// (`absolute top-3 left-3`) as a canvas overlay, but this combobox sits
// inline in the toolbar row alongside the Era/Labels selects. Interaction
// (arrow keys, Enter, Escape, blur-to-close) mirrors NodeFinder's pattern.

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchPeople } from "../../../lib/atlas/peopleNetwork.ts";
import type { ScholarlyIndex } from "../../../lib/atlas/scholarlyTypes.ts";
import type { AuthorsIndex } from "../../../generated/authors-index.ts";

export interface PersonComboboxProps {
    scholarly: Pick<ScholarlyIndex, "authors">;
    authorsIdx: Pick<AuthorsIndex, "authors">;
    onSelect: (id: string) => void;
}

export function PersonCombobox({ scholarly, authorsIdx, onSelect }: PersonComboboxProps) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const results = useMemo(() => searchPeople(query, authorsIdx, scholarly, 8), [query, authorsIdx, scholarly]);
    const showList = open && query.trim().length > 0 && results.length > 0;

    const pick = (id: string) => {
        onSelect(id);
        setQuery("");
        setOpen(false);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const pickResult = results[highlightIndex] ?? results[0];
            if (pickResult) pick(pickResult.id);
        } else if (e.key === "Escape") {
            setQuery("");
            setOpen(false);
        }
    };

    const listboxId = "people-network-combobox-listbox";

    return (
        <div className="relative w-full sm:w-64">
            <label className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-surface text-muted-foreground">
                <Search size={14} className="shrink-0" />
                <span className="sr-only">Find a person</span>
                <input
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    placeholder="Find a person"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        setHighlightIndex(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
            </label>

            {showList && (
                <ul
                    id={listboxId}
                    role="listbox"
                    aria-label="Matching people"
                    className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-surface shadow-lg"
                >
                    {results.map((r, idx) => (
                        <li key={r.id} role="presentation">
                            <button
                                type="button"
                                role="option"
                                aria-selected={idx === highlightIndex}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pick(r.id);
                                }}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                                    idx === highlightIndex ? "bg-muted" : "hover:bg-muted/60"
                                }`}
                            >
                                <span className="truncate text-foreground">{r.name}</span>
                                <span className="shrink-0 text-[11px] text-muted-foreground">{r.pageCount} pages</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
