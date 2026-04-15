import { lazy, type ComponentType } from "react";

export interface DemoRegistryEntry {
    component: ComponentType;
    title: string;
}

const ChessResponseDemo = lazy(
    () => import("../../components/illustrations/ChessResponseDemo"),
) as ComponentType;

export const demoRegistry: Record<string, DemoRegistryEntry> = {
    "chess-response": {
        component: ChessResponseDemo,
        title: "ChESS detector response",
    },
};
