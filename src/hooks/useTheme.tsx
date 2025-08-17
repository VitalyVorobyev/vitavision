import { useState, useEffect} from 'react';

const useTheme = () => {
    const getInitial = () => {
        try {
            const ls = localStorage.getItem("theme");
            if (ls === "light" || ls === "dark") return ls;
        } catch {}
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };

    const [theme, setTheme] = useState<"light" | "dark">(getInitial);
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.remove("light");
        } else {
            root.classList.add("light");
        }
        try { localStorage.setItem("theme", theme); } catch {}
    }, [theme]);
    return { theme, setTheme };
}

export default useTheme;
