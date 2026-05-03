/**
 * Footer disclosure shown below the relations sidebar on Atlas pages.
 * Discloses that the page is distilled from the source paper by an AI model.
 */
export default function AIDisclosure() {
    return (
        <div className="mt-3 px-3.5 py-2.5 border border-dashed border-white/10 rounded-lg font-mono text-[11px] leading-[1.5] text-muted-foreground">
            <span aria-hidden="true" className="text-purple-300 mr-1">
                ✦
            </span>
            This page was distilled from the source paper by Claude Opus and reviewed by an editor.
        </div>
    );
}
