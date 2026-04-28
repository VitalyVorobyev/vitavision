/* eslint-disable no-undef */
/* Mobile ChESS — three variants:
 *   M1 stacked (canvas on top, params below, readout last)
 *   M2 tabbed (one screen at a time: Diagram / Params / Readout)
 *   M3 full-bleed canvas + slide-up bottom sheet
 *
 * All sized to render inside an iOS frame (390 × ~720 visible).
 */

function ChessMobileV1() {
  return (
    <div style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))", minHeight: "100%", padding: 14, paddingBottom: 28 }}>
      <div className="muted" style={{ fontSize: 12 }}>← Demos</div>
      <h1 style={{ margin: "4px 0 4px 0", fontSize: 22, fontWeight: 600 }}>ChESS detector</h1>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 12px 0" }}>
        Adjust rotation, blur, and contrast to see SR / DR / MR shape the score.
      </p>

      {/* canvas */}
      <div className="panel" style={{ padding: 8 }}>
        <ChessCanvas size={360} />
        <div className="row" style={{ justifyContent: "center", marginTop: 8, gap: 6, flexWrap: "wrap" }}>
          <span className="pill" style={{ fontSize: 10, padding: "2px 8px", borderColor: "hsl(152 60% 48% / 0.4)", color: "hsl(152 60% 75%)" }}>strong corner</span>
          <span className="pill" style={{ fontSize: 10, padding: "2px 8px" }}>θ = 22.5°</span>
        </div>
      </div>

      {/* readout chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
        <Mini label="SR" v="1024" />
        <Mini label="DR" v="0.0" />
        <Mini label="MR" v="0.0" />
        <Mini label="R" v="1024" pos />
      </div>

      {/* pattern */}
      <div className="tinybrow" style={{ marginTop: 14, marginBottom: 6 }}>Pattern</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <button className="btn active" style={{ padding: "10px 0" }}>Corner</button>
        <button className="btn" style={{ padding: "10px 0" }}>Edge</button>
        <button className="btn" style={{ padding: "10px 0" }}>Stripe</button>
      </div>

      {/* sliders */}
      <div className="panel-flat" style={{ marginTop: 12, padding: 12 }}>
        <SliderRow label="Rotation" v="22.5°" pos={0.06} />
        <SliderRow label="Blur" v="0.18" pos={0.18} />
        <SliderRow label="Contrast" v="1.08" pos={0.62} />
      </div>

      {/* play */}
      <button className="btn-primary btn" style={{ width: "100%", marginTop: 12, padding: "12px 0", fontSize: 14, borderRadius: 12 }}>
        ▶  Play rotation
      </button>

      {/* overlays — collapsible */}
      <details style={{ marginTop: 12, border: "1px solid hsl(var(--border))", borderRadius: 12, background: "hsl(var(--surface))" }}>
        <summary style={{ padding: "10px 12px", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>Overlays</span>
          <span className="muted" style={{ fontSize: 11 }}>4 toggles ▾</span>
        </summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "0 12px 12px 12px" }}>
          <button className="btn active">Samples</button>
          <button className="btn active">SR</button>
          <button className="btn">DR</button>
          <button className="btn active">MR</button>
        </div>
      </details>
    </div>
  );
}

