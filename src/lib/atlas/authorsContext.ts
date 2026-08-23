import { createContext } from "react";
import type { AuthorsIndex } from "../../generated/authors-index.ts";

export const EMPTY_AUTHORS_INDEX: AuthorsIndex = { authors: {}, paperAuthors: {}, pagesByPaper: {} };

/** Internal context — consumed via the `useAuthorsIndex` hook. */
export const AuthorsIndexContext = createContext<AuthorsIndex>(EMPTY_AUTHORS_INDEX);
