import { useContext } from "react";
import { PapersContext } from "./papersContext.ts";
import type { PaperRef } from "../../generated/papers-index.ts";

/** Hook returning the resolved paper for a given ID, or `undefined` while
 *  the lazy fetch is in flight or when the ID is unknown. */
export function usePaperById(id: string | undefined): PaperRef | undefined {
    const papers = useContext(PapersContext);
    if (!id) return undefined;
    const stripped = id.startsWith("paper:") ? id.slice("paper:".length) : id;
    if (stripped.startsWith("repo:") || stripped.startsWith("doc:")) return undefined;
    return papers[stripped];
}
