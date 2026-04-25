import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import AlgorithmTagChip from "./AlgorithmTagChip.tsx";
import AlgorithmsTagPicker from "./AlgorithmsTagPicker.tsx";
import type {
    AlgorithmsFilters,
    AlgorithmsKind,
    FacetCounts,
} from "../../hooks/useAlgorithmsFilters.ts";

interface Props {
    open: boolean;
    onClose: () => void;
    filters: AlgorithmsFilters;
    facets: FacetCounts;
    categoryValues: readonly string[];
    categoryLabel: (id: string) => string;
    popularTags: string[];
    allTags: string[];
    totalResults: number;
    onKindChange: (k: AlgorithmsKind) => void;
    onCategoryChange: (id: string) => void;
    onTagToggle: (tag: string) => void;
    onReset: () => void;
}

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return reduced;
}

export default function AlgorithmsFilterSheet({
    open,
    onClose,
    filters,
    facets,
    categoryValues,
    categoryLabel,
    popularTags,
    allTags,
    totalResults,
    onKindChange,
    onCategoryChange,
    onTagToggle,
    onReset,
}: Props) {
    const reducedMotion = usePrefersReducedMotion();
    const [tagPickerOpen, setTagPickerOpen] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<Element | null>(null);

    // Save trigger on open, restore on close
    useEffect(() => {
        if (open) {
            triggerRef.current = document.activeElement;
            requestAnimationFrame(() => {
                sheetRef.current?.focus();
            });
        } else {
            if (triggerRef.current instanceof HTMLElement) {
                triggerRef.current.focus();
            }
        }
    }, [open]);

    // Esc to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // Focus trap
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key !== "Tab" || !sheetRef.current) return;
            const focusable = Array.from(
                sheetRef.current.querySelectorAll<HTMLElement>(
                    'button, input, [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((el) => !el.hasAttribute("disabled"));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        },
        [],
    );

    const content = (
        <>
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            className="fixed inset-0 bg-black/60 z-40"
                            onClick={onClose}
                            aria-hidden="true"
                            initial={reducedMotion ? false : { opacity: 0 }}
                            animate={reducedMotion ? {} : { opacity: 1 }}
                            exit={reducedMotion ? {} : { opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        />

                        {/* Sheet */}
                        <motion.div
                            key="sheet"
                            ref={sheetRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Filters"
                            tabIndex={-1}
                            className="fixed left-0 right-0 bottom-0 z-50 bg-[hsl(var(--bg-soft))] rounded-t-[18px] border-t border-border pb-[34px] max-h-[82vh] flex flex-col outline-none"
                            onKeyDown={handleKeyDown}
                            drag={reducedMotion ? false : "y"}
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.1}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 80) onClose();
                            }}
                            initial={reducedMotion ? false : { y: "100%" }}
                            animate={reducedMotion ? {} : { y: 0 }}
                            exit={reducedMotion ? {} : { y: "100%" }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                        >
                            {/* Grabber */}
                            <div className="grid place-items-center pt-2.5">
                                <div className="w-10 h-1 rounded-full bg-[hsl(var(--border))]" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-[18px] pt-2.5 pb-3.5 border-b border-[hsl(var(--border)/0.8)]">
                                <span className="text-[17px] font-semibold text-foreground">
                                    Filters
                                </span>
                                <button
                                    type="button"
                                    onClick={onReset}
                                    className="text-[13px] text-brand hover:underline"
                                >
                                    Reset
                                </button>
                            </div>

                            {/* Scrollable body */}
                            <div className="flex-1 overflow-y-auto px-[18px] pt-1 pb-2.5">
                                {/* Kind section */}
                                <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mt-3.5 mb-2">
                                    Kind
                                </div>
                                <div
                                    role="radiogroup"
                                    aria-label="Kind"
                                    className="flex gap-2 mt-2"
                                >
                                    {(
                                        [
                                            ["classical", "Classical"],
                                            ["models", "Models"],
                                        ] as const
                                    ).map(([key, label]) => {
                                        const active = filters.kind === key;
                                        const count =
                                            key === "classical"
                                                ? facets.kinds.classical
                                                : facets.kinds.models;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                role="radio"
                                                aria-checked={active}
                                                onClick={() => onKindChange(key)}
                                                className={`flex-1 px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                                                    active
                                                        ? "border border-[hsl(var(--brand)/0.5)] bg-[hsl(var(--brand)/0.08)] font-semibold text-foreground"
                                                        : "border border-border bg-surface text-[hsl(var(--foreground)/0.8)]"
                                                }`}
                                            >
                                                <span className="text-[13px]">
                                                    {label}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground font-normal">
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Category section */}
                                <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mt-5 mb-2">
                                    Category
                                </div>
                                <div
                                    role="radiogroup"
                                    aria-label="Category"
                                    className="flex flex-col gap-0.5"
                                >
                                    {["all", ...categoryValues]
                                        .filter(
                                            (id) =>
                                                id === "all" ||
                                                (facets.categories[id] ?? 0) > 0 ||
                                                filters.categoryId === id,
                                        )
                                        .map((id) => {
                                        const active = filters.categoryId === id;
                                        const label =
                                            id === "all" ? "All" : categoryLabel(id);
                                        const count = facets.categories[id] ?? 0;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                role="radio"
                                                aria-checked={active}
                                                onClick={() => onCategoryChange(id)}
                                                className={`flex justify-between items-center px-2.5 py-2 rounded-md text-[13.5px] w-full text-left transition-colors ${
                                                    active
                                                        ? "bg-[hsl(var(--surface-hi))] text-foreground font-semibold"
                                                        : "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface-hi)/0.5)]"
                                                }`}
                                            >
                                                <span>{label}</span>
                                                <span className="text-[11px] text-muted-foreground font-normal">
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Tags section */}
                                <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mt-5 mb-2">
                                    Tags{" "}
                                    <span className="text-[hsl(var(--muted-foreground)/0.7)] normal-case tracking-normal font-normal">
                                        · {allTags.length}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {popularTags.map((t) => (
                                        <AlgorithmTagChip
                                            key={t}
                                            tag={t}
                                            active={filters.tags.includes(t)}
                                            compact
                                            onToggle={onTagToggle}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setTagPickerOpen(true)}
                                        className="px-[9px] py-[3px] text-[11px] rounded-full border border-dashed border-[hsl(var(--border))] text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        + more tags
                                    </button>
                                </div>
                            </div>

                            {/* Sticky apply footer */}
                            <div className="border-t border-[hsl(var(--border)/0.8)] bg-[hsl(var(--bg-soft))] px-4 py-2.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-3 bg-brand text-background rounded-[10px] font-semibold text-sm"
                                >
                                    Show {totalResults} results
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Nested tag picker modal */}
            <AlgorithmsTagPicker
                open={tagPickerOpen}
                onClose={() => setTagPickerOpen(false)}
                allTags={allTags}
                popularTags={popularTags}
                selectedTags={filters.tags}
                onToggle={onTagToggle}
            />
        </>
    );

    if (typeof document === "undefined") return null;
    return createPortal(content, document.body);
}
