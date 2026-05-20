// Viewport, Timeline, InspectorPanel, EasingCurveEditor, CodeDock + App.

const { TopBar, LeftRail, LayersPanel, IconBtn } = window;
const { TweaksPanel, useTweaks, TweakSection, TweakSlider, TweakToggle, TweakColor } = window;
const _Ui = window.Ui;
const _Icons3D = window.Icons3D;

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "accent": "#7c5cff",
  "tilt": 18
}/*EDITMODE-END*/;

// ═════════════════════════════════════════════════════════════════════════
// VIEWPORT — 3D icon, gizmo, viewport options. Clean — no floating panels.
// ═════════════════════════════════════════════════════════════════════════
function Viewport({ activeLayer, motion, transitionTo, time }) {
  const ActiveComp = activeLayer.Comp;
  const NextComp = transitionTo && transitionTo.Comp;
  // animate based on motion just enough to feel alive
  const rot = motion === 'spin' ? time * 360 : motion === 'wiggle' ? Math.sin(time * 6) * 14 : 18;

  return (
    <div style={{
      flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden',
      background: `
        radial-gradient(ellipse 60% 50% at 50% 55%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 70%),
        radial-gradient(ellipse 90% 60% at 50% 100%, oklch(0.22 0.02 280), transparent 70%),
        var(--bg)`,
    }}>
      <ViewportGrid/>

      {/* viewport corner controls */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, zIndex: 4 }}>
        <ChipPill items={[{id:'pers',label:'Perspective',active:true},{id:'ortho',label:'Ortho'}]}/>
        <ToggleChip><_Ui.Grid size={12}/> Grid</ToggleChip>
        <ToggleChip><_Ui.Sparkle size={12}/> Lighting</ToggleChip>
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 4 }}>
        <ToggleChip><_Ui.Box size={12}/> Front</ToggleChip>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 7,
          background: 'var(--panel)', border: '1px solid var(--line-soft)',
        }}>
          <button style={zoomBtn()}>−</button>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)', minWidth: 40, textAlign: 'center' }}>100%</span>
          <button style={zoomBtn()}>+</button>
        </div>
      </div>

      {/* center 3D scene */}
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2,
      }}>
        <div style={{ position: 'relative', transformStyle: 'preserve-3d' }}>
          <Gizmo/>
          {/* contact light ring */}
          <div style={{
            position: 'absolute', left: '50%', top: '100%', transform: 'translate(-50%, -10%)',
            width: 320, height: 22, borderRadius: '50%',
            background: 'radial-gradient(ellipse, color-mix(in oklch, var(--accent) 55%, transparent), transparent 70%)',
            filter: 'blur(3px)', zIndex: 0, pointerEvents: 'none',
          }}/>
          {/* the icon — with gentle ambient breath on outer wrapper */}
          <div className="breath" style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              transform: `rotateY(${rot}deg)`,
              transformStyle: 'preserve-3d',
              transition: 'transform 0.4s cubic-bezier(.34,1.56,.64,1)',
            }}>
              <ActiveComp size={320} tilt={true}/>
            </div>
          </div>
          {/* ghosted transition target */}
          {NextComp && (
            <div style={{
              position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
              opacity: 0.16, transform: `translateX(40px) rotateY(${-rot * 0.5}deg)`,
              pointerEvents: 'none',
            }}>
              <NextComp size={320} tilt={true}/>
            </div>
          )}
        </div>
      </div>

      {/* bottom info bar */}
      <div style={{
        position: 'absolute', left: 14, bottom: 12, fontSize: 10.5, color: 'var(--muted-2)',
        display: 'flex', alignItems: 'center', gap: 10, zIndex: 4,
      }} className="mono">
        <span>1024 × 1024</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>perspective 50mm</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>WebGL 2</span>
      </div>
    </div>
  );
}

