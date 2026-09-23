import type { PaperPageTag as PaperPageTagData } from "../../lib/atlas/papersDirectory.ts";

/** Small kind-colored pill naming a paper's primary Atlas page — reuses the
 *  `--graph-icon-*` tokens `KindBadge`/`KindDot` (src/components/papers/)
 *  already color algorithm/model/concept entries with. */
export function PaperPageTag({ page }: { page: PaperPageTagData }) {
    return (
        <span
            className="inline-flex h-[22px] max-w-[220px] items-center truncate rounded-[3px] px-1.5 text-[12px] font-semibold"
            style={{
                color: `hsl(var(--graph-icon-tint-${page.kind}))`,
                background: `hsl(var(--graph-icon-bg-${page.kind}))`,
                border: `1px solid hsl(var(--graph-icon-border-${page.kind}))`,
            }}
            title={page.title}
        >
            {page.title}
        </span>
    );
}

export function NoPageTag() {
    return (
        <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-[3px] border border-dashed border-[hsl(35_65%_55%/0.6)] bg-[hsl(35_90%_96%)] px-1.5 text-[12px] font-medium text-[hsl(30_60%_35%)] dark:bg-[hsl(35_40%_16%)] dark:text-[hsl(35_70%_70%)]">
            No page yet
        </span>
    );
}
