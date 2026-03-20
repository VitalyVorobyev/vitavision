import type { RingGridProfile } from "../types";
import type { RingGridCodebook } from "./types";

const cache = new Map<string, RingGridCodebook>();

export async function loadCodebook(profile: RingGridProfile): Promise<RingGridCodebook> {
    const cached = cache.get(profile);
    if (cached) return cached;

    const url = `/ringgrid/codebook_${profile}.json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load codebook: ${resp.status}`);

    const data: RingGridCodebook = await resp.json();
    cache.set(profile, data);
    return data;
}
