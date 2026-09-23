import type { ScholarlyPageMeta } from "../../lib/atlas/scholarlyTypes.ts";

type Kind = ScholarlyPageMeta["kind"];

const KIND_LABEL: Record<Kind, string> = {
    algorithm: "Algorithm",
    model: "Model",
    concept: "Concept",
};

/** Small kind-colored badge, reusing the `--graph-icon-*` tokens the graph
 *  view already colors algorithm/model/concept entries with. */
export default function KindBadge({ kind }: { kind: Kind }) {
    return (
        <span
            className="inline-flex h-[18px] items-center rounded-[3px] px-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{
                color: `hsl(var(--graph-icon-tint-${kind}))`,
                background: `hsl(var(--graph-icon-bg-${kind}))`,
                border: `1px solid hsl(var(--graph-icon-border-${kind}))`,
            }}
        >
            {KIND_LABEL[kind]}
        </span>
    );
}

/** Small kind-colored square, used as the leading dot on domain-group chips. */
export function KindDot({ kind }: { kind: Kind }) {
    return (
        <span
            aria-hidden="true"
            className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
            style={{ background: `hsl(var(--graph-icon-tint-${kind}))` }}
        />
    );
}
