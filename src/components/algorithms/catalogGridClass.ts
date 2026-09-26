/** Shared grid/list container classes for catalog card sections. */
export function catalogGridClass(layout: "grid" | "list"): string {
    return layout === "grid"
        ? "grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        : "flex flex-col gap-2.5";
}
