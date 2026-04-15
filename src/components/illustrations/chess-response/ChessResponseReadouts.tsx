import { classNames } from "../../../utils/helpers";
import { PHASE_COLORS, formatValue } from "./readoutHelpers";
import type { useChessResponse } from "./useChessResponse";

function MetricCell({
    label,
    value,
    accentClassName,
}: {
    label: string;
    value: string;
    accentClassName?: string;
}) {
    return (
        <div
            className={classNames(
                "flex flex-col items-center justify-center rounded-lg border border-border/80 bg-background/80 px-2 py-1.5 min-w-0",
                accentClassName,
            )}
        >
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground leading-none">
                {label}
            </div>
            <div className="mt-1 font-mono text-sm font-semibold tracking-tight text-foreground leading-none truncate">
                {value}
            </div>
        </div>
    );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {children}
        </div>
    );
}

export interface ChessResponseReadoutsProps {
    response: ReturnType<typeof useChessResponse>;
    showTermBreakdowns?: boolean;
}

export default function ChessResponseReadouts({
    response,
    showTermBreakdowns = true,
}: ChessResponseReadoutsProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-1.5">
                <MetricCell label="SR" value={formatValue(response.sr)} />
                <MetricCell label="DR" value={formatValue(response.dr)} />
                <MetricCell label="MR" value={formatValue(response.mr)} />
                <MetricCell
                    label="R"
                    value={formatValue(response.response)}
                    accentClassName={
                        response.response > 0
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }
                />
            </div>

            {showTermBreakdowns && (
                <>
                    <section className="space-y-1.5">
                        <SectionHeader>Sum Response</SectionHeader>
                        <div className="grid grid-cols-2 gap-1.5">
                            {response.srTerms.map((term) => (
                                <div
                                    key={term.phase}
                                    className="rounded-md border border-border/80 bg-background/80 px-2 py-1.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className="rounded-full px-1.5 py-0 text-[10px] font-mono"
                                            style={{
                                                color: PHASE_COLORS[term.phase],
                                                backgroundColor: `${PHASE_COLORS[term.phase]}15`,
                                            }}
                                        >
                                            φ{term.phase}
                                        </span>
                                        <span className="font-mono text-xs text-foreground">
                                            {formatValue(term.value)}
                                        </span>
                                    </div>
                                    <div className="mt-1 font-mono text-[10px] leading-4 text-muted-foreground truncate">
                                        |(I{term.pairA[0]}+I{term.pairA[1]})−(I{term.pairB[0]}+I{term.pairB[1]})|
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-1.5">
                        <SectionHeader>Diff Response</SectionHeader>
                        <div className="grid grid-cols-2 gap-1.5">
                            {response.drTerms.map((term) => (
                                <div
                                    key={term.index}
                                    className="rounded-md border border-border/80 bg-background/80 px-2 py-1 flex items-center justify-between gap-2"
                                >
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        Δ{term.index} |I{term.pair[0]}−I{term.pair[1]}|
                                    </span>
                                    <span className="font-mono text-xs text-foreground">
                                        {formatValue(term.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-1.5">
                        <SectionHeader>Mean Response</SectionHeader>
                        <div className="rounded-md border border-border/80 bg-background/80 divide-y divide-border/60">
                            <div className="flex items-center justify-between px-2 py-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    local mean (center patch)
                                </span>
                                <span className="font-mono text-xs text-foreground">
                                    {formatValue(response.localMean)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    ring mean
                                </span>
                                <span className="font-mono text-xs text-foreground">
                                    {formatValue(response.neighborMean)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    penalty = 16·MR
                                </span>
                                <span className="font-mono text-xs text-foreground">
                                    {formatValue(16 * response.mr)}
                                </span>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
