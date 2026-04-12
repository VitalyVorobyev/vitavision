import { Play } from "lucide-react";

// TODO: category-aware variants when multiple demos exist
export default function DemoThumbnail() {
    return (
        <div className="w-full aspect-video bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--muted)))] flex items-center justify-center">
            <Play className="h-10 w-10 text-muted-foreground/50" />
        </div>
    );
}
