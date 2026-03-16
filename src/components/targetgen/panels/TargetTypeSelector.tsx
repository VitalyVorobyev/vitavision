import { Grid3X3, QrCode, CircleDot } from "lucide-react";
import type { TargetType, TargetGeneratorAction } from "../types";

const TARGET_TYPES: {
    id: TargetType;
    label: string;
    description: string;
    icon: React.ReactNode;
}[] = [
    {
        id: "chessboard",
        label: "Chessboard",
        description: "Classic checkerboard pattern for camera calibration",
        icon: <Grid3X3 size={24} />,
    },
    {
        id: "charuco",
        label: "ChArUco",
        description: "Checkerboard with embedded ArUco markers",
        icon: <QrCode size={24} />,
    },
    {
        id: "markerboard",
        label: "Marker Board",
        description: "Checkerboard with asymmetric circle markers",
        icon: <CircleDot size={24} />,
    },
];

interface Props {
    selected: TargetType;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function TargetTypeSelector({ selected, dispatch }: Props) {
    return (
        <div className="flex flex-col gap-2 p-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 px-1">
                Target Type
            </h2>
            {TARGET_TYPES.map((t) => (
                <button
                    key={t.id}
                    onClick={() =>
                        dispatch({ type: "SET_TARGET_TYPE", targetType: t.id })
                    }
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                        selected === t.id
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background hover:border-muted-foreground/40 text-muted-foreground"
                    }`}
                >
                    <span
                        className={
                            selected === t.id
                                ? "text-primary"
                                : "text-muted-foreground"
                        }
                    >
                        {t.icon}
                    </span>
                    <span className="text-xs font-medium">{t.label}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                        {t.description}
                    </span>
                </button>
            ))}
        </div>
    );
}
