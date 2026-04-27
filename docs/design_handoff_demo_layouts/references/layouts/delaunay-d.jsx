/* eslint-disable no-undef */
/* Layout D — Delaunay: Floating tool palette
 *
 * UX thesis:
 *   - The canvas is the whole page. A vertical *tool palette* on the left
 *     (Figma-style) holds modes: Add, Move, Delete, Grid-warp.
 *   - Floating layer chips on top — one click to toggle.
 *   - Stats live in a bottom-right HUD card.
 *   - Hover detail follows the cursor as a tooltip card.
 *   - Best for: spatial / direct-manipulation feel, big screens.
 */

function DelaunayLayoutD() {
  return (
    <div className="page">
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>← Demos</div>
      <h1 className="h-title">Delaunay & Voronoi</h1>
      <p className="h-sub">
        Direct-manipulation layout — vertical tool palette, floating layer chips, stats HUD. Designed to feel like a spatial editor where the canvas is the document.
      </p>

      <div className="panel" style={{ position: "relative", padding: 0, overflow: "hidden" }}>
        <DelaunayCanvas width={1000} height={620} showDelaunay showCircles={false} showGrid={false} />

        {/* Tool palette (left) */}
        <div style={{
          position: "absolute", top: 16, left: 16,
          display: "flex", flexDirection: "column", gap: 4, padding: 6,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 14, backdropFilter: "blur(8px)",
        }}>
          {[
            { i: "+", t: "Add point", k: "A", on: true },
            { i: "↔", t: "Move", k: "V" },
            { i: "✕", t: "Delete", k: "⌫" },
            { i: "▦", t: "Grid warp", k: "G" },
            { i: "⊙", t: "Hover info", k: "H" },
          ].map((tool) => (
            <button key={tool.t} className={`btn ${tool.on ? "active" : ""}`}
              title={`${tool.t} (${tool.k})`}
              style={{ width: 40, height: 40, padding: 0, fontSize: 16 }}>
              {tool.i}
            </button>
          ))}
          <div style={{ height: 1, background: "hsl(222 20% 22%)", margin: "4px 6px" }} />
          <button className="btn" style={{ width: 40, height: 40, padding: 0 }} title="Random 30">⚂</button>
          <button className="btn" style={{ width: 40, height: 40, padding: 0 }} title="Clear">⌫</button>
        </div>

        {/* Grid config popover (anchored to the Grid-warp tool) */}
        <div style={{
          position: "absolute", top: 16, left: 70, width: 220,
          background: "hsl(222 24% 12% / 0.95)", border: "1px solid hsl(28 92% 60% / 0.45)",
          borderRadius: 14, padding: 12, backdropFilter: "blur(8px)",
          boxShadow: "0 12px 30px -16px rgba(0,0,0,0.6)",
        }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <span className="tinybrow">Grid · 6 × 9</span>
            <button className="btn" style={{ padding: "2px 6px", fontSize: 10 }}>×</button>
          </div>
          <div className="col" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: 12 }}>Rows</span>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn" style={{ width: 22, height: 22, padding: 0, fontSize: 14 }}>−</button>
                <input type="number" defaultValue={6} style={{ width: 44, textAlign: "center" }} />
                <button className="btn" style={{ width: 22, height: 22, padding: 0, fontSize: 14 }}>+</button>
              </div>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: 12 }}>Cols</span>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn" style={{ width: 22, height: 22, padding: 0, fontSize: 14 }}>−</button>
                <input type="number" defaultValue={9} style={{ width: 44, textAlign: "center" }} />
                <button className="btn" style={{ width: 22, height: 22, padding: 0, fontSize: 14 }}>+</button>
              </div>
            </div>
            <button className="btn" style={{ fontSize: 12 }}>Reset corners</button>
          </div>
        </div>

        {/* Layer chips (top) */}
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 6, padding: 6,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 999, backdropFilter: "blur(8px)",
        }}>
          <button className="btn active" style={{ borderRadius: 999, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "hsl(210 30% 95%)", display: "inline-block", marginRight: 6 }}></span>
            Delaunay
          </button>
          <button className="btn" style={{ borderRadius: 999, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "hsl(180 60% 55%)", display: "inline-block", marginRight: 6 }}></span>
            Voronoi
          </button>
          <button className="btn" style={{ borderRadius: 999, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "hsl(28 92% 60%)", display: "inline-block", marginRight: 6 }}></span>
            Circumcircles
          </button>
          <button className="btn" style={{ borderRadius: 999, fontSize: 12 }}>Grid</button>
        </div>

        {/* Stats HUD (bottom-right) */}
        <div style={{
          position: "absolute", bottom: 16, right: 16, width: 240,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 14, padding: 10, backdropFilter: "blur(8px)",
        }}>
          <div className="tinybrow" style={{ marginBottom: 8 }}>Stats</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <Mini label="Points" v="15" />
            <Mini label="Tris" v="22" />
            <Mini label="Edges" v="36" />
            <Mini label="Min ∠" v="24.7°" good />
          </div>

          {/* NEW: live pose readout */}
          <div className="tinybrow" style={{ marginTop: 12, marginBottom: 6 }}>Camera pose</div>
          <div className="panel-flat" style={{ padding: 8 }}>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 11 }}>
              <span className="muted mono">yaw</span>
              <span className="mono">−18.4°</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 11 }}>
              <span className="muted mono">pitch</span>
              <span className="mono">12.7°</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 11 }}>
              <span className="muted mono">roll</span>
              <span className="mono">2.1°</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 11, marginTop: 4, paddingTop: 4, borderTop: "1px solid hsl(222 20% 22%)" }}>
              <span className="muted mono">f / focal</span>
              <span className="mono">847 px</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 11 }}>
              <span className="muted mono">reproj. err</span>
              <span className="mono" style={{ color: "hsl(152 60% 75%)" }}>0.42 px</span>
            </div>
          </div>

          {/* tiny visual horizon */}
          <div style={{ marginTop: 8, position: "relative", height: 36, background: "hsl(222 22% 14%)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{
              position: "absolute", left: "50%", top: 0, bottom: 0, width: 1,
              background: "hsl(28 92% 60% / 0.3)",
            }} />
            <div style={{
              position: "absolute", left: 0, right: 0, top: "50%", height: 1,
              background: "hsl(28 92% 60% / 0.3)",
            }} />
            <div style={{
              position: "absolute", left: "30%", top: "20%",
              transform: "rotate(2deg)",
              width: "40%", height: 1,
              background: "hsl(28 92% 60%)",
            }} />
            <div style={{
              position: "absolute", left: 6, bottom: 4,
              fontFamily: "ui-monospace, monospace", fontSize: 9,
              color: "hsl(210 12% 60%)",
            }}>horizon</div>
          </div>
        </div>

        {/* Hover tooltip example (bottom-left) */}
        <div style={{
          position: "absolute", bottom: 16, left: 80, width: 220,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 14, padding: 10, backdropFilter: "blur(8px)",
        }}>
          <div className="tinybrow" style={{ marginBottom: 6 }}>Hover</div>
          <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
            <span className="muted">triangle #14</span>
            <span className="mono">area 0.0182</span>
          </div>
          <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
            <span className="muted">min angle</span>
            <span className="mono" style={{ color: "hsl(152 60% 75%)" }}>32.4°</span>
          </div>
        </div>

        {/* Coord readout (top-right) */}
        <div style={{
          position: "absolute", top: 16, right: 16,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 12, padding: "6px 10px", backdropFilter: "blur(8px)",
          fontFamily: "ui-monospace, monospace", fontSize: 11,
        }}>
          <span className="muted">x</span> 412 &nbsp; <span className="muted">y</span> 287
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span className="pill"><span className="kbd">A</span> add</span>
        <span className="pill"><span className="kbd">V</span> move</span>
        <span className="pill"><span className="kbd">⌫</span> delete selected</span>
        <span className="pill"><span className="kbd">G</span> grid warp</span>
        <span className="pill"><span className="kbd">R</span> random 30</span>
      </div>

      <div className="note" style={{ marginTop: 14 }}>
        <strong style={{ color: "hsl(28 92% 60%)" }}>D — Floating tool palette.</strong> Modal tools (Figma-style), layer chips, HUD. The canvas owns the screen.
      </div>
    </div>
  );
}

function Mini({ label, v, good }) {
  return (
    <div className="metric" style={{ padding: "5px 4px", borderColor: good ? "hsl(152 60% 48% / 0.4)" : undefined, background: good ? "hsl(152 60% 48% / 0.10)" : undefined }}>
      <div className="lbl" style={{ fontSize: 9 }}>{label}</div>
      <div className="val" style={{ fontSize: 12, marginTop: 4, color: good ? "hsl(152 60% 80%)" : undefined }}>{v}</div>
    </div>
  );
}

window.DelaunayLayoutD = DelaunayLayoutD;
