import { useState } from "react";
import { Link } from "react-router-dom";
import CollapsibleSection from "./CollapsibleSection.tsx";

// ── Link section (blog posts / demos / narratives, collapsible) ──────────────

export default function LinkSection({
    heading,
    items,
    icon,
    defaultOpen = true,
    borderTop = false,
}: {
    heading: string;
    items: { slug: string; title: string; href: string }[];
    icon: string;
    defaultOpen?: boolean;
    borderTop?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    if (items.length === 0) return null;

    return (
        <CollapsibleSection
            heading={heading}
            count={items.length}
            open={open}
            onToggle={setOpen}
            className={`group${borderTop ? " border-t border-border pt-3.5" : " mt-[18px]"}`}
        >
            <ul className="m-0 p-0 list-none space-y-0">
                {items.map(({ slug, title, href }) => (
                    <li key={slug} className="border-b border-dashed border-foreground/10 last:border-b-0">
                        <Link
                            to={href}
                            className="flex items-center justify-between gap-2 text-[13px] py-1.5 text-foreground no-underline hover:text-foreground transition-colors"
                        >
                            <span className="inline-flex items-center gap-1.5 truncate">
                                <span aria-hidden="true" className="flex-shrink-0">{icon}</span>
                                <span className="truncate">{title}</span>
                            </span>
                            <span aria-hidden="true" className="text-muted-foreground text-[11px] flex-shrink-0">↗</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </CollapsibleSection>
    );
}
