import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { type FormControlMode, useFormControlMode } from "./controlMode";

function getSectionGridClass(columns: 1 | 2 | undefined, controlMode: FormControlMode): string {
    if (columns !== 2) {
        return "grid gap-y-2.5";
    }

    return controlMode === "touch"
        ? "grid grid-cols-1 gap-x-3 gap-y-2.5 min-[612px]:grid-cols-2"
        : "grid grid-cols-2 gap-x-3 gap-y-2.5";
}

interface SectionProps {
    title: string;
    children: React.ReactNode;
    columns?: 1 | 2;
}

export function Section(props: SectionProps) {
    const { title, children, columns } = props;
    const controlMode = useFormControlMode();
    return (
        <section className="space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {title}
            </h3>
            <div className={getSectionGridClass(columns, controlMode)}>
                {children}
            </div>
        </section>
    );
}

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    columns?: 1 | 2;
    defaultOpen?: boolean;
}

export function CollapsibleSection(props: CollapsibleSectionProps) {
    const { title, children, columns, defaultOpen = false } = props;
    const [open, setOpen] = useState(defaultOpen);
    const controlMode = useFormControlMode();

    return (
        <section className="overflow-hidden rounded-xl border border-border/70 bg-background/60">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center gap-1.5 p-3 text-left transition-colors hover:bg-muted/30"
            >
                <ChevronRight
                    size={12}
                    className={`text-muted-foreground/60 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
                />
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    {title}
                </h3>
            </button>
            {open && (
                <div className={`px-3 pb-3 ${getSectionGridClass(columns, controlMode)}`}>
                    {children}
                </div>
            )}
        </section>
    );
}
