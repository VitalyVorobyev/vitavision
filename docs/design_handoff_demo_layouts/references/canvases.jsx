/* eslint-disable no-undef */
// Static, illustrative SVGs that match the look of the original demos but
// are simplified for layout exploration. They are pure SVG so no math
// dependencies are needed.

/**
 * <ChessCanvas size={400} rotationDeg={22.5} showSamples showSrPairs showDrPairs showMrRegions />
 * Renders an X-junction patch with the 16-sample ring and accent overlays.
 */
function ChessCanvas({
  size = 420,
  rotationDeg = 22.5,
  showSamples = true,
  showSrPairs = true,
  showDrPairs = true,
  showMrRegions = true,
  cells = 11,
}) {
  const cx = size / 2;
  const cy = size / 2;
  const cellPx = size / cells;

  // Build the X-junction: dark NE+SW quadrants, light NW+SE
  const half = (cells * cellPx) / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);

  // Sample grid is rotated checkerboard rendered procedurally
  const cellsArr = [];
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const px = -half + (j + 0.5) * cellPx;
      const py = -half + (i + 0.5) * cellPx;
      // Rotate sample point into pattern frame
      const u = px * cos + py * sin;
      const v = -px * sin + py * cos;
      // X-junction: sign(u)*sign(v)
      const dark = u * v > 0; // two opposite quadrants dark
      const fill = dark ? "#1a2030" : "#cdd5e1";
      cellsArr.push({ x: cx - half + j * cellPx, y: cy - half + i * cellPx, fill });
    }
  }

  // 16 ring samples (radius ~ 2.5 cells from center)
  const ringR = cellPx * 2.7;
  const samples = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
    samples.push({
      i: k,
      x: cx + Math.cos(a) * ringR,
      y: cy + Math.sin(a) * ringR,
      phase: k % 4,
    });
  }

  const phaseColors = ["#f9a04a", "#7da7ff", "#9b7dff", "#36c4a8"];

  // SR pairs connect i and i+8 within same phase (illustrative lines through center)
  const srPairLines = showSrPairs
    ? samples.slice(0, 8).map((s, i) => {
        const o = samples[(i + 8) % 16];
        return { x1: s.x, y1: s.y, x2: o.x, y2: o.y, phase: s.phase };
      })
    : [];

  // DR pairs connect i and i+1 (skip pattern visual)
  const drPairs = showDrPairs
    ? [0, 4, 8, 12].map((i) => {
        const a = samples[i], b = samples[(i + 1) % 16];
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      })
    : [];

  // MR regions: small center patch + larger ring band
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: "block", borderRadius: 12 }}>
      <defs>
        <pattern id="grid" width={cellPx} height={cellPx} patternUnits="userSpaceOnUse">
          <path d={`M ${cellPx} 0 L 0 0 0 ${cellPx}`} fill="none" stroke="#0f1320" strokeWidth="1" />
        </pattern>
      </defs>
      {/* checker cells */}
      {cellsArr.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={cellPx + 0.5} height={cellPx + 0.5} fill={c.fill} />
      ))}
      <rect x={cx - half} y={cy - half} width={cells * cellPx} height={cells * cellPx} fill="url(#grid)" />

      {/* MR center patch & ring */}
      {showMrRegions && (
        <>
          <circle cx={cx} cy={cy} r={cellPx * 0.9} fill="hsl(28 92% 60% / 0.25)" stroke="hsl(28 92% 60%)" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="hsl(28 92% 60% / 0.45)" strokeDasharray="3 4" />
        </>
      )}

      {/* SR pair lines (through center) */}
      {srPairLines.map((p, i) => (
        <line key={`sr${i}`} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
          stroke={phaseColors[p.phase]} strokeOpacity="0.55" strokeWidth="1.5" />
      ))}

      {/* DR pair short lines */}
      {drPairs.map((p, i) => (
        <line key={`dr${i}`} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
          stroke="#ff7e9d" strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="2 3" />
      ))}

      {/* 16 ring samples */}
      {samples.map((s) => (
        <g key={s.i}>
          <circle cx={s.x} cy={s.y} r={6} fill="hsl(222 28% 9%)" stroke={phaseColors[s.phase]} strokeWidth="1.5" />
          {showSamples && s.i % 2 === 0 && (
            <text x={s.x + 9} y={s.y + 3} fontSize="9" fill="hsl(210 30% 80%)" fontFamily="ui-monospace,monospace">
              I{s.i}
            </text>
          )}
        </g>
      ))}

      {/* center marker */}
      <circle cx={cx} cy={cy} r={4} fill="hsl(28 92% 60%)" />
    </svg>
  );
}

