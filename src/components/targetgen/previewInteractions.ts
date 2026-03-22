export function isPreviewOverlayTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest("[data-preview-overlay]") !== null;
}
