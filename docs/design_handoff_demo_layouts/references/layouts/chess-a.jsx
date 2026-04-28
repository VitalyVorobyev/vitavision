/* eslint-disable no-undef */
/* Layout A — ChESS: Inspector overlay (canvas-first)
 *
 * UX thesis:
 *   - The diagram IS the interface. Make it huge.
 *   - Controls live in a slim *floating* inspector panel that the user can
 *     collapse, drag, or pin. Readouts are an overlay HUD pinned to the
 *     canvas bottom-left.
 *   - Bottom dock for the few things you change *during* exploration:
 *     pattern, play, scrub.
 *   - Best for: showing the demo to an audience or in an article hero.
 */

function ChessLayoutA() {
  return (
    <div className="page">
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>← Demos</div>
      <h1 className="h-title">ChESS detector response</h1>
      <p className="h-sub">
        Interactive exploration of the ChESS corner-detector response. Inspector lives on top of the canvas — collapse it to see the full pattern.
      </p>
      <div style={{ marginBottom: 18 }}>
        <span className="tag">computer-vision</span>
        <span className="tag">feature-detection</span>
        <span className="tag">interactive</span>
      </div>

      {/* Hero canvas */}
      <div className="panel" style={{ padding: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ display: "grid", placeItems: "center", padding: 8 }}>
          <div style={{ width: "min(100%, 720px)" }}>
            <ChessCanvas size={680} rotationDeg={22.5} />
          </div>
        </div>

        {/* Floating inspector — top right */}
        <aside style={{
          position: "absolute", top: 18, right: 18, width: 280,
          background: "hsl(222 24% 12% / 0.92)",
          border: "1px solid hsl(222 20% 22%)",
          borderRadius: 16, padding: 14, backdropFilter: "blur(8px)",
        }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span className="tinybrow">Inspector</span>
            <div className="row" style={{ gap: 4 }}>
              <button className="btn" style={{ padding: "4px 6px", fontSize: 11 }}>Pin</button>
              <button className="btn" style={{ padding: "4px 6px", fontSize: 11 }}>—</button>
            </div>
          </div>

          <div className="col" style={{ gap: 14 }}>
            <Slider label="Rotation" value="22.5°" pos={0.06} />
            <Slider label="Blur" value="0.18" pos={0.18} />
            <Slider label="Contrast" value="1.08" pos={0.62} />

            <div>
              <div className="tinybrow" style={{ marginBottom: 6 }}>Overlays</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button className="btn active" style={{ fontSize: 12, padding: "6px 8px" }}>Samples</button>
                <button className="btn active" style={{ fontSize: 12, padding: "6px 8px" }}>SR</button>
                <button className="btn" style={{ fontSize: 12, padding: "6px 8px" }}>DR</button>
                <button className="btn active" style={{ fontSize: 12, padding: "6px 8px" }}>MR</button>
              </div>
            </div>
          </div>
        </aside>

        {/* HUD readout — bottom left */}
        <div style={{
          position: "absolute", left: 18, bottom: 60, width: 220,
          background: "hsl(222 24% 12% / 0.9)",
          border: "1px solid hsl(222 20% 22%)",
          borderRadius: 14, padding: 10,
        }}>
          <div className="tinybrow" style={{ marginBottom: 8 }}>Live response</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <Mini label="SR" v="1024.0" />
            <Mini label="DR" v="0.0" />
            <Mini label="MR" v="0.0" />
            <Mini label="R" v="1024.0" pos />
          </div>
          <div style={{ marginTop: 8, fontFamily: "ui-monospace, monospace", fontSize: 10, color: "hsl(210 30% 70%)" }}>
            R = SR − DR − 16·MR
          </div>
        </div>

        {/* Bottom dock */}
        <div style={{
          position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 10,
          background: "hsl(222 24% 12% / 0.92)",
          border: "1px solid hsl(222 20% 22%)",
          borderRadius: 999, padding: "6px 8px", backdropFilter: "blur(8px)",
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn active" style={{ fontSize: 12, borderRadius: 999 }}>Corner</button>
            <button className="btn" style={{ fontSize: 12, borderRadius: 999 }}>Edge</button>
            <button className="btn" style={{ fontSize: 12, borderRadius: 999 }}>Stripe</button>
          </div>
          <div style={{ width: 1, height: 20, background: "hsl(222 20% 22%)" }} />
          <button className="btn-primary btn" style={{ borderRadius: 999, padding: "6px 12px" }}>▶ Play</button>
          <div style={{ width: 220, padding: "0 6px" }}>
            <input type="range" min="0" max="360" defaultValue="22" />
          </div>
          <span className="mono muted" style={{ fontSize: 11 }}>θ = 22.5°</span>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
        <p className="muted" style={{ maxWidth: 640 }}>
          Move the rotation slider to see how SR (sum), DR (diff), and MR (mean) terms react to a true corner. Collapse the inspector for a clean reading view.
        </p>
        <div className="note" style={{ maxWidth: 320 }}>
          <strong style={{ color: "hsl(28 92% 60%)" }}>A — Canvas-first.</strong> Inspector and HUD float over the diagram; bottom dock for live params. Best for hero figures.
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, pos }) {
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{label}</span>
        <span className="mono muted" style={{ fontSize: 11 }}>{value}</span>
      </div>
      <div style={{ position: "relative", height: 4, background: "hsl(222 18% 22%)", borderRadius: 999 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 4, width: `${pos * 100}%`, background: "hsl(28 92% 60%)", borderRadius: 999 }} />
        <div style={{ position: "absolute", left: `calc(${pos * 100}% - 6px)`, top: -4, width: 12, height: 12, background: "hsl(210 30% 95%)", border: "2px solid hsl(28 92% 60%)", borderRadius: 999 }} />
      </div>
    </div>
  );
}

function Mini({ label, v, pos }) {
  return (
    <div className={`metric ${pos ? "r-pos" : ""}`} style={{ padding: "5px 4px" }}>
      <div className="lbl" style={{ fontSize: 9 }}>{label}</div>
      <div className="val" style={{ fontSize: 12, marginTop: 4 }}>{v}</div>
    </div>
  );
}

window.ChessLayoutA = ChessLayoutA;
