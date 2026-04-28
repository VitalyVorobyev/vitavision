import { type ReactNode, type ElementType } from "react";

// Lightweight className merger — no external deps required.
function cn(...classes: (string | undefined | false | null)[]): string {
    return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Panel — gradient surface card (matches .panel in vv.css)
// ---------------------------------------------------------------------------
interface PanelProps extends React.HTMLAttributes<HTMLElement> {
    as?: ElementType;
    className?: string;
    children?: ReactNode;
}

export function Panel({ as: Tag = "div", className, children, ...rest }: PanelProps) {
    return (
        <Tag
            className={cn(
                "rounded-[1.5rem] border border-border",
                "bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))]",
                className,
            )}
            {...rest}
        >
            {children}
        </Tag>
    );
}

// ---------------------------------------------------------------------------
// PanelFlat — solid surface, no gradient (matches .panel-flat)
// ---------------------------------------------------------------------------
interface PanelFlatProps extends React.HTMLAttributes<HTMLElement> {
    as?: ElementType;
    className?: string;
    children?: ReactNode;
}

export function PanelFlat({ as: Tag = "div", className, children, ...rest }: PanelFlatProps) {
    return (
        <Tag
            className={cn("rounded-[1rem] border border-border bg-surface", className)}
            {...rest}
        >
            {children}
        </Tag>
    );
}

// ---------------------------------------------------------------------------
// FloatingPanel — absolute-positioned overlay chrome
// ---------------------------------------------------------------------------
interface FloatingPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    children?: ReactNode;
}

export function FloatingPanel({ className, children, ...rest }: FloatingPanelProps) {
    return (
        <div
            className={cn(
                "rounded-[14px] border border-border",
                "bg-[hsl(var(--surface)/0.92)] backdrop-blur-md",
                "shadow-[0_12px_30px_-16px_rgba(0,0,0,0.6)]",
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// TinyBrow — 10 px mono uppercase label
// ---------------------------------------------------------------------------
interface BrowProps {
    className?: string;
    children: ReactNode;
}

export function TinyBrow({ className, children }: BrowProps) {
    return (
        <span
            className={cn(
                "text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground",
                className,
            )}
        >
            {children}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Eyebrow — 11 px mono uppercase label (slightly larger than TinyBrow)
// ---------------------------------------------------------------------------
export function Eyebrow({ className, children }: BrowProps) {
    return (
        <span
            className={cn(
                "text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground",
                className,
            )}
        >
            {children}
        </span>
    );
}

// ---------------------------------------------------------------------------
// MetricCell — label + mono value with optional tone tint
// ---------------------------------------------------------------------------
type Tone = "neutral" | "good" | "warn" | "bad";

const toneStyles: Record<Tone, { cell: string; value: string }> = {
    neutral: { cell: "", value: "text-foreground" },
    good:    { cell: "border-emerald-500/40 bg-emerald-500/10", value: "text-emerald-400" },
    warn:    { cell: "border-amber-500/40   bg-amber-500/10",   value: "text-amber-400"   },
    bad:     { cell: "border-rose-500/40    bg-rose-500/10",    value: "text-rose-400"    },
};

interface MetricCellProps {
    label: string;
    value: ReactNode;
    tone?: Tone;
    className?: string;
}

export function MetricCell({ label, value, tone = "neutral", className }: MetricCellProps) {
    const { cell, value: valueColor } = toneStyles[tone];
    return (
        <div
            className={cn(
                "flex flex-col min-w-0 rounded-[0.6rem] border border-border",
                "bg-background/60 px-1.5 py-[0.55rem]",
                cell,
                className,
            )}
        >
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground leading-none">
                {label}
            </span>
            <span className={cn("mt-1.5 text-[13px] font-mono font-semibold leading-none", valueColor)}>
                {value}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Kbd — keyboard hint chip
// ---------------------------------------------------------------------------
interface KbdProps {
    className?: string;
    children: ReactNode;
}

export function Kbd({ className, children }: KbdProps) {
    return (
        <kbd
            className={cn(
                "text-[10px] font-mono px-1.5 py-px rounded-[4px]",
                "border border-border-strong bg-background text-muted-foreground",
                className,
            )}
        >
            {children}
        </kbd>
    );
}

// ---------------------------------------------------------------------------
// Pill — rounded-full label chip
// ---------------------------------------------------------------------------
interface PillProps {
    className?: string;
    children: ReactNode;
}

export function Pill({ className, children }: PillProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border",
                "bg-background/80 text-muted-foreground px-3 py-1.5 text-xs font-mono",
                className,
            )}
        >
            {children}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Note — callout block with left-border primary accent
// ---------------------------------------------------------------------------
interface NoteProps {
    className?: string;
    children: ReactNode;
}

export function Note({ className, children }: NoteProps) {
    return (
        <div
            className={cn(
                "text-xs text-muted-foreground border-l-2 border-primary/50",
                "pl-3 pr-2 py-1 bg-primary/5 rounded-r-md",
                className,
            )}
        >
            {children}
        </div>
    );
}
