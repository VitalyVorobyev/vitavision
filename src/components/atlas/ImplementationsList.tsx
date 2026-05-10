import type { ReactNode } from "react";
import type { ModelFrontmatterSerialized } from "../../lib/content/schema.ts";

type Implementation = NonNullable<
    ModelFrontmatterSerialized["implementations"]
>[number];

const roleStyles: Record<
    Implementation["role"],
    { label: string; chip: string }
> = {
    official: {
        label: "Official",
        chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    community: {
        label: "Community",
        chip: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    port: {
        label: "Port",
        chip: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
};

function parseRepoLabel(repoUrl: string): string {
    try {
        const parts = new URL(repoUrl).pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        }
    } catch {
        // fall through
    }
    return repoUrl;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline gap-1.5 min-w-0">
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {label}
            </dt>
            <dd className="text-[12.5px] text-foreground/90 truncate">
                {children}
            </dd>
        </div>
    );
}

function ImplementationCard({ impl }: { impl: Implementation }) {
    const role = roleStyles[impl.role];
    const shortSha = impl.commit.slice(0, 7);
    const repoLabel = parseRepoLabel(impl.repo);

    return (
        <article className="group rounded-lg border border-border bg-surface/40 transition-colors hover:border-foreground/20 hover:bg-surface/70">
            <header className="flex items-baseline gap-3 px-4 pt-3 pb-2">
                <span
                    className={`shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] ${role.chip}`}
                >
                    {role.label}
                </span>
                <a
                    href={impl.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate font-mono text-[13.5px] font-medium text-foreground transition-colors hover:text-primary"
                    title={impl.repo}
                >
                    {repoLabel}
                    <span
                        aria-hidden
                        className="ml-1 text-muted-foreground/60 transition-colors group-hover:text-primary/70"
                    >
                        ↗
                    </span>
                </a>
                <a
                    href={`${impl.repo}/commit/${impl.commit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary"
                    title={`Commit ${impl.commit}`}
                >
                    @ {shortSha}
                </a>
            </header>
            <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 border-t border-border/60 px-4 py-2.5">
                <Field label="Framework">
                    <span className="font-mono">{impl.framework}</span>
                </Field>
                <Field label="License">{impl.license}</Field>
                <Field label="Weights">
                    {impl.weights_url ? (
                        <a
                            href={impl.weights_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
                            title={impl.weights_url}
                        >
                            {impl.weights_license ?? "available"} ↗
                        </a>
                    ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                    )}
                </Field>
            </dl>
        </article>
    );
}

interface ImplementationsListProps {
    implementations: NonNullable<ModelFrontmatterSerialized["implementations"]>;
}

export default function ImplementationsList({
    implementations,
}: ImplementationsListProps) {
    return (
        <section aria-label="Implementations" className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Implementations
            </h2>
            <div className="space-y-2.5">
                {implementations.map((impl, i) => (
                    <ImplementationCard key={`${impl.repo}-${i}`} impl={impl} />
                ))}
            </div>
        </section>
    );
}
