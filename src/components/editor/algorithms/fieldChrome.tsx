import { useCallback, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

/* ── tooltip ─────────────────────────────────────────────────── */

export function InfoTooltip({ text }: { text: string }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<React.CSSProperties>({});
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const show = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pad = 8;
        let left = rect.left + rect.width / 2 - 112;
        left = Math.max(pad, Math.min(left, window.innerWidth - 224 - pad));
        let top = rect.top - pad;
        if (top < 40) top = rect.bottom + pad;
        setPos({ left, top, transform: top < rect.top ? "translateY(-100%)" : undefined });
        setOpen(true);
    }, []);

    return (
        <span
            ref={ref}
            className="relative inline-flex"
            onMouseEnter={show}
            onMouseLeave={() => setOpen(false)}
            onClick={show}
        >
            <Info size={12} className="cursor-help text-muted-foreground/50 hover:text-muted-foreground" />
            {open && (
                <div
                    className="fixed z-[100] w-56 rounded-md border border-border bg-surface p-2 text-[11px] leading-relaxed text-foreground shadow-lg pointer-events-none"
                    style={pos}
                >
                    {text}
                </div>
            )}
        </span>
    );
}

/* ── field label ─────────────────────────────────────────────── */

export function FieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
        </span>
    );
}
