import { useParams } from "react-router-dom";
import { algorithmPages, modelPages, conceptPages } from "../generated/content-index.ts";
import AlgorithmPost from "./AlgorithmPost.tsx";
import ModelPost from "./ModelPost.tsx";
import ConceptPost from "./ConceptPost.tsx";
import NotFound from "./NotFound.tsx";

/**
 * Resolves a `/atlas/<slug>` URL to the matching post type. The atlas slug
 * namespace is global (CLAUDE.md §"Single global slug namespace"), so a slug
 * lives in exactly one of the three indices.
 *
 * Lookup order: algorithm → model → concept. NotFound when none match.
 */
export default function AtlasPost() {
    const { slug } = useParams<{ slug: string }>();
    if (!slug) return <NotFound />;

    if (algorithmPages.some((p) => p.slug === slug)) return <AlgorithmPost />;
    if (modelPages.some((p) => p.slug === slug)) return <ModelPost />;
    if (conceptPages.some((p) => p.slug === slug)) return <ConceptPost />;

    return <NotFound />;
}
