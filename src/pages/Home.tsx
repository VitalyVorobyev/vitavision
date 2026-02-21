import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 px-4">
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-5xl md:text-7xl font-bold tracking-tighter"
            >
                Vitavision.
            </motion.h1>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="max-w-[600px] text-lg text-muted-foreground"
            >
                Computer Vision algorithms, interactive tools, and technical deep dives into pixels and models.
            </motion.p>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex space-x-4"
            >
                <Link to="/editor" className="px-6 py-3 bg-foreground text-background font-medium rounded-full hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95">
                    Open Editor
                </Link>
                <Link to="/blog" className="px-6 py-3 border border-border font-medium rounded-full hover:bg-muted transition-all hover:scale-105 active:scale-95">
                    Read Blog
                </Link>
            </motion.div>
        </div>
    );
}
