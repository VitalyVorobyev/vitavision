// Vitavision home tile variants — v2 (crosshair) & v3 (reveal)
// with bespoke content specimens instead of generic icons.

const BRAND = '191 75% 55%';
const BG    = 'hsl(222, 47%, 11%)';
const SURFACE = 'hsl(217, 33%, 17%)';
const BORDER  = 'hsl(215, 25%, 27%)';
const FG      = 'hsl(210, 40%, 96%)';
const MUTED   = 'hsl(215, 20%, 65%)';

// ──────────────────────────────────────────────────────────
// Bespoke specimens — one per destination, not generic icons.
// Each is ~40×30px "glyph" that previews what's behind the link.
// Receives `hot` so it can brighten on hover.
// ──────────────────────────────────────────────────────────

// BLOG — three stacked lines of "text" at decreasing width,
// like the first lines of a post card. Most-recent line is brand-colored.
const SpecBlog = ({ hot, w = 44, h = 28 }) => (
  <svg width={w} height={h} viewBox="0 0 44 28">
    <rect x="0"  y="2"  width="32" height="3" rx="1" fill={hot ? `hsl(${BRAND})` : FG} opacity={hot?1:0.85}/>
    <rect x="0"  y="9"  width="44" height="1.5" rx="0.75" fill={MUTED} opacity="0.8"/>
    <rect x="0"  y="14" width="40" height="1.5" rx="0.75" fill={MUTED} opacity="0.6"/>
    <rect x="0"  y="19" width="36" height="1.5" rx="0.75" fill={MUTED} opacity="0.45"/>
    <rect x="0"  y="24" width="22" height="1.5" rx="0.75" fill={MUTED} opacity="0.3"/>
  </svg>
);

// ALGORITHMS — a tiny node graph / DAG. Nodes + edges.
// Entry node is brand-colored on hover (execution trace vibe).
const SpecAlgorithms = ({ hot, w = 44, h = 28 }) => {
  const n = [ [4,14], [18,6], [18,22], [32,14], [42,8] ];
  const e = [ [0,1],[0,2],[1,3],[2,3],[3,4] ];
  return (
    <svg width={w} height={h} viewBox="0 0 46 28">
      {e.map(([a,b], i) => (
        <line key={i} x1={n[a][0]} y1={n[a][1]} x2={n[b][0]} y2={n[b][1]}
              stroke={hot ? `hsl(${BRAND} / 0.6)` : MUTED} strokeWidth="1" opacity={hot?0.9:0.55}/>
      ))}
      {n.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i===0 && hot ? 2.6 : 2}
                fill={i===0 && hot ? `hsl(${BRAND})` : (i===0 ? FG : BG)}
                stroke={i===0 ? (hot? `hsl(${BRAND})` : FG) : (hot ? `hsl(${BRAND})` : MUTED)}
                strokeWidth="1.2"/>
      ))}
    </svg>
  );
};

// EDITOR — a tiny image frame with detected feature points & one bbox.
// This is literally what the editor produces.
const SpecEditor = ({ hot, w = 44, h = 30 }) => {
  const pts = [[8,6],[14,10],[22,8],[30,12],[35,7],[12,18],[20,22],[28,20],[34,24],[9,24],[18,14]];
  return (
    <svg width={w} height={h} viewBox="0 0 44 30">
      <rect x="0.5" y="0.5" width="43" height="29" rx="2"
            fill="none" stroke={hot ? `hsl(${BRAND})` : MUTED} strokeWidth="1" opacity={hot?0.9:0.6}/>
      {/* Horizon line suggesting image content */}
      <line x1="2" y1="20" x2="42" y2="18" stroke={MUTED} strokeWidth="0.8" opacity="0.3"/>
      {/* Feature points */}
      {pts.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r="1"
                fill={hot ? `hsl(${BRAND})` : FG} opacity={hot ? 1 : 0.8}/>
      ))}
      {/* Bbox over a cluster */}
      <rect x="16" y="6" width="18" height="10" fill="none"
            stroke={hot ? `hsl(${BRAND})` : FG} strokeWidth="0.8" strokeDasharray="2 1.5" opacity={hot?1:0.7}/>
    </svg>
  );
};

// TARGETS — an actual miniature checkerboard + one brand-colored cell
// to hint at "selected target" / "generator".
const SpecTargets = ({ hot, w = 44, h = 28 }) => {
  const cols = 7, rows = 4, cw = 40/cols, ch = 24/rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dark = (r + c) % 2 === 0;
      cells.push({ r, c, dark });
    }
  }
  return (
    <svg width={w} height={h} viewBox="0 0 44 28">
      <g transform="translate(2,2)">
        {cells.map(({r,c,dark}, i) => {
          const isAccent = hot && r === 1 && c === 4;
          return (
            <rect key={i}
              x={c*cw} y={r*ch} width={cw} height={ch}
              fill={isAccent ? `hsl(${BRAND})` : (dark ? FG : 'transparent')}
              opacity={isAccent ? 1 : (dark ? (hot ? 0.95 : 0.85) : 0)}/>
          );
        })}
        {/* Outer frame */}
        <rect x="0" y="0" width={cols*cw} height={rows*ch}
              fill="none" stroke={hot ? `hsl(${BRAND})` : MUTED}
              strokeWidth="0.8" opacity={hot?0.9:0.5}/>
      </g>
    </svg>
  );
};