function ChessMobileV2() {
  const [tab, setTab] = React.useState("diagram");
  return (
    <div style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 14px 8px 14px" }}>
        <div className="muted" style={{ fontSize: 12 }}>← Demos</div>
        <h1 style={{ margin: "4px 0", fontSize: 20, fontWeight: 600 }}>ChESS detector</h1>
      </div>

      <div style={{ flex: 1, padding: "0 14px", overflowY: "auto", paddingBottom: 80 }}>
        {tab === "diagram" && (
          <div className="panel" style={{ padding: 8 }}>
            <ChessCanvas size={360} />
            <div className="row" style={{ justifyContent: "center", marginTop: 8, gap: 6, flexWrap: "wrap" }}>
              <span className="pill" style={{ fontSize: 10, padding: "2px 8px", borderColor: "hsl(152 60% 48% / 0.4)", color: "hsl(152 60% 75%)" }}>R = 1024</span>
              <span className="pill" style={{ fontSize: 10, padding: "2px 8px" }}>θ = 22.5°</span>
              <span className="pill" style={{ fontSize: 10, padding: "2px 8px" }}>corner</span>
            </div>
          </div>
        )}
        {tab === "params" && (
          <div className="col" style={{ gap: 12 }}>
            <div className="tinybrow" style={{ marginTop: 4 }}>Pattern</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <button className="btn active" style={{ padding: "10px 0" }}>Corner</button>
              <button className="btn" style={{ padding: "10px 0" }}>Edge</button>
              <button className="btn" style={{ padding: "10px 0" }}>Stripe</button>
            </div>
            <div className="panel-flat" style={{ padding: 12 }}>
              <SliderRow label="Rotation" v="22.5°" pos={0.06} />
              <SliderRow label="Blur" v="0.18" pos={0.18} />
              <SliderRow label="Contrast" v="1.08" pos={0.62} />
            </div>
            <button className="btn-primary btn" style={{ width: "100%", padding: "12px 0", fontSize: 14, borderRadius: 12 }}>▶  Play rotation</button>
            <div className="tinybrow">Overlays</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button className="btn active">Samples</button>
              <button className="btn active">SR</button>
              <button className="btn">DR</button>
              <button className="btn active">MR</button>
            </div>
          </div>
        )}
        {tab === "readout" && (
          <div className="col" style={{ gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              <Mini label="SR" v="1024" />
              <Mini label="DR" v="0.0" />
              <Mini label="MR" v="0.0" />
              <Mini label="R" v="1024" pos />
            </div>
            <div className="panel-flat" style={{ padding: 10 }}>
              <div className="tinybrow" style={{ marginBottom: 6 }}>Sum response</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {["#f9a04a", "#7da7ff", "#9b7dff", "#36c4a8"].map((c, i) => (
                  <div key={i} className="panel-flat" style={{ padding: 6 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="mono" style={{ fontSize: 10, color: c }}>φ{i}</span>
                      <span className="mono" style={{ fontSize: 11 }}>256.0</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mono muted" style={{ fontSize: 11, textAlign: "center", marginTop: 4 }}>
              R = SR − DR − 16·MR
            </div>
          </div>
        )}
      </div>

      {/* bottom tab bar */}
      <div style={{
        position: "sticky", bottom: 0,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        background: "hsl(var(--surface))", borderTop: "1px solid hsl(var(--border))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {[
          { k: "diagram", l: "Diagram", i: "◇" },
          { k: "params", l: "Params", i: "≡" },
          { k: "readout", l: "Readout", i: "Σ" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{
              background: "transparent", border: "none",
              padding: "12px 0",
              color: tab === t.k ? "hsl(28 92% 60%)" : "hsl(210 12% 60%)",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
            <span style={{ fontSize: 16 }}>{t.i}</span>
            <span style={{ fontSize: 10, letterSpacing: "0.04em" }}>{t.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChessMobileV3() {
  return (
    <div style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))", minHeight: "100%", position: "relative", overflow: "hidden" }}>
      {/* full-bleed canvas */}
      <div style={{ padding: 14, paddingBottom: 320 }}>
        <div className="muted" style={{ fontSize: 12 }}>← Demos</div>
        <h1 style={{ margin: "4px 0 12px 0", fontSize: 22, fontWeight: 600 }}>ChESS detector</h1>
        <ChessCanvas size={360} />

        {/* top-right floating R chip */}
        <div style={{
          position: "absolute", top: 50, right: 16,
          background: "hsl(152 60% 48% / 0.16)", border: "1px solid hsl(152 60% 48% / 0.4)",
          borderRadius: 10, padding: "6px 10px",
        }}>
          <div className="tinybrow" style={{ fontSize: 9, color: "hsl(152 60% 75%)" }}>R</div>
          <div className="mono" style={{ fontSize: 16, color: "hsl(152 60% 80%)", fontWeight: 600 }}>1024</div>
        </div>
      </div>

      {/* slide-up sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: "hsl(var(--surface))",
        borderTop: "1px solid hsl(var(--border))",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -10px 30px -16px rgba(0,0,0,0.5)",
        padding: "8px 14px 18px 14px",
        maxHeight: 380, overflowY: "auto",
      }}>
        {/* drag handle */}
        <div style={{ width: 40, height: 4, background: "hsl(var(--border-strong))", borderRadius: 999, margin: "4px auto 12px auto" }} />

        {/* mini metrics row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          <Mini label="SR" v="1024" />
          <Mini label="DR" v="0.0" />
          <Mini label="MR" v="0.0" />
          <Mini label="R" v="1024" pos />
        </div>

        {/* pattern segmented */}
        <div style={{ marginTop: 12, padding: 4, background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 999, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          {["Corner", "Edge", "Stripe"].map((p, i) => (
            <button key={p} className={i === 0 ? "btn-primary btn" : "btn"} style={{ borderRadius: 999, padding: "6px 0", fontSize: 12, border: "none", background: i === 0 ? "hsl(28 92% 60% / 0.16)" : "transparent" }}>
              {p}
            </button>
          ))}
        </div>

        {/* sliders */}
        <div style={{ marginTop: 12 }}>
          <SliderRow label="Rotation" v="22.5°" pos={0.06} />
          <SliderRow label="Blur" v="0.18" pos={0.18} />
          <SliderRow label="Contrast" v="1.08" pos={0.62} />
        </div>

        {/* row of icon buttons */}
        <div className="row" style={{ marginTop: 12, gap: 6 }}>
          <button className="btn-primary btn" style={{ flex: 1, padding: "10px 0", borderRadius: 12 }}>▶ Play</button>
          <button className="btn" style={{ width: 44, height: 40, padding: 0 }}>⟲</button>
          <button className="btn" style={{ width: 44, height: 40, padding: 0 }}>⚙</button>
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, v, pos }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{label}</span>
        <span className="mono muted" style={{ fontSize: 11 }}>{v}</span>
      </div>
      <div style={{ position: "relative", height: 6, background: "hsl(222 18% 22%)", borderRadius: 999 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 6, width: `${pos * 100}%`, background: "hsl(28 92% 60%)", borderRadius: 999 }} />
        <div style={{ position: "absolute", left: `calc(${pos * 100}% - 9px)`, top: -6, width: 18, height: 18, background: "hsl(210 30% 95%)", border: "2px solid hsl(28 92% 60%)", borderRadius: 999 }} />
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

window.ChessMobileV1 = ChessMobileV1;
window.ChessMobileV2 = ChessMobileV2;
window.ChessMobileV3 = ChessMobileV3;
