// Shared Vitavision design tokens + atoms for the Algorithms index exploration.
// Keep these in sync with `src/index.css` CSS variables.

const VV = {
  brand:   '191 75% 55%',
  bg:      'hsl(222, 47%, 11%)',
  bgSoft:  'hsl(222, 40%, 13%)',
  surface: 'hsl(217, 33%, 17%)',
  surfaceHi:'hsl(217, 33%, 21%)',
  border:  'hsl(215, 25%, 27%)',
  borderSoft:'hsl(215, 25%, 22%)',
  fg:      'hsl(210, 40%, 96%)',
  fgDim:   'hsl(210, 40%, 80%)',
  muted:   'hsl(215, 20%, 65%)',
  mutedDim:'hsl(215, 20%, 50%)',
  font:    'Inter, system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

// ── Data ──────────────────────────────────────────────────────────────────
// The real taxonomy shown in the baseline screenshot.
const TAGS_ALL = [
  'authoring','calibration','camera-calibration','checkerboard','chessboard',
  'cnn','computer-vision','corner','corner-detection','delaunay','demo',
  'dual-quaternions','feature-detection','graph-matching','hand-eye','homography',
  'image-matching','intrinsics','keypoint-detection','lens-sensor-tilt',
  'local-descriptors','meta','position-encoding','radial-alignment-constraint',
  'radon-transform','robotics','saddle-point','scale-space','self-identifying-pattern',
  'subgraph-isomorphism','subpixel-refinement','topology',
];

// Popular tags — used by compact variants that show "top N + more".
const TAGS_POPULAR = [
  'corner-detection','feature-detection','calibration','checkerboard',
  'homography','cnn','keypoint-detection','scale-space',
];

const CATEGORIES = [
  { id: 'corners',    name: 'Corner Detection',     count: 6 },
  { id: 'targets',    name: 'Calibration Targets',  count: 8 },
  { id: 'matching',   name: 'Feature Matching',     count: 5 },
  { id: 'geometry',   name: 'Geometry & Homography',count: 4 },
  { id: 'learned',    name: 'Learned Models',       count: 7 },
  { id: 'robotics',   name: 'Robotics & Hand-Eye',  count: 3 },
];

const ALGOS = {
  corners: [
    { title: 'ChESS Corners',
      desc: 'Chessboard-specific corner detector: scores each pixel by how well its local neighborhood matches a chess pattern.',
      level: 'Intermediate', glyph: 'chess' },
    { title: 'FAST Corner Detector',
      desc: 'Segment-test corner detector on a 16-pixel Bresenham ring of radius 3 around each candidate pixel.',
      level: 'Intermediate', glyph: 'fast' },
    { title: 'Harris Corner Detector',
      desc: 'Scores each pixel by the Harris response R = det(M) − k·tr(M)², where M is the gradient structure tensor.',
      level: 'Intermediate', glyph: 'harris' },
    { title: 'Localized Radon Checkerboard Cor…',
      desc: 'Detect checkerboard X-junctions by approximating a localized Radon transform with oriented kernels.',
      level: 'Intermediate', glyph: 'cross' },
    { title: 'Pyramidal Blur-Aware X-Corn…',
      desc: 'Detect chessboard X-junctions in heavily blurred or high-resolution images by computing a 16-pixel…',
      level: 'Intermediate', glyph: 'cross', draft: true },
    { title: 'Shi-Tomasi Corner Detector',
      desc: 'Scores each pixel by the smaller eigenvalue of the gradient structure tensor; returns integer…',
      level: 'Intermediate', glyph: 'shi' },
  ],
  targets: [
    { title: 'Standard Checkerboard',
      desc: 'Classic black-and-white grid with known square size; the default target for intrinsic calibration.',
      level: 'Beginner', glyph: 'chess' },
    { title: 'ChArUco Board',
      desc: 'Checkerboard with embedded ArUco markers — resilient to partial occlusion and view angle.',
      level: 'Intermediate', glyph: 'charuco' },
    { title: 'Circle Grid (Asymmetric)',
      desc: 'Asymmetric circle grid with sub-pixel centroid estimation; robust to blur and defocus.',
      level: 'Intermediate', glyph: 'dots' },
  ],
};

// ── Glyphs ────────────────────────────────────────────────────────────────
// Small monochrome placeholders that read as the "thumbnail" in an algo card.
function Glyph({ kind = 'chess', size = 28, color = VV.fgDim }) {
  const props = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none' };
  if (kind === 'chess') {
    const cells = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if ((r+c) % 2 === 0) cells.push(<rect key={`${r}${c}`} x={4+c*6} y={4+r*6} width="6" height="6" fill={color}/>);
    }
    return <svg {...props}>{cells}<rect x="4" y="4" width="24" height="24" fill="none" stroke={color} strokeOpacity="0.6" strokeWidth="0.8"/></svg>;
  }
  if (kind === 'fast') {
    // 16-pixel ring
    const ring = Array.from({length: 16}, (_, i) => {
      const a = (i / 16) * Math.PI * 2, x = 16 + Math.cos(a) * 10, y = 16 + Math.sin(a) * 10;
      return <circle key={i} cx={x} cy={y} r="1.1" fill={color}/>;
    });
    return <svg {...props}><circle cx="16" cy="16" r="1.5" fill={color}/>{ring}</svg>;
  }
  if (kind === 'harris') {
    // L-shape corner
    return (<svg {...props}>
      <path d="M6 6 L6 26 L26 26" stroke={color} strokeWidth="1.4" fill="none"/>
      <circle cx="6" cy="6" r="2" fill={color}/>
    </svg>);
  }
  if (kind === 'cross') {
    return (<svg {...props}>
      <path d="M6 16h20M16 6v20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="1.5" fill={color}/>
    </svg>);
  }
  if (kind === 'shi') {
    const pts = [[8,8],[14,10],[22,9],[10,16],[18,16],[24,18],[9,23],[17,22],[23,25]];
    return (<svg {...props}>{pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r="1.3" fill={color}/>)}</svg>);
  }
  if (kind === 'charuco') {
    return (<svg {...props}>
      {[[0,0],[2,2],[0,2],[2,0]].map(([cx,cy],i) => (
        <rect key={i} x={4+cx*6} y={4+cy*6} width="6" height="6" fill={color}/>
      ))}
      <rect x="10" y="10" width="12" height="12" fill="none" stroke={color} strokeWidth="1"/>
      <rect x="13" y="13" width="2" height="2" fill={color}/>
      <rect x="17" y="13" width="2" height="2" fill={color}/>
      <rect x="13" y="17" width="2" height="2" fill={color}/>
    </svg>);
  }
  if (kind === 'dots') {
    const pts = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      pts.push(<circle key={`${r}${c}`} cx={6+c*7} cy={6+r*7 + (c%2?2:0)} r="1.4" fill={color}/>);
    }
    return <svg {...props}>{pts}</svg>;
  }
  return <svg {...props}><rect x="6" y="6" width="20" height="20" stroke={color} fill="none"/></svg>;
}

