import { Fragment } from "react";
import { Link } from "react-router-dom";
import { authorsShortSegments } from "../../lib/atlas/formatAuthors.ts";
import { resolveAuthorIds } from "../../lib/atlas/authorLinks.ts";
import { useAuthorsIndex } from "../../lib/atlas/useAuthorsIndex.ts";

interface AuthorBylineProps {
    /** Paper id (already stripped of any `paper:` prefix) — keys `paperAuthors`. */
    paperId: string;
    /** Display author strings from the papers index, in publication order. */
    authors: string[];
    /** Extra classes for the rendered links (e.g. to sit above a stretched link). */
    linkClassName?: string;
}

/**
 * Renders the same compact byline as `formatAuthorsShort` — first four last
 * names, then "et al." — but turns each name whose author id is known into a
 * link to `/authors/<id>`. Names without a resolvable id stay plain text, which
 * is also the whole-byline behaviour before the authors index has loaded.
 */
export default function AuthorByline({ paperId, authors, linkClassName = "" }: AuthorBylineProps) {
    const { authors: authorsById, paperAuthors } = useAuthorsIndex();
    const { segments, etAl } = authorsShortSegments(authors);
    const ids = resolveAuthorIds(authors, paperAuthors[paperId], authorsById);

    if (segments.length === 0) return null;

    return (
        <>
            {segments.map((seg, i) => {
                const id = ids[seg.index];
                return (
                    <Fragment key={seg.index}>
                        {i > 0 && ", "}
                        {id ? (
                            <Link
                                to={`/authors/${id}`}
                                className={`hover:text-foreground hover:underline underline-offset-2 transition-colors ${linkClassName}`}
                            >
                                {seg.lastName}
                            </Link>
                        ) : (
                            seg.lastName
                        )}
                    </Fragment>
                );
            })}
            {etAl && " et al."}
        </>
    );
}
