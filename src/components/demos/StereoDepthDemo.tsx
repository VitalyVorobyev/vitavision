const StereoDepthDemo: React.FC = () => {
    const styles = {
        section: { display: "grid", gap: 12 },
        header: { fontSize: 20, fontWeight: 600 },
        paragraph: { color: "var(--muted)", fontSize: 14 },
        container: { height: 192, border: "1px dashed var(--border)", borderRadius: 16, display: "grid", placeItems: "center", background: "var(--bg-soft)" },
        mutedText: { color: "var(--muted)" }
    };

    return (
        <section style={styles.section}>
            <h3 style={styles.header}>
                Stereo Disparity Explorer
            </h3>
            <p style={styles.paragraph}>
                Load rectified pair → compute disparity & visualize point cloud (placeholder UI).
            </p>
            <div style={styles.container}>
                <span style={styles.mutedText}>
                    Add your WebAssembly/OpenCV.js here
                </span>
            </div>
        </section>
    );
};

export default StereoDepthDemo;
