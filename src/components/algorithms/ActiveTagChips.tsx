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
            <span className="text-[11px] text-fg-muted mr-0.5">Tagged</span>
            {tags.map((tag) => (
                <button
                    key={tag}
                    type="button"
                    onClick={() => onRemove(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-raised/60 px-2 py-0.5 text-xs text-fg hover:bg-line/60 transition-colors"
                >
                    {tag}
                    <X size={12} aria-hidden="true" />
                </button>
            ))}
            {tags.length > 1 && (
                <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[11px] text-fg-muted hover:text-fg transition-colors ml-0.5"
                >
                    Clear all
                </button>
            )}
        </div>
    );
}
