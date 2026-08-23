import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { narrativePages } from "../generated/content-index.ts";
import { narrativeLoaders, type GeneratedNarrativeModule } from "../generated/narrative-loaders.ts";
import SeoHead from "../components/seo/SeoHead.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import NarrativeCanvas from "../components/narratives/NarrativeCanvas.tsx";
import LensSwitcher from "../components/narratives/LensSwitcher.tsx";
import StoryRail from "../components/narratives/StoryRail.tsx";
import NodeInspector from "../components/narratives/NodeInspector.tsx";
import MobileNarrativeView from "../components/narratives/MobileNarrativeView.tsx";
import { proseClasses } from "../lib/prose-classes.ts";
import { useStaticContent } from "../lib/content/ssr-content.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import { useArticleIllustrations } from "../lib/content/useArticleIllustrations.tsx";
import { useArticleImageZoom } from "../lib/content/useArticleImageZoom.tsx";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import useMediaQuery from "../hooks/useMediaQuery.ts";
import NotFound from "./NotFound.tsx";

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

export default function NarrativePage() {
    const { slug } = useParams<{ slug: string }>();
    const entry = narrativePages.find((p) => p.slug === slug);
    const isAdmin = useIsAdmin();
    const staticContent = useStaticContent();
    const isDesktop = useMediaQuery("(min-width: 1024px)", true);
    const articleRef = useRef<HTMLElement>(null);

    const [searchParams, setSearchParams] = useSearchParams();

    // Resolve the essay synchronously from the SSR/prerender snapshot when
    // available; the graph itself always arrives via the async loader.
    const syncHtml = slug ? staticContent?.narrativeHtmlBySlug?.[slug] ?? null : null;

    const [trackedSlug, setTrackedSlug] = useState(slug);
    const [mod, setMod] = useState<GeneratedNarrativeModule | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    if (slug !== trackedSlug) {
        setTrackedSlug(slug);
        setMod(null);
        setLoadFailed(false);
    }

    const isDraftBlocked = Boolean(entry?.draft) && !isAdmin;

    useEffect(() => {
        if (isDraftBlocked || !slug) return;
        const loader = narrativeLoaders[slug];
        if (!loader) return;
        let cancelled = false;
        loader()
            .then((m) => { if (!cancelled) setMod(m); })
            .catch(() => { if (!cancelled) setLoadFailed(true); });
        return () => { cancelled = true; };
    }, [slug, isDraftBlocked]);

    const html = isDraftBlocked ? null : mod?.html ?? syncHtml;

    useMermaid(articleRef, [html]);
    useArticleIllustrations(articleRef, [html]);
    useArticleImageZoom(articleRef, [html]);

    // ── URL state (?lens=&step=&node=) ──────────────────────────────────────

    const setParam = useCallback(
        (patch: Record<string, string | null>) => {
            const next = new URLSearchParams(searchParams);
            for (const [k, v] of Object.entries(patch)) {
                if (v === null) next.delete(k);
                else next.set(k, v);
            }
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const narrative = mod?.narrative ?? null;
    const steps = useMemo(() => mod?.steps ?? [], [mod]);

    const lensId = useMemo(() => {
        if (!narrative || narrative.lenses.length === 0) return "";
        const requested = searchParams.get("lens");
        return narrative.lenses.some((l) => l.id === requested)
            ? (requested as string)
            : narrative.lenses[0].id;
    }, [narrative, searchParams]);

    const stepIndex = useMemo(() => {
        const raw = searchParams.get("step");
        if (raw === null || steps.length === 0) return null;
        const n = Number.parseInt(raw, 10);
        if (!Number.isFinite(n)) return null;
        return clamp(n - 1, 0, steps.length - 1);
    }, [searchParams, steps.length]);

    const selectedId = useMemo(() => {
        const raw = searchParams.get("node");
        if (!raw || !narrative) return null;
        return narrative.nodes.some((n) => n.id === raw) ? raw : null;
    }, [searchParams, narrative]);

    const setStep = useCallback(
        (next: number | null) => {
            setParam({ step: next === null ? null : String(next + 1) });
        },
        [setParam],
    );

    const setSelected = useCallback(
        (id: string | null) => setParam({ node: id }),
        [setParam],
    );

    // ← / → step through the walkthrough while it is active.
    useEffect(() => {
        if (stepIndex === null || steps.length === 0) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
            if (e.key === "ArrowRight" && stepIndex < steps.length - 1) {
                e.preventDefault();
                setStep(stepIndex + 1);
            } else if (e.key === "ArrowLeft" && stepIndex > 0) {
                e.preventDefault();
                setStep(stepIndex - 1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [stepIndex, steps.length, setStep]);

    const nodesById = useMemo(
        () => new Map((narrative?.nodes ?? []).map((n) => [n.id, n])),
        [narrative],
    );

    const focusIds = stepIndex === null ? null : steps[stepIndex]?.focus ?? null;
    const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null;

    if (!entry || isDraftBlocked) return <NotFound />;

    return (
        <div className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 lg:py-12 animate-in fade-in">
            <SeoHead
                title={entry.title}
                description={entry.summary}
                ogType="article"
                url={`/atlas/narratives/${entry.slug}`}
            />

            {/* Header */}
            <header className="mb-6 space-y-3">
                <Link
                    to="/atlas?view=narratives"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    &larr; Back to narratives
                </Link>
                <h1 className="text-[clamp(1.875rem,4vw,2.625rem)] font-bold leading-[1.2] tracking-[-0.03em]">
                    <span
                        aria-hidden="true"
                        className="mr-3 rounded border border-border px-2 py-1 align-middle font-mono text-sm uppercase tracking-wider text-muted-foreground"
                    >
                        narrative
                    </span>
                    {entry.draft && (
                        <span
                            aria-hidden="true"
                            className="mr-3 rounded border border-amber-500/40 px-2 py-1 align-middle font-mono text-sm uppercase tracking-wider text-amber-500"
                        >
                            draft
                        </span>
                    )}
                    {entry.title}
                </h1>
                {entry.tagline && (
                    <p className="m-0 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
                        {entry.tagline}
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                    <time>{entry.date}</time>
                    <span aria-hidden="true">·</span>
                    <span>
                        {entry.stats.nodes} stop{entry.stats.nodes === 1 ? "" : "s"} ·{" "}
                        {entry.stats.steps} chapter{entry.stats.steps === 1 ? "" : "s"}
                    </span>
                </div>
                <div className="border-t border-border" />
            </header>

            {/* Constellation */}
            {narrative === null ? (
                <div className="flex items-center justify-center rounded-xl border border-border py-20">
                    {loadFailed ? (
                        <span className="text-[13px] text-muted-foreground">
                            The constellation failed to load.
                        </span>
                    ) : (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                </div>
            ) : isDesktop ? (
                <section>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <LensSwitcher
                            lenses={narrative.lenses}
                            activeId={lensId}
                            onChange={(id) => setParam({ lens: id })}
                        />
                        <span className="text-[10.5px] text-muted-foreground">
                            drag to pan · wheel to zoom · click a node
                        </span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="h-[min(70vh,640px)] min-h-[420px]">
                            <NarrativeCanvas
                                narrative={narrative}
                                lensId={lensId}
                                focusIds={focusIds}
                                selectedId={selectedId}
                                onSelect={setSelected}
                            />
                        </div>
                        <aside className="flex flex-col gap-3">
                            {selectedNode && (
                                <NodeInspector
                                    node={selectedNode}
                                    areas={narrative.areas}
                                    onClose={() => setSelected(null)}
                                />
                            )}
                            <StoryRail
                                steps={steps}
                                index={stepIndex}
                                chapters={mod?.chapters ?? {}}
                                nodesById={nodesById}
                                areas={narrative.areas}
                                onStep={setStep}
                                onSelectNode={setSelected}
                            />
                        </aside>
                    </div>
                </section>
            ) : (
                <MobileNarrativeView
                    narrative={narrative}
                    steps={steps}
                    chapters={mod?.chapters ?? {}}
                />
            )}

            {/* Full essay */}
            <div className="mt-10 border-t border-border pt-8">
                {html === null ? (
                    loadFailed ? (
                        <div className="py-10 text-sm text-muted-foreground">
                            Narrative content failed to load.
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                    )
                ) : (
                    <ErrorBoundary>
                        <article
                            ref={articleRef}
                            data-atlas-slug={entry.slug}
                            data-atlas-kind="narrative"
                            className={`${proseClasses} mx-auto`}
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    </ErrorBoundary>
                )}
            </div>
        </div>
    );
}
