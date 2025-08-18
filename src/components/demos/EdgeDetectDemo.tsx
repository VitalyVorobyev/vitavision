
const EdgeDetectDemo: React.FC = () => {
    const styles = {
        section: {
            display: "grid",
            gap: 12
        },
        heading: {
            fontSize: 20,
            fontWeight: 600
        },
        paragraph: {
            color: "var(--muted)",
            fontSize: 14
        },
        dropArea: {
            height: 192,
            border: "1px dashed var(--border)",
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: "var(--bg-soft)"
        },
        comingSoon: {
            color: "var(--muted)"
        }
    }

    return (
        <section style={styles.section}>
            <h3 style={styles.heading}>
                Sobel Edge Preview
            </h3>
            <p style={styles.paragraph}>
                Drop an image to run a simple Sobel filter in a WebWorker (placeholder).
            </p>
            <div style={styles.dropArea}>
                <span style={styles.comingSoon}>
                    Coming soon - plug in your WASM / WebGL kernel
                </span>
            </div>
        </section>
    );
};

export default EdgeDetectDemo;
