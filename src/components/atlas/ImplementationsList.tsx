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
        chip: "border-ink-green/40 bg-ink-green/10 text-ink-green",
    },
    community: {
        label: "Community",
        chip: "border-ink-amber/40 bg-ink-amber/10 text-ink-amber",
    },
    port: {
        label: "Port",
        chip: "border-ink-violet/40 bg-ink-violet/10 text-ink-violet",
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
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-fg-muted/70">
                {label}
            </dt>
            <dd className="text-[12.5px] text-fg/90 truncate">
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
        <article className="group rounded-panel border border-line bg-surface/40 transition-colors hover:border-fg/20 hover:bg-surface/70">
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
                    className="min-w-0 truncate font-mono text-[13.5px] font-medium text-fg transition-colors hover:text-signal"
                    title={impl.repo}
                >
                    {repoLabel}
                    <span
                        aria-hidden
                        className="ml-1 text-fg-muted/60 transition-colors group-hover:text-signal/70"
                    >
                        ↗
                    </span>
                </a>
                <a
                    href={`${impl.repo}/commit/${impl.commit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto shrink-0 font-mono text-[11px] text-fg-muted transition-colors hover:text-signal"
                    title={`Commit ${impl.commit}`}
                >
                    @ {shortSha}
                </a>
            </header>
            <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 border-t border-line/60 px-4 py-2.5">
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
                            className="text-signal underline-offset-2 transition-colors hover:text-signal/80 hover:underline"
                            title={impl.weights_url}
                        >
                            {impl.weights_license ?? "available"} ↗
                        </a>
                    ) : (
                        <span className="text-fg-muted">&mdash;</span>
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-muted">
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