const TILES = [
  { label: 'Blog',       Spec: SpecBlog },
  { label: 'Algorithms', Spec: SpecAlgorithms },
  { label: 'Editor',     Spec: SpecEditor },
  { label: 'Targets',    Spec: SpecTargets },
];

// ──────────────────────────────────────────────────────────
// Hero shell (same as before, minimal)
// ──────────────────────────────────────────────────────────
function VMark({ size = 52 }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size}>
      <path d="M8 10 L30 50 L52 10" fill="none" stroke={FG} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="30" cy="24" r="4" fill={`hsl(${BRAND})`}/>
    </svg>
  );
}

function Hero({ children, tileGap = 12 }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: BG, color: FG,
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: `1px solid ${BORDER}60`,
        fontSize: 12, color: MUTED,
      }}>
        <svg viewBox="0 0 60 60" width={22} height={22}>
          <path d="M8 10 L30 50 L52 10" fill="none" stroke={FG} strokeWidth="3" strokeLinejoin="round"/>
        </svg>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Blog','Algorithms','Demos','Editor','Targets','About'].map(x => <span key={x}>{x}</span>)}
        </div>
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 18, padding: '24px 24px 40px',
      }}>
        <VMark size={52} />
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em' }}>
          Vitavision<span style={{ color: `hsl(${BRAND})` }}>.</span>
        </div>
        <div style={{ fontSize: 13, color: MUTED, maxWidth: 360, textAlign: 'center' }}>
          Computer Vision algorithms, interactive tools, technical deep dives.
        </div>
        <div style={{
          marginTop: 6,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: tileGap,
          width: '100%', maxWidth: 580,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// V2 — Crosshair, now with specimens instead of icons
// ──────────────────────────────────────────────────────────
function TilesCrosshair({ hoverIdx = 2 }) {
  const Ticks = ({ color }) => (
    <>
      {[[0,0,1,1],[1,0,-1,1],[0,1,1,-1],[1,1,-1,-1]].map(([x,y,dx,dy],k) => (
        <svg key={k} style={{
          position: 'absolute',
          left: x ? 'auto' : 6, right: x ? 6 : 'auto',
          top:  y ? 'auto' : 6, bottom: y ? 6 : 'auto',
          width: 8, height: 8, pointerEvents: 'none',
        }} viewBox="0 0 8 8">
          <path d={`M${x?8:0} ${y?8:0} L${x?8:0} ${(y?8:0)+4*dy}`} stroke={color} strokeWidth="1"/>
          <path d={`M${x?8:0} ${y?8:0} L${(x?8:0)+4*dx} ${y?8:0}`} stroke={color} strokeWidth="1"/>
        </svg>
      ))}
    </>
  );
  return (
    <Hero>
      {TILES.map(({label, Spec}, i) => {
        const hot = i === hoverIdx;
        return (
          <div key={label} style={{
            position: 'relative',
            border: `1px solid ${hot ? `hsl(${BRAND} / 0.45)` : BORDER+'80'}`,
            borderRadius: 4,
            background: SURFACE+'60',
            padding: '18px 12px 14px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            minHeight: 116, overflow: 'hidden',
            transition: 'all .3s',
            boxShadow: hot ? `0 8px 26px -14px hsl(${BRAND} / 0.4)` : 'none',
          }}>
            <Ticks color={hot ? `hsl(${BRAND})` : MUTED+'70'} />
            <div style={{
              height: 32, display: 'grid', placeItems: 'center',
            }}>
              <Spec hot={hot} />
            </div>
            <div style={{
              fontSize: 12.5, fontWeight: 600,
              color: hot ? FG : FG+'d0',
              letterSpacing: '-0.01em',
            }}>{label}</div>
          </div>
        );
      })}
    </Hero>
  );
}

// ──────────────────────────────────────────────────────────
// V3 — Reveal, with specimens instead of icons
// ──────────────────────────────────────────────────────────
function TilesReveal({ hoverIdx = 0 }) {
  return (
    <Hero>
      {TILES.map(({label, Spec}, i) => {
        const hot = i === hoverIdx;
        return (
          <div key={label} style={{
            position: 'relative', overflow: 'hidden',
            border: `1px solid ${hot ? `hsl(${BRAND} / 0.45)` : BORDER+'a0'}`,
            borderRadius: 10,
            background: SURFACE+'80',
            padding: '16px 14px 14px',
            minHeight: 116,
            transition: 'all .3s',
            boxShadow: hot ? `0 10px 28px -16px hsl(${BRAND} / 0.5)` : 'none',
          }}>
            {hot && (
              <span style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `radial-gradient(120% 80% at 100% 0%, hsl(${BRAND} / 0.14), transparent 60%)`,
              }}/>
            )}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                height: 40, display: 'flex', alignItems: 'center',
              }}>
                <Spec hot={hot} />
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                marginTop: 'auto', paddingTop: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={hot ? `hsl(${BRAND})` : MUTED+'80'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    transform: hot ? 'translateX(0)' : 'translateX(-4px)',
                    opacity: hot ? 1 : 0, transition: 'all .3s',
                  }}>
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </Hero>
  );
}

// ──────────────────────────────────────────────────────────
// Bonus: v6 — Hybrid. Takes v3's structure but makes the specimen
// the dominant element (bigger, left-aligned), with a hairline rule
// separating it from the label. Feels the most like a real "card of work".
// ──────────────────────────────────────────────────────────
function TilesHybrid({ hoverIdx = 1 }) {
  return (
    <Hero tileGap={10}>
      {TILES.map(({label, Spec}, i) => {
        const hot = i === hoverIdx;
        return (
          <div key={label} style={{
            position: 'relative', overflow: 'hidden',
            border: `1px solid ${hot ? `hsl(${BRAND} / 0.45)` : BORDER+'90'}`,
            borderRadius: 6,
            background: SURFACE+'88',
            minHeight: 120,
            display: 'flex', flexDirection: 'column',
            transition: 'all .3s',
            boxShadow: hot ? `0 10px 26px -16px hsl(${BRAND} / 0.5)` : 'none',
          }}>
            {/* Specimen stage */}
            <div style={{
              position: 'relative', flex: 1,
              display: 'grid', placeItems: 'center',
              borderBottom: `1px solid ${hot ? `hsl(${BRAND} / 0.3)` : BORDER+'80'}`,
              background: hot ? `hsl(${BRAND} / 0.05)` : 'transparent',
              transition: 'all .3s',
              padding: '16px 8px 14px',
            }}>
              <Spec hot={hot} w={52} h={32} />
            </div>
            {/* Label bar */}
            <div style={{
              padding: '8px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={hot ? `hsl(${BRAND})` : MUTED+'70'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'all .3s' }}>
                <path d="M7 17 17 7"/><path d="M8 7h9v9"/>
              </svg>
            </div>
          </div>
        );
      })}
    </Hero>
  );
}

// ──────────────────────────────────────────────────────────
// Canvas
// ──────────────────────────────────────────────────────────
const AW = 780, AH = 470;

function App() {
  return (
    <DesignCanvas>
      <div style={{ padding: '0 60px 24px', maxWidth: 1200 }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.4, color: 'rgba(40,30,20,0.9)' }}>
          Home tiles — specimens, not icons
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(60,50,40,0.65)', marginTop: 4, maxWidth: 680 }}>
          Dropped the numbering (you were right — it's an unordered list) and replaced generic
          lucide icons with a bespoke specimen per destination: text lines for Blog, a tiny DAG
          for Algorithms, an annotated image for Editor, an actual checkerboard for Targets.
          Every specimen reacts to hover.
        </div>
      </div>

      <DCSection title="v2 — Crosshair" subtitle="Blueprint ticks + specimen. One tile hovered.">
        <DCArtboard label="v2 · crosshair + specimens" width={AW} height={AH}>
          <TilesCrosshair hoverIdx={2}/>
        </DCArtboard>
      </DCSection>

      <DCSection title="v3 — Reveal" subtitle="Radial brand sweep + arrow slide-in.">
        <DCArtboard label="v3 · reveal + specimens" width={AW} height={AH}>
          <TilesReveal hoverIdx={0}/>
        </DCArtboard>
      </DCSection>

      <DCSection
        title="v6 — Hybrid"
        subtitle="Bonus: specimen takes the stage (bigger, centered), label sits in a divided bar below. Feels most 'portfolio card'.">
        <DCArtboard label="v6 · specimen-led card" width={AW} height={AH}>
          <TilesHybrid hoverIdx={1}/>
        </DCArtboard>
      </DCSection>

      <DCPostIt top={80} left={920} rotate={-3} width={230}>
        Specimens: text stack · DAG · image w/ features · checkerboard.
        Each is the CV / product-specific thing, not a generic glyph.
      </DCPostIt>

      <DCPostIt top={560} left={920} rotate={2} width={220}>
        The checkerboard is literally the Targets output. The DAG is what
        an algorithm page graph would look like. Self-documenting.
      </DCPostIt>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
