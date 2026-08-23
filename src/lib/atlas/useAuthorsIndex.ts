import { useContext } from "react";
import { AuthorsIndexContext } from "./authorsContext.ts";
import type { AuthorsIndex } from "../../generated/authors-index.ts";

/** Hook returning the full authors index: `authors` by id, `paperAuthors`
 *  (paper id → author ids), and `pagesByPaper` (paper id → atlas slugs). */
export function useAuthorsIndex(): AuthorsIndex {
    return useContext(AuthorsIndexContext);
}
