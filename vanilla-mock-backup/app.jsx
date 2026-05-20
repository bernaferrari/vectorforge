// Main editor app — composes the top bar, rails, panels, viewport, timeline.

const { useState, useRef, useEffect, useMemo } = React;
const Ui = window.Ui;
const Icons3D = window.Icons3D;

const ICON_REGISTRY = [
  { id: 'heart', name: 'Heart', tint: '#ff5b9a', Comp: Icons3D.Heart },
  { id: 'star',  name: 'Star',  tint: '#ffcc4d', Comp: Icons3D.Star },
  { id: 'bell',  name: 'Bell',  tint: '#f1ad36', Comp: Icons3D.Bell },
  { id: 'cloud', name: 'Cloud', tint: '#bcd1ff', Comp: Icons3D.Cloud },
  { id: 'gift',  name: 'Gift',  tint: '#a48bff', Comp: Icons3D.Gift },
];

// ═════════════════════════════════════════════════════════════════════════
// TOP BAR
// ═════════════════════════════════════════════════════════════════════════
function TopBar({ exportOpen, setExportOpen }) {
  return (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center',
      borderBottom: '1px solid var(--line-soft)',
      background: 'linear-gradient(180deg, var(--bg-2), var(--bg))',
      paddingLeft: 14, paddingRight: 14, gap: 12, flexShrink: 0, position: 'relative', zIndex: 30,
    }}>
      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), #b39bff)',
          display: 'grid', placeItems: 'center', boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 4px 12px rgba(124,92,255,0.4)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17V7l7 5 7-5v10"/>
          </svg>
        </div>
        <div style={{ fontWeight: 600, letterSpacing: -0.2, fontSize: 14 }}>Motion</div>
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--line-soft)' }}/>
      {/* file name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-2)' }}>
        <span style={{ fontSize: 12.5 }}>Notifications</span>
        <Ui.CaretRight size={11}/>
        <span style={{ fontSize: 12.5, color: 'var(--fg)', fontWeight: 500 }}>like-button-spin</span>
        <Ui.Caret size={11}/>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }}/>
        Saved
      </div>

      <div style={{ flex: 1 }}/>

      <button style={btn('ghost')}>
        <Ui.Share size={13}/> Share
      </button>
      <div style={{ position: 'relative' }}>
        <button style={btn('primary')} onClick={() => setExportOpen(v => !v)}>
          <Ui.Download size={13}/> Export
          <Ui.Caret size={11}/>
        </button>
        {exportOpen && <ExportMenu onClose={() => setExportOpen(false)}/>}
      </div>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: 'linear-gradient(135deg, #ff8fc5, #6e4fdb)',
        display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 600, color: 'white',
        boxShadow: '0 0 0 2px var(--bg-2)',
      }}>SK</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORT MENU — single place for all output formats
// ═════════════════════════════════════════════════════════════════════════
const EXPORTS = [
  { id: 'react',  group: 'Code',  name: 'React',           detail: 'framer-motion · 1.4kb', recommend: true,  glyph: <span style={{color:'#7cd8ff'}}>{'<>'}</span> },
  { id: 'vue',    group: 'Code',  name: 'Vue',             detail: 'motion · composable',                    glyph: <span style={{color:'#4ee2a3'}}>{'<>'}</span> },
  { id: 'css',    group: 'Code',  name: 'CSS keyframes',   detail: 'plain, no JS runtime',                   glyph: <span style={{color:'#ff8fc5'}}>{'{}'}</span> },
  { id: 'swift',  group: 'Code',  name: 'SwiftUI',         detail: '.animation modifier',                    glyph: <span style={{color:'#ffb454'}}>{'</>'}</span> },
  { id: 'mp4',    group: 'Render',name: 'Video',           detail: 'MP4 · 1080² · transparent', recommend: false, glyph: '▶' },
  { id: 'gif',    group: 'Render',name: 'GIF',             detail: 'looping · 256 colors',                   glyph: '◐' },
  { id: 'lottie', group: 'Render',name: 'Lottie JSON',     detail: 'vector · ~12kb',                         glyph: '◆' },
  { id: 'gltf',   group: 'Render',name: 'glTF',            detail: '3D scene · animated',                    glyph: '⬡' },
];

function ExportMenu({ onClose }) {
  const groups = ['Code', 'Render'];
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }}/>
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, zIndex: 41,
        background: 'oklch(0.19 0.014 280)', border: '1px solid var(--line)',
        borderRadius: 12, boxShadow: '0 24px 60px -16px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03) inset',
        padding: 6, overflow: 'hidden',
      }}>
        {groups.map(g => (
          <div key={g}>
            <div style={{ padding: '8px 10px 4px', fontSize: 10, fontWeight: 600, color: 'var(--muted-2)', letterSpacing: 0.6, textTransform: 'uppercase' }}>{g}</div>
            {EXPORTS.filter(e => e.group === g).map(e => (
              <button key={e.id} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7, border: 'none',
                background: e.recommend ? 'var(--accent-soft)' : 'transparent', textAlign: 'left',
                color: 'var(--fg)', cursor: 'pointer',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'var(--bg)', border: '1px solid var(--line-soft)',
                  display: 'grid', placeItems: 'center', fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600,
                }}>{e.glyph}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {e.name}
                    {e.recommend && <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: 'var(--accent)', color: 'white', fontWeight: 600, letterSpacing: 0.4 }}>FAST</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }} className="mono">{e.detail}</div>
                </div>
                <Ui.CaretRight size={11}/>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function btn(kind) {
  const base = {
    height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid transparent',
  };
  if (kind === 'primary') return { ...base, background: 'var(--accent)', color: 'white', boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset, 0 6px 16px -6px var(--accent-glow)' };
  if (kind === 'ghost') return { ...base, background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--line-soft)' };
  return base;
}

function IconBtn({ children, primary, active, onClick }) {
  const [hover, setHover] = useState(false);
  const bg = primary ? 'var(--accent)'
    : active ? 'var(--panel-hi)'
    : hover ? 'var(--panel-hi)' : 'transparent';
  const color = primary ? 'white' : active ? 'var(--accent-2)' : 'var(--fg-2)';
  return (
    <button onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={onClick}
      style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: bg, color,
        display: 'grid', placeItems: 'center', transition: 'background 120ms',
        boxShadow: primary ? '0 4px 10px -4px var(--accent-glow)' : 'none',
      }}>
      {children}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// LEFT RAIL
// ═════════════════════════════════════════════════════════════════════════
const TOOLS = [
  { id: 'select', name: 'Select', icon: Ui.Cursor },
  { id: 'move',   name: 'Move',   icon: Ui.Move },
  { id: 'rotate', name: 'Rotate', icon: Ui.Rotate },
  { id: 'scale',  name: 'Scale',  icon: Ui.Scale },
  { id: 'key',    name: 'Keyframe', icon: Ui.Key },
  { id: 'swap',   name: 'Transition', icon: Ui.Swap },
  { id: 'camera', name: 'Camera', icon: Ui.Camera },
  { id: 'fx',     name: 'Effects', icon: Ui.Sparkle },
];

function LeftRail({ tool, setTool }) {
  return (
    <div style={{
      width: 52, flexShrink: 0,
      borderRight: '1px solid var(--line-soft)',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 10, paddingBottom: 10,
    }}>
      {TOOLS.map(t => <ToolBtn key={t.id} active={tool === t.id} onClick={() => setTool(t.id)} name={t.name}><t.icon size={17}/></ToolBtn>)}
      <div style={{ flex: 1 }}/>
      <ToolBtn name="Settings"><Ui.Gear size={17}/></ToolBtn>
    </div>
  );
}
function ToolBtn({ children, active, onClick, name }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        style={{
          width: 36, height: 36, borderRadius: 9, border: 'none',
          background: active ? 'var(--accent-soft)' : hover ? 'var(--panel)' : 'transparent',
          color: active ? 'var(--accent-2)' : 'var(--fg-2)',
          display: 'grid', placeItems: 'center', transition: '120ms',
          boxShadow: active ? 'inset 0 0 0 1px var(--accent-soft)' : 'none',
        }}>{children}</button>
      {hover && (
        <div style={{
          position: 'absolute', left: 44, top: '50%', transform: 'translateY(-50%)',
          background: 'var(--panel-hi)', color: 'var(--fg)', fontSize: 11, fontWeight: 500,
          padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 20,
          border: '1px solid var(--line-soft)', pointerEvents: 'none',
        }}>{name}</div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// LAYERS / LIBRARY PANEL
// ═════════════════════════════════════════════════════════════════════════
function LayersPanel({ layers, activeId, setActiveId, libraryTab, setLibraryTab, motion, setMotion, addLayer }) {
  return (
    <div style={{
      width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--line-soft)', background: 'var(--bg-2)',
    }}>
      <Tabs tabs={[{id:'layers',label:'Layers'},{id:'library',label:'Library'},{id:'motions',label:'Motions'}]} value={libraryTab} onChange={setLibraryTab}/>
      {libraryTab === 'layers' && (
        <div style={{ padding: '8px 8px 12px', overflowY: 'auto', flex: 1 }}>
          {layers.map((l, i) => <LayerRow key={l.id} layer={l} active={l.id === activeId} onClick={() => setActiveId(l.id)} depth={i}/>)}
          <button style={{
            marginTop: 8, width: '100%', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: '1px dashed var(--line)', color: 'var(--muted)',
            borderRadius: 8, fontSize: 12, fontWeight: 500,
          }} onClick={addLayer}><Ui.Plus size={14}/> Add layer</button>

          <Group title="Scene">
            <SceneRow icon={<Ui.Image size={13}/>} name="Background" detail="solid · transparent"/>
            <SceneRow icon={<Ui.Camera size={13}/>} name="Camera" detail="perspective · 50mm"/>
            <SceneRow icon={<Ui.Sparkle size={13}/>} name="Light" detail="key · soft"/>
          </Group>
        </div>
      )}
      {libraryTab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '8px 12px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--line-soft)', borderRadius: 8 }}>
              <Ui.Search size={13}/>
              <input placeholder="Search icons & GLTFs…" style={{ flex: 1, background: 'none', border: 'none', color: 'var(--fg)', fontSize: 12, outline: 'none' }}/>
              <span style={{ fontSize: 10, color: 'var(--muted-2)', background: 'var(--panel)', padding: '2px 5px', borderRadius: 4 }} className="mono">⌘K</span>
            </div>
          </div>
          <div style={{ padding: '6px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All','Reactions','UI','Status','Custom'].map((c, i) => (
              <span key={c} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 999,
                background: i === 0 ? 'var(--accent-soft)' : 'var(--panel)',
                color: i === 0 ? 'var(--accent-2)' : 'var(--muted)',
                fontWeight: 500,
              }}>{c}</span>
            ))}
          </div>
          <div style={{
            padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, overflowY: 'auto', flex: 1,
          }}>
            {ICON_REGISTRY.map(it => (
              <div key={it.id} style={{
                aspectRatio: '1', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--line-soft)',
                display: 'grid', placeItems: 'center', position: 'relative', cursor: 'grab',
              }}>
                <it.Comp size={72} tilt={false}/>
                <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{it.name}</div>
              </div>
            ))}
            <div style={{
              aspectRatio: '1', borderRadius: 10, background: 'var(--bg)', border: '1px dashed var(--line)',
              display: 'grid', placeItems: 'center', color: 'var(--muted-2)', flexDirection: 'column', gap: 6,
            }}>
              <Ui.Plus size={18}/>
              <span style={{ fontSize: 10 }}>Import GLTF</span>
            </div>
          </div>
        </div>
      )}
      {libraryTab === 'motions' && (
        <MotionsList motion={motion} setMotion={setMotion}/>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MOTIONS list (motion recipes) — the dock-of-presets, redesigned as a list
// ═════════════════════════════════════════════════════════════════════════
const MOTION_RECIPES = [
  { id: 'spin',     group: 'Reactions', name: 'Spin',     desc: 'Rotate Y 360°',          trigger: 'tap',    icon: Ui.PSpin,     ease: 'easeOutBack', dur: 0.42 },
  { id: 'pop',      group: 'Reactions', name: 'Pop',      desc: 'Scale 1 → 1.25 → 1',     trigger: 'tap',    icon: Ui.PPop,      ease: 'easeOut',     dur: 0.36 },
  { id: 'bounce',   group: 'Reactions', name: 'Bounce',   desc: 'Lift up and settle',     trigger: 'tap',    icon: Ui.PBounce,   ease: 'spring',      dur: 0.60 },
  { id: 'wiggle',   group: 'Reactions', name: 'Wiggle',   desc: 'Shake side-to-side',     trigger: 'tap',    icon: Ui.PWiggle,   ease: 'easeInOut',   dur: 0.45 },
  { id: 'drift',    group: 'Reactions', name: 'Drift',    desc: 'Slide right and back',   trigger: 'tap',    icon: Ui.PDrift,    ease: 'easeInOut',   dur: 0.50 },
  { id: 'pulse',    group: 'Live',      name: 'Pulse',    desc: 'Subtle breath, looping', trigger: 'loop',   icon: Ui.PPulse,    ease: 'easeInOut',   dur: 1.40 },
  { id: 'wipe',     group: 'Entrance',  name: 'Wipe in',  desc: 'Reveal from one side',   trigger: 'mount',  icon: Ui.PWipe,     ease: 'easeOut',     dur: 0.40 },
  { id: 'dissolve', group: 'Entrance',  name: 'Dissolve', desc: 'Fade in with blur',      trigger: 'mount',  icon: Ui.PDissolve, ease: 'easeOut',     dur: 0.50 },
  { id: 'morph',    group: 'Transition',name: 'Morph A→B',desc: 'Cross-rotate icons',     trigger: 'tap',    icon: Ui.PMorph,    ease: 'anticipate',  dur: 0.60 },
];

function MotionsList({ motion, setMotion }) {
  const groups = ['Reactions', 'Entrance', 'Transition', 'Live'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '8px 12px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--line-soft)', borderRadius: 8 }}>
          <Ui.Search size={13}/>
          <input placeholder="Search motions…" style={{ flex: 1, background: 'none', border: 'none', color: 'var(--fg)', fontSize: 12, outline: 'none' }}/>
        </div>
      </div>
      <div style={{ padding: '6px 12px 4px', fontSize: 10.5, color: 'var(--muted-2)' }}>
        Click to apply to <span style={{ color: 'var(--fg-2)' }}>Heart</span>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 8px 12px' }}>
        {groups.map(g => {
          const items = MOTION_RECIPES.filter(r => r.group === g);
          if (!items.length) return null;
          return (
            <div key={g} style={{ marginTop: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-2)', letterSpacing: 0.6, padding: '10px 8px 6px', textTransform: 'uppercase' }}>{g}</div>
              {items.map(r => {
                const active = r.id === motion;
                return (
                  <button key={r.id} onClick={() => setMotion(r.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, border: 'none', marginBottom: 2,
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px color-mix(in oklch, var(--accent) 40%, transparent)' : 'none',
                    color: 'var(--fg)', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 7,
                      background: active ? 'color-mix(in oklch, var(--accent) 22%, transparent)' : 'var(--bg)',
                      border: '1px solid var(--line-soft)',
                      display: 'grid', placeItems: 'center',
                      color: active ? 'var(--accent-2)' : 'var(--fg-2)', flexShrink: 0,
                    }}>
                      <r.icon size={16}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: active ? 'var(--fg)' : 'var(--fg-2)' }}>{r.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }} className="mono">{r.desc}</div>
                    </div>
                    {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}/>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: 'flex', padding: '8px 8px 0', gap: 2, borderBottom: '1px solid var(--line-soft)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '7px 10px', fontSize: 12, fontWeight: 500,
          background: 'transparent', border: 'none', position: 'relative',
          color: value === t.id ? 'var(--fg)' : 'var(--muted)',
          borderBottom: value === t.id ? '1.5px solid var(--accent)' : '1.5px solid transparent',
          marginBottom: -1,
        }}>{t.label}</button>
      ))}
      <div style={{ flex: 1 }}/>
      <button style={{
        width: 22, height: 22, alignSelf: 'center', marginBottom: 6, marginRight: 4,
        borderRadius: 5, border: 'none', background: 'transparent', color: 'var(--muted)',
        display: 'grid', placeItems: 'center',
      }}><Ui.Plus size={13}/></button>
    </div>
  );
}

function LayerRow({ layer, active, onClick }) {
  const def = ICON_REGISTRY.find(i => i.id === layer.icon);
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7,
      background: active ? 'var(--accent-soft)' : 'transparent',
      boxShadow: active ? 'inset 0 0 0 1px color-mix(in oklch, var(--accent) 35%, transparent)' : 'none',
      cursor: 'pointer', marginBottom: 2,
    }}>
      <span style={{ color: 'var(--muted-2)', display: 'grid', placeItems: 'center' }}>
        {layer.visible ? <Ui.Eye size={13}/> : <Ui.EyeOff size={13}/>}
      </span>
      <span style={{ color: 'var(--muted-2)' }}>
        {layer.locked ? <Ui.Lock size={13}/> : <Ui.LockOpen size={13}/>}
      </span>
      <div style={{
        width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--line-soft)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {def && <def.Comp size={20} tilt={false}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ fontSize: 12, color: active ? 'var(--fg)' : 'var(--fg-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{layer.name}</div>
        <div style={{ fontSize: 10, color: 'var(--muted-2)' }} className="mono">{layer.detail}</div>
      </div>
      <Ui.Diamond size={9}/>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-2)', letterSpacing: 0.6, padding: '0 8px 6px', textTransform: 'uppercase' }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}
function SceneRow({ icon, name, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6 }}>
      <span style={{ color: 'var(--muted)' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{name}</div>
        <div style={{ fontSize: 10, color: 'var(--muted-2)' }} className="mono">{detail}</div>
      </div>
    </div>
  );
}

Object.assign(window, { TopBar, LeftRail, LayersPanel, IconBtn, MOTION_RECIPES });
