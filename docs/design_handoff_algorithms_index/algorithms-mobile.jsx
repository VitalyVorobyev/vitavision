// Algorithms index — MOBILE variants of Option A (sidebar rail).
// The sidebar can't persist on mobile, so we explore 4 different places
// to put the same taxonomy, keeping cards dominant above the fold.
//
// Device: iPhone 15 Pro, 402×874 (IOSDevice default).
// Inner content width: 402. We design content to 390-ish with 16px side
// padding so it reads comfortably. Status bar eats top 54px; home
// indicator eats bottom ~28px. Usable: ~792px tall.

// ─────────────────────────────────────────────────────────────
// Shared mobile shell
// ─────────────────────────────────────────────────────────────
function MobileTopNav({ showBack = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
      borderBottom: `1px solid ${VV.border}60`,
      background: VV.bg,
    }}>
      <VMark size={22}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon name="search" size={18} color={VV.fgDim}/>
        <div style={{
          width: 22, height: 22, borderRadius: 999,
          background: `linear-gradient(135deg, hsl(${VV.brand}), hsl(280, 60%, 55%))`,
        }}/>
        <Icon name="list" size={18} color={VV.fgDim}/>
      </div>
    </div>
  );
}

// Mobile-sized algorithm card (full-width, 2-row on phones).
function MobileAlgoCard({ item }) {
  return (
    <div style={{
      background: VV.surface,
      border: `1px solid ${VV.border}`,
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      fontFamily: VV.font,
    }}>
      <div style={{
        flex: '0 0 auto', width: 34, height: 34,
        background: VV.bg, borderRadius: 6,
        display: 'grid', placeItems: 'center',
        border: `1px solid ${VV.borderSoft}`,
      }}>
        <Glyph kind={item.glyph} size={22} color={VV.fgDim}/>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          {item.draft && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              padding: '1px 5px', borderRadius: 3,
              background: VV.border, color: VV.fg,
            }}>DRAFT</span>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: VV.fg, letterSpacing: -0.1,
                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </span>
        </div>
        <div style={{
          fontSize: 12, color: VV.muted, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{item.desc}</div>
        <div style={{
          marginTop: 6, display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: VV.muted,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: `hsl(${VV.brand})` }}/>
          {item.level}
        </div>
      </div>
    </div>
  );
}

function MobileSectionHeader({ name, count }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600,
      letterSpacing: 1.4, textTransform: 'uppercase',
      color: VV.muted,
      display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '16px 2px 10px',
    }}>
      <span>{name}</span>
      {count != null && <span style={{ fontWeight: 400, color: VV.mutedDim, letterSpacing: 0 }}>{count}</span>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// M1 — Collapsing title + SEGMENT + inline filter pill
// Opens with a compact one-line title, then a full-width
// Classical/Models segmented control, then a single "Filters"
// pill showing active count. Filters open a bottom sheet (M2).
// Fastest time-to-cards (~130px from top of content).
// ═════════════════════════════════════════════════════════════
function MobileM1() {
  return (
    <div style={{ width: '100%', height: '100%', background: VV.bg, color: VV.fg, fontFamily: VV.font, overflow: 'hidden' }}>
      <MobileTopNav/>
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Algorithms</span>
          <span style={{ fontSize: 12, color: VV.muted }}>28 entries</span>
        </div>

        {/* Segmented control */}
        <div style={{
          marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 3,
          background: VV.bgSoft, border: `1px solid ${VV.borderSoft}`, borderRadius: 8,
        }}>
          {['Classical','Models'].map((t, i) => (
            <div key={t} style={{
              textAlign: 'center', padding: '7px 0', borderRadius: 5,
              fontSize: 13, fontWeight: i===0 ? 600 : 400,
              background: i===0 ? VV.surfaceHi : 'transparent',
              color: i===0 ? VV.fg : VV.muted,
            }}>{t}</div>
          ))}
        </div>

        {/* Filter row */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', fontSize: 13,
            border: `1px solid ${VV.borderSoft}`,
            background: VV.bgSoft, color: VV.fgDim,
            borderRadius: 8, fontFamily: VV.font,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="filter" size={13} color={VV.fgDim}/>
              Filters
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: `hsl(${VV.brand})`, color: VV.bg,
                padding: '0 5px', borderRadius: 999,
              }}>2</span>
            </span>
            <Icon name="chev" size={13} color={VV.muted}/>
          </button>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', fontSize: 13,
            border: `1px solid ${VV.borderSoft}`,
            background: VV.bgSoft, color: VV.fgDim,
            borderRadius: 8, fontFamily: VV.font,
          }}>
            <Icon name="sort" size={13} color={VV.fgDim}/>
            Sort
          </button>
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px' }}>
        <MobileSectionHeader name="Corner Detection" count={6}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ALGOS.corners.slice(0,4).map((it, i) => <MobileAlgoCard key={i} item={it}/>)}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// M2 — M1 with the FILTER BOTTOM SHEET open.
