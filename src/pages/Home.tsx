import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SeoHead from "../components/seo/SeoHead.tsx";
import VitavisionLogo from "../components/shared/VitavisionLogo";
import {
    SpecBlog,
    SpecAlgorithms,
    SpecEditor,
    SpecTargets,
    type SpecProps,
} from "../components/home/specimens";

type Tile = {
    label: string;
    href: string;
    Spec: React.ComponentType<SpecProps>;
};

const tiles: Tile[] = [
    { label: "Blog",       href: "/blog",                   Spec: SpecBlog },
    { label: "Algorithms", href: "/algorithms",             Spec: SpecAlgorithms },
    { label: "Editor",     href: "/editor",                 Spec: SpecEditor },
    { label: "Targets",    href: "/tools/target-generator", Spec: SpecTargets },
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
                    {tiles.map(({ label, href, Spec }) => (
                        <Link
                            key={href}
                            to={href}
                            className="group relative flex min-h-[116px] flex-col overflow-hidden rounded-xl border border-border/70 bg-surface/80 px-3.5 pb-3.5 pt-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/45 hover:shadow-[0_10px_28px_-16px_hsl(var(--brand)/0.5)] focus-visible:border-brand/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                        >
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                                style={{
                                    background:
                                        "radial-gradient(120% 80% at 100% 0%, hsl(var(--brand) / 0.14), transparent 60%)",
                                }}
                            />
                            <div className="relative flex h-10 items-center">
                                <Spec />
                            </div>
                            <div className="relative mt-auto flex items-end justify-between pt-3">
                                <span className="text-[13px] font-semibold tracking-tight text-foreground">
                                    {label}
                                </span>
                                <ArrowRight
                                    size={14}
                                    strokeWidth={2}
                                    aria-hidden
                                    className="-translate-x-1 text-muted-foreground/80 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-brand group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:text-brand group-focus-visible:opacity-100"
                                />
                            </div>
                        </Link>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
