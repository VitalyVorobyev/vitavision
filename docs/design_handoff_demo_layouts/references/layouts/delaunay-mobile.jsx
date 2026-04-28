/* eslint-disable no-undef */
/* Mobile Delaunay — three variants:
 *   M1 full-bleed canvas + bottom tool dock + corner pose chip
 *   M2 bottom sheet with tabs (Tools / Layers / Stats / Pose)
 *   M3 focus mode — long-press to add, edge-rail for tools, mini stats
 */

function DelaunayMobileV1() {
  return (
    <div style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))", minHeight: "100%", position: "relative" }}>
      <div style={{ padding: 14 }}>
        <div className="muted" style={{ fontSize: 12 }}>← Demos</div>
        <h1 style={{ margin: "4px 0 10px 0", fontSize: 20, fontWeight: 600 }}>Delaunay & Voronoi</h1>
      </div>

      <div className="panel" style={{ margin: "0 14px 14px 14px", padding: 6, position: "relative", overflow: "hidden" }}>
        <DelaunayCanvas width={400} height={460} showDelaunay showGrid perspective={0.18} />

        {/* pose chip */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 10, padding: "6px 10px", backdropFilter: "blur(8px)",
        }}>
          <div className="tinybrow" style={{ fontSize: 9, marginBottom: 2 }}>Pose</div>
          <div className="mono" style={{ fontSize: 11, lineHeight: 1.5 }}>
            yaw <span className="muted">−18.4°</span><br />
            pitch <span className="muted">12.7°</span>
          </div>
        </div>

        {/* stats chip */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 10, padding: "6px 10px", backdropFilter: "blur(8px)",
          fontFamily: "ui-monospace, monospace", fontSize: 11,
        }}>
          15 · 22 · 36 · <span style={{ color: "hsl(152 60% 75%)" }}>24.7°</span>
        </div>
      </div>

      {/* tool dock — fixed bottom */}
      <div style={{
        margin: "0 14px 14px 14px",
        padding: 6,
        background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))",
        borderRadius: 14,
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
      }}>
        {[
          { i: "+", t: "Add", on: true },
          { i: "↔", t: "Move" },
          { i: "✕", t: "Delete" },
          { i: "▦", t: "Grid" },
          { i: "⚙", t: "More" },
        ].map((tool) => (
          <button key={tool.t} className={`btn ${tool.on ? "active" : ""}`}
            style={{ display: "flex", flexDirection: "column", padding: "8px 0", height: 56, gap: 2 }}>
            <span style={{ fontSize: 18 }}>{tool.i}</span>
            <span style={{ fontSize: 10 }}>{tool.t}</span>
          </button>
        ))}
      </div>

      {/* layer chips */}
      <div className="row" style={{ padding: "0 14px 18px 14px", gap: 6, flexWrap: "wrap" }}>
        <button className="btn active" style={{ borderRadius: 999, fontSize: 11 }}>Delaunay</button>
        <button className="btn" style={{ borderRadius: 999, fontSize: 11 }}>Voronoi</button>
        <button className="btn" style={{ borderRadius: 999, fontSize: 11 }}>Circles</button>
        <button className="btn active" style={{ borderRadius: 999, fontSize: 11 }}>Grid</button>
      </div>
    </div>
  );
}

