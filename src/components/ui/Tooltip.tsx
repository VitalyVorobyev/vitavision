import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    side?: "top" | "right" | "bottom" | "left";
    delayDuration?: number;
}

export default function Tooltip({ children, content, side = "right", delayDuration = 200 }: TooltipProps) {
    return (
        <TooltipPrimitive.Root delayDuration={delayDuration}>
            <TooltipPrimitive.Trigger asChild>
                {children}
            </TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    side={side}
                    sideOffset={8}
                    className="z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95"
                >
                    {content}
                    <TooltipPrimitive.Arrow className="fill-foreground" />
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}
