import { useEffect } from "react";
import { NavigationType, useLocation, useNavigationType } from "react-router";

export default function ScrollToTop() {
    const { pathname, hash } = useLocation();
    const navigationType = useNavigationType();

    useEffect(() => {
        // Let the browser restore scroll on back/forward.
        if (navigationType === NavigationType.Pop) return;
        // Anchor links handle their own scroll.
        if (hash) return;
        window.scrollTo(0, 0);
    }, [pathname, hash, navigationType]);

    return null;
}
