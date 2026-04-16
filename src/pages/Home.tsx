import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookMarked, ImagePlus, Grid3x3, FileText } from "lucide-react";
import SeoHead from "../components/seo/SeoHead.tsx";
import VitavisionLogo from "../components/shared/VitavisionLogo";

const tiles = [
    { label: "Blog", icon: FileText, href: "/blog" },
    { label: "Algorithms", icon: BookMarked, href: "/algorithms" },
    { label: "Editor", icon: ImagePlus, href: "/editor" },
    { label: "Targets", icon: Grid3x3, href: "/tools/target-generator" },
];

export default function Home() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 py-6 text-center sm:gap-8 sm:px-6">
            <SeoHead />
            <VitavisionLogo
                variant="full"
                animate
                className="h-16 w-auto text-foreground sm:h-20 md:h-24"
            />
            <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.8 }}
                className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl"
            >
                Vitavision<span className="text-brand">.</span>
            </motion.h1>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 1.0 }}
                className="max-w-[480px] text-sm text-muted-foreground sm:text-base"
            >
                Computer Vision algorithms, interactive tools, technical deep dives.
            </motion.p>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="w-full max-w-2xl"
            >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {tiles.map(({ label, icon: Icon, href }) => (
                        <Link
                            key={href}
                            to={href}
                            className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-surface/70 to-surface/20 px-4 py-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:from-surface/90 hover:to-surface/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--brand)/0.35)]"
                        >
                            <span
                                aria-hidden
                                className="pointer-events-none absolute right-3 top-3 h-1 w-1 rounded-full bg-brand/30 transition-all duration-300 group-hover:bg-brand group-hover:shadow-[0_0_8px_hsl(var(--brand))]"
                            />
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 bg-surface/70 transition-all duration-300 group-hover:border-brand/40 group-hover:bg-surface">
                                <Icon
                                    size={20}
                                    strokeWidth={1.75}
                                    className="text-foreground/80 transition-colors duration-300 group-hover:text-brand"
                                />
                            </span>
                            <span className="text-sm font-semibold tracking-tight text-foreground/90 transition-colors duration-300 group-hover:text-foreground">
                                {label}
                            </span>
                        </Link>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
