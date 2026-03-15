import TagBadge from "./TagBadge.tsx";

interface TagFilterProps {
    tags: string[];
    selected: string | null;
    onSelect: (tag: string | null) => void;
}

export default function TagFilter({ tags, selected, onSelect }: TagFilterProps) {
    if (tags.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            <TagBadge
                tag="All"
                active={selected === null}
                onClick={() => onSelect(null)}
            />
            {tags.map((tag) => (
                <TagBadge
                    key={tag}
                    tag={tag}
                    active={selected === tag}
                    onClick={() => onSelect(selected === tag ? null : tag)}
                />
            ))}
        </div>
    );
}
