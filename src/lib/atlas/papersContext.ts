import { createContext } from "react";
import type { PapersById } from "../../generated/papers-index.ts";

/** Internal context — consumed via the `usePaperById` hook. */
export const PapersContext = createContext<PapersById>({});
