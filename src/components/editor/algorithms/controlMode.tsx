import { createContext, useContext } from "react";

/* ── control-mode context ───────────────────────────────────────── */

export type FormControlMode = "desktop" | "touch";

const FormControlModeContext = createContext<FormControlMode>("desktop");

export const compactInputClass =
    "rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors " +
    "hover:border-muted-foreground/40 " +
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

export const touchInputClass =
    "rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors " +
    "hover:border-muted-foreground/40 " +
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

export function useFormControlMode(): FormControlMode {
    return useContext(FormControlModeContext);
}

export function FormControlModeProvider({
    mode,
    children,
}: {
    mode: FormControlMode;
    children: React.ReactNode;
}) {
    return (
        <FormControlModeContext.Provider value={mode}>
            {children}
        </FormControlModeContext.Provider>
    );
}