/**
 * <DelaunayCanvas size={[800,560]} layers={{delaunay,voronoi,circumcircles,grid}} />
 * Renders a fixed illustrative point set with overlays toggled.
 */
function DelaunayCanvas({
  width = 800,
  height = 560,
  showDelaunay = true,
  showVoronoi = false,
  showCircles = false,
  showGrid = false,
  perspective = 0,
  random = false,
  seed = 1,
}) {
  // Deterministic point set (slight perspective warp possible)
  const grid = [];
  const rows = 6, cols = 9;
  const margin = 80;
  // 4 corners (TL, TR, BR, BL); apply perspective by pulling top corners inward
  const persPx = perspective * 90;
  const corners = [
    { x: margin + persPx, y: margin },
    { x: width - margin - persPx, y: margin },
    { x: width - margin, y: height - margin },
    { x: margin, y: height - margin },
  ];
  // bilinear-warp grid (approximates a perspective look enough for static illustration)
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const u = c / cols, v = r / rows;
      const top = { x: corners[0].x + (corners[1].x - corners[0].x) * u, y: corners[0].y + (corners[1].y - corners[0].y) * u };
      const bot = { x: corners[3].x + (corners[2].x - corners[3].x) * u, y: corners[3].y + (corners[2].y - corners[3].y) * u };
      grid.push({ x: top.x + (bot.x - top.x) * v, y: top.y + (bot.y - top.y) * v });
    }
  }

  // Free points (deterministic pseudo-random)
  const rand = ((s) => () => (s = (s * 9301 + 49297) % 233280) / 233280)(seed * 31 + 7);
  const free = random
    ? Array.from({ length: 30 }, () => ({ x: 60 + rand() * (width - 120), y: 60 + rand() * (height - 120) }))
    : [
        { x: 180, y: 140 }, { x: 320, y: 110 }, { x: 460, y: 170 }, { x: 600, y: 140 },
        { x: 230, y: 260 }, { x: 410, y: 240 }, { x: 540, y: 290 }, { x: 670, y: 260 },
        { x: 150, y: 380 }, { x: 290, y: 410 }, { x: 470, y: 380 }, { x: 580, y: 430 },
        { x: 720, y: 380 }, { x: 360, y: 480 }, { x: 250, y: 500 },
      ];
  const pts = showGrid ? [...free, ...grid] : free;

  // Compute Delaunay triangulation via simple incremental Bowyer-Watson (small n)
  const tris = triangulate(pts);

  // Voronoi cells via dual: for each point gather circumcenters of incident triangles, sort by angle.
  const cells = showVoronoi ? voronoiCells(pts, tris) : [];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block", borderRadius: 12, background: "#0d111d" }}>
      {/* background plain (no checker) */}
      <rect x="0" y="0" width={width} height={height} fill="#0d111d" />

      {/* projective grid lines */}
      {showGrid && (
        <g stroke="hsl(28 92% 60% / 0.25)" strokeWidth="1" fill="none">
          {Array.from({ length: rows + 1 }).map((_, r) => (
            <polyline key={`r${r}`} points={Array.from({ length: cols + 1 }).map((_, c) => {
              const p = grid[r * (cols + 1) + c]; return `${p.x},${p.y}`;
            }).join(" ")} />
          ))}
          {Array.from({ length: cols + 1 }).map((_, c) => (
            <polyline key={`c${c}`} points={Array.from({ length: rows + 1 }).map((_, r) => {
              const p = grid[r * (cols + 1) + c]; return `${p.x},${p.y}`;
            }).join(" ")} />
          ))}
        </g>
      )}

      {/* Voronoi */}
      {showVoronoi && cells.map((cell, i) => (
        <polygon key={`v${i}`} points={cell.map(p => `${p.x},${p.y}`).join(" ")}
          fill="hsl(180 60% 55% / 0.05)" stroke="hsl(180 60% 55% / 0.7)" strokeWidth="1" />
      ))}

      {/* Delaunay triangles */}
      {showDelaunay && tris.map((t, i) => (
        <polygon key={`t${i}`} points={`${pts[t[0]].x},${pts[t[0]].y} ${pts[t[1]].x},${pts[t[1]].y} ${pts[t[2]].x},${pts[t[2]].y}`}
          fill="none" stroke="hsl(210 30% 70% / 0.6)" strokeWidth="1" />
      ))}

      {/* Circumcircles */}
      {showCircles && tris.map((t, i) => {
        const cc = circumcircle(pts[t[0]], pts[t[1]], pts[t[2]]);
        if (!cc) return null;
        return <circle key={`cc${i}`} cx={cc.x} cy={cc.y} r={cc.r} fill="none" stroke="hsl(28 92% 60% / 0.25)" strokeWidth="1" />;
      })}

      {/* Points */}
      {pts.map((p, i) => {
        const isGridP = showGrid && i >= free.length;
        return <circle key={`p${i}`} cx={p.x} cy={p.y} r={isGridP ? 3 : 4}
          fill={isGridP ? "hsl(180 60% 55%)" : "hsl(210 30% 95%)"}
          stroke={isGridP ? "hsl(180 60% 55%)" : "hsl(28 92% 60%)"} strokeWidth="1" />;
      })}

      {/* Grid corner handles (when grid on) */}
      {showGrid && corners.map((c, i) => (
        <rect key={`cn${i}`} x={c.x - 5} y={c.y - 5} width="10" height="10"
          fill="hsl(28 92% 60%)" stroke="hsl(222 28% 9%)" strokeWidth="2" />
      ))}
    </svg>
  );
}

