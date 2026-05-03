import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ATLAS_VIEW_STORAGE_KEY } from "./useAlgorithmsFilters.ts";

function readInitialGate(tour: boolean): boolean {
    if (typeof window === "undefined") return false;
    if (tour) return true;
    let stored: string | null;
    try {
        stored = window.localStorage.getItem(ATLAS_VIEW_STORAGE_KEY);
    } catch {
        stored = null;
    }
    if (stored !== null) return false;
    const referrer = document.referrer ?? "";
    return !referrer.includes("/atlas");
}

/**
 * Returns `true` when the Atlas should render the first-visit task landing
 * instead of the regular index. The gate falls open when:
 *
 *   - the user has never written a `view` preference to localStorage AND
 *   - the user did not arrive from another `/atlas` page
 *
 * `?tour=1` always forces the gate open. Once a user picks a view (any view),
 * the localStorage write suppresses the gate on subsequent visits.
 */
export default function useFirstVisitAtlasGate(): boolean {
    const [searchParams] = useSearchParams();
    const tour = searchParams.get("tour") === "1";

    // Render-time state reset pattern: when `tour` flips to true the next
    // render forces the gate open without an effect.
    const [trackedTour, setTrackedTour] = useState(tour);
    const [show, setShow] = useState<boolean>(() => readInitialGate(tour));
    if (tour !== trackedTour) {
        setTrackedTour(tour);
        setShow(tour ? true : show);
    }

    return show;
}
