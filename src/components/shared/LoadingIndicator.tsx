import { cn } from "@vitavision/ui";

/** The bare ring spinner (ui has none). Use `LoadingIndicator` for a centred block. */
export function Spinner() {
    return (
        <div
            role="status"
            aria-label="Loading"
            className="h-6 w-6 animate-spin rounded-full border-2 border-signal border-t-transparent"
        />
    );
}

/** A centred spinner for a page region that is still loading; `className` overrides the spacing. */
export default function LoadingIndicator({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center py-16", className)}>
            <Spinner />
        </div>
    );
}