/* ---------- Tiny geometry helpers (Bowyer-Watson) ---------- */
function triangulate(points) {
  if (points.length < 3) return [];
  // Super triangle
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  const dx = (maxX - minX) || 1, dy = (maxY - minY) || 1;
  const dmax = Math.max(dx, dy) * 20;
  const midx = (minX + maxX) / 2, midy = (minY + maxY) / 2;
  const sp = [
    { x: midx - dmax, y: midy - dmax },
    { x: midx + dmax, y: midy - dmax },
    { x: midx, y: midy + dmax },
  ];
  const verts = [...points, ...sp];
  const N = points.length;
  let tris = [[N, N + 1, N + 2]];

  for (let i = 0; i < N; i++) {
    const p = verts[i];
    const edges = [];
    tris = tris.filter((t) => {
      const cc = circumcircle(verts[t[0]], verts[t[1]], verts[t[2]]);
      if (!cc) return true;
      const d2 = (p.x - cc.x) ** 2 + (p.y - cc.y) ** 2;
      if (d2 < cc.r * cc.r) {
        edges.push([t[0], t[1]], [t[1], t[2]], [t[2], t[0]]);
        return false;
      }
      return true;
    });
    // Remove duplicate edges
    const unique = [];
    for (const e of edges) {
      let dup = false;
      for (let j = 0; j < edges.length; j++) {
        if (e === edges[j]) continue;
        if ((edges[j][0] === e[0] && edges[j][1] === e[1]) ||
            (edges[j][0] === e[1] && edges[j][1] === e[0])) { dup = true; break; }
      }
      if (!dup) unique.push(e);
    }
    for (const e of unique) tris.push([e[0], e[1], i]);
  }
  // remove triangles that touch super triangle
  return tris.filter((t) => t.every((idx) => idx < N));
}

function circumcircle(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d;
  const uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d;
  const r = Math.hypot(a.x - ux, a.y - uy);
  return { x: ux, y: uy, r };
}

function voronoiCells(points, tris) {
  // For each point, find triangles using it; collect circumcenters; sort by angle.
  const cells = points.map(() => []);
  for (const t of tris) {
    const cc = circumcircle(points[t[0]], points[t[1]], points[t[2]]);
    if (!cc) continue;
    for (const idx of t) cells[idx].push(cc);
  }
  return cells.map((cs, i) => {
    if (cs.length < 3) return [];
    const p = points[i];
    return cs.slice().sort((a, b) => Math.atan2(a.y - p.y, a.x - p.x) - Math.atan2(b.y - p.y, b.x - p.x));
  });
}

window.ChessCanvas = ChessCanvas;
window.DelaunayCanvas = DelaunayCanvas;
