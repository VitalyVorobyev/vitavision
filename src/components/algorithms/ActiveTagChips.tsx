import { X } from "lucide-react";

interface ActiveTagChipsProps {
    tags: string[];
    onRemove: (tag: string) => void;
    onClearAll: () => void;
}

export default function ActiveTagChips({ tags, onRemove, onClearAll }: ActiveTagChipsProps) {
    if (tags.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-0.5">Tagged</span>
            {tags.map((tag) => (
                <button
                    key={tag}
                    type="button"
                    onClick={() => onRemove(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground hover:bg-muted transition-colors"
                >
                    {tag}
                    <X size={12} aria-hidden="true" />
                </button>
            ))}
            {tags.length > 1 && (
                <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                >
                    Clear all
                </button>
            )}
        </div>
    );
}
