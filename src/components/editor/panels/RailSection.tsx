export default function RailSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2.5">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 shrink-0">
                    {label}
                </span>
                <div className="h-px flex-1 bg-border/50" />
            </div>
            {children}
        </div>
    );
}