// ── Top nav (matches live site) ───────────────────────────────────────────
function VMark({ size = 26 }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size * 1}>
      <path d="M8 10 L30 50 L52 10" fill="none" stroke={VV.fg} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="30" cy="24" r="3.4" fill={`hsl(${VV.brand})`}/>
    </svg>
  );
}

function TopNav({ dense = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: dense ? '10px 22px' : '14px 24px',
      borderBottom: `1px solid ${VV.border}60`,
      fontSize: 13, color: VV.muted,
      background: VV.bg,
    }}>
      <VMark size={dense ? 22 : 24}/>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
        {[
          ['Blog', false],['Algorithms', true],['Demos', false],
          ['Editor', false],['Targets', false],['About', false],
        ].map(([name, active]) => (
          <span key={name} style={{
            color: active ? VV.fg : VV.muted,
            fontWeight: active ? 600 : 400,
            fontSize: 13,
          }}>{name}</span>
        ))}
        <span style={{ color: VV.muted, marginLeft: 4 }}>◐</span>
        <div style={{
          width: 22, height: 22, borderRadius: 999,
          background: `linear-gradient(135deg, hsl(${VV.brand}), hsl(280, 60%, 55%))`,
        }}/>
      </div>
    </div>
  );
}

// ── Tag chip ──────────────────────────────────────────────────────────────
function Chip({ children, active, dim, compact, onClick, style }) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center',
      padding: compact ? '3px 9px' : '4px 11px',
      fontSize: compact ? 11 : 12,
      fontWeight: active ? 600 : 400,
      borderRadius: 999,
      border: `1px solid ${active ? VV.border : VV.borderSoft}`,
      background: active ? VV.surfaceHi : 'transparent',
      color: active ? VV.fg : (dim ? VV.mutedDim : VV.fgDim),
      fontFamily: VV.font,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      ...style,
    }}>{children}</span>
  );
}

// ── Algorithm card (matches baseline) ─────────────────────────────────────
function AlgoCard({ item, width = 230 }) {
  return (
    <div style={{
      width, height: 112,
      background: VV.surface,
      border: `1px solid ${VV.border}`,
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: VV.font,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          flex: '0 0 auto', width: 30, height: 30,
          background: VV.bg, borderRadius: 4,
          display: 'grid', placeItems: 'center',
          border: `1px solid ${VV.borderSoft}`,
        }}>
          <Glyph kind={item.glyph} size={20} color={VV.fgDim}/>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {item.draft && (
            <span style={{
              display: 'inline-block',
              fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              padding: '1px 5px', borderRadius: 3,
              background: VV.border, color: VV.fg,
              marginRight: 6, verticalAlign: 1,
            }}>DRAFT</span>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: VV.fg, letterSpacing: -0.1 }}>
            {item.title}
          </span>
        </div>
      </div>
      <div style={{
        fontSize: 11.5, color: VV.muted, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>{item.desc}</div>
      <div style={{
        marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: VV.muted,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: 999,
          background: `hsl(${VV.brand})`,
        }}/>
        {item.level}
      </div>
    </div>
  );
}

// ── Section header over a card grid ───────────────────────────────────────
function SectionHeader({ name, count, style }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600,
      letterSpacing: 1.4, textTransform: 'uppercase',
      color: VV.muted,
      display: 'flex', alignItems: 'baseline', gap: 10,
      ...style,
    }}>
      <span>{name}</span>
      {count != null && (
        <span style={{ fontWeight: 400, color: VV.mutedDim, letterSpacing: 0 }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── Icon atoms ────────────────────────────────────────────────────────────
function Icon({ name, size = 14, color = VV.muted, strokeWidth = 1.6 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
              stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'search':  return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'filter':  return <svg {...p}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case 'chev':    return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case 'chevR':   return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>;
    case 'close':   return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case 'grid':    return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case 'list':    return <svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
    case 'sort':    return <svg {...p}><path d="M3 6h18M6 12h12M10 18h4"/></svg>;
    case 'x':       return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
  }
  return null;
}

Object.assign(window, {
  VV, TAGS_ALL, TAGS_POPULAR, CATEGORIES, ALGOS,
  Glyph, VMark, TopNav, Chip, AlgoCard, SectionHeader, Icon,
});
