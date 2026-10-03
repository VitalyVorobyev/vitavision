// ⌘K node search overlay — extracted from GraphExplorer.tsx.
//
// Generic over the item shape: the caller supplies a `search(query)` function
// that returns already-filtered/ranked/capped results (icon, title, subtitle
// all pre-built by the caller), and an `onSelect(id)` callback. This keeps
// the component reusable outside the Atlas content graph (e.g. NarrativeCanvas).

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@vitavision/ui";

export interface NodeFinderItem {
    id:        string;
    title:     string;
    subtitle?: string;
    icon?:     ReactNode;
}

export interface NodeFinderProps {
    /** Given a non-empty query, return the (already filtered/capped) result list. */
    search:       (query: string) => NodeFinderItem[];
    onSelect:     (id: string) => void;
    placeholder?: string;
}

export function NodeFinder({ search, onSelect, placeholder = "Find a node…" }: NodeFinderProps) {
    const [query,          setQuery]          = useState("");
    const [open,           setOpen]           = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const results = useMemo<NodeFinderItem[]>(() => {
        if (!query.trim()) return [];
        return search(query);
    }, [query, search]);

    // ⌘K / Ctrl+K global shortcut — focuses the input
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const pick = (id: string) => {
        onSelect(id);
        setQuery("");
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            const item = results[highlightIndex] ?? results[0];
            if (item) pick(item.id);
        } else if (e.key === "Escape") {
            setQuery("");
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    const showDropdown = open && query.trim().length > 0 && results.length > 0;

    return (
        <div className="absolute top-3 left-3 z-20 w-64">
            {/* Input */}
            <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                <Input
                    ref={inputRef}
                    type="search"
                    aria-label={placeholder}
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlightIndex(0); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onKeyDown={handleKeyDown}
                    className="bg-surface/90 pl-8 text-xs shadow-sm backdrop-blur"
                />
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div className="mt-1 rounded-panel border border-line bg-surface/90 backdrop-blur shadow-sm overflow-y-auto max-h-[280px]">
                    {results.map((item, idx) => {
                        const isHighlighted = idx === highlightIndex;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); pick(item.id); }}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                                    isHighlighted ? "bg-line/60" : "hover:bg-line/60"
                                }`}
                            >
                                {item.icon}
                                <span className="flex-1 min-w-0 text-xs text-fg truncate">{item.title}</span>
                                {item.subtitle && (
                                    <span className="shrink-0 text-[10px] text-fg-muted">{item.subtitle}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
