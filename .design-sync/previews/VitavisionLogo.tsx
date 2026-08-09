import { VitavisionLogo } from 'vitcv';

export const NavbarMark = () => (
    <nav className="flex h-16 items-center border-b border-border bg-background/80 px-4">
        <VitavisionLogo variant="mark" className="h-9 w-auto text-foreground" />
    </nav>
);

export const HeroFull = () => (
    <div className="flex items-center justify-center py-6">
        <VitavisionLogo variant="full" className="h-16 w-auto text-foreground sm:h-20 md:h-24" />
    </div>
);

export const MarkVsFull = () => (
    <div className="flex items-center" style={{ gap: 32 }}>
        <div className="flex flex-col items-center gap-2">
            <VitavisionLogo variant="mark" className="h-12 w-auto text-foreground" />
            <span className="text-xs text-muted-foreground">mark</span>
        </div>
        <div className="flex flex-col items-center gap-2">
            <VitavisionLogo variant="full" className="h-12 w-auto text-foreground" />
            <span className="text-xs text-muted-foreground">full</span>
        </div>
    </div>
);
