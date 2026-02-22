import { motion } from "framer-motion";

const SKILLS = ["Computer vision", "Machine learning", "Algorithms", "C++", "Rust", "Python", "TypeScript", "React"];

const CAREER = [
    { role: "", place: "QUISS GmbH", period: "2022 – present" },
    { role: "Lecturer", place: "Novosibirsk State University", period: "2011 – 2022" },
    { role: "Particle Physics", place: "Budker Institute of Nuclear Physics", period: "2009 – 2022" },
];

export default function About() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-3xl mx-auto px-6 py-16"
        >
            {/* Two-column on md+, stacked on mobile */}
            <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-start">

                {/* Photo */}
                <div className="w-full flex justify-center md:block md:w-auto shrink-0">
                    <img
                        src="/VVAvatar.png"
                        alt="Vitaly Vorobyev"
                        className="w-52 md:w-64 aspect-square object-cover rounded-2xl border border-border"
                    />
                </div>

                {/* Text column */}
                <div className="flex flex-col gap-6 min-w-0">

                    {/* Name + role */}
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                            Vitaly Vorobyev (PhD)
                        </h1>
                        <p className="mt-1 text-accent font-medium">
                            Team Lead · Computer Vision · QUISS GmbH
                        </p>
                    </div>

                    {/* Bio */}
                    <div className="space-y-4 text-muted-foreground leading-7">
                        <p>
                            I build computer vision systems for industrial inspection. My path started
                            in particle physics research at the Budker Institute in Novosibirsk, where
                            I spent over a decade on detectors, data analysis, and simulation. That
                            background shaped how I think about measurement, uncertainty, and precision.
                        </p>
                        <p>
                            Today I lead a team at QUISS GmbH working on machine-vision algorithms and products.
                            I also built vitavision — this tool — to explore and
                            prototype CV ideas directly in the browser.
                        </p>
                    </div>

                    {/* Skills chips */}
                    <div className="flex flex-wrap gap-2">
                        {SKILLS.map((skill) => (
                            <span
                                key={skill}
                                className="bg-accent-soft text-accent text-sm rounded-full px-3 py-1 font-medium"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>

                    {/* Career highlights */}
                    <ul className="space-y-2">
                        {CAREER.map(({ role, place, period }) => (
                            <li key={role} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                                <span className="text-foreground text-sm font-medium">
                                    {role} · {place}
                                </span>
                                <span className="text-accent-2 text-xs sm:ml-auto shrink-0">
                                    {period}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    );
}
