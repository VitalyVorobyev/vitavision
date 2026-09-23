const ERA_START = 1980;

function eraEnd(): number {
    return new Date().getFullYear();
}

interface PeopleEraBarProps {
    firstYear: number;
    lastYear: number;
    width?: number;
}

/** A tiny 1980→now activity bar, plus a "'YY–'YY" (or a single year) label. */
export default function PeopleEraBar({ firstYear, lastYear, width = 96 }: PeopleEraBarProps) {
    const end = eraEnd();
    const span = Math.max(1, end - ERA_START);
    const x = (year: number) => ((year - ERA_START) / span) * width;
    const x0 = x(firstYear);
    const x1 = Math.max(x(lastYear), x0 + 3);
    const label =
        firstYear === lastYear
            ? String(firstYear)
            : `’${String(firstYear).slice(2)}–’${String(lastYear).slice(2)}`;

    return (
        <span className="flex items-center gap-2">
            <svg
                width={width}
                height={14}
                viewBox={`0 0 ${width} 14`}
                aria-label={`Active ${firstYear}–${lastYear}`}
                role="img"
            >
                <line x1={0} x2={width} y1={7} y2={7} stroke="hsl(var(--border))" strokeWidth={2} />
                <line
                    x1={x0}
                    x2={x1}
                    y1={7}
                    y2={7}
                    stroke="hsl(var(--foreground)/0.55)"
                    strokeWidth={5}
                    strokeLinecap="round"
                />
            </svg>
            <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{label}</span>
        </span>
    );
}
