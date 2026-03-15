import { useEffect, useRef, type ComponentType } from "react";
import { X } from "lucide-react";

import type { AlgorithmConfigFormProps } from "../algorithms/types";

interface ConfigModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    ConfigComponent: ComponentType<AlgorithmConfigFormProps<unknown>>;
    config: unknown;
    onChange: (next: unknown) => void;
    disabled: boolean;
}

export default function ConfigModal({ open, onClose, title, ConfigComponent, config, onChange, disabled }: ConfigModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        if (open && !el.open) {
            el.showModal();
        } else if (!open && el.open) {
            el.close();
        }
    }, [open]);

    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        const handleClose = () => onClose();
        el.addEventListener("close", handleClose);
        return () => el.removeEventListener("close", handleClose);
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
        if (e.target === dialogRef.current) {
            onClose();
        }
    };

    return (
        <dialog
            ref={dialogRef}
            onClick={handleBackdropClick}
            className="backdrop:bg-black/60 bg-transparent p-0 m-auto max-w-2xl w-[calc(100vw-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden rounded-xl"
        >
            <div className="bg-background border border-border rounded-xl shadow-xl flex flex-col max-h-[calc(100vh-4rem)]">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
                    <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="overflow-y-auto p-5 space-y-3 [&_section]:bg-background">
                    <ConfigComponent
                        config={config}
                        onChange={onChange}
                        disabled={disabled}
                        modal
                    />
                </div>
            </div>
        </dialog>
    );
}