function ViewportGrid() {
  // soft horizontal floor grid
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} preserveAspectRatio="none">
      <defs>
        <pattern id="dotgrid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="0" cy="0" r="0.8" fill="currentColor" opacity="0.5"/>
        </pattern>
        <linearGradient id="floorfade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="transparent"/>
          <stop offset="0.55" stopColor="transparent"/>
          <stop offset="0.85" stopColor="rgba(255,255,255,0.04)"/>
          <stop offset="1" stopColor="transparent"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotgrid)" style={{ color: 'var(--line)' }} opacity="0.45"/>
      <rect width="100%" height="100%" fill="url(#floorfade)"/>
    </svg>
  );
}

function Gizmo() {
  // 3 rotation rings around the origin
  return (
    <svg width="380" height="380" viewBox="-190 -190 380 380" style={{
      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) perspective(800px) rotateX(-12deg) rotateY(18deg)',
      pointerEvents: 'none', opacity: 0.6, zIndex: 1,
    }}>
      {/* Y axis = vertical ring (green) - drawn as ellipse rotated to lie around vertical axis */}
      <ellipse cx="0" cy="0" rx="155" ry="52" stroke="var(--green)" strokeOpacity="0.55" strokeWidth="1.5" fill="none"/>
      {/* X axis (red) - horizontal */}
      <ellipse cx="0" cy="0" rx="52" ry="155" stroke="var(--red)" strokeOpacity="0.55" strokeWidth="1.5" fill="none"/>
      {/* Z (blue) - face on */}
      <circle cx="0" cy="0" r="155" stroke="var(--blue)" strokeOpacity="0.4" strokeWidth="1.5" fill="none" strokeDasharray="3 5"/>
      {/* drag handles on each ring */}
      <circle cx="155" cy="0" r="5" fill="var(--green)"/>
      <circle cx="0" cy="-155" r="5" fill="var(--red)"/>
      <circle cx="110" cy="110" r="5" fill="var(--blue)"/>
      {/* origin */}
      <circle cx="0" cy="0" r="3" fill="white" opacity="0.8"/>
      <circle cx="0" cy="0" r="8" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="1"/>
    </svg>
  );
}

function ChipPill({ items }) {
  return (
    <div style={{
      display: 'flex', padding: 3, borderRadius: 8, gap: 2,
      background: 'var(--panel)', border: '1px solid var(--line-soft)',
    }}>
      {items.map(it => (
        <span key={it.id} style={{
          fontSize: 11, padding: '4px 8px', borderRadius: 5, fontWeight: 500,
          color: it.active ? 'var(--fg)' : 'var(--muted)',
          background: it.active ? 'var(--panel-hi)' : 'transparent',
          boxShadow: it.active ? 'inset 0 0 0 1px var(--line)' : 'none',
        }}>{it.label}</span>
      ))}
    </div>
  );
}
function ToggleChip({ children, active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
      padding: '5px 9px', borderRadius: 7, fontWeight: 500,
      color: active ? 'var(--fg)' : 'var(--muted)',
      background: 'var(--panel)', border: '1px solid var(--line-soft)',
    }}>{children}</span>
  );
}
function zoomBtn() {
  return { width: 22, height: 22, border: 'none', background: 'transparent', color: 'var(--muted)',
    borderRadius: 4, fontSize: 14, cursor: 'pointer' };
}

// ═════════════════════════════════════════════════════════════════════════
// (Preset dock and floating code dock are gone — motion recipes live in the
//  Motions tab now, and export formats live under the Export menu.)
// ═════════════════════════════════════════════════════════════════════════
function smallBtn(primary) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500,
    padding: '5px 9px', borderRadius: 6, border: 'none',
    background: primary ? 'var(--accent)' : 'var(--panel)',
    color: primary ? 'white' : 'var(--fg-2)',
  };
}

// ═════════════════════════════════════════════════════════════════════════
// TIMELINE
// ═════════════════════════════════════════════════════════════════════════
// TIMELINE — header with transport, ruler, rows of clip rectangles
// ═════════════════════════════════════════════════════════════════════════
const EASING_CTRL = {
  linear:      [[0,0],[0.33,0.33],[0.66,0.66],[1,1]],
  easeIn:      [[0,0],[0.42,0],[1,1],[1,1]],
  easeOut:     [[0,0],[0,0],[0.58,1],[1,1]],
  easeInOut:   [[0,0],[0.42,0],[0.58,1],[1,1]],
  easeOutBack: [[0,0],[0.34,1.56],[0.64,1],[1,1]],
  spring:      [[0,0],[0.2,1.35],[0.5,0.95],[1,1]],
  bounce:      [[0,0],[0.45,1.3],[0.55,0.75],[1,1]],
  anticipate:  [[0,0],[0.5,-0.35],[0.5,1.3],[1,1]],
};

