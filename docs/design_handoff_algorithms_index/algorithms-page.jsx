// Algorithms index — UX alternatives.
// Each artboard is 1000×620 (matches the baseline screenshot aspect).
// Pages mock the viewport only; below-the-fold content is implied.

const AW = 1000, AH = 620;

// ─────────────────────────────────────────────────────────────
// Shared: the card grid used by every variant below the header
// ─────────────────────────────────────────────────────────────
function CardGrid({ cols = 3, items, cardWidth }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12,
    }}>
      {items.map((it, i) => <AlgoCard key={i} item={it} width={cardWidth}/>)}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// BASELINE — current state (reconstruction of the screenshot)
// ═════════════════════════════════════════════════════════════
function Baseline() {
  const cardW = 288;
  return (
    <div style={{ width: '100%', height: '100%', background: VV.bg, color: VV.fg, fontFamily: VV.font }}>
      <TopNav/>
      <div style={{ padding: '28px 56px' }}>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8 }}>Algorithms</div>
        <div style={{ fontSize: 14, color: VV.muted, marginTop: 6, maxWidth: 720 }}>
          Classical computer vision algorithms and deep-learning models — explore, understand, and experiment.
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 20, padding: 3,
                      background: VV.bgSoft, border: `1px solid ${VV.borderSoft}`,
                      borderRadius: 8, width: 'fit-content' }}>
          {['Classical','Models'].map((t, i) => (
            <span key={t} style={{
              padding: '6px 14px', fontSize: 13, borderRadius: 5,
              background: i===0 ? VV.surfaceHi : 'transparent',
              color: i===0 ? VV.fg : VV.muted,
              fontWeight: i===0 ? 600 : 400,
            }}>{t}</span>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <Chip active>All</Chip>
          {TAGS_ALL.map(t => <Chip key={t}>{t}</Chip>)}
        </div>
        <div style={{ marginTop: 28 }}>
          <SectionHeader name="Corner Detection"/>
          <div style={{ marginTop: 14 }}>
            <CardGrid items={ALGOS.corners.slice(0,3)} cardWidth={cardW}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// A — Compact header + LEFT SIDEBAR filters
// Taxonomy moves out of the vertical flow entirely.
// Cards start ~70px from the nav.
// ═════════════════════════════════════════════════════════════
function OptionA() {
  return (
    <div style={{ width: '100%', height: '100%', background: VV.bg, color: VV.fg, fontFamily: VV.font }}>
      <TopNav dense/>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: 'calc(100% - 44px)' }}>
        {/* Sidebar */}
        <aside style={{
          borderRight: `1px solid ${VV.border}60`,
          padding: '20px 18px 20px 22px',
          fontSize: 13,
          overflow: 'hidden',
        }}>
          <div style={{
            fontSize: 11, color: VV.muted, textTransform: 'uppercase', letterSpacing: 1.3,
            fontWeight: 600, marginBottom: 10,
          }}>Kind</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 22 }}>
            {[['Classical', true, 28], ['Models', false, 14]].map(([name, active, n]) => (
              <div key={name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 8px', borderRadius: 5,
                background: active ? VV.surfaceHi : 'transparent',
                color: active ? VV.fg : VV.fgDim,
                fontWeight: active ? 600 : 400,
              }}>
                <span>{name}</span>
                <span style={{ fontSize: 11, color: VV.muted }}>{n}</span>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 11, color: VV.muted, textTransform: 'uppercase', letterSpacing: 1.3,
            fontWeight: 600, marginBottom: 10,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Category</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 22 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '5px 8px', borderRadius: 5,
              background: VV.surfaceHi, color: VV.fg, fontWeight: 600,
            }}>
              <span>All</span><span style={{ fontSize: 11, color: VV.muted }}>28</span>
            </div>
            {CATEGORIES.map(c => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '5px 8px', borderRadius: 5,
                color: VV.fgDim,
              }}>
                <span>{c.name}</span>
                <span style={{ fontSize: 11, color: VV.muted }}>{c.count}</span>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 11, color: VV.muted, textTransform: 'uppercase', letterSpacing: 1.3,
            fontWeight: 600, marginBottom: 10,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Tags</span>
            <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400,
                           color: `hsl(${VV.brand})`, cursor: 'pointer' }}>all 32 →</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {TAGS_POPULAR.slice(0,6).map(t => (
              <Chip key={t} compact>{t}</Chip>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main style={{ padding: '20px 40px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                        marginBottom: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
              Algorithms <span style={{ color: VV.muted, fontWeight: 400, fontSize: 15, marginLeft: 6 }}>28</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: VV.muted, fontSize: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 10px',
                border: `1px solid ${VV.borderSoft}`, borderRadius: 6,
                background: VV.bgSoft, width: 200,
              }}>
                <Icon name="search" size={13}/>
                <span>Search…</span>
              </div>
              <div style={{ display: 'flex', gap: 2, padding: 2,
                            border: `1px solid ${VV.borderSoft}`, borderRadius: 6 }}>
                <span style={{ padding: '3px 6px', borderRadius: 4, background: VV.surfaceHi, color: VV.fg }}>
                  <Icon name="grid" size={13} color={VV.fg}/>
                </span>
                <span style={{ padding: '3px 6px' }}>
                  <Icon name="list" size={13}/>
                </span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: VV.muted, marginBottom: 20 }}>
            Classical computer vision algorithms and deep-learning models.
          </div>

          <div>
            <SectionHeader name="Corner Detection" count={6}/>
            <div style={{ marginTop: 12 }}>
              <CardGrid cols={3} items={ALGOS.corners.slice(0,3)} cardWidth={230}/>
            </div>
            <div style={{ marginTop: 12 }}>
              <CardGrid cols={3} items={ALGOS.corners.slice(3,6)} cardWidth={230}/>
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <SectionHeader name="Calibration Targets" count={8}/>
            <div style={{ marginTop: 12 }}>
              <CardGrid cols={3} items={ALGOS.targets.slice(0,3)} cardWidth={230}/>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════
// Canvas
// ═════════════════════════════════════════════════════════════
function App() {
  return (
    <DesignCanvas>
      <div style={{ padding: '0 60px 28px', maxWidth: 1300 }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.4, color: 'rgba(40,30,20,0.9)' }}>
          Algorithms index — sidebar rail redesign
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(60,50,40,0.65)', marginTop: 6, maxWidth: 820 }}>
          The baseline pushes the actual list below the fold: hero (~170px) + segmented control (~50px) +
          32-chip tag cloud (~100px) = cards don't appear until ~y=320. Option A relocates the entire
          taxonomy into a persistent left rail so cards start at ~y=80, while keeping the dark slate /
          cyan brand language from the live site.
        </div>
      </div>

      <DCSection
        title="Baseline"
        subtitle="Reconstruction of today's page for reference. Cards start at ~y=320 of a 620px viewport — only 1 row visible above the fold.">
        <DCArtboard label="current · baseline" width={AW} height={AH}>
          <Baseline/>
        </DCArtboard>
      </DCSection>

      <DCSection
        title="A — Sidebar filters"
        subtitle="Hero + filters move to a persistent left rail, out of the vertical flow. Cards start at ~y=80. Highest density; best when users filter often.">
        <DCArtboard label="A · sidebar rail" width={AW} height={AH}>
          <OptionA/>
        </DCArtboard>
      </DCSection>

      <DCPostIt top={80} left={1080} rotate={-2} width={240}>
        The tag cloud isn't a filter — it's a table of contents pretending to be one.
        32 equally-weighted chips force users to read every label.
      </DCPostIt>

      <DCPostIt top={820} left={1080} rotate={2} width={240}>
        Sidebar rail: facets out of the vertical flow, cards dominate from the top,
        and a real <b>search</b> absorbs most of the work the tag cloud did.
      </DCPostIt>
    </DesignCanvas>
  );
}

Object.assign(window, { Baseline, OptionA, AlgoPageApp: App });
if (!window.__SKIP_MOUNT_ALGO_PAGE__) {
  ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
}
