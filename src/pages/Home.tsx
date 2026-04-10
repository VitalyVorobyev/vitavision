import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead.tsx";
import VitavisionLogo from "../components/shared/VitavisionLogo";

export default function Home() {
    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center space-y-8 px-4 text-center sm:px-6">
            <SeoHead />
            <VitavisionLogo
                variant="full"
                animate
                className="h-28 w-auto text-foreground sm:h-28 md:h-32"
            />
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
                className="text-5xl font-bold tracking-tighter md:text-7xl"
            >
                Vitavision<span className="text-brand">.</span>
            </motion.h1>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                className="max-w-[600px] text-base text-muted-foreground sm:text-lg"
            >
                Computer Vision algorithms, interactive tools, and technical deep dives into pixels and models.
            </motion.p>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
            >
                <Link to="/editor" className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-all hover:scale-105 hover:bg-foreground/90 active:scale-95">
                    Open Editor
                </Link>
                <Link to="/tools/target-generator" className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-all hover:scale-105 hover:bg-foreground/90 active:scale-95">
                    Target Generator
                </Link>
                <Link to="/blog" className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-all hover:scale-105 hover:bg-foreground/90 active:scale-95">
                    Read Blog
                </Link>
            </motion.div>
        </div>
    );
}