function EasingMini({ ease, color, height = 24, padding = 2 }) {
  const pts = EASING_CTRL[ease] || EASING_CTRL.linear;
  // overshoot-friendly y range
  const minY = -0.4, maxY = 1.7;
  const yp = (y) => padding + (1 - (y - minY) / (maxY - minY)) * (height - padding * 2);
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {/* baseline at value=0 and value=1 */}
      <line x1="0" y1={yp(0)} x2="100" y2={yp(0)} stroke={color} strokeOpacity="0.18" strokeDasharray="2 3"/>
      <line x1="0" y1={yp(1)} x2="100" y2={yp(1)} stroke={color} strokeOpacity="0.18" strokeDasharray="2 3"/>
      <path d={`M ${pts[0][0]*100} ${yp(pts[0][1])} C ${pts[1][0]*100} ${yp(pts[1][1])}, ${pts[2][0]*100} ${yp(pts[2][1])}, ${pts[3][0]*100} ${yp(pts[3][1])}`}
        stroke={color} strokeWidth="1.6" strokeOpacity="0.95" fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round"/>
    </svg>
  );
}

function Timeline({ layers, activeId, time, setTime, playing, setPlaying }) {
  const dur = 1.2;
  return (
    <div style={{
      height: 260, flexShrink: 0, background: 'var(--bg-2)',
      borderTop: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column',
    }}>
      {/* transport + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--line-soft)', padding: '0 12px', height: 44, gap: 10 }}>
        {/* TRANSPORT CONTROLS — anchored where they belong: with the playhead */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: 'var(--panel)', border: '1px solid var(--line-soft)',
          borderRadius: 9, padding: 3,
        }}>
          <IconBtn><_Ui.Stepback size={13}/></IconBtn>
          <IconBtn primary onClick={() => setPlaying(p => !p)}>
            {playing ? <_Ui.Pause size={13}/> : <_Ui.Play size={13}/>}
          </IconBtn>
          <IconBtn><_Ui.Stepfwd size={13}/></IconBtn>
        </div>
        <button style={{
          width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line-soft)',
          background: 'var(--panel)', color: 'var(--accent-2)', display: 'grid', placeItems: 'center',
        }}><_Ui.Loop size={13}/></button>

        <div className="mono" style={{ fontSize: 12, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
          <span style={{ color: 'var(--fg)', minWidth: 36 }}>{time.toFixed(2)}s</span>
          <span style={{ color: 'var(--muted-2)' }}>/</span>
          <span>{dur.toFixed(2)}s</span>
          <span style={{ color: 'var(--muted-2)', marginLeft: 6 }}>· 60fps</span>
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--line-soft)', margin: '0 6px' }}/>

        {/* sub-tabs */}
        {['Timeline','Curves','Trigger graph'].map((t, i) => (
          <button key={t} style={{
            fontSize: 12, fontWeight: 500, padding: '8px 4px',
            background: 'transparent', border: 'none',
            color: i === 0 ? 'var(--fg)' : 'var(--muted)',
            borderBottom: i === 0 ? '1.5px solid var(--accent)' : '1.5px solid transparent',
            marginBottom: -1,
          }}>{t}</button>
        ))}

        <div style={{ flex: 1 }}/>

        <div style={{
          display: 'flex', gap: 2, padding: 3, borderRadius: 7,
          background: 'var(--panel)', border: '1px solid var(--line-soft)',
        }}>
          <button style={tinyTab(true)}>Frames</button>
          <button style={tinyTab(false)}>Seconds</button>
        </div>
        <button style={{ ...smallBtn(false), padding: '5px 9px' }}><_Ui.Plus size={12}/> Key</button>
      </div>

      {/* ruler */}
      <div style={{ display: 'flex', height: 26, borderBottom: '1px solid var(--line-soft)', flexShrink: 0 }}>
        <div style={{ width: 196, flexShrink: 0, borderRight: '1px solid var(--line-soft)' }}/>
        <div style={{ flex: 1, position: 'relative' }}>
          <Ruler dur={dur} time={time} setTime={setTime}/>
        </div>
      </div>

      {/* tracks scroll area */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative', display: 'flex' }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {layers.map((l) => <TimelineRow key={l.id} layer={l} active={l.id === activeId} dur={dur} time={time}/>)}
        </div>
      </div>
    </div>
  );
}

