import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import AlgorithmTagChip from "./AlgorithmTagChip.tsx";

interface Props {
    open: boolean;
    onClose: () => void;
    allTags: string[];
    popularTags: string[];
    selectedTags: string[];
    onToggle: (tag: string) => void;
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

/**
 * Inner modal content — mounted fresh each time `open` transitions true→false→true.
 * AnimatePresence unmounts this after the exit animation, so `query` naturally
 * resets to "" on each open without any setState-in-effect.
 */
function ModalContent({
    allTags,
    popularTags,
    selectedTags,
    onToggle,
    onClose,
    reducedMotion,
}: {
    allTags: string[];
    popularTags: string[];
    selectedTags: string[];
    onToggle: (tag: string) => void;
    onClose: () => void;
    reducedMotion: boolean;
}) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Focus the search input when this component mounts (i.e. when modal opens)
    useEffect(() => {
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }, []);

    // Esc to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    // Focus trap
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key !== "Tab" || !modalRef.current) return;
            const focusable = Array.from(
                modalRef.current.querySelectorAll<HTMLElement>(
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

    const filteredPopular = popularTags.filter((t) =>
        t.toLowerCase().includes(query.toLowerCase()),
    );
    const filteredAll = allTags.filter((t) =>
        t.toLowerCase().includes(query.toLowerCase()),
    );

    const motionProps = reducedMotion
        ? {}
        : {
              initial: { opacity: 0, scale: 0.96 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.96 },
              transition: { duration: 0.18 },
          };

    return (
        <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Pick tags"
            className="pointer-events-auto bg-surface border border-border rounded-xl w-[420px] max-w-[92vw] max-h-[82vh] p-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
            onKeyDown={handleKeyDown}
            {...motionProps}
        >
            {/* Search row */}
            <div className="flex items-center mb-3">
                <input
                    ref={inputRef}
                    type="search"
                    placeholder="Filter tags…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border)/0.7)] rounded-md px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[hsl(var(--brand)/0.5)]"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                    {allTags.length} tags
                </span>
            </div>

            {/* Popular section */}
            {filteredPopular.length > 0 && (
                <div className="mb-3 shrink-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-1.5">
                        Popular
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {filteredPopular.map((t) => (
                            <AlgorithmTagChip
                                key={t}
                                tag={t}
                                active={selectedTags.includes(t)}
                                compact
                                onToggle={onToggle}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* All tags section — scrollable */}
            <div className="flex flex-col min-h-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-1.5 shrink-0">
                    All tags
                </div>
                <div className="overflow-y-auto flex-1">
                    <div className="flex flex-wrap gap-1.5 pb-1">
                        {filteredAll.map((t) => (
                            <AlgorithmTagChip
                                key={t}
                                tag={t}
                                active={selectedTags.includes(t)}
                                compact
                                onToggle={onToggle}
                            />
                        ))}
                        {filteredAll.length === 0 && (
                            <p className="text-xs text-muted-foreground py-2">
                                No tags match &ldquo;{query}&rdquo;.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Close button */}
            <div className="mt-3 shrink-0 flex justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Close
                </button>
            </div>
        </motion.div>
    );
}

export default function AlgorithmsTagPicker({
    open,
    onClose,
    allTags,
    popularTags,
    selectedTags,
    onToggle,
}: Props) {
    const reducedMotion = usePrefersReducedMotion();
    const triggerRef = useRef<Element | null>(null);

    // Save trigger on open; restore on close — pure DOM, no setState
    useEffect(() => {
        if (open) {
            triggerRef.current = document.activeElement;
        } else {
            if (triggerRef.current instanceof HTMLElement) {
                triggerRef.current.focus();
            }
        }
    }, [open]);

    const backdropMotion = reducedMotion
        ? {}
        : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
              transition: { duration: 0.15 },
          };

    const content = (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                        aria-hidden="true"
                        {...backdropMotion}
                    />

                    {/* Modal */}
                    <div
                        key="modal"
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <ModalContent
                            allTags={allTags}
                            popularTags={popularTags}
                            selectedTags={selectedTags}
                            onToggle={onToggle}
                            onClose={onClose}
                            reducedMotion={reducedMotion}
                        />
                    </div>
                </>
            )}
        </AnimatePresence>
    );

    if (typeof document === "undefined") return null;
    return createPortal(content, document.body);
}
