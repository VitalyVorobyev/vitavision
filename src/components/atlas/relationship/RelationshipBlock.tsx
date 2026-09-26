import type { RelationDisplayResult } from "../../../lib/atlas/relationDisplay.ts";
import { SECTION_ORDER } from "../../../lib/atlas/relationDisplay.ts";
import BlockSection from "./BlockSection.tsx";
import TypedBucket from "./TypedBucket.tsx";
import SupersededBy from "./SupersededBy.tsx";

interface RelationshipBlockProps {
    result: RelationDisplayResult;
    supersededBy?: string;
}

export default function RelationshipBlock({ result, supersededBy }: RelationshipBlockProps) {
    if (!result.hasGraphContent && !result.hasSuccessor) return null;

    return (
        <section className="mt-12 pt-6 border-t border-border space-y-5">
            {result.hasSuccessor && <SupersededBy successor={supersededBy!} variant="block" />}
            <BlockSection heading="Prerequisites" slugs={result.prerequisites} />
            {SECTION_ORDER.map((label) => {
                const items = result.grouped.get(label) ?? [];
                if (items.length === 0) return null;
                return (
                    <TypedBucket
                        key={label}
                        heading={label}
                        items={items}
                    />
                );
            })}
            <BlockSection heading="Used by" slugs={result.usedBy} />
            <BlockSection heading="Failure modes" slugs={result.failureModes} />
            <BlockSection heading="Affects" slugs={result.affects} />
        </section>
    );
}