function DelaunayMobileV2() {
  const [tab, setTab] = React.useState("tools");
  const [sheetOpen, setSheetOpen] = React.useState(true);
  return (
    <div style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))", minHeight: "100%", position: "relative", overflow: "hidden" }}>
      <div style={{ padding: 14 }}>
        <div className="muted" style={{ fontSize: 12 }}>← Demos</div>
        <h1 style={{ margin: "4px 0 10px 0", fontSize: 20, fontWeight: 600 }}>Delaunay & Voronoi</h1>
      </div>

      {/* Canvas (full width) */}
      <div className="panel" style={{ margin: "0 14px 14px 14px", padding: 6, position: "relative", overflow: "hidden" }}>
        <DelaunayCanvas width={400} height={420} showDelaunay showGrid perspective={0.12} />
      </div>

      {/* Bottom sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: "hsl(var(--surface))",
        borderTop: "1px solid hsl(var(--border))",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -10px 30px -16px rgba(0,0,0,0.5)",
        padding: "8px 14px 18px 14px",
        maxHeight: sheetOpen ? 360 : 60, overflow: "hidden",
        transition: "max-height .2s",
      }}>
        <div onClick={() => setSheetOpen(!sheetOpen)} style={{ cursor: "pointer", textAlign: "center", paddingBottom: 6 }}>
          <div style={{ width: 40, height: 4, background: "hsl(var(--border-strong))", borderRadius: 999, margin: "4px auto" }} />
        </div>

        {/* tab bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 4, background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 999 }}>
          {[
            { k: "tools", l: "Tools" },
            { k: "layers", l: "Layers" },
            { k: "stats", l: "Stats" },
            { k: "pose", l: "Pose" },
          ].map((t) => (
            <button key={t.k} onClick={() => { setTab(t.k); setSheetOpen(true); }}
              style={{
                background: tab === t.k ? "hsl(28 92% 60% / 0.16)" : "transparent",
                color: tab === t.k ? "hsl(28 92% 60%)" : "hsl(210 12% 60%)",
                border: "none", padding: "8px 0", borderRadius: 999, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>{t.l}</button>
          ))}
        </div>

        <div style={{ marginTop: 10 }}>
          {tab === "tools" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[
                ["+", "Add"], ["↔", "Move"], ["✕", "Delete"],
                ["▦", "Grid"], ["⚂", "Random"], ["⌫", "Clear"],
              ].map(([i, t]) => (
                <button key={t} className="btn" style={{ display: "flex", flexDirection: "column", padding: "10px 0", gap: 4 }}>
                  <span style={{ fontSize: 18 }}>{i}</span>
                  <span style={{ fontSize: 11 }}>{t}</span>
                </button>
              ))}
            </div>
          )}
          {tab === "layers" && (
            <div className="col" style={{ gap: 6 }}>
              {[
                { l: "Delaunay edges", on: true },
                { l: "Voronoi cells", on: false },
                { l: "Circumcircles", on: false },
                { l: "Projective grid", on: true },
              ].map((row) => (
                <div key={row.l} className="panel-flat" style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>{row.l}</span>
                  <span style={{
                    width: 36, height: 20, borderRadius: 999,
                    background: row.on ? "hsl(28 92% 60%)" : "hsl(222 18% 22%)",
                    position: "relative",
                  }}>
                    <span style={{
                      position: "absolute", top: 2, left: row.on ? 18 : 2,
                      width: 16, height: 16, borderRadius: 999,
                      background: "hsl(210 30% 95%)",
                    }} />
                  </span>
                </div>
              ))}
              <div className="panel-flat" style={{ padding: 10 }}>
                <div className="tinybrow" style={{ marginBottom: 6 }}>Grid size</div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12 }}>Rows</span>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn" style={{ width: 28, height: 28, padding: 0 }}>−</button>
                    <input type="number" defaultValue={6} style={{ width: 50, textAlign: "center" }} />
                    <button className="btn" style={{ width: 28, height: 28, padding: 0 }}>+</button>
                  </div>
                </div>
                <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 12 }}>Cols</span>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn" style={{ width: 28, height: 28, padding: 0 }}>−</button>
                    <input type="number" defaultValue={9} style={{ width: 50, textAlign: "center" }} />
                    <button className="btn" style={{ width: 28, height: 28, padding: 0 }}>+</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === "stats" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              <Mini2 l="Points" v="15" />
              <Mini2 l="Triangles" v="22" />
              <Mini2 l="Edges" v="36" />
              <Mini2 l="Min ∠" v="24.7°" good />
            </div>
          )}
          {tab === "pose" && (
            <div className="panel-flat" style={{ padding: 12 }}>
              <div className="col" style={{ gap: 8 }}>
                {[
                  ["yaw", "−18.4°"], ["pitch", "12.7°"], ["roll", "2.1°"],
                  ["focal", "847 px"], ["reproj. err", "0.42 px", true],
                ].map(([k, v, good]) => (
                  <div key={k} className="row" style={{ justifyContent: "space-between" }}>
                    <span className="muted mono" style={{ fontSize: 12 }}>{k}</span>
                    <span className="mono" style={{ fontSize: 13, color: good ? "hsl(152 60% 75%)" : "inherit" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                Computed live from grid-corner correspondences via DLT homography decomposition.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DelaunayMobileV3() {
  return (
    <div style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))", minHeight: "100%", position: "relative", overflow: "hidden" }}>
      {/* full-bleed canvas first */}
      <div style={{ position: "relative" }}>
        <DelaunayCanvas width={400} height={620} showDelaunay showGrid perspective={0.2} />

        {/* top app bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(180deg, hsl(222 28% 9% / 0.85), transparent)",
        }}>
          <button className="btn" style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>← Demos</button>
          <span className="mono" style={{ fontSize: 11, padding: "4px 10px", background: "hsl(222 24% 12% / 0.85)", border: "1px solid hsl(var(--border))", borderRadius: 999 }}>
            15 · 22 · <span style={{ color: "hsl(152 60% 75%)" }}>24.7°</span>
          </span>
          <button className="btn" style={{ width: 32, height: 32, padding: 0, borderRadius: 999 }}>⋯</button>
        </div>

        {/* edge rail (right) — minimal */}
        <div style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          display: "flex", flexDirection: "column", gap: 4, padding: 4,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 999, backdropFilter: "blur(8px)",
        }}>
          {[
            { i: "+", on: true },
            { i: "↔" },
            { i: "✕" },
            { i: "▦" },
          ].map((tool, i) => (
            <button key={i} className={`btn ${tool.on ? "active" : ""}`}
              style={{ width: 36, height: 36, padding: 0, borderRadius: 999, fontSize: 14, border: "none", background: tool.on ? "hsl(28 92% 60% / 0.16)" : "transparent" }}>
              {tool.i}
            </button>
          ))}
        </div>

        {/* pose pill bottom-left */}
        <div style={{
          position: "absolute", bottom: 16, left: 14,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 14, padding: 10, backdropFilter: "blur(8px)", width: 180,
        }}>
          <div className="tinybrow" style={{ fontSize: 9, marginBottom: 4 }}>Camera pose</div>
          <div className="mono" style={{ fontSize: 11, lineHeight: 1.6 }}>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted">yaw</span><span>−18.4°</span></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted">pitch</span><span>12.7°</span></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted">err</span><span style={{ color: "hsl(152 60% 75%)" }}>0.42 px</span></div>
          </div>
        </div>

        {/* gesture hint */}
        <div style={{
          position: "absolute", bottom: 16, right: 14,
          background: "hsl(222 24% 12% / 0.92)", border: "1px solid hsl(222 20% 22%)",
          borderRadius: 999, padding: "6px 12px", backdropFilter: "blur(8px)",
          fontSize: 11, color: "hsl(210 12% 60%)",
        }}>
          long-press to add
        </div>
      </div>
    </div>
  );
}

function Mini2({ l, v, good }) {
  return (
    <div className="metric" style={{
      padding: "10px 8px",
      borderColor: good ? "hsl(152 60% 48% / 0.4)" : undefined,
      background: good ? "hsl(152 60% 48% / 0.10)" : undefined,
    }}>
      <div className="lbl">{l}</div>
      <div className="val" style={{ fontSize: 16, marginTop: 6, color: good ? "hsl(152 60% 80%)" : undefined }}>{v}</div>
    </div>
  );
}

window.DelaunayMobileV1 = DelaunayMobileV1;
window.DelaunayMobileV2 = DelaunayMobileV2;
window.DelaunayMobileV3 = DelaunayMobileV3;
