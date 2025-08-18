import Card from "../components/ui/Card";

const ExperienceCard = ({ role, company, period, bullets }: { role: string; company: string; period: string; bullets: string[] }) => {
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
            role: "Product Owner / CV Engineer",
            company: "QUICK Calibration Kit",
            period: "2025 — present",
            bullets: [
                "Architected modular services for sensor/robot/calibration with Zenoh IPC.",
                "Designed discovery & event-driven observers for UI sync.",
                "Prototyped calibration UIs and demo sandboxes.",
            ]
        },
        {
            role: "Computer Vision Engineer",
            company: "Industrial Inspection",
            period: "2022 — 2025",
            bullets: [
                "Ellipse detection & geometric feature pipelines (C++/OpenCV).",
                "Real-time streaming and WASM visualization tools.",
            ]
        },
    ];

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
        "Rust",
        "Python",
        "TypeScript",
        "OpenCV",
        "Eigen",
        "Pytorch",
        "React",
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
                    M.Sc. (or equivalent) in Computer Science / Applied Math
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