// Replicates the sidebar sections (Kind / Category / Tags) as
// a scrollable sheet. Confirms by "Apply".
// ═════════════════════════════════════════════════════════════
function MobileM2() {
  return (
    <div style={{ width: '100%', height: '100%', background: VV.bg, position: 'relative', overflow: 'hidden', fontFamily: VV.font }}>
      {/* Dimmed M1 underneath */}
      <div style={{ filter: 'brightness(0.4)', height: '100%' }}>
        <MobileM1/>
      </div>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: VV.bgSoft,
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        borderTop: `1px solid ${VV.border}`,
        paddingBottom: 34,
        color: VV.fg,
        height: '82%',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Grabber */}
        <div style={{ display: 'grid', placeItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: VV.border }}/>
        </div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px 14px',
          borderBottom: `1px solid ${VV.borderSoft}`,
        }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Filters</span>
          <span style={{ fontSize: 13, color: `hsl(${VV.brand})` }}>Reset</span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '4px 18px 10px' }}>
          <div style={{
            fontSize: 10.5, color: VV.muted, textTransform: 'uppercase', letterSpacing: 1.3,
            fontWeight: 600, marginTop: 14, marginBottom: 8,
          }}>Kind</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['Classical', true, 28], ['Models', false, 14]].map(([name, active, n]) => (
              <div key={name} style={{
                flex: 1, padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${active ? `hsl(${VV.brand} / 0.5)` : VV.borderSoft}`,
                background: active ? `hsl(${VV.brand} / 0.08)` : VV.surface,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400,
                               color: active ? VV.fg : VV.fgDim }}>{name}</span>
                <span style={{ fontSize: 11, color: VV.muted }}>{n}</span>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 10.5, color: VV.muted, textTransform: 'uppercase', letterSpacing: 1.3,
            fontWeight: 600, marginTop: 20, marginBottom: 8,
          }}>Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { name: 'All', count: 28, active: true },
              ...CATEGORIES.slice(0,4).map(c => ({ name: c.name, count: c.count, active: false }))
            ].map(c => (
              <div key={c.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 10px', borderRadius: 6,
                background: c.active ? VV.surfaceHi : 'transparent',
                color: c.active ? VV.fg : VV.fgDim,
                fontWeight: c.active ? 600 : 400,
                fontSize: 13.5,
              }}>
                <span>{c.name}</span>
                <span style={{ fontSize: 11, color: VV.muted }}>{c.count}</span>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 10.5, color: VV.muted, textTransform: 'uppercase', letterSpacing: 1.3,
            fontWeight: 600, marginTop: 20, marginBottom: 8,
          }}>Tags <span style={{ color: VV.mutedDim, letterSpacing: 0, fontWeight: 400, textTransform: 'none' }}>· 32</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TAGS_POPULAR.slice(0,6).map((t, i) => (
              <Chip key={t} active={i < 2} compact>{t}</Chip>
            ))}
          </div>
        </div>

        {/* Sticky apply */}
        <div style={{
          padding: '10px 16px',
          borderTop: `1px solid ${VV.borderSoft}`,
          background: VV.bgSoft,
        }}>
          <div style={{
            padding: '12px 0', textAlign: 'center',
            background: `hsl(${VV.brand})`, color: VV.bg,
            borderRadius: 10, fontWeight: 600, fontSize: 14,
          }}>Show 12 results</div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// M3 — HORIZONTAL-SCROLL tag rail + category chips
// Keeps filters visible (no tap needed) but bounded to 2 short
// rows that scroll horizontally. Sticks to top when scrolling.
// ═════════════════════════════════════════════════════════════
function MobileM3() {
  return (
    <div style={{ width: '100%', height: '100%', background: VV.bg, color: VV.fg, fontFamily: VV.font, overflow: 'hidden' }}>
      <MobileTopNav/>
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Algorithms</span>
          <span style={{ fontSize: 12, color: VV.muted }}>28 entries</span>
        </div>
        {/* Kind tabs (quiet, underline) */}
        <div style={{ display: 'flex', gap: 18, marginTop: 10,
                      borderBottom: `1px solid ${VV.border}60` }}>
          {[['Classical', true, 28], ['Models', false, 14]].map(([name, active, n]) => (
            <div key={name} style={{
              padding: '6px 2px 8px', fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? VV.fg : VV.muted,
              borderBottom: active ? `2px solid hsl(${VV.brand})` : '2px solid transparent',
              marginBottom: -1,
            }}>
              {name} <span style={{ fontSize: 11, color: VV.muted, fontWeight: 400, marginLeft: 3 }}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category horizontal scroll */}
      <div style={{
        padding: '12px 0 10px',
      }}>
        <div style={{
          display: 'flex', gap: 8, padding: '0 16px',
          overflowX: 'hidden',
        }}>
          <Chip active compact>All · 28</Chip>
          {CATEGORIES.slice(0,5).map(c => (
            <Chip key={c.id} compact>{c.name} · {c.count}</Chip>
          ))}
        </div>
      </div>

      {/* Tags horizontal scroll */}
      <div style={{
        padding: '0 0 12px',
        borderBottom: `1px solid ${VV.border}40`,
      }}>
        <div style={{
          display: 'flex', gap: 6, padding: '0 16px',
          overflowX: 'hidden', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10.5, color: VV.mutedDim, textTransform: 'uppercase',
                         letterSpacing: 1.2, fontWeight: 600, marginRight: 2 }}>Tags</span>
          {TAGS_POPULAR.slice(0,6).map(t => <Chip key={t} compact>{t}</Chip>)}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '3px 8px', fontSize: 11, color: VV.muted,
            border: `1px dashed ${VV.borderSoft}`, borderRadius: 999,
            whiteSpace: 'nowrap',
          }}>+26</span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px' }}>
        <MobileSectionHeader name="Corner Detection" count={6}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ALGOS.corners.slice(0,3).map((it, i) => <MobileAlgoCard key={i} item={it}/>)}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// M4 — SEARCH-FIRST with filter leaf
// Prominent search input up top; active filters shown as
// removable chips below. The idea: on a phone, search beats
// every faceted filter UI. Tap the "Filter" button to open M2.
// ═════════════════════════════════════════════════════════════
function MobileM4() {
  return (
    <div style={{ width: '100%', height: '100%', background: VV.bg, color: VV.fg, fontFamily: VV.font, overflow: 'hidden' }}>
      <MobileTopNav/>
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 12 }}>
          Algorithms
        </div>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: VV.bgSoft, border: `1px solid ${VV.borderSoft}`,
          borderRadius: 10,
        }}>
          <Icon name="search" size={15} color={VV.muted}/>
          <span style={{ fontSize: 14, color: VV.muted, flex: 1 }}>Search algorithms…</span>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 9px', borderRadius: 6,
            border: `1px solid ${VV.borderSoft}`,
            fontSize: 12, color: VV.fgDim,
          }}>
            <Icon name="filter" size={12} color={VV.fgDim}/>
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: `hsl(${VV.brand})`, color: VV.bg,
              padding: '0 5px', borderRadius: 999, marginLeft: 1,
            }}>2</span>
          </div>
        </div>

        {/* Active filter chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10,
                      flexWrap: 'wrap' }}>
          {[['Classical', 'kind'], ['corner-detection', 'tag']].map(([v, k]) => (
            <span key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 5px 4px 10px', borderRadius: 999,
              background: `hsl(${VV.brand} / 0.12)`,
              border: `1px solid hsl(${VV.brand} / 0.3)`,
              color: VV.fg, fontSize: 11.5,
            }}>
              <span style={{ color: VV.muted, fontSize: 10, textTransform: 'uppercase',
                             letterSpacing: 0.8, marginRight: 2 }}>{k}</span>
              {v}
              <span style={{ width: 14, height: 14, display: 'grid', placeItems: 'center',
                             background: `hsl(${VV.brand} / 0.2)`, borderRadius: 999 }}>
                <Icon name="x" size={9} color={VV.fg} strokeWidth={2}/>
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px' }}>
        <MobileSectionHeader name="Corner Detection" count={6}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ALGOS.corners.slice(0,4).map((it, i) => <MobileAlgoCard key={i} item={it}/>)}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Canvas
// ═════════════════════════════════════════════════════════════
function MobileApp() {
  const phoneW = 402, phoneH = 874;
  return (
    <DesignCanvas>
      <div style={{ padding: '0 60px 28px', maxWidth: 1300 }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.4, color: 'rgba(40,30,20,0.9)' }}>
          Algorithms index — mobile (Option A)
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(60,50,40,0.65)', marginTop: 6, maxWidth: 820 }}>
          The sidebar from A doesn't translate directly to a phone — it would eat the viewport. These 4 variants
          re-home the same taxonomy (Kind / Category / Tags) using mobile-native patterns, while keeping cards
          dominant above the fold. All use the same card component and type scale as desktop A.
        </div>
      </div>

      <DCSection
        title="M1 — Title + segment + filter pill"
        subtitle="Segmented Classical/Models is always visible; everything else collapses behind a single 'Filters' pill that shows an active-count badge. First card starts at ~y=240 (of 874).">
        <DCArtboard label="M1 · default" width={phoneW} height={phoneH}>
          <IOSDevice width={phoneW} height={phoneH} dark>
            <MobileM1/>
          </IOSDevice>
        </DCArtboard>
        <DCArtboard label="M2 · M1 with filter sheet open" width={phoneW} height={phoneH}>
          <IOSDevice width={phoneW} height={phoneH} dark>
            <MobileM2/>
          </IOSDevice>
        </DCArtboard>
      </DCSection>

      <DCSection
        title="M3 — Horizontal-scroll rails"
        subtitle="Categories and tags stay visible but bounded to two horizontally-scrolling rows. No tap needed to see what's there. Kind becomes quiet underline tabs.">
        <DCArtboard label="M3 · h-scroll rails" width={phoneW} height={phoneH}>
          <IOSDevice width={phoneW} height={phoneH} dark>
            <MobileM3/>
          </IOSDevice>
        </DCArtboard>
      </DCSection>

      <DCSection
        title="M4 — Search-first"
        subtitle="On a phone, search usually beats faceted filters. Big search input up top with an inline filter button; active filters become removable chips in their own row.">
        <DCArtboard label="M4 · search-first" width={phoneW} height={phoneH}>
          <IOSDevice width={phoneW} height={phoneH} dark>
            <MobileM4/>
          </IOSDevice>
        </DCArtboard>
      </DCSection>

      <DCPostIt top={80} left={920} rotate={-2} width={230}>
        The sidebar pattern from A maps to a <b>bottom sheet</b> on mobile — same
        three sections (Kind / Category / Tags), one tap away.
      </DCPostIt>

      <DCPostIt top={1060} left={920} rotate={2} width={230}>
        M1 is the most conservative port of A. M3 keeps filters visible which
        helps discovery but costs vertical space. M4 bets search absorbs most
        filter intent.
      </DCPostIt>

      <DCPostIt top={2030} left={920} rotate={-1.5} width={230}>
        If desktop A ships, I'd pair it with <b>M1+M2</b> on mobile — same mental
        model (filters live in one place), just behind a tap instead of a rail.
      </DCPostIt>
    </DesignCanvas>
  );
}

Object.assign(window, { MobileM1, MobileM2, MobileM3, MobileM4, MobileApp });
if (!window.__SKIP_MOUNT_ALGO_MOBILE__) {
  ReactDOM.createRoot(document.getElementById('root')).render(<MobileApp/>);
}
