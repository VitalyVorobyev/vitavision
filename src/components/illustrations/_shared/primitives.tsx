import { type ReactNode, type ElementType } from "react";
import { cn } from "@vitavision/ui";

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
                "rounded-[1.5rem] border border-line",
                "bg-[linear-gradient(180deg,var(--surface),var(--ground))]",
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
            className={cn("rounded-[1rem] border border-line bg-surface", className)}
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
                "rounded-[14px] border border-line",
                "bg-surface/92 backdrop-blur-md",
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
                "text-[10px] font-mono uppercase tracking-[0.18em] text-fg-muted",
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
    neutral: { cell: "", value: "text-fg" },
    good:    { cell: "border-normal/40 bg-normal/10", value: "text-normal" },
    warn:    { cell: "border-warn/40 bg-warn/10",     value: "text-warn"   },
    bad:     { cell: "border-defect/40 bg-defect/10", value: "text-defect" },
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
                "flex flex-col min-w-0 rounded-[0.6rem] border border-line",
                "bg-ground/60 px-1.5 py-[0.55rem]",
                cell,
                className,
            )}
        >
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-muted leading-none">
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
                "border border-line-strong bg-ground text-fg-muted",
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
                "inline-flex items-center gap-2 rounded-full border border-line",
                "bg-ground/80 text-fg-muted px-3 py-1.5 text-xs font-mono",
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
                "text-xs text-fg-muted border-l-2 border-signal/50",
                "pl-3 pr-2 py-1 bg-signal/5 rounded-r-control",
                className,
            )}
        >
            {children}
        </div>
    );
}