function tinyTab(active) {
  return {
    fontSize: 11, padding: '3px 8px', borderRadius: 4, border: 'none', fontWeight: 500,
    background: active ? 'var(--panel-hi)' : 'transparent', color: active ? 'var(--fg)' : 'var(--muted)',
  };
}

function Ruler({ dur, time, setTime }) {
  const ticks = [];
  const step = 0.1;
  for (let t = 0; t <= dur + 0.0001; t += step) ticks.push(+t.toFixed(2));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {ticks.map((t, i) => {
        const major = Math.abs(t * 10 % 5) < 0.001;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${(t / dur) * 100}%`, top: 0, bottom: 0,
            borderLeft: major ? '1px solid var(--line)' : '1px solid var(--line-soft)',
            display: 'flex', alignItems: 'flex-end', padding: '0 0 2px 4px',
            fontSize: 10, color: 'var(--muted-2)',
            opacity: major ? 1 : 0.55,
          }} className="mono">{major ? t.toFixed(1) + 's' : ''}</div>
        );
      })}
    </div>
  );
}

// rows: each layer has tracks. Each track is rendered as a row containing a
// clip rectangle for each segment, with the easing curve drawn inside.
function TimelineRow({ layer, active, dur, time }) {
  const baseTracks = layer.tracks || [];
  const ROW_H = 28;
  return (
    <div style={{
      display: 'flex', borderBottom: '1px solid var(--line-soft)', position: 'relative',
      background: active ? 'color-mix(in oklch, var(--accent) 4%, transparent)' : 'transparent',
    }}>
      {/* LEFT LABEL COLUMN */}
      <div style={{ width: 196, flexShrink: 0, padding: '8px 12px', borderRight: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, height: 18 }}>
          <_Ui.Caret size={10}/>
          <div style={{ fontSize: 12, color: active ? 'var(--fg)' : 'var(--fg-2)', fontWeight: 500 }}>{layer.name}</div>
        </div>
        {baseTracks.map(t => (
          <div key={t.name} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '0 0 0 16px', fontSize: 10.5, color: 'var(--muted)',
            height: ROW_H, lineHeight: 1,
          }} className="mono">
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: t.color || 'var(--muted-2)' }}/>
            <span style={{ flex: 1, color: 'var(--muted)' }}>{t.name}</span>
            <span style={{ color: 'var(--muted-2)' }}>{t.value}</span>
          </div>
        ))}
      </div>

      {/* RIGHT TRACK COLUMN — clips with easing inside */}
      <div style={{ flex: 1, position: 'relative', padding: '8px 0 8px' }}>
        <div style={{ height: 18 }}/>
        {baseTracks.map((t) => (
          <div key={t.name} style={{ height: ROW_H, position: 'relative' }}>
            {/* faint baseline */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed var(--line-soft)', opacity: 0.6,
            }}/>
            {/* clips */}
            {(t.clips || []).map((c, ci) => {
              const left = (c.from / dur) * 100;
              const w = ((c.to - c.from) / dur) * 100;
              return (
                <div key={ci} style={{
                  position: 'absolute', left: `${left}%`, width: `${w}%`,
                  top: 3, height: ROW_H - 6, borderRadius: 5,
                  background: `color-mix(in oklch, ${t.color || 'var(--accent)'} 16%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${t.color || 'var(--accent)'} 55%, transparent)`,
                  overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}>
                  <EasingMini ease={c.ease || c.easing || 'linear'} color={t.color || 'var(--accent)'} height={ROW_H - 6}/>
                  {/* keyframe diamonds at edges */}
                  <span style={{
                    position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)',
                    width: 7, height: 7, background: t.color || 'var(--accent)',
                  }}/>
                  <span style={{
                    position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)',
                    width: 7, height: 7, background: t.color || 'var(--accent)',
                  }}/>
                </div>
              );
            })}
          </div>
        ))}
        {/* morph bridge — gradient overlay on top of the track area */}
        {layer.morphTo && (
          <div style={{
            position: 'absolute', top: 6, left: `${(0.45 / dur) * 100}%`, width: `${(0.35 / dur) * 100}%`,
            height: 18, borderRadius: 4,
            background: 'linear-gradient(90deg, color-mix(in oklch, var(--pink) 55%, transparent), color-mix(in oklch, var(--warn) 55%, transparent))',
            border: '1px solid color-mix(in oklch, var(--accent) 35%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            fontSize: 9.5, color: 'white', fontWeight: 600, letterSpacing: 0.2,
          }}>
            <_Ui.PMorph size={10}/> MORPH → {layer.morphTo}
          </div>
        )}
        {/* playhead */}
        <div style={{
          position: 'absolute', left: `${(time / dur) * 100}%`,
          top: 0, bottom: 0, width: 1, background: 'var(--accent)', pointerEvents: 'none', zIndex: 3,
        }}>
          <div style={{
            position: 'absolute', top: -7, left: -5, width: 11, height: 11,
            background: 'var(--accent)', transform: 'rotate(45deg)', borderRadius: 2,
            boxShadow: '0 0 10px var(--accent-glow)',
          }}/>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// INSPECTOR
// ═════════════════════════════════════════════════════════════════════════
const TRIGGERS = [
  { id: 'tap', name: 'Tap', icon: _Ui.Tap },
  { id: 'hover', name: 'Hover', icon: _Ui.Hover },
  { id: 'mount', name: 'On mount', icon: _Ui.Mount },
  { id: 'scroll', name: 'Scroll in', icon: _Ui.Scroll },
  { id: 'success', name: 'Success', icon: _Ui.Success },
  { id: 'loop', name: 'Loop', icon: _Ui.LoopT },
];

function Inspector({ trigger, setTrigger, motion, motionRecipe, activeLayer, setLibraryTab }) {
  const isMorph = motion === 'morph';
  return (
    <div style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid var(--line-soft)',
      background: 'var(--bg-2)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
    }}>
      {/* selection header */}
      <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-2)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>Selected layer</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: 'var(--bg)',
            border: '1px solid var(--line-soft)', display: 'grid', placeItems: 'center',
          }}><activeLayer.Comp size={28} tilt={false}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{activeLayer.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--muted-2)' }} className="mono">{activeLayer.id}.gltf · 12kb</div>
          </div>
          <button style={{ ...smallBtn(false), padding: 6 }}><_Ui.Gear size={12}/></button>
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
        <Section title="Trigger" badge={trigger}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {TRIGGERS.map(t => (
              <button key={t.id} onClick={() => setTrigger(t.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px',
                borderRadius: 8, border: 'none',
                background: trigger === t.id ? 'var(--accent-soft)' : 'var(--bg)',
                color: trigger === t.id ? 'var(--accent-2)' : 'var(--fg-2)',
                boxShadow: trigger === t.id ? 'inset 0 0 0 1px color-mix(in oklch, var(--accent) 40%, transparent)' : 'inset 0 0 0 1px var(--line-soft)',
              }}>
                <t.icon size={16}/>
                <span style={{ fontSize: 10.5, fontWeight: 500 }}>{t.name}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* MOTION section — the heart of the inspector */}
        <Section title="Motion" badge={`${motionRecipe.dur.toFixed(2)}s`}>
          {/* Current motion card with swap action */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 9,
            background: 'var(--bg)', border: '1px solid var(--line-soft)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'color-mix(in oklch, var(--accent) 22%, transparent)',
              border: '1px solid color-mix(in oklch, var(--accent) 45%, transparent)',
              display: 'grid', placeItems: 'center', color: 'var(--accent-2)',
            }}>
              <motionRecipe.icon size={18}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{motionRecipe.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }} className="mono">{motionRecipe.desc}</div>
            </div>
            <button onClick={() => setLibraryTab('motions')} style={{ ...smallBtn(false), padding: '5px 8px' }}>Change</button>
          </div>

          <Row label="Duration">
            <NumStep value={motionRecipe.dur.toFixed(2)} unit="s"/>
            <NumStep value="0" unit="s" sub="delay"/>
          </Row>

          <Row label="Easing">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <div style={{
                position: 'relative', width: 68, height: 36, borderRadius: 6,
                background: 'var(--bg)', border: '1px solid var(--line-soft)', overflow: 'hidden',
              }}>
                <EasingMini ease={motionRecipe.ease} color="var(--accent-2)" height={36}/>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)', flex: 1 }}>{motionRecipe.ease}</span>
              <button style={{ ...smallBtn(false), padding: '5px 7px' }}>Edit</button>
            </div>
          </Row>

          <EasingCurveEditor easing={motionRecipe.ease}/>

          {isMorph && (
            <>
              <Row label="From → To">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <IconChip><_Icons3D.Heart size={16} tilt={false}/></IconChip>
                  <_Ui.CaretRight size={11}/>
                  <IconChip><_Icons3D.Star size={16} tilt={false}/></IconChip>
                  <button style={{ ...smallBtn(false), padding: '4px 8px', marginLeft: 'auto' }}>Swap</button>
                </div>
              </Row>
              <Row label="Direction"><DirectionPicker/></Row>
            </>
          )}
        </Section>

        <Section title="Transform">
          <Row label="Rotation">
            <AxisGroup values={['0°','360°','0°']} colors={['var(--red)','var(--green)','var(--blue)']}/>
          </Row>
          <Row label="Position">
            <AxisGroup values={['0px','0px','0px']}/>
          </Row>
          <Row label="Scale">
            <AxisGroup values={['1.0','1.0','1.0']} linked/>
          </Row>
          <Row label="Anchor">
            <AnchorPicker/>
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, badge, children, collapsed }) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <div style={{ borderBottom: '1px solid var(--line-soft)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 10px',
        background: 'transparent', border: 'none', color: 'var(--fg)',
      }}>
        <span style={{ transition: 'transform 120ms', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--muted-2)' }}>
          <_Ui.Caret size={11}/>
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.2 }}>{title}</span>
        {badge && <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'var(--panel)',
          color: 'var(--muted)', marginLeft: 'auto', fontWeight: 500,
        }} className="mono">{badge}</span>}
      </button>
      {open && <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', width: 64, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
    </div>
  );
}

function AxisGroup({ values, unit, colors, linked }) {
  const labels = linked ? ['', '', ''] : ['X','Y','Z'];
  const cols = colors || ['var(--muted-2)','var(--muted-2)','var(--muted-2)'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, flex: 1 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 7px', borderRadius: 6,
          background: 'var(--bg)', border: '1px solid var(--line-soft)',
        }}>
          {!linked && <span style={{ fontSize: 10, color: cols[i], fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{labels[i]}</span>}
          {linked && i === 0 && <_Ui.Lock size={11}/>}
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)', marginLeft: 'auto' }}>{v}{unit}</span>
        </div>
      ))}
    </div>
  );
}
function NumStep({ value, unit, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 6,
      background: 'var(--bg)', border: '1px solid var(--line-soft)', flex: 1, position: 'relative',
    }}>
      {sub && <span style={{ position: 'absolute', top: -4, left: 8, fontSize: 9, color: 'var(--muted-2)', background: 'var(--bg-2)', padding: '0 4px', borderRadius: 3, fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: 0.4 }}>{sub}</span>}
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg)' }}>{value}{unit}</span>
      <span style={{ flex: 1 }}/>
      <span style={{ color: 'var(--muted-2)', display: 'flex', flexDirection: 'column' }}>
        <_Ui.Caret size={9}/>
        <_Ui.Caret size={9}/>
      </span>
    </div>
  );
}
function Select({ value, options }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: 6,
      background: 'var(--bg)', border: '1px solid var(--line-soft)', fontSize: 12, color: 'var(--fg-2)',
    }}>
      {value}
      <span style={{ flex: 1 }}/>
      <_Ui.Caret size={11}/>
    </div>
  );
}
function IconChip({ children }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 7, background: 'var(--bg)',
      border: '1px solid var(--line-soft)', display: 'grid', placeItems: 'center',
    }}>{children}</div>
  );
}
function AnchorPicker() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 16px)', gap: 4 }}>
      {Array.from({length:9}).map((_, i) => (
        <span key={i} style={{
          width: 14, height: 14, borderRadius: 3, background: i === 4 ? 'var(--accent)' : 'var(--bg)',
          border: '1px solid var(--line-soft)',
        }}/>
      ))}
    </div>
  );
}
function DirectionPicker() {
  const arrows = ['↑','→','↓','←','⤴','⤵'];
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {arrows.map((a, i) => (
        <span key={i} style={{
          width: 24, height: 22, display: 'grid', placeItems: 'center', borderRadius: 5,
          background: i === 1 ? 'var(--accent-soft)' : 'var(--bg)',
          color: i === 1 ? 'var(--accent-2)' : 'var(--muted)',
          border: '1px solid var(--line-soft)', fontSize: 12, fontWeight: 600,
        }}>{a}</span>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EASING CURVE EDITOR
// ═════════════════════════════════════════════════════════════════════════
function EasingCurveEditor({ easing = 'easeOutBack' }) {
  // resolve from easing name → control points
  const pts = EASING_CTRL[easing] || EASING_CTRL.easeOutBack;
  const p1 = { x: pts[1][0], y: pts[1][1] };
  const p2 = { x: pts[2][0], y: pts[2][1] };
  const W = 264, H = 130, pad = 14;
  const minY = -0.4, maxY = 1.8;
  const mx = (x) => pad + x * (W - 2 * pad);
  const my = (y) => H - pad - ((y - minY) / (maxY - minY)) * (H - 2 * pad);
  const d = `M ${mx(0)} ${my(0)} C ${mx(p1.x)} ${my(p1.y)}, ${mx(p2.x)} ${my(p2.y)}, ${mx(1)} ${my(1)}`;
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--line-soft)', borderRadius: 8, padding: 8, marginTop: 4 }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ec-stroke" x1="0" x2="1">
            <stop offset="0" stopColor="var(--accent)"/>
            <stop offset="1" stopColor="#ff8fc5"/>
          </linearGradient>
        </defs>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <React.Fragment key={v}>
            <line x1={mx(v)} y1={my(minY)} x2={mx(v)} y2={my(maxY)} stroke="var(--line-soft)"/>
            <line x1={mx(0)} y1={my(v)} x2={mx(1)} y2={my(v)} stroke="var(--line-soft)"/>
          </React.Fragment>
        ))}
        <line x1={mx(0)} y1={my(0)} x2={mx(1)} y2={my(0)} stroke="var(--line)" strokeDasharray="2 3"/>
        <line x1={mx(0)} y1={my(1)} x2={mx(1)} y2={my(1)} stroke="var(--line)" strokeDasharray="2 3"/>
        <line x1={mx(0)} y1={my(0)} x2={mx(p1.x)} y2={my(p1.y)} stroke="var(--muted-2)" strokeDasharray="3 2"/>
        <line x1={mx(1)} y1={my(1)} x2={mx(p2.x)} y2={my(p2.y)} stroke="var(--muted-2)" strokeDasharray="3 2"/>
        <path d={d} stroke="url(#ec-stroke)" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <circle cx={mx(0)} cy={my(0)} r="3.5" fill="var(--fg-2)"/>
        <circle cx={mx(1)} cy={my(1)} r="3.5" fill="var(--fg-2)"/>
        <circle cx={mx(p1.x)} cy={my(p1.y)} r="5" fill="var(--accent)" stroke="white" strokeWidth="1.5"/>
        <circle cx={mx(p2.x)} cy={my(p2.y)} r="5" fill="#ff8fc5" stroke="white" strokeWidth="1.5"/>
      </svg>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// APP
// ═════════════════════════════════════════════════════════════════════════
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULS);
  const [tool, setTool] = useState('rotate');
  const [activeId, setActiveId] = useState('heart');
  const [libraryTab, setLibraryTab] = useState('layers');
  const [trigger, setTrigger] = useState('tap');
  const [motion, setMotion] = useState('morph');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0.42);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.accent]);

  const motionRecipe = (window.MOTION_RECIPES || []).find(r => r.id === motion) || (window.MOTION_RECIPES || [])[0];
  const isMorph = motion === 'morph';

  // Layer data structure uses CLIPS (each clip = a keyframed range with an easing curve).
  const layers = useMemo(() => [
    {
      id: 'heart', name: 'Heart', icon: 'heart', detail: motionRecipe ? motionRecipe.name.toLowerCase() : 'spin',
      visible: true, locked: false, morphTo: isMorph ? 'Star' : null,
      tracks: [
        { name: 'rotation.y', value: '0 → 360°', color: '#4ee2a3', clips: [{ from: 0,    to: 0.42, ease: motionRecipe ? motionRecipe.ease : 'easeOutBack' }] },
        { name: 'position.x', value: '0 → 18px', color: '#ff6b6b', clips: [{ from: 0.30, to: 0.65, ease: 'easeInOut' }] },
        { name: 'opacity',    value: '1.0',      color: '#a48bff', clips: [{ from: 0,    to: 0.42, ease: 'linear' }] },
      ],
    },
    {
      id: 'star', name: 'Star', icon: 'star', detail: 'opacity ramp', visible: true, locked: false,
      tracks: [
        { name: 'opacity', value: '0 → 1', color: '#a48bff',     clips: [{ from: 0.42, to: 0.80, ease: 'easeOut' }] },
        { name: 'scale',   value: '0.6 → 1', color: '#ffcc4d',   clips: [{ from: 0.45, to: 0.85, ease: 'spring' }] },
      ],
    },
    {
      id: 'bg', name: 'Background', icon: 'cloud', detail: 'blur', visible: true, locked: true,
      tracks: [
        { name: 'blur', value: '0 → 6px', color: '#6ba8ff', clips: [{ from: 0, to: 1.2, ease: 'easeInOut' }] },
      ],
    },
  ], [motion, motionRecipe, isMorph]);

  const layersWithComp = layers.map(l => ({ ...l, Comp: ICON_REGISTRY_LIB[l.icon] }));
  const activeLayer = layersWithComp.find(l => l.id === activeId) || layersWithComp[0];
  const transitionTo = isMorph ? { name: 'Star', Comp: _Icons3D.Star } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <TopBar exportOpen={exportOpen} setExportOpen={setExportOpen}/>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <LeftRail tool={tool} setTool={setTool}/>
        <LayersPanel layers={layersWithComp} activeId={activeId} setActiveId={setActiveId}
          libraryTab={libraryTab} setLibraryTab={setLibraryTab}
          motion={motion} setMotion={setMotion}
          addLayer={() => {}}/>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Viewport activeLayer={activeLayer} transitionTo={transitionTo}
            time={time} motion={motion}/>
          <Timeline layers={layersWithComp} activeId={activeId} time={time} setTime={setTime}
            playing={playing} setPlaying={setPlaying}/>
        </div>
        <Inspector trigger={trigger} setTrigger={setTrigger}
          motion={motion} motionRecipe={motionRecipe}
          activeLayer={activeLayer} setLibraryTab={setLibraryTab}/>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakColor label="Accent" value={t.accent} onChange={(v) => setTweak('accent', v)}
            options={['#7c5cff', '#4ee2a3', '#ff7a59', '#ff5b9a', '#6ba8ff']}/>
        </TweakSection>
        <TweakSection title="Scene">
          <TweakSlider label="Icon tilt" value={t.tilt} min={0} max={45} step={1} onChange={(v) => setTweak('tilt', v)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Lookup helper for icon registry by id
const ICON_REGISTRY_LIB = {
  heart: _Icons3D.Heart, star: _Icons3D.Star, bell: _Icons3D.Bell, cloud: _Icons3D.Cloud, gift: _Icons3D.Gift,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
