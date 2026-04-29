// Mirrors calib-targets-puzzleboard/src/code_maps.rs. Maps are the Stelldinger 2024 canonical arrays — do not regenerate.

export const EDGE_MAP_A_ROWS = 3;
export const EDGE_MAP_A_COLS = 167;
export const EDGE_MAP_B_ROWS = 167;
export const EDGE_MAP_B_COLS = 3;

const MAP_A_HEX =
    "d0e1aac4da704789f841fd32a9ebf0db9a7de7e545c3ef5f24786410310c1c2beeda4dc232ae38325e89a070e1f50549e8b2b9d6344933bd7340ed6b33bc18";
const MAP_B_HEX =
    "cb1f4c219e6e31ed7056ae36916a8888914111bf24a5b92320fbb941e158d40874979ed7b5614103f291b2cc387d6b1e9ba3f52fbeb372b1ea4ae08bedcd1a";

const decodeHex = (hex: string): Uint8Array =>
    Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16)));

export const MAP_A_BYTES: Uint8Array = decodeHex(MAP_A_HEX);
export const MAP_B_BYTES: Uint8Array = decodeHex(MAP_B_HEX);

const posMod = (n: number, m: number): number => ((n % m) + m) % m;

export function horizontalEdgeBit(masterRow: number, masterCol: number): 0 | 1 {
    const r = posMod(masterRow, 167);
    const c = posMod(masterCol, 3);
    const idx = r * 3 + c;
    return ((MAP_B_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
}

export function verticalEdgeBit(masterRow: number, masterCol: number): 0 | 1 {
    const r = posMod(masterRow, 3);
    const c = posMod(masterCol, 167);
    const idx = r * 167 + c;
    return ((MAP_A_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
}
