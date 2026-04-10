import type { DictionaryName } from "../../../lib/types";
import type { ArucoDictionary } from "./types";

const cache = new Map<string, ArucoDictionary>();

interface RawDictionary {
    name: string;
    marker_size: number;
    max_correction_bits: number;
    codes: string[];
}

export async function loadDictionary(name: DictionaryName): Promise<ArucoDictionary> {
    const cached = cache.get(name);
    if (cached) return cached;

    const resp = await fetch(`/arucodict/${name}_CODES.json`);
    if (!resp.ok) {
        throw new Error(`Failed to load ArUco dictionary ${name}: ${resp.status}`);
    }

    const raw: RawDictionary = await resp.json();
    const dict: ArucoDictionary = {
        name: raw.name,
        markerSize: raw.marker_size,
        maxCorrectionBits: raw.max_correction_bits,
        codes: raw.codes,
    };

    cache.set(name, dict);
    return dict;
}
