import Card from "../components/ui/Card";

const ExperienceCard = ({ role, company, period, bullets }: { role: string; company: string; period: string; bullets: React.ReactNode[] }) => {
    return (
        <div style={{ position: "relative", paddingLeft: 16 }}>
            <div style={{ position: "absolute", left: 0, top: 6, height: 8, width: 8, borderRadius: 99, background: "var(--primary)" }} />
            <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 600 }}>{role} — {company}</div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>{period}</div>
            </div>
            <ul style={{ margin: "8px 0 0 18px", color: "var(--muted)", fontSize: 14, padding: 0 }}>
                {bullets.map(b => <li key={`${company}-${role}-${b}`}>{b}</li>)}
            </ul>
        </div>
    );
};

const Experience = () => {
    const experience = [
        {
            role: "Team Lead Embedded Software Development",
            company: "QUISS GmbH",
            period: "2024 — present",
            bullets: [
                "Architected system with expandable services-based architecture",
                "Developed cross-platform applications leveraging Tauri, React.JS and TypeScript",
                "Spearheading development team with Agile methodologies and CI/CD practices"
            ]
        },
        {
            role: "Software Developer",
            company: "QUISS GmbH",
            period: "2022 — 2024",
            bullets: [
                "Implemented high-performance image processing algorithms using C++ and OpenCV for contour detection and pattern matching",
                "Developed cross-platform applications with Qt framework",
                "Developed calibration systems for vision sensors, multicamera arrays, laser triangulation 3D sensors, and hand-eye calibration",
                "Utilized GenICam standard for robust machine vision implementation",
                "Working with cobots and industrial KUKA robots",
                "Designed and implemented computational geometry algorithms for point cloud processing and surface triangulation"
            ]
        },
        {
            role: "Teacher/Lecturer/Head of Chair",
            company: "Novosibirsk State University",
            period: "2011 — 2022",
            bullets: [
                "Delivered courses on physics and algorithms with C++ and Python",
                "Mentored students through bachelor and master thesis projects"
            ]
        },
        {
            role: "Researcher/Senior Researcher",
            company: "Budker Institute of Nuclear Physics",
            period: "2009 — 2022",
            bullets: [
                <>Conducted advanced research in particle physics, publishing findings in peer-reviewed journals and conferences (e.g. {' '}
                    <a href="https://arxiv.org/abs/1004.2350" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>[1]</a>,
                    <a href="https://arxiv.org/abs/1607.05813" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>[2]</a>)
                </>,
                "Performed state-of-the-art statistical data analysis and developed detailed Monte-Carlo simulations of particle detectors",
                <>Contributed as active member of international research collaborations: {' '}
                <a href="https://en.wikipedia.org/wiki/Belle_experiment" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Belle, Belle II</a>, {' '}
                <a href="https://en.wikipedia.org/wiki/LHCb_experiment" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>LHCb</a>, {' '}
                <a href="https://en.wikipedia.org/wiki/Particle_Data_Group" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Particle Data Group</a></>,
                <>Led Work Package 5 of the European Commission project {' '}
                <a href="https://www.cremlinplus.eu/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>CremlinPlus</a></>
            ]
        }
    ]

    return (
        <Card>
            <div className="card-header">
                <h3 style={{ margin: 0, fontWeight: 600 }}>
                    Experience
                </h3>
            </div>
            <div className="card-content" style={{ display: "grid", gap: 16 }}>
                {experience.map(e => <ExperienceCard key={`${e.company}-${e.role}`} {...e} />)}
            </div>
        </Card>
    );
};

const Skills = () => {
    const skills = [
        "C++",
        "algorithms",
        "math",
        "Python",
        "TypeScript",
        "Linux",
        "CMake",
        "OpenCV",
        "Eigen",
        "Pytorch",
        "React",
        "Rust",
        "Tauri",
        "Zenoh",
        "Docker"
    ];

    return (
        <Card>
            <div className="card-header">
                <h3 style={{ margin: 0, fontWeight: 600 }}>
                    Skills
                </h3>
            </div>
            <div className="card-content" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {skills.map(s => <span key={s} className="badge secondary">{s}</span>)}
            </div>
        </Card>
    );
};

const Education = () => {
    return (
        <Card>
            <div className="card-header">
                <h3 style={{ margin: 0, fontWeight: 600 }}>
                    Education
                </h3>
            </div>
            <div className="card-content">
                <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    B.Sc. in Physics (Novosibirsk State University, 2009)
                </div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    M.Sc. in Particle Physics (Novosibirsk State University, 2011)
                </div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    PhD in Particle Physics (Budker Institute of Nuclear Physics, 2026)
                </div>
            </div>
        </Card>
    );
};

const CvPage: React.FC = () => {
    return (
        <div style={{ display: "grid", gap: 24 }}>
            <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
                    Curriculum Vitae
                </h1>
                <p style={{ color: "var(--muted)", marginTop: 6 }}>
                    Compact overview; ask for full PDF for details.
                </p>
            </div>

            <Experience />
            <Skills />
            <Education />
        </div>
    );
};

export default CvPage;
