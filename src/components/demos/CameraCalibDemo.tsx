const CameraCalibDemo: React.FC = () => {
    const styles = {
        section: {
            display: "grid",
            gap: 12
        },
        title: {
            fontSize: 20,
            fontWeight: 600
        },
        description: {
            color: "var(--muted)",
            fontSize: 14
        },
        placeholder: {
            height: 192,
            border: "1px dashed var(--border)",
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: "var(--bg-soft)"
        },
        placeholderText: {
            color: "var(--muted)"
        }
    };

    return (
        <section style={styles.section}>
            <h3 style={styles.title}>
                Planar Calibration Sandbox
            </h3>
            <p style={styles.description}>
                Visualize chessboard detections, reprojection error, and undistortion (placeholder UI).
            </p>
            <div style={styles.placeholder}>
                <span style={styles.placeholderText}>
                    Hook up your CV pipeline here
                </span>
            </div>
        </section>
    );
};

export default CameraCalibDemo;
