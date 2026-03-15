import { useEditorStore } from "../../store/editor/useEditorStore";
import type { SampleId } from "../../store/editor/useEditorStore";
import { Plus, Image as ImageIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function EditorGallery() {
    const {
        galleryImages,
        addGalleryImage,
        setImage,
        setGalleryMode,
        setFeatures,
        setZoom,
        setPan,
    } = useEditorStore();

    const handleFileUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) {
                return;
            }

            const url = URL.createObjectURL(file);
            addGalleryImage({
                id: uuidv4(),
                src: url,
                name: file.name,
                sampleId: 'upload',
            });
        };
        input.click();
    };

    const handleSelectImage = (src: string, name: string, sampleId: SampleId) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            setImage(src, img.width, img.height, name, sampleId);
            setFeatures([]);
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setGalleryMode(false);
        };
        img.onerror = () => {
            alert("Failed to load image");
        };
    };

    return (
        <div className="flex-1 bg-muted/10 p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Image Gallery</h1>
                        <p className="text-muted-foreground mt-1">Select an image to start exploring algorithms.</p>
                    </div>
                    <button
                        onClick={handleFileUpload}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors shadow-xs"
                    >
                        <Plus size={18} />
                        Upload Image
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {galleryImages.map((img) => (
                        <div
                            key={img.id}
                            onClick={() => handleSelectImage(img.src, img.name, img.sampleId)}
                            className="group cursor-pointer rounded-xl border border-border bg-background overflow-hidden hover:shadow-md transition-all hover:border-primary/50 flex flex-col"
                        >
                            <div className="aspect-video relative overflow-hidden bg-muted flex items-center justify-center">
                                <img
                                    src={img.src}
                                    alt={img.name}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <div className="p-4 flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0 mt-0.5">
                                    <ImageIcon size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="font-medium truncate block">{img.name}</span>
                                    {img.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{img.description}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
