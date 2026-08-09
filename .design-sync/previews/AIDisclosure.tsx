import { AIDisclosure } from 'vitcv';

export const Standalone = () => (
    <div style={{ width: 320 }}>
        <AIDisclosure />
    </div>
);

export const InSidebarContext = () => (
    <aside className="rounded-lg border border-border bg-surface p-3.5" style={{ width: 320 }}>
        <h4 className="m-0 mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Relations
        </h4>
        <ul className="m-0 mb-1 list-none space-y-1.5 p-0 text-[12.5px] text-foreground">
            <li>Generalized by → Zhang's Planar Calibration</li>
            <li>Compared with → Sturm-Maybank Plane-Based</li>
        </ul>
        <AIDisclosure />
    </aside>
);
