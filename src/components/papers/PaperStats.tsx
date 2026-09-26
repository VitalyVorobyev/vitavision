import type { PaperStat } from "../../lib/atlas/paperView.ts";

/** Four-stat strip under the header — primary pages, citing pages,
 *  narratives, and registry citations. Every stat renders even at 0. */
export default function PaperStats({ stats }: { stats: PaperStat[] }) {
    return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 border-y border-border py-4 sm:grid-cols-4 sm:gap-4">
            {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                    <span className="font-mono text-[22px] font-semibold tabular-nums text-foreground sm:text-[26px]">
                        {stat.value}
                    </span>
                    <span className="text-[12px] text-muted-foreground sm:text-[12.5px]">{stat.label}</span>
                </div>
            ))}
        </div>
    );
}
